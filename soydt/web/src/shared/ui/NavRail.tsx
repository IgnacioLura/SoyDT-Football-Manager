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
  'group relative flex items-center gap-3 overflow-hidden rounded-card px-3 py-2.5 font-display font-semibold no-underline transition-all duration-200 ease-out animate-in fade-in slide-in-from-left-2 fill-mode-both hover:translate-x-1'

// Clean solid accent bar + soft gradient tint on the active tile — replaces
// the old blurred pulsing box-shadow glow, which read as a smudge rather
// than a highlight. `tailwindcss-animate`'s `animate-in`/`fade-in`/
// `slide-in-from-left-*` drive the cascading mount-in below instead of a
// bespoke keyframe.
const TILE_ACTIVE =
  "bg-gradient-to-r from-accent-primary/15 via-accent-primary/5 to-transparent text-accent-primary ring-1 ring-inset ring-accent-primary/30 before:absolute before:left-0 before:top-1/2 before:h-4 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-accent-primary before:shadow-[0_0_6px_rgba(var(--accent-primary-rgb),0.7)] before:content-['']"

const TILE_INACTIVE = 'text-text-muted hover:bg-surface-2 hover:text-text-primary'

function NavRail({ navItems, countryLeagues, activePath }: NavRailProps) {
  return (
    <nav className="bg-surface-0 p-3">
      <ul className="mb-4 flex list-none flex-col gap-1 p-0">
        {navItems.map((item, i) => {
          const Icon = item.icon
          const active = activePath.startsWith(item.url)
          return (
            <li key={item.url}>
              <Link
                to={item.url}
                className={`${TILE_BASE} ${active ? TILE_ACTIVE : TILE_INACTIVE}`}
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <Icon size={18} className="transition-transform duration-200 ease-out group-hover:scale-110" />
                <span>{item.title}</span>
              </Link>
            </li>
          )
        })}
      </ul>
      {countryLeagues && countryLeagues.length > 0 && (
        <ul className="mb-4 flex list-none flex-col gap-1 p-0">
          {countryLeagues.map((league, i) => {
            const active = activePath.startsWith(`/leagues/${league.id}`)
            return (
              <li key={league.id}>
                <Link
                  to={`/leagues/${league.id}`}
                  className={`${TILE_BASE} ${active ? TILE_ACTIVE : TILE_INACTIVE}`}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <Trophy size={18} className="transition-transform duration-200 ease-out group-hover:scale-110" />
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
