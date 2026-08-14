import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'

// Mirrors the original app's `teams/schedule/index.html` (extends
// `teams/team_layout.html`) — `/{lang}/teams/{slug}/schedule` route.
// Simplification: backed by `engine_get_team_schedule`, which only surfaces
// the team's domestic league fixtures (continental/cup fixtures are not
// merged in yet — see MIGRATION_CHECKLIST.md).

type TeamScheduleItem = {
  date: string
  time: string
  opponentTeamId: number
  opponentName: string
  isHome: boolean
  competitionName: string
  matchId: string
  homeGoals: number | null
  awayGoals: number | null
}

function TeamSchedulePage() {
  const { teamId } = useParams<{ teamId: string }>()
  const [items, setItems] = useState<TeamScheduleItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setItems(null)
    setError(null)
    callApi<TeamScheduleItem[]>(`/api/teams/${teamId}/schedule`)
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [teamId])

  if (error) {
    return (
      <Layout title="Schedule">
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!items) {
    return (
      <Layout title="Schedule">
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Schedule">
      <div className="fm-page">
        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Schedule</h3>
          </div>
          <table className="fm-schedule">
            <thead>
              <tr>
                <th className="sch-date">Date</th>
                <th className="sch-time">Time</th>
                <th>Opposition</th>
                <th className="sch-venue">Venue</th>
                <th className="sch-result">Result</th>
                <th>Competition</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.matchId}>
                  <td className="sch-date">{item.date}</td>
                  <td className="sch-time">{item.time}</td>
                  <td className="sch-opponent">
                    <Link to={`/teams/${item.opponentTeamId}`}>{item.opponentName}</Link>
                  </td>
                  <td className="sch-venue">
                    <span className={`fm-venue ${item.isHome ? 'venue-h' : 'venue-a'}`}>{item.isHome ? 'H' : 'A'}</span>
                  </td>
                  <td className="sch-result">
                    {item.homeGoals !== null && item.awayGoals !== null ? (
                      <Link to={`/match/${item.matchId}`} className="fm-result">
                        {item.homeGoals} – {item.awayGoals}
                      </Link>
                    ) : (
                      <span className="fm-pending">–</span>
                    )}
                  </td>
                  <td className="sch-comp">{item.competitionName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </Layout>
  )
}

export default TeamSchedulePage
