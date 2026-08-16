import { useProcessContext } from './ProcessContext'

// Full-width banner shown across the whole header while a process/live run
// is in flight — replaces the small per-button spinner, which was easy to
// miss and (before ProcessContext existed) disappeared entirely on
// navigation since it lived in a component that remounts per page.

function ProcessBanner() {
  const { processing, daysProcessed, totalDays, percent } = useProcessContext()

  if (!processing) return null

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        padding: '0.4rem 1rem',
        background: 'var(--header-bg, #1a3668)',
        color: '#fff',
        fontSize: '0.85rem',
      }}
    >
      <div className="spinner" style={{ borderTopColor: '#fff', width: 16, height: 16 }} />
      <span>
        Processing day {daysProcessed} of {totalDays}… ({percent}%)
      </span>
      <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            width: `${percent}%`,
            height: '100%',
            background: '#fff',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  )
}

export default ProcessBanner
