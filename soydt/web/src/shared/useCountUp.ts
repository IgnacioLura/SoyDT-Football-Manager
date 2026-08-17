// soydt/web/src/shared/useCountUp.ts
import { useEffect, useRef, useState } from 'react'

// Kinetic-typography "Momentum" reveal (see DESIGN_SYSTEM.md's EA FC motion
// language): a value counts up from its previous displayed value to the new
// one over --transition-slow (400ms), eased with --ease-momentum's overshoot
// instead of just appearing — mirrors FUT's OVR/stat reveal animation.
// Respects prefers-reduced-motion by jumping straight to the target.
const DURATION_MS = 400

export function useCountUp(target: number): number {
  const [displayed, setDisplayed] = useState(target)
  const fromRef = useRef(target)

  useEffect(() => {
    const from = fromRef.current
    if (from === target) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      fromRef.current = target
      setDisplayed(target)
      return
    }
    let raf = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION_MS)
      // cubic ease-out-back approximation of --ease-momentum, since CSS
      // easing curves aren't queryable from JS.
      const eased = 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2
      setDisplayed(from + (target - from) * (t >= 1 ? 1 : eased))
      if (t < 1) raf = requestAnimationFrame(tick)
      else fromRef.current = target
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])

  return Math.round(displayed)
}
