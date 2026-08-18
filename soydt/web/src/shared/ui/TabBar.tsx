// soydt/web/src/shared/ui/TabBar.tsx
// Generic replacement for the fm-tabbar/fm-tab markup duplicated across
// leagues/tabs.tsx, countries/tabs.tsx, staff/tabs.tsx (see DESIGN_SYSTEM.md
// Phase 2 of the fm-/style.css migration plan).
import { Link } from 'react-router-dom'

export type TabBarItem<T extends string> = {
  key: T
  label: string
  to: string
}

function TabBar<T extends string>({ items, active }: { items: TabBarItem<T>[]; active: T }) {
  return (
    <div className="flex max-w-full overflow-x-auto bg-[var(--header-bg,var(--surface-0))] border-b border-[var(--header-border,var(--surface-3))]">
      {items.map((item) => (
        <Link
          key={item.key}
          className={`inline-flex items-center whitespace-nowrap px-[18px] py-[10px] font-display text-[10px] font-semibold italic uppercase leading-none tracking-[0.6px] cursor-pointer border-b-2 [transition:color_var(--transition-fast)_ease,background-color_var(--transition-fast)_ease,border-color_var(--transition-snap)_linear] hover:text-[var(--tab-fg-active,var(--text-primary))] hover:bg-[var(--tab-hover-bg,rgba(255,255,255,0.04))] ${
            active === item.key
              ? 'text-[var(--tab-fg-active,var(--text-primary))] border-b-[var(--tab-active-border,var(--accent-primary))]'
              : 'text-[var(--tab-fg,var(--text-muted))] border-b-transparent'
          }`}
          to={item.to}
        >
          {item.label}
        </Link>
      ))}
    </div>
  )
}

export default TabBar
