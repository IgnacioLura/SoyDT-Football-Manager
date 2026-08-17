import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import SectionPanel from '../../shared/ui/SectionPanel'

// SIMPLIFIED port of open-football/src/web/src/player/events — the
// original renders every HappinessEvent variant (manager talks,
// dressing-room friction, match-performance reactions, national-team
// call-ups, contract talk, …) as a rich decision/severity-tagged card.
// Here: a flat chronological list of only the three most
// game-mechanically-significant categories — transfers, awards, and
// injury-recovery swings. No decision cards, no severity styling, no
// partner links. See MIGRATION_CHECKLIST.md.

type PlayerEventItem = {
  date: string
  kind: string
  description: string
}

const KIND_LABELS: Record<string, string> = {
  transfer: 'Transfer',
  award: 'Award',
  injury: 'Injury',
}

function PlayerEventsPage() {
  const { playerId } = useParams<{ playerId: string }>()
  const [events, setEvents] = useState<PlayerEventItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setEvents(null)
    setError(null)
    callApi<PlayerEventItem[]>(`/api/players/${playerId}/events`)
      .then(setEvents)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [playerId])

  if (error) {
    return (
      <Layout title="Events">
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!events) {
    return (
      <Layout title="Events">
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Events">
      <div className="fm-page">
        <SectionPanel
          title="Events"
          actions={events.length > 0 ? <span className="fm-panel-count">{events.length}</span> : undefined}
        >
          {events.length === 0 ? (
            <div className="fm-empty">No events on record</div>
          ) : (
            <table className="fm-squad fm-events-table">
              <thead>
                <tr>
                  <th className="sq-date">Date</th>
                  <th className="sq-kind">Type</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e, i) => (
                  <tr key={`${e.date}-${i}`}>
                    <td className="sq-date">{e.date}</td>
                    <td className="sq-kind">{KIND_LABELS[e.kind] ?? e.kind}</td>
                    <td>{e.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default PlayerEventsPage
