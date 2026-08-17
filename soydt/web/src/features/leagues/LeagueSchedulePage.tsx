import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import SectionPanel from '../../shared/ui/SectionPanel'
import TeamCrest from '../onboarding/TeamCrest'
import { leagueTabs } from './tabs'

// Ported from open-football/src/web/src/leagues/get/index.html's
// "fixtures_results" panel (fm-fixtures) — the original embeds only the
// *current* matchday inline in the overview page; this route surfaces the
// full-season fixture list instead, grouped by date like the original's
// fm-matchday-hd sections. `/{lang}/leagues/{slug}/schedule` route.
// Simplification: backed by `engine_get_league_schedule`, which only
// surfaces the league's own domestic schedule (continental/cup fixtures
// are not merged in) — same simplification as teams/schedule.

type LeagueScheduleItem = {
  date: string
  time: string
  homeTeamId: number
  homeTeamName: string
  homeTeamSlug: string
  awayTeamId: number
  awayTeamName: string
  awayTeamSlug: string
  matchId: string
  homeGoals: number | null
  awayGoals: number | null
}

function groupByDate(items: LeagueScheduleItem[]): [string, LeagueScheduleItem[]][] {
  const groups = new Map<string, LeagueScheduleItem[]>()
  for (const item of items) {
    const bucket = groups.get(item.date)
    if (bucket) {
      bucket.push(item)
    } else {
      groups.set(item.date, [item])
    }
  }
  return Array.from(groups.entries())
}

function LeagueSchedulePage() {
  const { leagueId } = useParams<{ leagueId: string }>()
  const [items, setItems] = useState<LeagueScheduleItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setItems(null)
    setError(null)
    callApi<LeagueScheduleItem[]>(`/api/leagues/${leagueId}/schedule`)
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [leagueId])

  const tabs = leagueTabs(leagueId!, 'schedule')

  if (error) {
    return (
      <Layout title="Schedule" subTitle={tabs}>
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!items) {
    return (
      <Layout title="Schedule" subTitle={tabs}>
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  const matchdays = groupByDate(items)

  return (
    <Layout title="Schedule" subTitle={tabs}>
      <div className="fm-page">
        <SectionPanel title="Fixtures & results">
          <div className="fm-fixtures">
            {matchdays.length === 0 ? (
              <div className="fm-empty">No fixtures</div>
            ) : (
              matchdays.map(([date, matches]) => (
                <div key={date}>
                  <div className="fm-matchday-hd">{date}</div>
                  {matches.map((item) => (
                    <div className="fm-fixture" key={item.matchId}>
                      <div className="fx-home">
                        <Link to={`/teams/${item.homeTeamId}`} className="fx-club">
                          <span>{item.homeTeamName}</span>
                          <TeamCrest slug={item.homeTeamSlug} name={item.homeTeamName} size={20} />
                        </Link>
                      </div>
                      <Link to={`/match/${item.matchId}`} className="fx-score">
                        {item.homeGoals !== null && item.awayGoals !== null ? (
                          <>
                            {item.homeGoals} – {item.awayGoals}
                          </>
                        ) : (
                          '–'
                        )}
                      </Link>
                      <div className="fx-away">
                        <Link to={`/teams/${item.awayTeamId}`} className="fx-club">
                          <TeamCrest slug={item.awayTeamSlug} name={item.awayTeamName} size={20} />
                          <span>{item.awayTeamName}</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default LeagueSchedulePage
