// soydt/web/src/features/players/AttributeGrid.tsx
import StatBar from '../../shared/ui/StatBar'

export type AttributeEntry = { key: string; label: string; value: number }

function AttributeGrid({ title, entries }: { title: string; entries: AttributeEntry[] }) {
  return (
    <div className="fm-attr-group">
      <h4>{title}</h4>
      <div>
        {entries.map((entry) => (
          <StatBar key={entry.key} label={entry.label} value={entry.value} />
        ))}
      </div>
    </div>
  )
}

export default AttributeGrid
