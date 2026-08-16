import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import AiReportButton from '../../shared/AiReportButton'
import Layout from '../../shared/Layout'

// Phase 1: team overview/squad page, mirrors the original app's
// `/{lang}/teams/{slug}` route (overview tab only so far — tactics/staff/
// transfers/etc. are separate tabs there, not yet ported).

type PlayerCard = { id: number; name: string; position: string; age: number; currentAbility: number }
type TeamDetail = {
  id: number
  name: string
  slug: string
  clubId: number
  countryId: number
  leagueId: number | null
  leagueName: string | null
  reputation: number
  players: PlayerCard[]
}

function TeamPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const [team, setTeam] = useState<TeamDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setTeam(null)
    setError(null)
    callApi<TeamDetail>(`/api/teams/${teamId}`)
      .then(setTeam)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [teamId])

  if (error) {
    return (
      <Layout title="Team">
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!team) {
    return (
      <Layout title="Team">
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  const subTitle = team.leagueId ? (
    <Link to={`/leagues/${team.leagueId}`}>{team.leagueName}</Link>
  ) : undefined

  return (
    <Layout title={team.name} subTitle={subTitle} sidebarCountryId={team.countryId}>
      <div className="fm-page">
        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Squad</h3>
            <span className="fm-panel-count">{team.players.length}</span>
            <AiReportButton title="AI scouting report" startUrl={`/api/teams/${teamId}/ai-report`} />
          </div>
          <table className="fm-standings">
            <thead>
              <tr>
                <th className="st-club">Name</th>
                <th>Pos</th>
                <th>Age</th>
                <th className="st-pts">OVR</th>
              </tr>
            </thead>
            <tbody>
              {team.players.map((p) => (
                <tr key={p.id}>
                  <td className="st-club">
                    <Link to={`/players/${p.id}`}>{p.name}</Link>
                  </td>
                  <td>{p.position}</td>
                  <td>{p.age}</td>
                  <td className="st-pts">{p.currentAbility}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </Layout>
  )
}

export default TeamPage
