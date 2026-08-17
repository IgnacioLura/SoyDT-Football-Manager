// soydt/web/src/shared/ui/TabBar.tsx
// Generic replacement for the fm-tabbar/fm-tab markup duplicated across
// leagues/tabs.tsx, countries/tabs.tsx, staff/tabs.tsx (see DESIGN_SYSTEM.md
// Phase 2 of the fm-/style.css migration plan).
import { Link } from 'react-router-dom'
import './TabBar.css'

export type TabBarItem<T extends string> = {
  key: T
  label: string
  to: string
}

function TabBar<T extends string>({ items, active }: { items: TabBarItem<T>[]; active: T }) {
  return (
    <div className="tb-bar">
      {items.map((item) => (
        <Link key={item.key} className={`tb-tab${active === item.key ? ' tb-tab-active' : ''}`} to={item.to}>
          {item.label}
        </Link>
      ))}
    </div>
  )
}

export default TabBar
