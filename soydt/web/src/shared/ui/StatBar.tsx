// soydt/web/src/shared/ui/StatBar.tsx
import { attributeColor } from '../attributeColor'
import './StatBar.css'

type StatBarProps = {
  label: string
  value: number
  max?: number
}

function StatBar({ label, value, max = 20 }: StatBarProps) {
  const rounded = Math.round(value)
  const color = attributeColor(rounded)
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="sb-row">
      <span className="sb-label">{label}</span>
      <div className="sb-track">
        <div className={`sb-fill sb-fill-${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="sb-value">{rounded}</span>
    </div>
  )
}

export default StatBar
