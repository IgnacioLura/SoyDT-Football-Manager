import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import { useTeamCountryId } from '../../shared/useTeamCountryId'

// Ported from open-football/src/web/src/teams/academy/index.html — the
// `/{lang}/teams/{slug}/academy` route. Deliberately simplified: no
// pathway readiness bar/threshold, no low-condition/jaded/injury-prone
// risk tags, no nationality flag column, and current/potential ability
// are shown as raw numbers rather than star ratings — see
// engine-ffi/src/team_academy.rs's doc comment and MIGRATION_CHECKLIST.md.

type AcademyPlayer = {
  playerId: number
  name: string
  position: string
  phase: string
  age: number
  currentAbility: number
  potentialAbility: number
}

type TeamAcademy = {
  level: number
  tier: number
  pathwayReputation: number
  developmentIdentity: string
  graduatesProduced: number
  foundationCount: number
  developmentCount: number
  professionalCount: number
  players: AcademyPlayer[]
}

function TeamAcademyPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const sidebarCountryId = useTeamCountryId(teamId)
  const [academy, setAcademy] = useState<TeamAcademy | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setAcademy(null)
    setError(null)
    callApi<TeamAcademy>(`/api/teams/${teamId}/academy`)
      .then(setAcademy)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [teamId])

  if (error) {
    return (
      <Layout title="Academy" sidebarCountryId={sidebarCountryId}>
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!academy) {
    return (
      <Layout title="Academy" sidebarCountryId={sidebarCountryId}>
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Academy" sidebarCountryId={sidebarCountryId}>
      <div className="fm-page">
        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Overview</h3>
          </div>
          <div className="fm-personal-detail">
            <div className="fm-detail-row">
              <span className="fm-detail-label">Academy level</span>
              <span className="fm-detail-value">{academy.level}/20</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Academy tier</span>
              <span className="fm-detail-value">{academy.tier}/10</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Pathway reputation</span>
              <span className="fm-detail-value">{academy.pathwayReputation}/100</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Development identity</span>
              <span className="fm-detail-value">{academy.developmentIdentity}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Graduates produced</span>
              <span className="fm-detail-value">{academy.graduatesProduced}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Foundation / Development / Professional</span>
              <span className="fm-detail-value">
                {academy.foundationCount} / {academy.developmentCount} / {academy.professionalCount}
              </span>
            </div>
          </div>
        </section>

        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Academy players</h3>
            <span className="fm-panel-count">{academy.players.length}</span>
          </div>
          {academy.players.length === 0 ? (
            <div className="fm-empty">No academy players</div>
          ) : (
            <table className="fm-squad">
              <thead>
                <tr>
                  <th className="sq-name">Name</th>
                  <th>Pos</th>
                  <th>Phase</th>
                  <th>Age</th>
                  <th>OVR</th>
                  <th>PA</th>
                </tr>
              </thead>
              <tbody>
                {academy.players.map((p) => (
                  <tr key={p.playerId}>
                    <td className="sq-name">
                      <Link to={`/players/${p.playerId}`}>{p.name}</Link>
                    </td>
                    <td>{p.position}</td>
                    <td>{p.phase}</td>
                    <td>{p.age}</td>
                    <td>{p.currentAbility}</td>
                    <td>{p.potentialAbility}</td>
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

export default TeamAcademyPage
