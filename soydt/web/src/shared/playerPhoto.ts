// soydt/web/src/shared/playerPhoto.ts
import type { SyntheticEvent } from 'react'

// Most player photos are plain .jpg headshots, but a growing subset (started
// with Nacional's official squad photos, sourced with the background already
// removed) are transparent .png cutouts — those look far better in the FIFA-
// style cards since there's no flat studio backdrop to mask/fade away. Every
// photo <img> tries .png first and falls back to .jpg, then the placeholder,
// so dropping in a cutout for a player is just adding the file — no per-player
// code changes needed.
export function playerPhotoSrc(id: number): string {
  return `/static/images/players/${id}.png`
}

export function playerPhotoOnError(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget
  if (img.src.endsWith('.png')) {
    img.src = img.src.replace(/\.png$/, '.jpg')
    return
  }
  img.onerror = null
  img.src = '/static/images/player/placeholder-face.svg'
}
