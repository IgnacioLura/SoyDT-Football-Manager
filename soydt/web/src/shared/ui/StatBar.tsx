// soydt/web/src/shared/ui/StatBar.tsx
import { useCountUp } from '../useCountUp'
import './StatBar.css'

type StatBarTone = 'normal' | 'inverse'

// Percentage-of-max bands, not absolute thresholds, so this scales to any
// `max` — equivalent to the old attributeColor(rounded) behavior at the
// default max=20 (its <=8/<=13 cutoffs are exactly 40%/65% of 20) for
// integer inputs; takes `rounded` rather than raw `value` so it stays
// exactly equivalent for fractional inputs too (e.g. value=8.4 rounds to
// 8, same red bucket as before, instead of reading as 42%/yellow).
// `tone="inverse"` flips which end reads as "good" (green) — needed for
// gauges where high = bad, e.g. board pressure (see
// docs/superpowers/specs/2026-08-17-club-board-design.md).
function barColor(pct: number, tone: StatBarTone): 'red' | 'yellow' | 'green' {
  const effective = tone === 'inverse' ? 100 - pct : pct
  if (effective <= 40) return 'red'
  if (effective <= 65) return 'yellow'
  return 'green'
}

type StatBarProps = {
  label: string
  value: number
  max?: number
  tone?: StatBarTone
}

function StatBar({ label, value, max = 20, tone = 'normal' }: StatBarProps) {
  const rounded = Math.round(value)
  const displayed = useCountUp(rounded)
  const pct = Math.max(0, Math.min(100, (rounded / max) * 100))
  const color = barColor(pct, tone)
  return (
    <div className="sb-row">
      <span className="sb-label">{label}</span>
      <div className="sb-track">
        <div className={`sb-fill sb-fill-${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="sb-value">{displayed}</span>
    </div>
  )
}

export default StatBar
