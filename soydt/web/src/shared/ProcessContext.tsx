import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { HubConnectionBuilder, HubConnectionState, type HubConnection } from '@microsoft/signalr'
import { callApi } from './api'

// Owns the ProcessHub connection + processing state ONCE for the whole app
// lifetime, instead of per-page — `Layout` (and therefore any component
// that used to hold this state locally) remounts on every route change, so
// a "still processing" banner living inside it would vanish the moment the
// user navigated mid-run even though the backend kept working. Mounted
// once in App.tsx, outside the router, so it survives navigation.

type GameSnapshot = { date: string }
type ProcessProgress = { date: string; daysProcessed: number; totalDays: number; matchesPlayed: number; done: boolean }

type ProcessState = {
  date: string | null
  processing: boolean
  daysProcessed: number
  totalDays: number
  percent: number
  process: (days: number) => void
}

const ProcessContext = createContext<ProcessState | null>(null)

export function useProcessContext(): ProcessState {
  const ctx = useContext(ProcessContext)
  if (!ctx) throw new Error('useProcessContext must be used inside <ProcessProvider>')
  return ctx
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function ProcessProvider({ children }: { children: ReactNode }) {
  const [date, setDate] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [daysProcessed, setDaysProcessed] = useState(0)
  const [totalDays, setTotalDays] = useState(0)
  const connectionRef = useRef<HubConnection | null>(null)

  useEffect(() => {
    callApi<GameSnapshot>('/api/game/snapshot')
      .then((s) => setDate(s.date))
      .catch(() => setDate(null))
  }, [])

  const ensureConnection = useCallback(async (): Promise<HubConnection> => {
    if (connectionRef.current && connectionRef.current.state === HubConnectionState.Connected) {
      return connectionRef.current
    }
    const connection = new HubConnectionBuilder().withUrl('/api/hubs/process').withAutomaticReconnect().build()
    connectionRef.current = connection
    await connection.start()
    return connection
  }, [])

  const process = useCallback(
    (days: number) => {
      if (processing) return
      setProcessing(true)
      setDaysProcessed(0)
      setTotalDays(days)
      ;(async () => {
        try {
          const before = await callApi<GameSnapshot>('/api/game/snapshot').catch(() => null)

          // ProcessHub gives live per-day progress for the banner, but it's
          // best-effort only — completion is always confirmed independently
          // by polling the snapshot below, so a hub connection that fails
          // (or a WebSocket the dev proxy doesn't relay) can't leave the
          // button stuck on "Processing…" forever with the date never
          // actually updating.
          ensureConnection()
            .then((connection) => {
              connection.on('ProgressUpdate', (progress: ProcessProgress) => {
                setDate(progress.date)
                setDaysProcessed(progress.daysProcessed)
                setTotalDays(progress.totalDays)
              })
            })
            .catch((e) => console.error('ProcessHub connection failed (progress bar only — processing continues regardless):', e))

          await callApi(`/api/game/process/live?days=${days}`, { method: 'POST' })

          // Poll until the world has actually moved. `process/live` returns
          // 202 immediately (the real work happens in the background), so
          // this is the only reliable "are we done" signal regardless of
          // whether any ProgressUpdate arrived.
          for (let attempt = 0; attempt < 600; attempt++) {
            await sleep(1000)
            const snap = await callApi<GameSnapshot>('/api/game/snapshot').catch(() => null)
            if (snap && (!before || snap.date !== before.date)) {
              setDate(snap.date)
              break
            }
          }

          // Every page fetches its own data on mount with no shared
          // cache/store to invalidate — a full reload is the simplest way
          // to get every panel back in sync with the new date.
          window.location.reload()
        } catch (e) {
          console.error('process failed:', e)
        } finally {
          setProcessing(false)
        }
      })()
    },
    [processing, ensureConnection],
  )

  const percent = totalDays > 0 ? Math.round((daysProcessed / totalDays) * 100) : 0

  return (
    <ProcessContext.Provider value={{ date, processing, daysProcessed, totalDays, percent, process }}>
      {children}
    </ProcessContext.Provider>
  )
}
