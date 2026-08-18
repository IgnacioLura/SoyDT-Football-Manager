// soydt/web/src/shared/playerPhoto.ts
import type { SyntheticEvent } from 'react'

// Curated real photos are checked in under a per-team folder (see
// soydt/scripts/download-nacional-photos.sh for the original Nacional-only
// pass and soydt/scripts/download-team-photos.sh for the generalized,
// id-driven version run across every other team) rather than flat, so the
// source is easy to attribute. The
// frontend doesn't know a player's club at every call site (PlayerCard is
// used from squad pages, free agents, search, relations, etc.), so instead
// of threading a team slug through every caller, we just probe each known
// team folder client-side via the <img> onError chain, then fall back to the
// flat legacy path, then placeholder. Most players raise multiple 404s before
// landing on the placeholder — accepted cost for "drop a file, no code
// changes" simplicity. Every photo also tries .png (transparent cutout) before
// .jpg (plain headshot).
const PHOTO_TEAM_FOLDERS = [
  'nacional',
  'penarol',
  'liverpool-montevideo',
  'boston-river',
  'cerro',
  'cerro-largo',
  'danubio',
  'defensor-sporting',
  'juventud',
  'miramar-misiones',
  'montevideo-city-torque',
  'plaza-colonia',
  'progreso',
  'racing-montevideo',
  'river-plate-montevideo',
  'wanderers',
  'river-plate',
  'boca-juniors',
]

function playerPhotoCandidates(id: number): string[] {
  const dirs = [...PHOTO_TEAM_FOLDERS.map((t) => `/static/images/players/${t}`), '/static/images/players']
  return [...dirs.map((d) => `${d}/${id}.png`), ...dirs.map((d) => `${d}/${id}.jpg`)]
}

export function playerPhotoSrc(id: number): string {
  return playerPhotoCandidates(id)[0]
}

export function playerPhotoOnError(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget
  const match = img.src.match(/\/(\d+)\.(?:png|jpg)$/)
  if (match) {
    const candidates = playerPhotoCandidates(Number(match[1]))
    const currentPath = new URL(img.src).pathname
    const idx = candidates.indexOf(currentPath)
    if (idx !== -1 && idx < candidates.length - 1) {
      img.src = candidates[idx + 1]
      return
    }
  }
  img.onerror = null
  img.src = '/static/images/player/placeholder-face.svg'
}
