import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import DataTable from '../../shared/ui/DataTable'
import SectionPanel from '../../shared/ui/SectionPanel'

// SIMPLIFIED port of open-football/src/web/src/player/history — the
// original renders an accordion of per-competition stat breakdowns backed
// by a live/historical merge projection. Here: a flat table of completed
// (League-kind) season_ledger rows only — no accordion, no in-progress
// current season, no transfer fee. See MIGRATION_CHECKLIST.md.

type PlayerHistoryRow = {
  season: string
  teamName: string
  played: number
  goals: number
  assists: number
  averageRating: number
}

function PlayerHistoryPage() {
  const { playerId } = useParams<{ playerId: string }>()
  const [rows, setRows] = useState<PlayerHistoryRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRows(null)
    setError(null)
    callApi<PlayerHistoryRow[]>(`/api/players/${playerId}/history`)
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [playerId])

  if (error) {
    return (
      <Layout title="Player History">
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!rows) {
    return (
      <Layout title="Player History">
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Player History">
      <div className="fm-page">
        <SectionPanel title="Season history" actions={<span className="fm-panel-count">{rows.length}</span>}>
          <DataTable
            rows={rows}
            rowKey={(_, i) => i}
            emptyMessage="No completed seasons"
            columns={[
              { key: 'season', header: 'Season', render: (r) => r.season },
              { key: 'team', header: 'Team', render: (r) => r.teamName },
              { key: 'played', header: 'Played', render: (r) => r.played },
              { key: 'goals', header: 'Goals', render: (r) => r.goals },
              { key: 'assists', header: 'Assists', render: (r) => r.assists },
              { key: 'rating', header: 'Avg Rating', render: (r) => r.averageRating.toFixed(2) },
            ]}
          />
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default PlayerHistoryPage
