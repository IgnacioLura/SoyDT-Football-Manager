import { Link } from 'react-router-dom'

// Shared tab bar for the country sub-pages (squad/schedule/staff/leagues/
// free-agents) — mirrors open-football/src/web/src/countries/countries_layout.html.

export type CountryTab = 'squad' | 'schedule' | 'staff' | 'leagues' | 'free_agents'

export function countryTabs(countryId: string, active: CountryTab) {
  const tab = (key: CountryTab, label: string, to: string) => (
    <Link key={key} className={`fm-tab${active === key ? ' active' : ''}`} to={to}>
      {label}
    </Link>
  )

  return (
    <div className="fm-tabbar">
      {tab('squad', 'Squad', `/countries/${countryId}`)}
      {tab('schedule', 'Schedule', `/countries/${countryId}/schedule`)}
      {tab('staff', 'Staff', `/countries/${countryId}/staff`)}
      {tab('leagues', 'Leagues', `/countries/${countryId}/leagues`)}
      {tab('free_agents', 'Free agents', `/countries/${countryId}/free-agents`)}
    </div>
  )
}
