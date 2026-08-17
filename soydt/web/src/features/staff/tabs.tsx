import TabBar from '../../shared/ui/TabBar'

// Sub-tab bar for a single staff member's profile pages — mirrors
// open-football/src/web/src/staff/get/index.html and
// open-football/src/web/src/staff/personal/index.html's shared `fm-tabbar`.

export type StaffTab = 'overview' | 'personal'

export function staffTabs(staffId: string, active: StaffTab) {
  return (
    <TabBar
      active={active}
      items={[
        { key: 'overview', label: 'Overview', to: `/staff/${staffId}` },
        { key: 'personal', label: 'Personal', to: `/staff/${staffId}/personal` },
      ]}
    />
  )
}
