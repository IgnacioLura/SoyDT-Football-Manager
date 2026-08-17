import TabBar from '../../shared/ui/TabBar'

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
  return (
    <TabBar
      active={active}
      items={[
        { key: 'overview', label: 'Overview', to: `/leagues/${leagueId}` },
        { key: 'schedule', label: 'Schedule', to: `/leagues/${leagueId}/schedule` },
        { key: 'transfers', label: 'Transfers', to: `/leagues/${leagueId}/transfers` },
        { key: 'awards', label: 'Awards', to: `/leagues/${leagueId}/awards` },
      ]}
    />
  )
}
