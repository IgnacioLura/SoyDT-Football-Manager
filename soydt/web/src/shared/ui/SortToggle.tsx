// soydt/web/src/shared/ui/SortToggle.tsx
import type { SortMode } from '../sortPlayers'
import './SortToggle.css'

function SortToggle({ value, onChange }: { value: SortMode; onChange: (mode: SortMode) => void }) {
  return (
    <div className="sort-toggle" role="group" aria-label="Ordenar">
      <button
        type="button"
        className={`sort-toggle-btn${value === 'position' ? ' sort-toggle-btn-active' : ''}`}
        onClick={() => onChange('position')}
      >
        Posición
      </button>
      <button
        type="button"
        className={`sort-toggle-btn${value === 'ovr' ? ' sort-toggle-btn-active' : ''}`}
        onClick={() => onChange('ovr')}
      >
        OVR
      </button>
    </div>
  )
}

export default SortToggle
