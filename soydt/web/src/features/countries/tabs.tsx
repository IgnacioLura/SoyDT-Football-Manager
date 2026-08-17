import TabBar from '../../shared/ui/TabBar'

// Shared tab bar for the country sub-pages (squad/schedule/staff/leagues/
// free-agents/transfer-market) — mirrors open-football/src/web/src/countries/countries_layout.html
// (transfer_market is a new tab, not in the original template — see
// docs/superpowers/specs/2026-08-17-transfers-deep-logic-design.md).

export type CountryTab = 'squad' | 'schedule' | 'staff' | 'leagues' | 'free_agents' | 'transfer_market'

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
        { key: 'transfer_market', label: 'Transfer Market', to: `/countries/${countryId}/transfer-market` },
      ]}
    />
  )
}
