import { useProcessContext } from './ProcessContext'

// Full-screen, input-blocking modal shown for the whole `process/live` run —
// replaces the old header banner, which was easy to miss entirely (thin
// strip, only visible if you happened to be looking at the header). Stays
// up a minimum stretch (see MIN_VISIBLE_MS in ProcessContext) so a 1-day
// click isn't just an invisible flash.

function ProcessOverlay() {
  const { processing, date, daysProcessed, totalDays, percent, logs, awaitingAck, acknowledge } = useProcessContext()

  if (!processing) return null

  const latest = logs[logs.length - 1]

  return (
    <div
      role="alertdialog"
      aria-busy="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(10, 16, 28, 0.72)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <style>{`
        @keyframes fm-process-cartel-in {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <div
        style={{
          width: 'min(420px, 90vw)',
          background: 'var(--card-bg, #1a2436)',
          color: '#fff',
          borderRadius: 10,
          padding: '1.5rem',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          textAlign: 'center',
        }}
      >
        <div className="spinner" style={{ margin: '0 auto 1rem', borderTopColor: '#fff', width: 28, height: 28 }} />

        <div style={{ fontSize: '1.05rem', fontWeight: 700 }}>
          Simulando día {date ?? '…'} ({daysProcessed}/{totalDays})
        </div>

        {latest && (
          <div
            key={latest.day}
            style={
              latest.matchesToday > 0
                ? {
                    marginTop: '0.75rem',
                    padding: '0.6rem 0.8rem',
                    borderRadius: 8,
                    background: 'rgba(232, 196, 106, 0.16)',
                    border: '1px solid rgba(232, 196, 106, 0.5)',
                    color: '#e8c46a',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    animation: 'fm-process-cartel-in 0.25s ease',
                  }
                : { marginTop: '0.5rem', fontSize: '0.9rem', opacity: 0.7 }
            }
          >
            {latest.matchesToday > 0
              ? `⚽ Hay fecha — ${latest.matchesToday} partido${latest.matchesToday === 1 ? '' : 's'} jugado${latest.matchesToday === 1 ? '' : 's'}`
              : 'Sin partidos ese día'}
          </div>
        )}

        {awaitingAck && (
          <button
            onClick={acknowledge}
            style={{
              marginTop: '0.75rem',
              padding: '0.5rem 1.25rem',
              borderRadius: 6,
              border: 'none',
              background: '#e8c46a',
              color: '#1a2436',
              fontWeight: 700,
              fontSize: '0.9rem',
              cursor: 'pointer',
            }}
          >
            Continuar ▶
          </button>
        )}

        <div
          style={{
            marginTop: '1rem',
            height: 6,
            background: 'rgba(255,255,255,0.15)',
            borderRadius: 3,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${percent}%`,
              height: '100%',
              background: '#fff',
              transition: 'width 0.3s ease',
            }}
          />
        </div>

        {logs.length > 0 && (
          <ul
            style={{
              marginTop: '1rem',
              maxHeight: 160,
              overflowY: 'auto',
              textAlign: 'left',
              fontSize: '0.8rem',
              opacity: 0.85,
              listStyle: 'none',
              padding: 0,
            }}
          >
            {logs
              .slice()
              .reverse()
              .map((log) => (
                <li key={log.day} style={{ padding: '0.15rem 0' }}>
                  Día {log.day} — {log.date}: {log.matchesToday > 0 ? `${log.matchesToday} partido${log.matchesToday === 1 ? '' : 's'}` : 'sin partidos'}
                </li>
              ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default ProcessOverlay
