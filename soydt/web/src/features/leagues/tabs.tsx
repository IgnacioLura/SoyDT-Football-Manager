import { Link } from 'react-router-dom'

// Shared tab bar for league sub-pages (overview/schedule/news/transfers/
// awards) — mirrors leagues/get/index.html's fm-tabbar. "News" (newspaper)
// is deferred — see MIGRATION_CHECKLIST.md — so it's omitted here rather
// than linking to a page that doesn't exist yet.
//
// "Schedule" isn't a distinct tab in the original template — its fixtures
// list is embedded inline in the overview page's "fixtures_results" panel
// (current matchday only). This app surfaces the full-season fixture list
// as a standalone page instead, following the same tab convention as
// countries/tabs.tsx's "schedule" tab and teams/schedule.

export type LeagueTab = 'overview' | 'schedule' | 'transfers' | 'awards'

export function leagueTabs(leagueId: string, active: LeagueTab) {
  const tab = (key: LeagueTab, label: string, to: string) => (
    <Link key={key} className={`fm-tab${active === key ? ' active' : ''}`} to={to}>
      {label}
    </Link>
  )

  return (
    <div className="fm-tabbar">
      {tab('overview', 'Overview', `/leagues/${leagueId}`)}
      {tab('schedule', 'Schedule', `/leagues/${leagueId}/schedule`)}
      {tab('transfers', 'Transfers', `/leagues/${leagueId}/transfers`)}
      {tab('awards', 'Awards', `/leagues/${leagueId}/awards`)}
    </div>
  )
}
