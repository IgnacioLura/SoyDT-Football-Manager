import { useEffect, useState, type CSSProperties } from 'react'
import { useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import SectionPanel from '../../shared/ui/SectionPanel'
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
  const [elapsedSec, setElapsedSec] = useState(0)

  const ids = matchId ? parseTeamIds(matchId) : null

  useEffect(() => {
    if (!ids) {
      setError(`could not parse team ids from match id "${matchId}"`)
      return
    }
    const [homeTeamId, awayTeamId] = ids
    setMatch(null)
    setError(null)
    setElapsedSec(0)
    // The simulation itself can take several seconds (full 90-minute match
    // + position-data serialization) — this ticker is the only signal the
    // request hasn't silently died, since a single fetch has no progress
    // events to report (unlike ProcessHub's day-by-day pushes).
    const ticker = setInterval(() => setElapsedSec((s) => s + 1), 1000)
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
      .finally(() => clearInterval(ticker))

    return () => clearInterval(ticker)
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
          <section className="fm-panel">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem 1rem' }}>
              <div className="spinner" />
              <p>Simulating match… ({elapsedSec}s)</p>
              <p style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                Running the full 90 minutes plus position data — usually takes a few seconds.
              </p>
            </div>
          </section>
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
        <SectionPanel
          title={`${homeTeam?.name ?? `Team ${ids?.[0]}`} ${match.homeGoals} – ${match.awayGoals} ${awayTeam?.name ?? `Team ${ids?.[1]}`}`}
          actions={<span className="fm-panel-count">{match.homePossessionPercentage.toFixed(0)}% possession (home)</span>}
        >
          <p style={{ fontSize: '0.85rem', opacity: 0.8 }}>
            Re-simulated from both squads' current rosters — not a replay of a specific historical result.
          </p>
        </SectionPanel>

        {match.positionData && (
          <MatchReplayCanvas
            positionData={match.positionData}
            homePlayerIds={match.homePlayerIds}
            awayPlayerIds={match.awayPlayerIds}
          />
        )}

        <SectionPanel title="Timeline">
          {events.length === 0 ? (
            <p>No notable events.</p>
          ) : (
            <ul>
              {events.map((e, i) => (
                <li className="anim-fade-in-up" style={{ '--i': i } as CSSProperties} key={i}>
                  {e.minute}' — {e.text} ({e.isHome ? 'H' : 'A'})
                </li>
              ))}
            </ul>
          )}
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default MatchDetailPage
