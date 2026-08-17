// soydt/web/src/features/teams/TeamPage.tsx
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import AiReportButton from '../../shared/AiReportButton'
import Layout from '../../shared/Layout'
import PlayerCard from '../../shared/ui/PlayerCard'
import SectionPanel from '../../shared/ui/SectionPanel'
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
        <SectionPanel
          title="Squad"
          actions={
            <>
              <span className="tp-count">{team.players.length}</span>
              <AiReportButton title="AI scouting report" startUrl={`/api/teams/${teamId}/ai-report`} />
            </>
          }
        >
          <div className="tp-grid">
            {team.players.map((p) => (
              <PlayerCard
                key={p.id}
                id={p.id}
                name={p.name}
                position={p.position}
                age={p.age}
                currentAbility={p.currentAbility}
              />
            ))}
          </div>
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default TeamPage
