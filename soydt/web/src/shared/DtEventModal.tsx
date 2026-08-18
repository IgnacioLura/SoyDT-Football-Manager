import { useState } from 'react'

// Shows whatever DT random events fired during the last `process`/
// `process/live` run — captured into sessionStorage by ProcessContext.tsx
// right before its post-success `window.location.reload()`, since every
// page (including this one, mounted once at the App root) re-fetches on
// mount anyway. One event at a time; "Continuar" advances the queue.

type DtEventLogEntry = {
  eventId: string
  name: string
  storyText: string
  success: boolean
  matchday: number
  scope: string
  playerId: number | null
  playerName: string | null
  ovrDelta: number
  moraleDelta: number
}

function readPending(): DtEventLogEntry[] {
  try {
    const raw = sessionStorage.getItem('dtPendingEvents')
    if (!raw) return []
    return JSON.parse(raw) as DtEventLogEntry[]
  } catch {
    return []
  }
}

function DtEventModal() {
  const [queue, setQueue] = useState<DtEventLogEntry[]>(readPending)

  if (queue.length === 0) return null

  const current = queue[0]

  const dismiss = () => {
    const rest = queue.slice(1)
    setQueue(rest)
    if (rest.length === 0) {
      sessionStorage.removeItem('dtPendingEvents')
    } else {
      sessionStorage.setItem('dtPendingEvents', JSON.stringify(rest))
    }
  }

  return (
    <div
      role="alertdialog"
      className="animate-in fade-in duration-fast"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(10, 16, 28, 0.72)',
        backdropFilter: 'blur(2px)',
      }}
    >
      <div
        key={current.eventId}
        className="animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-base"
        style={{
          width: 'min(420px, 90vw)',
          background: 'var(--card-bg, #1a2436)',
          color: '#fff',
          borderRadius: 10,
          padding: '1.5rem',
          textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ fontSize: '1.05rem', fontWeight: 700, color: current.success ? '#4ade80' : '#ef4444' }}>
          {current.name}
        </div>
        <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', opacity: 0.9 }}>{current.storyText}</p>
        {(current.ovrDelta !== 0 || current.moraleDelta !== 0) && (
          <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center', gap: '0.75rem', fontWeight: 700, fontSize: '0.9rem' }}>
            {current.ovrDelta !== 0 && (
              <span style={{ color: current.ovrDelta > 0 ? '#4ade80' : '#ef4444' }}>
                {current.ovrDelta > 0 ? '+' : ''}
                {current.ovrDelta} OVR
              </span>
            )}
            {current.moraleDelta !== 0 && (
              <span style={{ color: current.moraleDelta > 0 ? '#4ade80' : '#ef4444' }}>
                {current.moraleDelta > 0 ? '+' : ''}
                {current.moraleDelta} moral
              </span>
            )}
          </div>
        )}
        <button
          onClick={dismiss}
          style={{
            marginTop: '1rem',
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
      </div>
    </div>
  )
}

export default DtEventModal
