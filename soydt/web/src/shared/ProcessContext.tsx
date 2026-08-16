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
          const connection = await ensureConnection()
          await new Promise<void>((resolve, reject) => {
            connection.on('ProgressUpdate', (progress: ProcessProgress) => {
              setDate(progress.date)
              setDaysProcessed(progress.daysProcessed)
              setTotalDays(progress.totalDays)
              if (progress.done) {
                connection.off('ProgressUpdate')
                resolve()
              }
            })
            callApi(`/api/game/process/live?days=${days}`, { method: 'POST' }).catch(reject)
          })
          // Every page fetches its own data on mount with no shared
          // cache/store to invalidate — a full reload is the simplest way
          // to get every panel back in sync with the new date.
          window.location.reload()
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
