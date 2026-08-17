// Raw position comes from the Rust enum's Debug format (e.g.
// "DefensiveMidfielder", see engine-ffi's `format!("{pos:?}")`) — map it to
// the equivalent EA Sports FC position code (GK/CB/LB/RB/LWB/RWB/CDM/CM/
// LM/RM/CAM/LW/RW/LF/CF/RF/ST — the same 17-code vocabulary FIFA/EA FC
// uses) so every page reads using nomenclature players already know,
// instead of the engine's own internal position names. Several engine
// positions collapse onto the same EA code (e.g. all three central-defender
// slots are just "CB" in FIFA too — it doesn't distinguish them either), so
// line + exact shade still comes from the *engine's* more granular
// position: darker for the more defensive-minded slot, lighter for the
// wider / more advanced one — e.g. within DEF, Sweeper is the darkest blue
// and the Wingbacks (most attacking of the back line) are the lightest.
//
// Single source of truth for this mapping — every squad/roster listing
// across the app (team page, transfers, watchlist, free agents, national
// squad, DT lineup formation, etc.) should render through `PositionBadge`
// rather than the raw engine string, so a player's position code stays
// consistent wherever they show up.
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

export function positionInfo(position: string) {
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

// Position familiarity — EA FC's "how far is this from your natural
// position" model, not a flat "any slot in your line costs the same"
// penalty. Every code gets a `side` (-1 left, 0 center, +1 right) and a
// `role` (how withdrawn vs. advanced within the line — e.g. CDM < CM < CAM,
// or a defensive fullback (0) vs. an attacking wingback (1)). Moving a
// player is cheap when both axes barely change (CB -> LB, CDM -> CM) and
// expensive when they change a lot (LM -> RW: crosses the pitch *and*
// swaps role) — see `outOfPositionPenalty` for how the axes combine.
const POSITION_FAMILIARITY: Record<string, { side: -1 | 0 | 1; role: number }> = {
  GK: { side: 0, role: 0 },

  CB: { side: 0, role: 0 },
  LB: { side: -1, role: 0 },
  RB: { side: 1, role: 0 },
  LWB: { side: -1, role: 1 },
  RWB: { side: 1, role: 1 },

  CDM: { side: 0, role: 0 },
  CM: { side: 0, role: 1 },
  CAM: { side: 0, role: 2 },
  LM: { side: -1, role: 1 },
  RM: { side: 1, role: 1 },
  LW: { side: -1, role: 2 },
  RW: { side: 1, role: 2 },

  ST: { side: 0, role: 1 },
  CF: { side: 0, role: 0 },
  LF: { side: -1, role: 0 },
  RF: { side: 1, role: 0 },
}

// Side weight is deliberately tiny: swapping wings (LW <-> RW, LB <-> RB, a
// natural left-winger playing right) is a "wrong foot" quibble, not a real
// positional switch — a mirrored move (same role, opposite side) should
// cost next to nothing. Role weight carries the actual penalty, since
// changing job (CDM -> CAM, LB -> LWB) is the part that's genuinely harder
// than lining up on the other flank.
const SIDE_WEIGHT = 1
const ROLE_WEIGHT = 6
const MAX_PENALTY = 25

// OVR cost of playing `fromCode`'s natural occupant at `toCode` — 0 for an
// exact match, rising with how far the two axes above diverge, capped so
// even the most awkward same-line deputizing (e.g. a left winger pushed to
// right-back) stays a "worse but playable" option rather than a punitive
// wall. Only meaningful for two codes in the same line — cross-line moves
// are handled as flatly ineligible by the caller, not through this scale.
export function outOfPositionPenalty(fromCode: string, toCode: string): number {
  const a = POSITION_FAMILIARITY[fromCode]
  const b = POSITION_FAMILIARITY[toCode]
  if (!a || !b) return MAX_PENALTY
  const penalty = Math.abs(a.side - b.side) * SIDE_WEIGHT + Math.abs(a.role - b.role) * ROLE_WEIGHT
  return Math.min(penalty, MAX_PENALTY)
}

// Reuses `.fm-pos-badge` (see style.css) — same pill DtSquadPage's
// formation tokens already use, so a player's position code looks
// identical whether it's shown on the pitch grid or in a plain table row.
export function PositionBadge({ position }: { position: string }) {
  const info = positionInfo(position)
  return (
    <span className="fm-pos-badge" style={{ color: info.color, background: `rgba(${hexToRgbTriplet(info.color)}, 0.18)` }}>
      {info.code}
    </span>
  )
}
