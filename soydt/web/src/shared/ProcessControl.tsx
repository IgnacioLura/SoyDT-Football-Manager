import { useEffect, useRef, useState } from 'react'
import { HubConnectionBuilder, HubConnectionState, type HubConnection } from '@microsoft/signalr'
import { callApi } from './api'

// Ported from the original app's shared layout `#process-btn` (advance one
// day) — same button lives in every page's header there
// (`web/src/layout.html`), not on a single feature page. Uses the Fase 2
// `ProcessHub` for live progress instead of the original's blocking POST +
// full-page refresh; on completion this just reloads the page so every
// panel re-fetches with the new date (same net effect as the original's
// `refreshContent()`).

type GameSnapshot = { date: string }
type ProcessProgress = { date: string; daysProcessed: number; totalDays: number; matchesPlayed: number; done: boolean }

function ProcessControl() {
  const [date, setDate] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const connectionRef = useRef<HubConnection | null>(null)

  useEffect(() => {
    callApi<GameSnapshot>('/api/game/snapshot')
      .then((s) => setDate(s.date))
      .catch(() => setDate(null))
  }, [])

  const ensureConnection = async (): Promise<HubConnection> => {
    if (connectionRef.current && connectionRef.current.state === HubConnectionState.Connected) {
      return connectionRef.current
    }
    const connection = new HubConnectionBuilder().withUrl('/api/hubs/process').withAutomaticReconnect().build()
    await connection.start()
    connectionRef.current = connection
    return connection
  }

  const process = async (days: number) => {
    if (processing) return
    setProcessing(true)
    try {
      const connection = await ensureConnection()
      await new Promise<void>((resolve, reject) => {
        connection.on('ProgressUpdate', (progress: ProcessProgress) => {
          setDate(progress.date)
          if (progress.done) {
            connection.off('ProgressUpdate')
            resolve()
          }
        })
        callApi(`/api/game/process/live?days=${days}`, { method: 'POST' }).catch(reject)
      })
      // Every page fetches its own data on mount with no shared cache/store
      // to invalidate — a full reload is the simplest way to get every
      // panel back in sync with the new date, same net effect as the
      // original's `refreshContent()` AJAX partial-reload.
      window.location.reload()
    } finally {
      setProcessing(false)
    }
  }

  return (
    <>
      {date && (
        <div className="fm-date">
          <div className="fm-date-main">{date}</div>
        </div>
      )}
      <button
        className={`fm-process-btn${processing ? ' fm-processing' : ''}`}
        onClick={() => process(1)}
        disabled={processing}
        title="Advance one day"
      >
        <span className="fm-process-label">{processing ? 'Processing…' : 'Process'}</span>
        {processing && (
          <div className="spinner-wrapper">
            <div className="spinner" />
          </div>
        )}
      </button>
    </>
  )
}

export default ProcessControl
