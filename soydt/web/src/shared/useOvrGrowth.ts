// soydt/web/src/shared/useOvrGrowth.ts
import { useEffect, useRef, useState } from 'react'

// FIFA-career-mode-style OVR growth tracking: the engine has no "previous
// OVR" snapshot to diff against server-side, so this tracks it client-side —
// last-seen `currentAbility` per player id, global (not per-page), in
// localStorage. Whenever a consumer mounts (or `currentAbility` changes,
// e.g. after processing days) with a higher value than what was last stored
// for that id, it returns a one-time positive delta until the next change
// resets the baseline — same "since you last checked" semantics FIFA's
// squad hub uses. Drops are intentionally not surfaced (green-only, per
// product decision).
const OVR_SNAPSHOT_PREFIX = 'soydt:ovr-snapshot:'

export function useOvrGrowth(id: number, currentAbility: number): number {
  const [delta, setDelta] = useState(0)
  // Guards against StrictMode's dev-only double-invoke of this effect:
  // without it, the first run's own `localStorage.setItem` becomes the
  // second run's "previous" value, silently zeroing the delta before it's
  // ever seen.
  const comparedRef = useRef<{ id: number; currentAbility: number } | null>(null)
  useEffect(() => {
    if (comparedRef.current?.id === id && comparedRef.current?.currentAbility === currentAbility) return
    comparedRef.current = { id, currentAbility }
    const key = `${OVR_SNAPSHOT_PREFIX}${id}`
    const stored = localStorage.getItem(key)
    const prev = stored != null ? Number(stored) : null
    setDelta(prev != null && currentAbility > prev ? currentAbility - prev : 0)
    localStorage.setItem(key, String(currentAbility))
  }, [id, currentAbility])
  return delta
}
