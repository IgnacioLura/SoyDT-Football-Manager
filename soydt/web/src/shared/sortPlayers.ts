// soydt/web/src/shared/sortPlayers.ts
import { positionInfo } from './positions'

export type SortMode = 'position' | 'ovr'

// Canonical left-to-right, back-to-front position order so "sort by
// position" reads like a lineup sheet (GK, then DEF/MID/FWD grouped,
// sides ordered left-center-right within each line) instead of an
// alphabetical jumble of EA codes.
const POSITION_ORDER = [
  'GK',
  'LB', 'LWB', 'CB', 'RWB', 'RB',
  'CDM', 'LM', 'CM', 'RM', 'CAM',
  'LW', 'LF', 'ST', 'CF', 'RF', 'RW',
]

export function positionRank(position: string): number {
  const idx = POSITION_ORDER.indexOf(positionInfo(position).code)
  return idx === -1 ? POSITION_ORDER.length : idx
}

// Generic sort used by every squad/roster list — parameterized on how to
// read a position code and an OVR (current ability) out of whatever row
// shape that particular list's API returns (`id` vs `playerId`,
// `currentAbility` vs `assessedAbility`, etc.), since every list already
// has its own DTO. Ties break on the other axis so the order stays stable
// and useful either way (e.g. sorting by OVR still groups same-rated
// players by position rather than leaving them in fetch order).
export function sortByMode<T>(
  items: T[],
  mode: SortMode,
  posOf: (item: T) => string,
  ovrOf: (item: T) => number,
): T[] {
  const sorted = [...items]
  if (mode === 'position') {
    sorted.sort((a, b) => positionRank(posOf(a)) - positionRank(posOf(b)) || ovrOf(b) - ovrOf(a))
  } else {
    sorted.sort((a, b) => ovrOf(b) - ovrOf(a) || positionRank(posOf(a)) - positionRank(posOf(b)))
  }
  return sorted
}
