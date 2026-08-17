import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import DataTable from '../../shared/ui/DataTable'
import SectionPanel from '../../shared/ui/SectionPanel'

// Player "matches" sub-tab, mirrors the original app's player fixture list.
// Simplification: backed by `engine_get_player_matches`, which just returns
// the player's *current team's* domestic **league** schedule — it is NOT
// gated on the player having actually appeared in each match (no lineup/
// player_stats cross-reference), and does NOT merge in domestic-cup,
// continental, or international fixtures. See MIGRATION_CHECKLIST.md.

type PlayerMatchItem = {
  date: string
  opponentName: string
  isHome: boolean
  competitionName: string
  homeGoals: number | null
  awayGoals: number | null
}

function PlayerMatchesPage() {
  const { playerId } = useParams<{ playerId: string }>()
  const [items, setItems] = useState<PlayerMatchItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setItems(null)
    setError(null)
    callApi<PlayerMatchItem[]>(`/api/players/${playerId}/matches`)
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [playerId])

  if (error) {
    return (
      <Layout title="Matches">
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!items) {
    return (
      <Layout title="Matches">
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Matches">
      <div className="fm-page">
        <SectionPanel title="Matches">
          <DataTable
            rows={items}
            rowKey={(item, i) => `${item.date}-${item.opponentName}-${i}`}
            columns={[
              { key: 'date', header: 'Date', render: (item) => item.date },
              {
                key: 'venue',
                header: 'Venue',
                align: 'center',
                render: (item) => (
                  <span className={`fm-venue ${item.isHome ? 'venue-h' : 'venue-a'}`}>{item.isHome ? 'H' : 'A'}</span>
                ),
              },
              { key: 'opponent', header: 'Opponent', render: (item) => item.opponentName },
              { key: 'competition', header: 'Competition', render: (item) => item.competitionName },
              {
                key: 'result',
                header: 'Result',
                align: 'center',
                render: (item) =>
                  item.homeGoals !== null && item.awayGoals !== null ? (
                    <span className="fm-result">
                      {item.homeGoals} – {item.awayGoals}
                    </span>
                  ) : (
                    <span className="fm-pending">–</span>
                  ),
              },
            ]}
          />
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default PlayerMatchesPage
