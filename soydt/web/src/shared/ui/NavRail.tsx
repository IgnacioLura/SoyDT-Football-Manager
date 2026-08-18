// soydt/web/src/shared/ui/NavRail.tsx
import { Link } from 'react-router-dom'
import { Trophy, type LucideIcon } from 'lucide-react'

export type NavRailItem = { title: string; icon: LucideIcon; url: string }
export type NavRailLeague = { id: number; name: string }

type NavRailProps = {
  navItems: NavRailItem[]
  countryLeagues: NavRailLeague[] | null
  activePath: string
}

const TILE_BASE =
  'relative flex items-center gap-3 rounded-card p-3 font-display font-semibold no-underline transition-[background-color,color,transform] duration-fast ease-linear hover:bg-surface-2 hover:text-text-primary hover:translate-x-0.5'

// Triangle motif (see DESIGN_SYSTEM.md) — active-tab marker as the FC
// brand's triangle instead of a plain rectangle bar, sliding in along its
// own point. Slow breathing glow matches the DT lineup's "actively
// selected" pulse language elsewhere in the app.
const TILE_ACTIVE =
  'bg-surface-2 text-accent-primary animate-nr-active-glow before:content-[\'\'] before:absolute before:left-0 before:top-1/2 before:h-3.5 before:w-1.5 before:-translate-x-0.5 before:-translate-y-1/2 before:animate-nr-tri-in before:bg-accent-primary before:[clip-path:var(--clip-triangle)]'

const TILE_INACTIVE = 'text-text-muted'

function NavRail({ navItems, countryLeagues, activePath }: NavRailProps) {
  return (
    <nav className="bg-surface-0 p-3">
      <ul className="mb-4 flex list-none flex-col gap-1 p-0">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = activePath.startsWith(item.url)
          return (
            <li key={item.url}>
              <Link to={item.url} className={`${TILE_BASE} ${active ? TILE_ACTIVE : TILE_INACTIVE}`}>
                <Icon size={18} />
                <span>{item.title}</span>
              </Link>
            </li>
          )
        })}
      </ul>
      {countryLeagues && countryLeagues.length > 0 && (
        <ul className="mb-4 flex list-none flex-col gap-1 p-0">
          {countryLeagues.map((league) => {
            const active = activePath.startsWith(`/leagues/${league.id}`)
            return (
              <li key={league.id}>
                <Link to={`/leagues/${league.id}`} className={`${TILE_BASE} ${active ? TILE_ACTIVE : TILE_INACTIVE}`}>
                  <Trophy size={18} />
                  <span>{league.name}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </nav>
  )
}

export default NavRail
