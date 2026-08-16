import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import { useTeamCountryId } from '../../shared/useTeamCountryId'

// Team season statistics page — mirrors the original app's team stats tab.
// One row per squad player; rows arrive from the engine pre-sorted by
// appearances (Played) descending.

type TeamPlayerStatsRow = {
  playerId: number
  name: string
  position: string
  played: number
  playedSubs: number
  goals: number
  assists: number
  yellowCards: number
  redCards: number
  shotsOnTarget: number
  passes: number
  tackling: number
  averageRating: string
}

function TeamStatsPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const sidebarCountryId = useTeamCountryId(teamId)
  const [rows, setRows] = useState<TeamPlayerStatsRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRows(null)
    setError(null)
    callApi<TeamPlayerStatsRow[]>(`/api/teams/${teamId}/stats`)
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [teamId])

  if (error) {
    return (
      <Layout title="Team Stats" sidebarCountryId={sidebarCountryId}>
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!rows) {
    return (
      <Layout title="Team Stats" sidebarCountryId={sidebarCountryId}>
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Team Stats" sidebarCountryId={sidebarCountryId}>
      <div className="fm-page">
        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Season Statistics</h3>
            <span className="fm-panel-count">{rows.length}</span>
          </div>
          <table className="fm-stats">
            <thead>
              <tr>
                <th>Pos</th>
                <th className="st-club">Player</th>
                <th className="st-pts">Apps</th>
                <th className="st-pts">Gls</th>
                <th className="st-pts">Ast</th>
                <th className="st-pts">YC</th>
                <th className="st-pts">RC</th>
                <th className="st-pts">SoT</th>
                <th className="st-pts">Passes</th>
                <th className="st-pts">Tck</th>
                <th className="st-pts">Av Rat</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.playerId}>
                  <td>{p.position}</td>
                  <td className="st-club">
                    <Link to={`/players/${p.playerId}`}>{p.name}</Link>
                  </td>
                  <td className="st-pts">
                    {p.played}
                    {p.playedSubs > 0 ? ` (${p.playedSubs})` : ''}
                  </td>
                  <td className="st-pts">{p.goals}</td>
                  <td className="st-pts">{p.assists}</td>
                  <td className="st-pts">{p.yellowCards}</td>
                  <td className="st-pts">{p.redCards}</td>
                  <td className="st-pts">{p.shotsOnTarget.toFixed(1)}</td>
                  <td className="st-pts">{p.passes}</td>
                  <td className="st-pts">{p.tackling.toFixed(1)}</td>
                  <td className="st-pts">{p.averageRating}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </Layout>
  )
}

export default TeamStatsPage
