import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import SectionPanel from '../../shared/ui/SectionPanel'

// SIMPLIFIED port of open-football/src/web/src/player/awards — the
// original groups totals per-league (archive blocks) and charts the last
// 12 months as a bar chart. Here: flat lifetime counters only, across all
// leagues/seasons — no per-league grouping, no monthly chart. See
// MIGRATION_CHECKLIST.md.

type PlayerAwardsSummary = {
  playerOfTheWeek: number
  youngPlayerOfTheWeek: number
  teamOfTheWeek: number
  youngTeamOfTheWeek: number
  playerOfTheMonth: number
  youngPlayerOfTheMonth: number
  teamOfTheMonth: number
  youngTeamOfTheMonth: number
  teamOfTheSeason: number
  teamOfTheYear: number
  playerOfTheSeason: number
  youngPlayerOfTheSeason: number
  leagueTopScorer: number
  leagueTopAssists: number
  leagueGoldenGlove: number
  continentalPlayerOfYear: number
  worldPlayerOfYear: number
  domesticCupWinner: number
  total: number
}

const AWARD_LABELS: { key: keyof Omit<PlayerAwardsSummary, 'total'>; label: string }[] = [
  { key: 'playerOfTheWeek', label: 'Player of the Week' },
  { key: 'youngPlayerOfTheWeek', label: 'Young Player of the Week' },
  { key: 'teamOfTheWeek', label: 'Team of the Week' },
  { key: 'youngTeamOfTheWeek', label: 'Young Team of the Week' },
  { key: 'playerOfTheMonth', label: 'Player of the Month' },
  { key: 'youngPlayerOfTheMonth', label: 'Young Player of the Month' },
  { key: 'teamOfTheMonth', label: 'Team of the Month' },
  { key: 'youngTeamOfTheMonth', label: 'Young Team of the Month' },
  { key: 'teamOfTheSeason', label: 'Team of the Season' },
  { key: 'teamOfTheYear', label: 'Team of the Year' },
  { key: 'playerOfTheSeason', label: 'Player of the Season' },
  { key: 'youngPlayerOfTheSeason', label: 'Young Player of the Season' },
  { key: 'leagueTopScorer', label: 'League Top Scorer' },
  { key: 'leagueTopAssists', label: 'League Top Assists' },
  { key: 'leagueGoldenGlove', label: 'League Golden Glove' },
  { key: 'continentalPlayerOfYear', label: 'Continental Player of the Year' },
  { key: 'worldPlayerOfYear', label: 'World Player of the Year' },
  { key: 'domesticCupWinner', label: 'Domestic Cup Winner' },
]

function PlayerAwardsPage() {
  const { playerId } = useParams<{ playerId: string }>()
  const [awards, setAwards] = useState<PlayerAwardsSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setAwards(null)
    setError(null)
    callApi<PlayerAwardsSummary>(`/api/players/${playerId}/awards`)
      .then(setAwards)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [playerId])

  if (error) {
    return (
      <Layout title="Player Awards">
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!awards) {
    return (
      <Layout title="Player Awards">
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  const wonAwards = AWARD_LABELS.filter((a) => awards[a.key] > 0)

  return (
    <Layout title="Player Awards">
      <div className="fm-page">
        <SectionPanel title="Career Awards">
          <div style={{ padding: '14px', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', fontWeight: 700, lineHeight: 1 }}>{awards.total}</div>
            <div style={{ color: '#888', marginTop: '4px' }}>Total career awards</div>
          </div>
        </SectionPanel>

        <SectionPanel title="Breakdown" actions={<span className="fm-panel-count">{wonAwards.length}</span>}>
          {wonAwards.length === 0 ? (
            <div className="fm-empty">No awards</div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '12px',
                padding: '14px',
              }}
            >
              {wonAwards.map((a) => (
                <div
                  key={a.key}
                  style={{
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    padding: '10px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span>{a.label}</span>
                  <strong>{awards[a.key]}</strong>
                </div>
              ))}
            </div>
          )}
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default PlayerAwardsPage
