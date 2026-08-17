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
export type ProcessDayLog = { day: number; date: string; matchesToday: number }
type DtEventLogEntry = {
  eventId: string
  name: string
  storyText: string
  success: boolean
  matchday: number
  scope: string
  playerId: number | null
  playerName: string | null
}

type ProcessState = {
  date: string | null
  processing: boolean
  daysProcessed: number
  totalDays: number
  percent: number
  logs: ProcessDayLog[]
  // True while the reveal loop is holding on a match day, waiting for the
  // user to dismiss it — see `acknowledge`.
  awaitingAck: boolean
  acknowledge: () => void
  process: (days: number) => void
}

// Overlay stays up at least this long even if the backend finishes
// instantly, so single-day "Process" clicks don't just flash and vanish —
// there's always time to read what happened that day.
const MIN_VISIBLE_MS = 5000

// A single clone up front (see GameSession.ProcessDaysWithProgress) made a
// 5-day run drop from ~70s to ~15s — great for the backend, bad for a
// progress overlay: every "ProgressUpdate" for every day can arrive within
// a couple hundred ms of each other, faster than a human can read any of
// them. So real per-day events are queued and revealed to the UI at this
// minimum pace instead of applied the instant they arrive — a day with no
// match still gets a moment on screen, and a match day holds indefinitely
// until the user acknowledges it (see `awaitingAck`/`acknowledge`).
const MIN_REVEAL_MS = 1200

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
  const [logs, setLogs] = useState<ProcessDayLog[]>([])
  const [awaitingAck, setAwaitingAck] = useState(false)
  const connectionRef = useRef<HubConnection | null>(null)
  const lastCumulativeMatchesRef = useRef(0)
  // React state updates aren't synchronous, so a `processing` state check
  // alone can't stop a second click fired before the re-render lands (seen
  // in practice: two overlapping process/live POSTs from one fast
  // double-click). A ref is set/read in the same tick, so it actually guards.
  const processingRef = useRef(false)
  // Queue of real per-day events not yet shown to the user, drained by
  // `drainQueue` below at a readable pace. A plain ref (not state) — items
  // arrive from a SignalR callback and get consumed by an async loop, no
  // rendering depends on the queue's contents directly.
  const queueRef = useRef<ProcessProgress[]>([])
  const ackResolverRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    callApi<GameSnapshot>('/api/game/snapshot')
      .then((s) => setDate(s.date))
      .catch(() => setDate(null))
  }, [])

  const acknowledge = useCallback(() => {
    ackResolverRef.current?.()
    ackResolverRef.current = null
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
      if (processingRef.current) return
      processingRef.current = true
      setProcessing(true)
      setDaysProcessed(0)
      setTotalDays(days)
      setLogs([])
      setAwaitingAck(false)
      lastCumulativeMatchesRef.current = 0
      queueRef.current = []
      ackResolverRef.current = null
      const startedAt = Date.now()
      let backendDone = false

      // Reveals queued per-day events one at a time: a plain day gets at
      // least MIN_REVEAL_MS on screen before the next one shows; a match
      // day holds until `acknowledge()` is called (the overlay's
      // "Continuar" button). Stops once it has revealed an event flagged
      // `done` — that's always the last one `ProcessDaysWithProgress` emits.
      const drainQueue = async () => {
        while (true) {
          const next = queueRef.current.shift()
          if (!next) {
            if (backendDone) return
            await sleep(150)
            continue
          }

          setDate(next.date)
          setDaysProcessed(next.daysProcessed)
          setTotalDays(next.totalDays)
          // matchesPlayed is cumulative across the whole run, so the
          // per-day count is the delta since the previous update.
          const matchesToday = next.matchesPlayed - lastCumulativeMatchesRef.current
          lastCumulativeMatchesRef.current = next.matchesPlayed
          setLogs((prev) => [...prev, { day: next.daysProcessed, date: next.date, matchesToday }])

          if (matchesToday > 0) {
            setAwaitingAck(true)
            await new Promise<void>((resolve) => {
              ackResolverRef.current = resolve
            })
            setAwaitingAck(false)
          } else {
            await sleep(MIN_REVEAL_MS)
          }

          if (next.done) return
        }
      }
      const revealDone = drainQueue()

      ;(async () => {
        let succeeded = false
        try {
          const before = await callApi<GameSnapshot>('/api/game/snapshot').catch(() => null)
          const eventsBefore = await callApi<{ log: DtEventLogEntry[] }>('/api/dt/events').catch(() => null)

          // `GameSession.ProcessDaysWithProgress` ticks one real day at a
          // time (a single clone up front, not per day), so every
          // "ProgressUpdate" here is a genuine day's result — just queued
          // rather than applied immediately (see drainQueue above). Best
          // effort only: completion is always confirmed independently by
          // polling the snapshot below, so a hub connection that fails (or
          // a WebSocket the dev proxy doesn't relay) can't leave the
          // overlay stuck on "Processing…" forever.
          ensureConnection()
            .then((connection) => {
              connection.on('ProgressUpdate', (progress: ProcessProgress) => {
                queueRef.current.push(progress)
              })
            })
            .catch((e) => console.error('ProcessHub connection failed (progress overlay only — processing continues regardless):', e))

          await callApi(`/api/game/process/live?days=${days}`, { method: 'POST' })

          // Poll until the world has actually moved. `process/live` returns
          // 202 immediately (the real work happens in the background), so
          // this is the only reliable "are we done" signal regardless of
          // whether any ProgressUpdate arrived.
          for (let attempt = 0; attempt < 600; attempt++) {
            await sleep(1000)
            const snap = await callApi<GameSnapshot>('/api/game/snapshot').catch(() => null)
            if (snap && (!before || snap.date !== before.date)) {
              break
            }
          }

          const eventsAfter = await callApi<{ log: DtEventLogEntry[] }>('/api/dt/events').catch(() => null)
          if (eventsBefore && eventsAfter) {
            const newCount = eventsAfter.log.length - eventsBefore.log.length
            if (newCount > 0) {
              sessionStorage.setItem('dtPendingEvents', JSON.stringify(eventsAfter.log.slice(0, newCount)))
            }
          }

          succeeded = true
        } catch (e) {
          console.error('process failed:', e)
        }

        backendDone = true
        // Let the reveal loop finish showing whatever's still queued
        // (including waiting on any pending match-day acknowledgement)
        // before closing the overlay.
        await revealDone
        setDaysProcessed(days)

        // Keep the blocking overlay up for a minimum stretch — regardless
        // of success or failure — so it's never just a flash, even when
        // the backend finishes (or errors out) instantly and nothing was
        // ever queued to reveal.
        const elapsed = Date.now() - startedAt
        if (elapsed < MIN_VISIBLE_MS) await sleep(MIN_VISIBLE_MS - elapsed)

        processingRef.current = false
        setProcessing(false)

        // Every page fetches its own data on mount with no shared
        // cache/store to invalidate — a full reload is the simplest way
        // to get every panel back in sync with the new date.
        if (succeeded) window.location.reload()
      })()
    },
    [processing, ensureConnection],
  )

  const percent = totalDays > 0 ? Math.round((daysProcessed / totalDays) * 100) : 0

  return (
    <ProcessContext.Provider
      value={{ date, processing, daysProcessed, totalDays, percent, logs, awaitingAck, acknowledge, process }}
    >
      {children}
    </ProcessContext.Provider>
  )
}
