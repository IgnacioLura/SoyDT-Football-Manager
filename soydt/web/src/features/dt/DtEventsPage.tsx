import { useEffect, useState } from 'react'
import { callApi } from '../../shared/api'
import DtLayout from './DtLayout'
import { useMyTeamId } from './useMyTeamId'

// DT's random-events log — history of resolved events (investor/streak/
// staff catalog, see GameSession.DtEvents.cs) plus whatever OVR/morale
// buffs are still counting down. Read-only: events fire as a side effect
// of advancing days elsewhere (see ProcessContext.tsx), not from this page.

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

type DtActiveBuff = {
  scope: string
  playerId: number | null
  playerName: string | null
  ovrDelta: number
  moraleDelta: number
  matchesRemaining: number
}

type DtEventsResponse = { log: DtEventLogEntry[]; activeBuffs: DtActiveBuff[] }

function DtEventsPage() {
  const myTeamId = useMyTeamId()
  const [data, setData] = useState<DtEventsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (myTeamId == null) return
    callApi<DtEventsResponse>('/api/dt/events')
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [myTeamId])

  if (myTeamId === undefined || (myTeamId != null && !data && !error)) {
    return (
      <DtLayout title="Eventos">
        <div className="fm-page">
          <p>Cargando…</p>
        </div>
      </DtLayout>
    )
  }

  if (myTeamId == null) {
    return (
      <DtLayout title="Eventos">
        <div className="fm-page">
          <p>Todavía no elegiste tu club — andá a /new-game.</p>
        </div>
      </DtLayout>
    )
  }

  if (error || !data) {
    return (
      <DtLayout title="Eventos">
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </DtLayout>
    )
  }

  return (
    <DtLayout title="Eventos">
      <div className="fm-page">
        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Efectos activos</h3>
            <span className="fm-panel-count">{data.activeBuffs.length}</span>
          </div>
          {data.activeBuffs.length === 0 && <p style={{ padding: '0 1rem 1rem' }}>Ninguno por ahora.</p>}
          {data.activeBuffs.map((b, i) => (
            <div className="fm-detail-row" key={i}>
              <span className="fm-detail-label">{b.scope === 'Player' ? b.playerName : 'Todo el plantel'}</span>
              <span
                className="fm-detail-value"
                style={{ color: b.ovrDelta > 0 || (b.ovrDelta === 0 && b.moraleDelta >= 0) ? '#4ade80' : '#ef4444' }}
              >
                {b.ovrDelta >= 0 ? '+' : ''}
                {b.ovrDelta} OVR · {b.matchesRemaining} partido{b.matchesRemaining === 1 ? '' : 's'} restante
                {b.matchesRemaining === 1 ? '' : 's'}
              </span>
            </div>
          ))}
        </section>

        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Historial</h3>
            <span className="fm-panel-count">{data.log.length}</span>
          </div>
          {data.log.length === 0 && (
            <p style={{ padding: '0 1rem 1rem' }}>Todavía no pasó nada — a partir de la fecha 5 pueden aparecer eventos.</p>
          )}
          {data.log.map((e, i) => (
            <div className="fm-detail-row" key={i}>
              <span className="fm-detail-label">
                Fecha {e.matchday} — {e.name}
              </span>
              <span className="fm-detail-value" style={{ color: e.success ? '#4ade80' : '#ef4444' }}>
                {e.storyText}
              </span>
            </div>
          ))}
        </section>
      </div>
    </DtLayout>
  )
}

export default DtEventsPage
