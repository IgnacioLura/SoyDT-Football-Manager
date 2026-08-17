// soydt/web/src/shared/ui/NavRail.tsx
import { Link } from 'react-router-dom'
import './NavRail.css'

export type NavRailItem = { title: string; icon: string; url: string }
export type NavRailLeague = { id: number; name: string }

type NavRailProps = {
  navItems: NavRailItem[]
  countryLeagues: NavRailLeague[] | null
  activePath: string
}

function NavRail({ navItems, countryLeagues, activePath }: NavRailProps) {
  return (
    <nav className="nr-rail">
      <ul className="nr-section">
        {navItems.map((item) => (
          <li key={item.url} className={activePath.startsWith(item.url) ? 'nr-active' : ''}>
            <Link to={item.url} className="nr-tile">
              <i className={`fa ${item.icon}`} />
              <span>{item.title}</span>
            </Link>
          </li>
        ))}
      </ul>
      {countryLeagues && countryLeagues.length > 0 && (
        <ul className="nr-section">
          {countryLeagues.map((league) => (
            <li key={league.id} className={activePath.startsWith(`/leagues/${league.id}`) ? 'nr-active' : ''}>
              <Link to={`/leagues/${league.id}`} className="nr-tile">
                <i className="fa fa-trophy" />
                <span>{league.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </nav>
  )
}

export default NavRail
