import { Link } from 'react-router-dom'

// Sub-tab bar for a single staff member's profile pages — mirrors
// open-football/src/web/src/staff/get/index.html and
// open-football/src/web/src/staff/personal/index.html's shared `fm-tabbar`.

export type StaffTab = 'overview' | 'personal'

export function staffTabs(staffId: string, active: StaffTab) {
  const tab = (key: StaffTab, label: string, to: string) => (
    <Link key={key} className={`fm-tab${active === key ? ' active' : ''}`} to={to}>
      {label}
    </Link>
  )

  return (
    <div className="fm-tabbar">
      {tab('overview', 'Overview', `/staff/${staffId}`)}
      {tab('personal', 'Personal', `/staff/${staffId}/personal`)}
    </div>
  )
}
