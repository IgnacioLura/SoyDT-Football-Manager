import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import { useTeamCountryId } from '../../shared/useTeamCountryId'

// Ported from open-football/src/web/src/teams/scouting/index.html — the
// `/{lang}/teams/{slug}/scouting` route. Heavily simplified: the original
// has six sub-tabs (overview summary / active monitoring / detailed
// reports / scouting & match assignments / recruitment meetings with
// votes+decisions / known-player database + transfer-request context),
// all backed by the club's full recruitment department model. This page
// collapses all of that to the one table that answers "who are our
// scouts watching right now" — the club's active scouting-monitoring
// rows with a rating snapshot. See engine-ffi/src/team_scouting.rs for
// the export this is fed from and MIGRATION_CHECKLIST.md for precedent.

type ScoutMonitoringItem = {
  playerId: number
  playerName: string
  position: string
  age: number
  currentClubName: string
  scoutId: number
  scoutName: string
  status: string
  startedOn: string
  lastObserved: string
  timesWatched: number
  assessedAbility: number
  assessedPotential: number
  confidencePct: number
  estimatedValue: number
}

function TeamScoutingPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const sidebarCountryId = useTeamCountryId(teamId)
  const [monitoring, setMonitoring] = useState<ScoutMonitoringItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMonitoring(null)
    setError(null)
    callApi<ScoutMonitoringItem[]>(`/api/teams/${teamId}/scouting`)
      .then(setMonitoring)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [teamId])

  if (error) {
    return (
      <Layout title="Scouting" sidebarCountryId={sidebarCountryId}>
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!monitoring) {
    return (
      <Layout title="Scouting" sidebarCountryId={sidebarCountryId}>
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Scouting" sidebarCountryId={sidebarCountryId}>
      <div className="fm-page">
        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Active monitoring</h3>
            <span className="fm-panel-count">{monitoring.length}</span>
          </div>
          {monitoring.length === 0 ? (
            <div className="fm-empty">No players currently being scouted</div>
          ) : (
            <table className="fm-squad">
              <thead>
                <tr>
                  <th className="sq-name">Player</th>
                  <th>Position</th>
                  <th>Age</th>
                  <th>Club</th>
                  <th>Scout</th>
                  <th>Status</th>
                  <th>Started</th>
                  <th>Last observed</th>
                  <th>Watched</th>
                  <th>OVR</th>
                  <th>PA</th>
                  <th>Confidence</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {monitoring.map((m) => (
                  <tr key={`${m.scoutId}-${m.playerId}`}>
                    <td className="sq-name">
                      <Link to={`/players/${m.playerId}`}>{m.playerName}</Link>
                    </td>
                    <td>{m.position}</td>
                    <td>{m.age}</td>
                    <td>{m.currentClubName || '—'}</td>
                    <td>{m.scoutName || '—'}</td>
                    <td>{m.status}</td>
                    <td>{m.startedOn}</td>
                    <td>{m.lastObserved}</td>
                    <td>{m.timesWatched}</td>
                    <td>{m.assessedAbility}</td>
                    <td>{m.assessedPotential}</td>
                    <td>{m.confidencePct}%</td>
                    <td>{m.estimatedValue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </Layout>
  )
}

export default TeamScoutingPage
