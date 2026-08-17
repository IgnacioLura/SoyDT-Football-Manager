import type { CSSProperties } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { callApi } from '../../shared/api'
import { outOfPositionPenalty, positionInfo } from '../../shared/positions'
import type { SortMode } from '../../shared/sortPlayers'
import { sortByMode } from '../../shared/sortPlayers'
import { playerPhotoOnError, playerPhotoSrc } from '../../shared/playerPhoto'
import PlayerCard from '../../shared/ui/PlayerCard'
import { ratingTier } from '../../shared/ui/RatingBadge'
import SectionPanel from '../../shared/ui/SectionPanel'
import SortToggle from '../../shared/ui/SortToggle'
import TeamCrest from '../onboarding/TeamCrest'
import DtLayout from './DtLayout'
import './DtSquadPage.css'
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
  age: number
  currentAbility: number
  shirtNumber: number | null
  pinned: boolean
  isReadyForMatch: boolean
  isInjured: boolean
  isBanned: boolean
}

type DtActiveBuff = {
  scope: string
  playerId: number | null
  playerName: string | null
  ovrDelta: number
  moraleDelta: number
  matchesRemaining: number
}

function unavailableLabel(p: Pick<LineupPlayer, 'isInjured' | 'isBanned'>): string {
  if (p.isInjured) return 'Lesionado'
  if (p.isBanned) return 'Suspendido'
  return 'No disponible'
}

// OVR — the engine's 1-200 overall rating for a player (same field the API
// still calls `currentAbility`; the app now labels it "OVR" everywhere,
// matching the EA FC nomenclature already used for position codes). Bands
// are absolute (not relative to one squad) so they stay meaningful across
// a whole career.
function abilityColor(ca: number): 'red' | 'yellow' | 'green' {
  if (ca < 100) return 'red'
  if (ca < 150) return 'yellow'
  return 'green'
}

// Fixed default formation (4-3-3) — the engine has no user-editable tactical
// shape yet (TeamTacticsPage is read-only), so this is the one shape the DT
// fills in for now. Order matters: it's also the row grouping used below
// (index 0 = GK row, 1-4 = DEF row, 5-7 = MID row, 8-10 = FWD row). `line`
// matches the same classification `POSITION_CODES` already uses for that
// exact code (e.g. LW/RW are 'MID' there too, since the engine's Attacking
// Midfielder Left/Right — not a separate winger position — is what maps to
// them), so a player's out-of-position eligibility below is consistent with
// how they're colored everywhere else in the app.
const FORMATION: { code: string; line: 'GK' | 'DEF' | 'MID' | 'FWD'; color: string }[] = [
  { code: 'GK', line: 'GK', color: '#f59e0b' },
  { code: 'LB', line: 'DEF', color: '#3b82f6' },
  { code: 'CB', line: 'DEF', color: '#1d4ed8' },
  { code: 'CB', line: 'DEF', color: '#1d4ed8' },
  { code: 'RB', line: 'DEF', color: '#3b82f6' },
  { code: 'CDM', line: 'MID', color: '#14532d' },
  { code: 'CM', line: 'MID', color: '#16a34a' },
  { code: 'CM', line: 'MID', color: '#16a34a' },
  { code: 'LW', line: 'MID', color: '#86efac' },
  { code: 'ST', line: 'FWD', color: '#991b1b' },
  { code: 'RW', line: 'MID', color: '#86efac' },
]
const FORMATION_ROWS = [[0], [1, 2, 3, 4], [5, 6, 7], [8, 9, 10]]

// Out-of-position eligibility: a defender/midfielder/forward can fill any
// slot within their own line (not their exact EA code) — same idea as
// FIFA/FM letting a CB deputize at RB, just worse at it than a natural
// one. How much worse now scales with how far the two positions actually
// are (`outOfPositionPenalty`, EA FC's own positional-familiarity model)
// instead of one flat number for every same-line move — a CB filling in
// at LB barely costs anything, while an LM asked to play RW (crosses the
// pitch and changes role) costs a lot more. Goalkeepers are excluded on
// purpose: playing outfield isn't a "worse version of the same job" the
// way it is within DEF/MID/FWD, it's a different job entirely.
function eligibility(playerPosition: string, slot: { code: string; line: 'GK' | 'DEF' | 'MID' | 'FWD' }) {
  const info = positionInfo(playerPosition)
  if (info.code === slot.code) return { eligible: true, penalty: 0 }
  if (slot.line !== 'GK' && info.line === slot.line) {
    return { eligible: true, penalty: outOfPositionPenalty(info.code, slot.code) }
  }
  return { eligible: false, penalty: 0 }
}

// Linear assignment problem (Hungarian / Kuhn-Munkres algorithm), O(n^2*m)
// for an n x m cost matrix with n <= m — finds the row-to-distinct-column
// assignment that minimizes total cost. `cost` must have `cost[i].length`
// equal (a rectangular matrix), and every entry finite. Returns
// `assignment[i]` = the column index given to row `i` (never -1 for a
// well-formed n <= m input, but guarded anyway). Standard competitive-
// programming implementation (potentials + shortest augmenting path);
// used here because a greedy "highest score first" fill can strand a
// slot with a worse player than the optimal arrangement would give it —
// see `fillBestAvailable`'s doc comment for a concrete example.
function hungarianAssignment(cost: number[][]): number[] {
  const n = cost.length
  const m = cost[0]?.length ?? 0
  if (n === 0 || m === 0) return new Array(n).fill(-1)
  const INF = Number.POSITIVE_INFINITY
  const u = new Array(n + 1).fill(0)
  const v = new Array(m + 1).fill(0)
  const p = new Array(m + 1).fill(0) // p[j] = 1-indexed row currently assigned to column j
  const way = new Array(m + 1).fill(0)
  for (let i = 1; i <= n; i++) {
    p[0] = i
    let j0 = 0
    const minv = new Array(m + 1).fill(INF)
    const used = new Array(m + 1).fill(false)
    do {
      used[j0] = true
      const i0 = p[j0]
      let delta = INF
      let j1 = -1
      for (let j = 1; j <= m; j++) {
        if (used[j]) continue
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j]
        if (cur < minv[j]) {
          minv[j] = cur
          way[j] = j0
        }
        if (minv[j] < delta) {
          delta = minv[j]
          j1 = j
        }
      }
      for (let j = 0; j <= m; j++) {
        if (used[j]) {
          u[p[j]] += delta
          v[j] -= delta
        } else {
          minv[j] -= delta
        }
      }
      j0 = j1
    } while (p[j0] !== 0)
    do {
      const j1 = way[j0]
      p[j0] = p[j1]
      j0 = j1
    } while (j0 !== 0)
  }
  const assignment = new Array(n).fill(-1)
  for (let j = 1; j <= m; j++) {
    if (p[j] > 0) assignment[p[j] - 1] = j - 1
  }
  return assignment
}

function DtSquadPage() {
  const myTeamId = useMyTeamId()
  const [players, setPlayers] = useState<LineupPlayer[] | null>(null)
  // slots[i] = playerId filling FORMATION[i], or null if empty.
  const [slots, setSlots] = useState<(number | null)[]>(Array(11).fill(null))
  const [openSlot, setOpenSlot] = useState<number | null>(null)
  // Whether the open dropdown should render above its token instead of
  // below — the FWD row sits near the bottom of the formation panel, so a
  // ~280px dropdown opening downward there routinely ran off the bottom of
  // the viewport with no way to see (or click) the rest of it. Measured
  // fresh on every open against the *current* viewport height rather than
  // baked in per-row, since how much room a row has left depends on scroll
  // position and window size, not just which row it is.
  const [openUp, setOpenUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [teamInfo, setTeamInfo] = useState<{ name: string; slug: string } | null>(null)
  const [activeBuffs, setActiveBuffs] = useState<DtActiveBuff[]>([])
  const [sortMode, setSortMode] = useState<SortMode>('position')
  // Drag-and-drop is additive on top of the click-a-slot-to-open-a-dropdown
  // flow above — same `assign` swap logic underneath, just a second way to
  // trigger it. `draggedPlayerId` tracks who's mid-drag so slots can light
  // up (or not) as valid drop targets while hovering.
  const [draggedPlayerId, setDraggedPlayerId] = useState<number | null>(null)
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null)

  useEffect(() => {
    if (myTeamId == null) return
    callApi<{ name: string; slug: string }>(`/api/teams/${myTeamId}`)
      .then(setTeamInfo)
      .catch(() => setTeamInfo(null))
  }, [myTeamId])

  useEffect(() => {
    if (myTeamId == null) return
    callApi<{ players: LineupPlayer[]; slotOrder: (number | null)[] }>(`/api/teams/${myTeamId}/lineup`)
      .then(({ players: rows, slotOrder }) => {
        setPlayers(rows)
        if (slotOrder.length === 11) {
          // Exact slot layout from the last save (see engine-ffi's
          // `GameHandle::lineup_order`) — restores out-of-position picks
          // to the precise slot they were placed in, unlike deriving
          // placement from position codes below (which can't tell "CM
          // deputizing at LW" apart from "CM in a CM slot").
          setSlots(slotOrder)
          return
        }
        // No saved slot layout yet (first time this team's lineup loads) —
        // fall back to auto-placing already-pinned players into the first
        // empty slot whose EA code matches theirs. A previously-saved
        // lineup that doesn't fit this fixed 4-3-3 (e.g. it had a back
        // three) leaves the leftover pinned players unplaced — they're
        // still on the bench, just not pre-filled into a slot. Skips
        // anyone who became unavailable (injured/suspended/low condition)
        // since the lineup was last saved — the backend would reject
        // saving them again anyway, so re-placing them here would just
        // reproduce the error.
        const next: (number | null)[] = Array(11).fill(null)
        const pinned = rows.filter((r) => r.pinned && r.isReadyForMatch)
        const leftover: LineupPlayer[] = []
        for (const p of pinned) {
          const code = positionInfo(p.position).code
          const slotIndex = FORMATION.findIndex((slot, i) => slot.code === code && next[i] == null)
          if (slotIndex !== -1) next[slotIndex] = p.playerId
          else leftover.push(p)
        }
        // Second pass: a pinned out-of-position player (saved with a
        // penalty into a slot outside their exact code, e.g. an LW pinned
        // at ST) has no slot with their own code left — fall back to any
        // empty slot within their line, same rule `eligibility()` uses,
        // so the save round-trips instead of bouncing them to the bench.
        for (const p of leftover) {
          const line = positionInfo(p.position).line
          const slotIndex = FORMATION.findIndex((slot, i) => slot.line !== 'GK' && slot.line === line && next[i] == null)
          if (slotIndex !== -1) next[slotIndex] = p.playerId
        }
        setSlots(next)
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [myTeamId])

  useEffect(() => {
    if (myTeamId == null) return
    callApi<{ activeBuffs: DtActiveBuff[] }>('/api/dt/events')
      .then((r) => setActiveBuffs(r.activeBuffs))
      .catch(() => setActiveBuffs([]))
  }, [myTeamId])

  const playerById = useMemo(() => {
    const map = new Map<number, LineupPlayer>()
    players?.forEach((p) => map.set(p.playerId, p))
    return map
  }, [players])

  const assignedIds = useMemo(() => new Set(slots.filter((id): id is number => id != null)), [slots])
  const filledCount = assignedIds.size

  // Sum of every active DT-event buff/debuff touching this player — "Team"
  // scope applies to everyone, "Player" scope only to its own playerId.
  // Stacks with (and is applied before) the existing out-of-position
  // penalty, same as `eligibility`'s penalty already stacks onto the raw
  // OVR everywhere it's used below.
  const buffDeltaFor = (playerId: number) =>
    activeBuffs.filter((b) => b.scope === 'Team' || b.playerId === playerId).reduce((sum, b) => sum + b.ovrDelta, 0)

  // Candidates for a slot include bench players *and* other starters — a
  // starter shown here isn't a duplicate, picking one swaps them into this
  // slot and sends whoever (if anyone) was here to the picked player's old
  // spot (see `assign`). Previously this list only showed the bench, so
  // swapping two starters required clearing one first and losing track of
  // who was where.
  //
  // Always ranked by effective OVR (buffs + out-of-position penalty
  // applied), ready-for-match players first — this list is a
  // recommendation ("who's the best fit for this slot"), not a browsing
  // view, so it ignores the Position/OVR display toggle further down the
  // page (that one only reorders the full-squad grid, where "best pick
  // first" isn't the point).
  const candidatesFor = (slotIndex: number) => {
    if (!players) return []
    const slot = FORMATION[slotIndex]
    const currentOccupantId = slots[slotIndex]
    const eligible = players
      .filter((p) => p.playerId !== currentOccupantId)
      .map((p) => {
        const { eligible: isEligible, penalty } = eligibility(p.position, slot)
        return {
          ...p,
          eligible: isEligible,
          penalty,
          fromSlotIndex: slots.findIndex((id) => id === p.playerId),
          effOvr: p.currentAbility + buffDeltaFor(p.playerId) - penalty,
        }
      })
      .filter((c) => c.eligible)
    const ready = eligible.filter((c) => c.isReadyForMatch).sort((a, b) => b.effOvr - a.effOvr)
    const unready = eligible.filter((c) => !c.isReadyForMatch).sort((a, b) => b.effOvr - a.effOvr)
    return [...ready, ...unready]
  }

  // Places `playerId` in `slotIndex`. If they were already starting
  // somewhere else, that slot gets whoever (if anyone) is displaced from
  // `slotIndex` — a real two-way swap instead of silently duplicating the
  // player or leaving their old slot empty.
  const assign = (slotIndex: number, playerId: number) => {
    setSlots((prev) => {
      const next = [...prev]
      const displaced = next[slotIndex]
      const fromSlotIndex = next.findIndex((id) => id === playerId)
      next[slotIndex] = playerId
      if (fromSlotIndex !== -1 && fromSlotIndex !== slotIndex) {
        next[fromSlotIndex] = displaced ?? null
      }
      return next
    })
    setOpenSlot(null)
    setSaved(false)
  }

  // Best-XI auto-fill: an actual maximum-weight assignment (Hungarian
  // algorithm — see `hungarianAssignment` below), not a greedy pick. A
  // greedy "take the highest-OVR pair first" fill can lock a merely-good
  // player into a slot because their pairing happened to sort first, even
  // when a different arrangement of the same players nets a higher total
  // (e.g. a world-class CB who's also a decent LB should slot in at CB and
  // let a real LB take the other spot, not grab CB just because that pair
  // had the single highest score). The Hungarian algorithm finds the
  // arrangement that maximizes the *sum* across all 11 slots at once,
  // which is what "best team" actually means.
  const fillBestAvailable = () => {
    if (!players) return
    const ready = players.filter((p) => p.isReadyForMatch)
    if (ready.length === 0) return
    // Cost = -effOvr (Hungarian minimizes); INELIGIBLE is a large finite
    // penalty rather than Infinity so the algorithm's arithmetic stays
    // well-defined — it's only ever picked when a slot has no real
    // candidate at all, and that's filtered back out below.
    const INELIGIBLE = 1_000_000
    const costMatrix = FORMATION.map((slot) =>
      ready.map((p) => {
        const { eligible, penalty } = eligibility(p.position, slot)
        if (!eligible) return INELIGIBLE
        return -(p.currentAbility + buffDeltaFor(p.playerId) - penalty)
      }),
    )
    const slotToPlayerCol = hungarianAssignment(costMatrix)
    const next: (number | null)[] = Array(11).fill(null)
    slotToPlayerCol.forEach((col, slotIndex) => {
      if (col === -1 || costMatrix[slotIndex][col] >= INELIGIBLE) return
      next[slotIndex] = ready[col].playerId
    })
    setSlots(next)
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
        <SectionPanel
          title="Alineación titular"
          actions={
            <>
              {teamInfo && <TeamCrest slug={teamInfo.slug} name={teamInfo.name} size={32} />}
              <span className="fm-panel-count">{filledCount}/11</span>
            </>
          }
        >
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
                        className={`fm-slot${openSlot === slotIndex ? ' fm-slot-open' : ''}${player ? ` fm-slot-tier-${ratingTier(player.currentAbility)}` : ' fm-slot-empty-tier'}${dragOverSlot === slotIndex ? ' fm-slot-drag-over' : ''}`}
                        onClick={(e) => {
                          if (openSlot === slotIndex) {
                            setOpenSlot(null)
                            return
                          }
                          const rect = e.currentTarget.getBoundingClientRect()
                          setOpenUp(window.innerHeight - rect.bottom < 300 && rect.top > 300)
                          setOpenSlot(slotIndex)
                        }}
                        draggable={player != null}
                        onDragStart={() => player && setDraggedPlayerId(player.playerId)}
                        onDragEnd={() => {
                          setDraggedPlayerId(null)
                          setDragOverSlot(null)
                        }}
                        onDragOver={(e) => {
                          if (draggedPlayerId == null) return
                          const dragged = playerById.get(draggedPlayerId)
                          if (!dragged || !eligibility(dragged.position, slot).eligible) return
                          e.preventDefault()
                          setDragOverSlot(slotIndex)
                        }}
                        onDragLeave={() => setDragOverSlot((s) => (s === slotIndex ? null : s))}
                        onDrop={(e) => {
                          e.preventDefault()
                          setDragOverSlot(null)
                          if (draggedPlayerId == null) return
                          const dragged = playerById.get(draggedPlayerId)
                          if (!dragged || !eligibility(dragged.position, slot).eligible) return
                          assign(slotIndex, draggedPlayerId)
                        }}
                        title={player ? player.name : `Vacío — ${slot.code}`}
                      >
                        {/* Badges sit outside `.fm-slot-shape` so they can overflow past
                            its clip-path corners instead of being sliced by it — same
                            trick as the roster PlayerCard. */}
                        {player && (
                          <span className="fm-slot-ovr-badge">{Math.round(player.currentAbility)}</span>
                        )}
                        <span className="fm-slot-pos-badge" style={{ '--pos-color': slot.color } as CSSProperties}>
                          {slot.code}
                        </span>
                        <span className="fm-slot-shape">
                          <span className="fm-slot-photo-wrap">
                            {player ? (
                              <img
                                className="fm-slot-photo"
                                src={playerPhotoSrc(player.playerId)}
                                onError={playerPhotoOnError}
                                alt=""
                              />
                            ) : (
                              <span className="fm-slot-empty">+</span>
                            )}
                            {player?.shirtNumber != null && <span className="fm-slot-number">{player.shirtNumber}</span>}
                          </span>
                          {player && (
                            <span className="fm-slot-nameplate">
                              <span className="fm-slot-name">{player.name}</span>
                              {(() => {
                                const penalty = eligibility(player.position, slot).penalty
                                const buff = buffDeltaFor(player.playerId)
                                return (
                                  (buff !== 0 || penalty > 0) && (
                                    <span className="fm-slot-ovr-row">
                                      {buff !== 0 && (
                                        <span className={buff > 0 ? 'fm-ovr-buff-positive' : 'fm-ovr-buff-negative'}>
                                          {buff > 0 ? '+' : ''}
                                          {buff}
                                        </span>
                                      )}
                                      {penalty > 0 && <span className="fm-ovr-penalty">-{penalty}</span>}
                                    </span>
                                  )
                                )
                              })()}
                            </span>
                          )}
                        </span>
                      </button>

                      {openSlot === slotIndex && (
                        <>
                          <div className="fm-slot-dropdown-backdrop" onClick={() => setOpenSlot(null)} />
                          <div className={`fm-slot-dropdown${openUp ? ' fm-slot-dropdown-up' : ''}`}>
                            {player && (
                              <button type="button" className="fm-slot-dropdown-item fm-slot-dropdown-clear" onClick={() => clearSlot(slotIndex)}>
                                Dejar vacío
                              </button>
                            )}
                            {candidatesFor(slotIndex).map((c) => (
                              <button
                                type="button"
                                key={c.playerId}
                                className={`fm-slot-dropdown-item${!c.isReadyForMatch ? ' fm-slot-dropdown-item-disabled' : ''}`}
                                disabled={!c.isReadyForMatch}
                                onClick={() => assign(slotIndex, c.playerId)}
                              >
                                <img
                                  className="fm-slot-dropdown-photo"
                                  src={playerPhotoSrc(c.playerId)}
                                  onError={playerPhotoOnError}
                                  alt=""
                                />
                                <span className="fm-slot-dropdown-name">
                                  {c.name}
                                  {c.fromSlotIndex !== -1 && (
                                    <span className="fm-slot-dropdown-swap-tag"> (titular en {FORMATION[c.fromSlotIndex].code})</span>
                                  )}
                                </span>
                                {c.isReadyForMatch ? (
                                  <>
                                    <span className={`fm-ability fm-ability-${abilityColor(c.currentAbility)}`}>{c.currentAbility}</span>
                                    {buffDeltaFor(c.playerId) !== 0 && (
                                      <span className={buffDeltaFor(c.playerId) > 0 ? 'fm-ovr-buff-positive' : 'fm-ovr-buff-negative'}>
                                        {buffDeltaFor(c.playerId) > 0 ? '+' : ''}
                                        {buffDeltaFor(c.playerId)}
                                      </span>
                                    )}
                                    {c.penalty > 0 && <span className="fm-ovr-penalty">-{c.penalty}</span>}
                                  </>
                                ) : (
                                  <span className="fm-unavailable">{unavailableLabel(c)}</span>
                                )}
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
            <button type="button" className="fm-worker-dialog-btn" onClick={fillBestAvailable}>
              Poner lo mejor disponible
            </button>
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
        </SectionPanel>

        <SectionPanel
          title="Plantel completo"
          actions={
            <>
              <SortToggle value={sortMode} onChange={setSortMode} />
              <span className="fm-panel-count">{players?.length ?? 0}</span>
            </>
          }
        >
          <div className="dt-squad-grid">
            {sortByMode(players ?? [], sortMode, (p) => p.position, (p) => p.currentAbility).map((p, i) => (
              <div
                className="dt-squad-card"
                key={p.playerId}
                draggable
                onDragStart={() => setDraggedPlayerId(p.playerId)}
                onDragEnd={() => {
                  setDraggedPlayerId(null)
                  setDragOverSlot(null)
                }}
              >
                <PlayerCard
                  id={p.playerId}
                  name={p.name}
                  position={p.position}
                  age={p.age}
                  currentAbility={p.currentAbility}
                  index={i}
                />
                {assignedIds.has(p.playerId) && <span className="dt-squad-badge dt-squad-badge-starter">Titular</span>}
                {!p.isReadyForMatch && (
                  <span className="dt-squad-badge dt-squad-badge-unavailable">{unavailableLabel(p)}</span>
                )}
              </div>
            ))}
          </div>
        </SectionPanel>
      </div>
    </DtLayout>
  )
}

export default DtSquadPage
