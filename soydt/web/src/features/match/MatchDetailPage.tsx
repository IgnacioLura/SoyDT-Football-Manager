import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import MatchReplayCanvas from './MatchReplayCanvas'

// Mirrors the original app's `match/get/index.html` (scoreboard + replay),
// but on-demand rather than a persisted recording — see the Fase 2
// architecture note in MIGRATION_CHECKLIST.md. `matchId` follows the same
// `{date}_{homeTeamId}_{awayTeamId}` convention already used as the link
// target from `TeamSchedulePage`/`LeagueSchedulePage` (team ids are always
// numeric, so splitting on `_` and taking the last two segments is safe).

type MatchGoal = { playerId: number; isHome: boolean; minute: number; isAutoGoal: boolean }
type MatchCard = { playerId: number; isHome: boolean; cardType: string }
type MatchSubstitution = { playerOutId: number; playerInId: number; isHome: boolean; minute: number }
type MatchDetail = {
  homeGoals: number
  awayGoals: number
  homePossessionPercentage: number
  goals: MatchGoal[]
  injuries: { playerId: number; isHome: boolean; minute: number }[]
  cards: MatchCard[]
  substitutions: MatchSubstitution[]
  homePlayerIds: number[]
  awayPlayerIds: number[]
  positionData: { ball: number[][]; players: Record<string, number[][]> } | null
}
type TeamDetail = { id: number; name: string }

function parseTeamIds(matchId: string): [string, string] | null {
  const parts = matchId.split('_')
  if (parts.length < 3) return null
  return [parts[parts.length - 2], parts[parts.length - 1]]
}

function MatchDetailPage() {
  const { matchId } = useParams<{ matchId: string }>()
  const [match, setMatch] = useState<MatchDetail | null>(null)
  const [homeTeam, setHomeTeam] = useState<TeamDetail | null>(null)
  const [awayTeam, setAwayTeam] = useState<TeamDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  const ids = matchId ? parseTeamIds(matchId) : null

  useEffect(() => {
    if (!ids) {
      setError(`could not parse team ids from match id "${matchId}"`)
      return
    }
    const [homeTeamId, awayTeamId] = ids
    setMatch(null)
    setError(null)
    Promise.all([
      callApi<MatchDetail>(`/api/match/${homeTeamId}/${awayTeamId}`),
      callApi<TeamDetail>(`/api/teams/${homeTeamId}`),
      callApi<TeamDetail>(`/api/teams/${awayTeamId}`),
    ])
      .then(([m, home, away]) => {
        setMatch(m)
        setHomeTeam(home)
        setAwayTeam(away)
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId])

  if (error) {
    return (
      <Layout title="Match">
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!match) {
    return (
      <Layout title="Match">
        <div className="fm-page">
          <p>Simulating match…</p>
        </div>
      </Layout>
    )
  }

  const events = [
    ...match.goals.map((g) => ({ minute: g.minute, text: `${g.isAutoGoal ? 'Own goal' : 'Goal'} — player ${g.playerId}`, isHome: g.isHome })),
    ...match.cards.map((c) => ({ minute: 0, text: `${c.cardType} card — player ${c.playerId}`, isHome: c.isHome })),
    ...match.substitutions.map((s) => ({
      minute: s.minute,
      text: `Substitution — player ${s.playerOutId} off, player ${s.playerInId} on`,
      isHome: s.isHome,
    })),
  ].sort((a, b) => a.minute - b.minute)

  return (
    <Layout title="Match">
      <div className="fm-page">
        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>
              {homeTeam?.name ?? `Team ${ids?.[0]}`} {match.homeGoals} – {match.awayGoals} {awayTeam?.name ?? `Team ${ids?.[1]}`}
            </h3>
            <span className="fm-panel-count">{match.homePossessionPercentage.toFixed(0)}% possession (home)</span>
          </div>
          <p style={{ fontSize: '0.85rem', opacity: 0.8 }}>
            Re-simulated from both squads' current rosters — not a replay of a specific historical result.
          </p>
        </section>

        {match.positionData && (
          <MatchReplayCanvas
            positionData={match.positionData}
            homePlayerIds={match.homePlayerIds}
            awayPlayerIds={match.awayPlayerIds}
          />
        )}

        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Timeline</h3>
          </div>
          {events.length === 0 ? (
            <p>No notable events.</p>
          ) : (
            <ul>
              {events.map((e, i) => (
                <li key={i}>
                  {e.minute}' — {e.text} ({e.isHome ? 'H' : 'A'})
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Layout>
  )
}

export default MatchDetailPage
