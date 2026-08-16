import { attributeColor } from '../../shared/attributeColor'
import { ATTRIBUTE_ICONS } from '../../shared/attributeIcons'

export type AttributeEntry = { key: string; label: string; value: number }

function AttributeGrid({ title, entries }: { title: string; entries: AttributeEntry[] }) {
  return (
    <div className="fm-attr-group">
      <h4>{title}</h4>
      <div className="fm-attr-grid">
        {entries.map((entry) => {
          const Icon = ATTRIBUTE_ICONS[entry.key]
          const rounded = Math.round(entry.value)
          const color = attributeColor(rounded)
          return (
            <div key={entry.key} className={`fm-attr-tile fm-attr-${color}`}>
              <span className="fm-attr-icon">{Icon ? Icon() : null}</span>
              <span className="fm-attr-label">{entry.label}</span>
              <span className="fm-attr-value">{rounded}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AttributeGrid
