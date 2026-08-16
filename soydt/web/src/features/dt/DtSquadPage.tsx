import { useEffect, useMemo, useState } from 'react'
import { callApi } from '../../shared/api'
import DtLayout from './DtLayout'
import { useMyTeamId } from './useMyTeamId'

// DT's squad + lineup editor — picks the starting XI that actually gets
// pinned via `PUT /api/teams/{id}/lineup` (see engine-ffi/src/team_lineup.rs).
// No pitch/formation graphic (consistent with the repo's existing "no SVG
// pitch graphics" simplification precedent) — a flat checkbox list capped
// at 11 is enough for the DT MVP.

type LineupPlayer = { playerId: number; name: string; position: string; currentAbility: number; pinned: boolean }

// Raw position comes from the Rust enum's Debug format (e.g.
// "DefensiveMidfielder", see engine-ffi's `format!("{pos:?}")`) — map it to
// the equivalent EA Sports FC position code (GK/CB/LB/RB/LWB/RWB/CDM/CM/
// LM/RM/CAM/LW/RW/LF/CF/RF/ST — the same 17-code vocabulary FIFA/EA FC
// uses) so the table reads using nomenclature players already know, instead
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
// text at low opacity (see the inline style on the badge below).
function hexToRgbTriplet(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}

// Current ability (CA) is the engine's 1-200 overall rating for a player —
// same "how good is this player, in one number" idea as a FIFA/FM overall.
// Bands are absolute (not relative to this one squad) so they stay
// meaningful across a whole career, not just this snapshot's range.
function abilityColor(ca: number): 'red' | 'yellow' | 'green' {
  if (ca < 100) return 'red'
  if (ca < 150) return 'yellow'
  return 'green'
}

type SortKey = 'name' | 'position' | 'currentAbility'
type SortState = { key: SortKey; dir: 'asc' | 'desc' } | null

function DtSquadPage() {
  const myTeamId = useMyTeamId()
  const [players, setPlayers] = useState<LineupPlayer[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [sort, setSort] = useState<SortState>(null)

  const toggleSort = (key: SortKey) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: key === 'currentAbility' ? 'desc' : 'asc' }
      if (prev.dir === 'asc') return { key, dir: 'desc' }
      return null
    })
  }

  const sortedPlayers = useMemo(() => {
    if (!players) return players
    if (!sort) return players
    const factor = sort.dir === 'asc' ? 1 : -1
    const rows = [...players]
    rows.sort((a, b) => {
      if (sort.key === 'currentAbility') return (a.currentAbility - b.currentAbility) * factor
      const av = sort.key === 'name' ? a.name : a.position
      const bv = sort.key === 'name' ? b.name : b.position
      return av.localeCompare(bv) * factor
    })
    return rows
  }, [players, sort])

  const sortIndicator = (key: SortKey) => (sort?.key === key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : '')

  useEffect(() => {
    if (myTeamId == null) return
    callApi<LineupPlayer[]>(`/api/teams/${myTeamId}/lineup`)
      .then((rows) => {
        setPlayers(rows)
        setSelected(new Set(rows.filter((p) => p.pinned).map((p) => p.playerId)))
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [myTeamId])

  const toggle = (playerId: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) {
        next.delete(playerId)
      } else if (next.size < 11) {
        next.add(playerId)
      }
      return next
    })
    setSaved(false)
  }

  const save = async () => {
    if (!myTeamId || selected.size !== 11) return
    setError(null)
    try {
      await callApi(`/api/teams/${myTeamId}/lineup`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerIds: Array.from(selected) }),
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
    <DtLayout title="Plantel" subTitle={`${selected.size}/11 titulares`}>
      <div className="fm-page">
        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Alineación titular</h3>
            <span className="fm-panel-count">{selected.size}/11</span>
          </div>
          {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}
          <table className="fm-standings">
            <thead>
              <tr>
                <th></th>
                <th className="st-club fm-sortable" onClick={() => toggleSort('name')}>
                  Nombre{sortIndicator('name')}
                </th>
                <th className="fm-sortable" onClick={() => toggleSort('position')}>
                  Pos{sortIndicator('position')}
                </th>
                <th
                  className="st-pts fm-sortable"
                  onClick={() => toggleSort('currentAbility')}
                  title="Habilidad (CA = Current Ability): valoración general del jugador de 1 a 200. Rojo = por debajo del nivel de Primera, amarillo = nivel profesional, verde = figura."
                >
                  Habilidad{sortIndicator('currentAbility')}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedPlayers!.map((p) => {
                const pos = positionInfo(p.position)
                return (
                  <tr key={p.playerId}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(p.playerId)}
                        onChange={() => toggle(p.playerId)}
                        disabled={!selected.has(p.playerId) && selected.size >= 11}
                      />
                    </td>
                    <td className="st-club">{p.name}</td>
                    <td>
                      <span
                        className="fm-pos-badge"
                        style={{ color: pos.color, background: `rgba(${hexToRgbTriplet(pos.color)}, 0.18)` }}
                        title={p.position}
                      >
                        {pos.code}
                      </span>
                    </td>
                    <td className={`st-pts fm-ability fm-ability-${abilityColor(p.currentAbility)}`}>
                      {p.currentAbility}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              type="button"
              className="fm-worker-dialog-btn fm-worker-dialog-btn-add"
              disabled={selected.size !== 11}
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
