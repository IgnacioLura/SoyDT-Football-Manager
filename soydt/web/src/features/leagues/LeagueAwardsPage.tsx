import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
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

function AwardRow({ label, award }: { label: string; award: NamedAward | null }) {
  return (
    <tr>
      <td>{label}</td>
      <td>
        {award ? (
          <>
            <Link to={`/players/${award.playerId}`}>{award.playerName}</Link> — {award.clubName}
          </>
        ) : (
          '—'
        )}
      </td>
    </tr>
  )
}

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
        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Season honours</h3>
          </div>
          {awards === null ? (
            <div className="fm-empty">No season has completed yet</div>
          ) : (
            <table className="fm-aw-season-table">
              <tbody>
                <AwardRow label="Player of the Season" award={awards.playerOfSeason} />
                <AwardRow label="Young Player of the Season" award={awards.youngPlayerOfSeason} />
                <AwardRow label="Top Scorer" award={awards.topScorer} />
                <AwardRow label="Top Assists" award={awards.topAssists} />
                <AwardRow label="Golden Glove" award={awards.goldenGlove} />
              </tbody>
            </table>
          )}
        </section>
      </div>
    </Layout>
  )
}

export default LeagueAwardsPage
