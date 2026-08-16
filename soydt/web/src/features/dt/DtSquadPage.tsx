import { useEffect, useMemo, useState } from 'react'
import { callApi } from '../../shared/api'
import DtLayout from './DtLayout'
import { useMyTeamId } from './useMyTeamId'

// DT's squad + lineup editor — a fixed 4-3-3 formation of round player
// tokens (photo + shirt number + position + ability), tap a token to open
// a dropdown of eligible bench replacements for that exact slot. Not a
// drag-and-drop pitch graphic (still no SVG field drawing, consistent with
// the repo's "no SVG pitch graphics" precedent) — just a schematic grid of
// rows by formation line. Saves via the same `PUT /api/teams/{id}/lineup`
// (see engine-ffi/src/team_lineup.rs) the old checkbox-table version used.

type LineupPlayer = {
  playerId: number
  name: string
  position: string
  currentAbility: number
  shirtNumber: number | null
  pinned: boolean
}

// Raw position comes from the Rust enum's Debug format (e.g.
// "DefensiveMidfielder", see engine-ffi's `format!("{pos:?}")`) — map it to
// the equivalent EA Sports FC position code (GK/CB/LB/RB/LWB/RWB/CDM/CM/
// LM/RM/CAM/LW/RW/LF/CF/RF/ST — the same 17-code vocabulary FIFA/EA FC
// uses) so the page reads using nomenclature players already know, instead
// of the engine's own internal position names. Several engine positions
// collapse onto the same EA code (e.g. all three central-defender slots
// are just "CB" in FIFA too — it doesn't distinguish them either), so line
// + exact shade still comes from the *engine's* more granular position:
// darker for the more defensive-minded slot, lighter for the wider / more
// advanced one — e.g. within DEF, Sweeper is the darkest blue and the
// Wingbacks (most attacking of the back line) are the lightest.
const POSITION_CODES: Record<string, { code: string; line: 'GK' | 'DEF' | 'MID' | 'FWD'; color: string }> = {
  Goalkeeper: { code: 'GK', line: 'GK', color: '#f59e0b' },

  Sweeper: { code: 'CB', line: 'DEF', color: '#1e3a8a' },
  DefenderCenterLeft: { code: 'CB', line: 'DEF', color: '#1d4ed8' },
  DefenderCenter: { code: 'CB', line: 'DEF', color: '#1d4ed8' },
  DefenderCenterRight: { code: 'CB', line: 'DEF', color: '#1d4ed8' },
  DefenderLeft: { code: 'LB', line: 'DEF', color: '#3b82f6' },
  DefenderRight: { code: 'RB', line: 'DEF', color: '#3b82f6' },
  WingbackLeft: { code: 'LWB', line: 'DEF', color: '#93c5fd' },
  WingbackRight: { code: 'RWB', line: 'DEF', color: '#93c5fd' },

  DefensiveMidfielder: { code: 'CDM', line: 'MID', color: '#14532d' },
  MidfielderCenterLeft: { code: 'CM', line: 'MID', color: '#16a34a' },
  MidfielderCenter: { code: 'CM', line: 'MID', color: '#16a34a' },
  MidfielderCenterRight: { code: 'CM', line: 'MID', color: '#16a34a' },
  MidfielderLeft: { code: 'LM', line: 'MID', color: '#4ade80' },
  MidfielderRight: { code: 'RM', line: 'MID', color: '#4ade80' },
  AttackingMidfielderCenter: { code: 'CAM', line: 'MID', color: '#86efac' },
  AttackingMidfielderLeft: { code: 'LW', line: 'MID', color: '#86efac' },
  AttackingMidfielderRight: { code: 'RW', line: 'MID', color: '#86efac' },

  Striker: { code: 'ST', line: 'FWD', color: '#991b1b' },
  ForwardCenter: { code: 'CF', line: 'FWD', color: '#dc2626' },
  ForwardLeft: { code: 'LF', line: 'FWD', color: '#f87171' },
  ForwardRight: { code: 'RF', line: 'FWD', color: '#f87171' },
}

function positionInfo(position: string) {
  return POSITION_CODES[position] ?? { code: position, line: 'MID' as const, color: '#16a34a' }
}

// #rrggbb -> "r, g, b", so a badge's background can be the same hue as its
// text at low opacity.
function hexToRgbTriplet(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

// Current ability (CA) is the engine's 1-200 overall rating for a player —
// same "how good is this player, in one number" idea as a FIFA/FM overall.
// Bands are absolute (not relative to one squad) so they stay meaningful
// across a whole career.
function abilityColor(ca: number): 'red' | 'yellow' | 'green' {
  if (ca < 100) return 'red'
  if (ca < 150) return 'yellow'
  return 'green'
}

// Fixed default formation (4-3-3) — the engine has no user-editable tactical
// shape yet (TeamTacticsPage is read-only), so this is the one shape the DT
// fills in for now. Order matters: it's also the row grouping used below
// (index 0 = GK row, 1-4 = DEF row, 5-7 = MID row, 8-10 = FWD row).
const FORMATION: { code: string; color: string }[] = [
  { code: 'GK', color: '#f59e0b' },
  { code: 'LB', color: '#3b82f6' },
  { code: 'CB', color: '#1d4ed8' },
  { code: 'CB', color: '#1d4ed8' },
  { code: 'RB', color: '#3b82f6' },
  { code: 'CDM', color: '#14532d' },
  { code: 'CM', color: '#16a34a' },
  { code: 'CM', color: '#16a34a' },
  { code: 'LW', color: '#86efac' },
  { code: 'ST', color: '#991b1b' },
  { code: 'RW', color: '#86efac' },
]
const FORMATION_ROWS = [[0], [1, 2, 3, 4], [5, 6, 7], [8, 9, 10]]

function DtSquadPage() {
  const myTeamId = useMyTeamId()
  const [players, setPlayers] = useState<LineupPlayer[] | null>(null)
  // slots[i] = playerId filling FORMATION[i], or null if empty.
  const [slots, setSlots] = useState<(number | null)[]>(Array(11).fill(null))
  const [openSlot, setOpenSlot] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (myTeamId == null) return
    callApi<LineupPlayer[]>(`/api/teams/${myTeamId}/lineup`)
      .then((rows) => {
        setPlayers(rows)
        // Auto-place already-pinned players into the first empty slot whose
        // EA code matches theirs. A previously-saved lineup that doesn't
        // fit this fixed 4-3-3 (e.g. it had a back three) leaves the
        // leftover pinned players unplaced — they're still on the bench,
        // just not pre-filled into a slot.
        const next: (number | null)[] = Array(11).fill(null)
        for (const p of rows.filter((r) => r.pinned)) {
          const code = positionInfo(p.position).code
          const slotIndex = FORMATION.findIndex((slot, i) => slot.code === code && next[i] == null)
          if (slotIndex !== -1) next[slotIndex] = p.playerId
        }
        setSlots(next)
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [myTeamId])

  const playerById = useMemo(() => {
    const map = new Map<number, LineupPlayer>()
    players?.forEach((p) => map.set(p.playerId, p))
    return map
  }, [players])

  const assignedIds = useMemo(() => new Set(slots.filter((id): id is number => id != null)), [slots])
  const filledCount = assignedIds.size

  const candidatesFor = (slotIndex: number) => {
    if (!players) return []
    const code = FORMATION[slotIndex].code
    return players
      .filter((p) => !assignedIds.has(p.playerId) && positionInfo(p.position).code === code)
      .sort((a, b) => b.currentAbility - a.currentAbility)
  }

  const assign = (slotIndex: number, playerId: number) => {
    setSlots((prev) => {
      const next = [...prev]
      next[slotIndex] = playerId
      return next
    })
    setOpenSlot(null)
    setSaved(false)
  }

  const clearSlot = (slotIndex: number) => {
    setSlots((prev) => {
      const next = [...prev]
      next[slotIndex] = null
      return next
    })
    setOpenSlot(null)
    setSaved(false)
  }

  const save = async () => {
    if (!myTeamId || filledCount !== 11) return
    setError(null)
    try {
      await callApi(`/api/teams/${myTeamId}/lineup`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerIds: slots.filter((id): id is number => id != null) }),
      })
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  if (myTeamId === undefined || (myTeamId != null && !players)) {
    return (
      <DtLayout title="Plantel">
        <div className="fm-page">
          <p>Cargando…</p>
        </div>
      </DtLayout>
    )
  }

  if (myTeamId == null) {
    return (
      <DtLayout title="Plantel">
        <div className="fm-page">
          <p>Todavía no elegiste tu club — andá a /new-game.</p>
        </div>
      </DtLayout>
    )
  }

  return (
    <DtLayout title="Plantel" subTitle={`${filledCount}/11 titulares`}>
      <div className="fm-page">
        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Alineación titular</h3>
            <span className="fm-panel-count">{filledCount}/11</span>
          </div>
          {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}

          <div className="fm-formation">
            {FORMATION_ROWS.map((row, rowIdx) => (
              <div className="fm-formation-row" key={rowIdx}>
                {row.map((slotIndex) => {
                  const slot = FORMATION[slotIndex]
                  const player = slots[slotIndex] != null ? playerById.get(slots[slotIndex]!) : undefined
                  return (
                    <div className="fm-slot-wrap" key={slotIndex}>
                      <button
                        type="button"
                        className="fm-slot"
                        onClick={() => setOpenSlot(openSlot === slotIndex ? null : slotIndex)}
                        title={player ? player.name : `Vacío — ${slot.code}`}
                      >
                        <span className="fm-slot-photo-ring" style={{ borderColor: slot.color }}>
                          {player ? (
                            <img
                              className="fm-slot-photo"
                              src={`/static/images/players/${player.playerId}.jpg`}
                              onError={(e) => {
                                e.currentTarget.onerror = null
                                e.currentTarget.src = '/static/images/player/placeholder-face.svg'
                              }}
                              alt=""
                            />
                          ) : (
                            <span className="fm-slot-empty">+</span>
                          )}
                          {player?.shirtNumber != null && <span className="fm-slot-number">{player.shirtNumber}</span>}
                        </span>
                        <span
                          className="fm-pos-badge fm-slot-code"
                          style={{ color: slot.color, background: `rgba(${hexToRgbTriplet(slot.color)}, 0.18)` }}
                        >
                          {slot.code}
                        </span>
                        {player && (
                          <>
                            <span className="fm-slot-name">{player.name}</span>
                            <span className={`fm-ability fm-ability-${abilityColor(player.currentAbility)}`}>
                              {player.currentAbility}
                            </span>
                          </>
                        )}
                      </button>

                      {openSlot === slotIndex && (
                        <>
                          <div className="fm-slot-dropdown-backdrop" onClick={() => setOpenSlot(null)} />
                          <div className="fm-slot-dropdown">
                            {player && (
                              <button type="button" className="fm-slot-dropdown-item fm-slot-dropdown-clear" onClick={() => clearSlot(slotIndex)}>
                                Dejar vacío
                              </button>
                            )}
                            {candidatesFor(slotIndex).map((c) => (
                              <button
                                type="button"
                                key={c.playerId}
                                className="fm-slot-dropdown-item"
                                onClick={() => assign(slotIndex, c.playerId)}
                              >
                                <img
                                  className="fm-slot-dropdown-photo"
                                  src={`/static/images/players/${c.playerId}.jpg`}
                                  onError={(e) => {
                                    e.currentTarget.onerror = null
                                    e.currentTarget.src = '/static/images/player/placeholder-face.svg'
                                  }}
                                  alt=""
                                />
                                <span className="fm-slot-dropdown-name">{c.name}</span>
                                <span className={`fm-ability fm-ability-${abilityColor(c.currentAbility)}`}>{c.currentAbility}</span>
                              </button>
                            ))}
                            {candidatesFor(slotIndex).length === 0 && (
                              <span className="fm-slot-dropdown-empty">No hay más {slot.code} disponibles en el banco</span>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              type="button"
              className="fm-worker-dialog-btn fm-worker-dialog-btn-add"
              disabled={filledCount !== 11}
              onClick={save}
            >
              Guardar alineación
            </button>
            {saved && <span style={{ color: '#4ade80' }}>Guardada ✓</span>}
          </div>
        </section>
      </div>
    </DtLayout>
  )
}

export default DtSquadPage
