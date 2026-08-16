import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import { useTeamCountryId } from '../../shared/useTeamCountryId'

// Team tactics page — deliberately simplified vs. the original app's
// tactics tab: a text/table view only. No pitch graphic and no last-match/
// "recently used shapes" history strip — see
// engine-ffi/src/team_tactics.rs's doc comment and MIGRATION_CHECKLIST.md.

type TacticsPlayer = {
  playerId: number
  name: string
  position: string
  currentAbility: number
}

type TeamTactics = {
  formationName: string
  formationDescription: string
  tacticalStyle: string
  formationStrength: number
  pressingIntensity: number
  defensiveLineHeight: number
  compactness: number
  isAttacking: boolean
  isDefensive: boolean
  players: TacticsPlayer[]
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`
}

function TeamTacticsPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const sidebarCountryId = useTeamCountryId(teamId)
  const [tactics, setTactics] = useState<TeamTactics | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setTactics(null)
    setError(null)
    callApi<TeamTactics>(`/api/teams/${teamId}/tactics`)
      .then(setTactics)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [teamId])

  if (error) {
    return (
      <Layout title="Tactics" sidebarCountryId={sidebarCountryId}>
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!tactics) {
    return (
      <Layout title="Tactics" sidebarCountryId={sidebarCountryId}>
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Tactics" sidebarCountryId={sidebarCountryId}>
      <div className="fm-page">
        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Formation</h3>
            <span className="fm-panel-action">{tactics.formationName}</span>
          </div>
          <div className="fm-personal-detail">
            <div className="fm-detail-row">
              <span className="fm-detail-label">Shape</span>
              <span className="fm-detail-value">{tactics.formationDescription}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Style</span>
              <span className="fm-detail-value">{tactics.tacticalStyle}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Formation fit</span>
              <span className="fm-detail-value">{percent(tactics.formationStrength)}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Pressing intensity</span>
              <span className="fm-detail-value">{percent(tactics.pressingIntensity)}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Defensive line</span>
              <span className="fm-detail-value">{percent(tactics.defensiveLineHeight)}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Compactness</span>
              <span className="fm-detail-value">{percent(tactics.compactness)}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Tendency</span>
              <span className="fm-detail-value">
                {tactics.isAttacking ? 'Attacking' : tactics.isDefensive ? 'Defensive' : 'Balanced'}
              </span>
            </div>
          </div>
        </section>

        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Starting XI</h3>
            <span className="fm-panel-count">{tactics.players.length}</span>
          </div>
          <table className="fm-standings">
            <thead>
              <tr>
                <th className="st-club">Name</th>
                <th>Pos</th>
                <th className="st-pts">OVR</th>
              </tr>
            </thead>
            <tbody>
              {tactics.players.map((p) => (
                <tr key={p.playerId}>
                  <td className="st-club">
                    <Link to={`/players/${p.playerId}`}>{p.name}</Link>
                  </td>
                  <td>{p.position}</td>
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

export default TeamTacticsPage
