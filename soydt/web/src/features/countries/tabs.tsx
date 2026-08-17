import TabBar from '../../shared/ui/TabBar'

// Shared tab bar for the country sub-pages (squad/schedule/staff/leagues/
// free-agents) — mirrors open-football/src/web/src/countries/countries_layout.html.

export type CountryTab = 'squad' | 'schedule' | 'staff' | 'leagues' | 'free_agents'

export function countryTabs(countryId: string, active: CountryTab) {
  return (
    <TabBar
      active={active}
      items={[
        { key: 'squad', label: 'Squad', to: `/countries/${countryId}` },
        { key: 'schedule', label: 'Schedule', to: `/countries/${countryId}/schedule` },
        { key: 'staff', label: 'Staff', to: `/countries/${countryId}/staff` },
        { key: 'leagues', label: 'Leagues', to: `/countries/${countryId}/leagues` },
        { key: 'free_agents', label: 'Free agents', to: `/countries/${countryId}/free-agents` },
      ]}
    />
  )
}
