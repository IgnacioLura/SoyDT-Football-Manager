// soydt/web/src/features/teams/TeamPage.tsx
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import AiReportButton from '../../shared/AiReportButton'
import Layout from '../../shared/Layout'
import type { SortMode } from '../../shared/sortPlayers'
import { sortByMode } from '../../shared/sortPlayers'
import PlayerCard from '../../shared/ui/PlayerCard'
import SectionPanel from '../../shared/ui/SectionPanel'
import SortToggle from '../../shared/ui/SortToggle'
import './TeamPage.css'

// Phase 1: team overview/squad page, mirrors the original app's
// `/{lang}/teams/{slug}` route (overview tab only so far — tactics/staff/
// transfers/etc. are separate tabs there, not yet ported).
//
// Fase A (2026-08-16 EA FC redesign spec): squad renders as a PlayerCard
// grid instead of a table — same underlying `players` data, no API change.

type TeamPlayer = { id: number; name: string; position: string; age: number; currentAbility: number }
type TeamDetail = {
  id: number
  name: string
  slug: string
  clubId: number
  countryId: number
  leagueId: number | null
  leagueName: string | null
  reputation: number
  players: TeamPlayer[]
}

type TeamSquadNeeds = {
  mainTeamSize: number
  totalMissing: number
  urgent: boolean
  gkCount: number
  gkMissing: number
  defCount: number
  defMissing: number
  midCount: number
  midMissing: number
  fwdCount: number
  fwdMissing: number
}

function TeamPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const [team, setTeam] = useState<TeamDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('position')

  useEffect(() => {
    setTeam(null)
    setError(null)
    callApi<TeamDetail>(`/api/teams/${teamId}`)
      .then(setTeam)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [teamId])

  const [squadNeeds, setSquadNeeds] = useState<TeamSquadNeeds | null>(null)

  useEffect(() => {
    setSquadNeeds(null)
    callApi<TeamSquadNeeds>(`/api/teams/${teamId}/squad-needs`).then(setSquadNeeds).catch(() => setSquadNeeds(null))
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
        <SectionPanel
          title="Squad"
          actions={
            <>
              <SortToggle value={sortMode} onChange={setSortMode} />
              <span className="tp-count">{team.players.length}</span>
              <AiReportButton title="AI scouting report" startUrl={`/api/teams/${teamId}/ai-report`} />
            </>
          }
        >
          <div className="tp-grid">
            {sortByMode(team.players, sortMode, (p) => p.position, (p) => p.currentAbility).map((p, i) => (
              <PlayerCard
                key={p.id}
                id={p.id}
                name={p.name}
                position={p.position}
                age={p.age}
                currentAbility={p.currentAbility}
                index={i}
              />
            ))}
          </div>
        </SectionPanel>

        {squadNeeds && (
          <SectionPanel title="Squad Needs">
            <div className="fm-personal-detail">
              {squadNeeds.urgent && (
                <div className="fm-detail-row">
                  <span className="fm-detail-label">Status</span>
                  <span className="fm-detail-value" style={{ color: 'crimson' }}>
                    Urgent — squad below minimum
                  </span>
                </div>
              )}
              <div className="fm-detail-row">
                <span className="fm-detail-label">Goalkeepers</span>
                <span className="fm-detail-value" style={squadNeeds.gkMissing > 0 ? { color: 'crimson' } : undefined}>
                  {squadNeeds.gkCount}
                  {squadNeeds.gkMissing > 0 ? ` (${squadNeeds.gkMissing} short)` : ''}
                </span>
              </div>
              <div className="fm-detail-row">
                <span className="fm-detail-label">Defenders</span>
                <span className="fm-detail-value" style={squadNeeds.defMissing > 0 ? { color: 'crimson' } : undefined}>
                  {squadNeeds.defCount}
                  {squadNeeds.defMissing > 0 ? ` (${squadNeeds.defMissing} short)` : ''}
                </span>
              </div>
              <div className="fm-detail-row">
                <span className="fm-detail-label">Midfielders</span>
                <span className="fm-detail-value" style={squadNeeds.midMissing > 0 ? { color: 'crimson' } : undefined}>
                  {squadNeeds.midCount}
                  {squadNeeds.midMissing > 0 ? ` (${squadNeeds.midMissing} short)` : ''}
                </span>
              </div>
              <div className="fm-detail-row">
                <span className="fm-detail-label">Forwards</span>
                <span className="fm-detail-value" style={squadNeeds.fwdMissing > 0 ? { color: 'crimson' } : undefined}>
                  {squadNeeds.fwdCount}
                  {squadNeeds.fwdMissing > 0 ? ` (${squadNeeds.fwdMissing} short)` : ''}
                </span>
              </div>
              <div className="fm-detail-row">
                <span className="fm-detail-label">Total missing</span>
                <span
                  className="fm-detail-value"
                  style={squadNeeds.totalMissing > 0 ? { color: 'crimson' } : undefined}
                >
                  {squadNeeds.totalMissing}
                </span>
              </div>
            </div>
          </SectionPanel>
        )}
      </div>
    </Layout>
  )
}

export default TeamPage
