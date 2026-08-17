import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import { PositionBadge } from '../../shared/positions'
import DataTable from '../../shared/ui/DataTable'
import SectionPanel from '../../shared/ui/SectionPanel'
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
        <SectionPanel
          title="Season Statistics"
          actions={<span className="fm-panel-count">{rows.length}</span>}
        >
          <DataTable
            rows={rows}
            rowKey={(p) => p.playerId}
            columns={[
              { key: 'pos', header: 'Pos', render: (p) => <PositionBadge position={p.position} /> },
              {
                key: 'player',
                header: 'Player',
                className: 'st-club',
                render: (p) => <Link to={`/players/${p.playerId}`}>{p.name}</Link>,
              },
              {
                key: 'apps',
                header: 'Apps',
                className: 'st-pts',
                render: (p) => (
                  <>
                    {p.played}
                    {p.playedSubs > 0 ? ` (${p.playedSubs})` : ''}
                  </>
                ),
              },
              { key: 'gls', header: 'Gls', className: 'st-pts', render: (p) => p.goals },
              { key: 'ast', header: 'Ast', className: 'st-pts', render: (p) => p.assists },
              { key: 'yc', header: 'YC', className: 'st-pts', render: (p) => p.yellowCards },
              { key: 'rc', header: 'RC', className: 'st-pts', render: (p) => p.redCards },
              { key: 'sot', header: 'SoT', className: 'st-pts', render: (p) => p.shotsOnTarget.toFixed(1) },
              { key: 'passes', header: 'Passes', className: 'st-pts', render: (p) => p.passes },
              { key: 'tck', header: 'Tck', className: 'st-pts', render: (p) => p.tackling.toFixed(1) },
              { key: 'avRat', header: 'Av Rat', className: 'st-pts', render: (p) => p.averageRating },
            ]}
          />
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default TeamStatsPage
