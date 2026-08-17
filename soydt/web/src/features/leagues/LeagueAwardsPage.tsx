import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import DataTable from '../../shared/ui/DataTable'
import SectionPanel from '../../shared/ui/SectionPanel'
import { leagueTabs } from './tabs'

// Ported from open-football/src/web/src/leagues/awards/index.html, scoped
// down to season honours only — the original's weekly/monthly TOTW pitch
// graphics and stat-leader grids are deferred (see MIGRATION_CHECKLIST.md).

type NamedAward = { playerId: number; playerName: string; clubName: string }
type SeasonAwards = {
  seasonEndDate: string
  playerOfSeason: NamedAward | null
  youngPlayerOfSeason: NamedAward | null
  topScorer: NamedAward | null
  topAssists: NamedAward | null
  goldenGlove: NamedAward | null
}

type AwardEntry = { label: string; award: NamedAward | null }

function LeagueAwardsPage() {
  const { leagueId } = useParams<{ leagueId: string }>()
  const [awards, setAwards] = useState<SeasonAwards | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setAwards(undefined)
    setError(null)
    callApi<SeasonAwards | null>(`/api/leagues/${leagueId}/awards`)
      .then(setAwards)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [leagueId])

  const tabs = leagueTabs(leagueId!, 'awards')

  if (error) {
    return (
      <Layout title="Awards" subTitle={tabs}>
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (awards === undefined) {
    return (
      <Layout title="Awards" subTitle={tabs}>
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Awards" subTitle={tabs}>
      <div className="fm-page">
        <SectionPanel title="Season honours">
          {awards === null ? (
            <div className="fm-empty">No season has completed yet</div>
          ) : (
            <DataTable<AwardEntry>
              rows={[
                { label: 'Player of the Season', award: awards.playerOfSeason },
                { label: 'Young Player of the Season', award: awards.youngPlayerOfSeason },
                { label: 'Top Scorer', award: awards.topScorer },
                { label: 'Top Assists', award: awards.topAssists },
                { label: 'Golden Glove', award: awards.goldenGlove },
              ]}
              rowKey={(r) => r.label}
              columns={[
                { key: 'label', header: '', render: (r) => r.label },
                {
                  key: 'award',
                  header: '',
                  render: (r) =>
                    r.award ? (
                      <>
                        <Link to={`/players/${r.award.playerId}`}>{r.award.playerName}</Link> — {r.award.clubName}
                      </>
                    ) : (
                      '—'
                    ),
                },
              ]}
            />
          )}
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default LeagueAwardsPage
