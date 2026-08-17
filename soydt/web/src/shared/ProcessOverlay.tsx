import { useProcessContext } from './ProcessContext'

// Non-blocking corner card shown for the whole `process/live` run — the
// daily AI event (see GameController.TriggerDailyAiEvent) now blocks the
// backend's day loop on an LLM call, so a run can take several seconds per
// day; a full-screen input-blocking modal for that whole stretch made the
// rest of the app unusable for no reason (nothing here needs the user's
// attention until there's an actual match day or a resolved event to show).
// Floats over the corner instead — everything else stays clickable — and
// still holds a match day for acknowledgement via `awaitingAck`/`acknowledge`
// same as before. Stays up a minimum stretch (see MIN_VISIBLE_MS in
// ProcessContext) so a 1-day click isn't just an invisible flash.

function ProcessOverlay() {
  const { processing, date, daysProcessed, totalDays, percent, logs, awaitingAck, acknowledge } = useProcessContext()

  if (!processing) return null

  const latest = logs[logs.length - 1]

  return (
    <div
      role="status"
      aria-busy="true"
      style={{
        position: 'fixed',
        bottom: '1.25rem',
        right: '1.25rem',
        zIndex: 2000,
      }}
    >
      <style>{`
        @keyframes fm-process-cartel-in {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        /* Triangle motif (see DESIGN_SYSTEM.md) — the loading indicator
           reads as the FC brand triangle instead of a generic circular
           spinner, per BUCK's "integral to the brand" framing. */
        @keyframes fm-process-tri-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <div
        className="bg-triangle-grid"
        style={{
          width: 'min(320px, 90vw)',
          backgroundColor: 'var(--card-bg, #1a2436)',
          color: '#fff',
          borderRadius: 10,
          padding: '1rem 1.25rem',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
          textAlign: 'center',
          pointerEvents: 'auto',
        }}
      >
        <div
          style={{
            margin: '0 auto 0.75rem',
            width: 22,
            height: 22,
            clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
            background: '#fff',
            animation: 'fm-process-tri-spin 0.9s linear infinite',
          }}
        />

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
