import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import TeamCrest from '../onboarding/TeamCrest'
import DataTable from '../../shared/ui/DataTable'
import SectionPanel from '../../shared/ui/SectionPanel'
import { useTeamCountryId } from '../../shared/useTeamCountryId'

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
  opponentSlug: string
  isHome: boolean
  competitionName: string
  matchId: string
  homeGoals: number | null
  awayGoals: number | null
}

function TeamSchedulePage() {
  const { teamId } = useParams<{ teamId: string }>()
  const sidebarCountryId = useTeamCountryId(teamId)
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
      <Layout title="Schedule" sidebarCountryId={sidebarCountryId}>
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!items) {
    return (
      <Layout title="Schedule" sidebarCountryId={sidebarCountryId}>
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Schedule" sidebarCountryId={sidebarCountryId}>
      <div className="fm-page">
        <SectionPanel title="Schedule">
          <DataTable
            rows={items}
            rowKey={(item) => item.matchId}
            columns={[
              { key: 'date', header: 'Date', className: 'sch-date', render: (item) => item.date },
              { key: 'time', header: 'Time', className: 'sch-time', render: (item) => item.time },
              {
                key: 'opposition',
                header: 'Opposition',
                className: 'sch-opponent',
                render: (item) => (
                  <Link to={`/teams/${item.opponentTeamId}`} className="st-club-link">
                    <TeamCrest slug={item.opponentSlug} name={item.opponentName} size={20} />
                    <span>{item.opponentName}</span>
                  </Link>
                ),
              },
              {
                key: 'venue',
                header: 'Venue',
                align: 'center',
                className: 'sch-venue',
                render: (item) => (
                  <span className={`fm-venue ${item.isHome ? 'venue-h' : 'venue-a'}`}>{item.isHome ? 'H' : 'A'}</span>
                ),
              },
              {
                key: 'result',
                header: 'Result',
                align: 'center',
                className: 'sch-result',
                render: (item) =>
                  item.homeGoals !== null && item.awayGoals !== null ? (
                    <Link to={`/match/${item.matchId}`} className="fm-result">
                      {item.homeGoals} – {item.awayGoals}
                    </Link>
                  ) : (
                    <span className="fm-pending">–</span>
                  ),
              },
              { key: 'competition', header: 'Competition', className: 'sch-comp', render: (item) => item.competitionName },
            ]}
          />
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default TeamSchedulePage
