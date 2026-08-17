import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import { PositionBadge } from '../../shared/positions'
import type { SortMode } from '../../shared/sortPlayers'
import { sortByMode } from '../../shared/sortPlayers'
import DataTable from '../../shared/ui/DataTable'
import SectionPanel from '../../shared/ui/SectionPanel'
import SortToggle from '../../shared/ui/SortToggle'
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
  const [sortMode, setSortMode] = useState<SortMode>('position')

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
        <SectionPanel
          title="Active monitoring"
          accent="gold"
          actions={
            <>
              <SortToggle value={sortMode} onChange={setSortMode} />
              <span className="fm-panel-count">{monitoring.length}</span>
            </>
          }
        >
          <DataTable
            rows={sortByMode(monitoring, sortMode, (m) => m.position, (m) => m.assessedAbility)}
            rowKey={(m) => `${m.scoutId}-${m.playerId}`}
            emptyMessage="No players currently being scouted"
            columns={[
              {
                key: 'player',
                header: 'Player',
                className: 'sq-name',
                render: (m) => <Link to={`/players/${m.playerId}`}>{m.playerName}</Link>,
              },
              { key: 'position', header: 'Position', render: (m) => <PositionBadge position={m.position} /> },
              { key: 'age', header: 'Age', render: (m) => m.age },
              { key: 'club', header: 'Club', render: (m) => m.currentClubName || '—' },
              { key: 'scout', header: 'Scout', render: (m) => m.scoutName || '—' },
              { key: 'status', header: 'Status', render: (m) => m.status },
              { key: 'started', header: 'Started', render: (m) => m.startedOn },
              { key: 'lastObserved', header: 'Last observed', render: (m) => m.lastObserved },
              { key: 'watched', header: 'Watched', render: (m) => m.timesWatched },
              { key: 'ovr', header: 'OVR', render: (m) => m.assessedAbility },
              { key: 'pa', header: 'PA', render: (m) => m.assessedPotential },
              { key: 'confidence', header: 'Confidence', render: (m) => `${m.confidencePct}%` },
              { key: 'value', header: 'Value', render: (m) => m.estimatedValue.toLocaleString() },
            ]}
          />
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default TeamScoutingPage
