import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AiSettingsBadge from './AiSettingsBadge'
import Flag from './Flag'
import ProcessControl from './ProcessControl'
import { callApi } from './api'

// Ported 1:1 from open-football/src/web/src/layout.html — same wrapper
// div/class structure (fm-sidebar, fm-header, container-fluid/row/col from
// Bootstrap5) so style.css's existing rules apply unmodified. See the
// migration plan's pixel-perfect UI decision.
//
// `menu_sections`/`i18n`/theming (--header-bg etc.) are server-computed in
// the original Askama template; this is a static approximation until more
// feature areas exist to populate a real nav (Phase 1 only has Countries).

type NavItem = { title: string; icon: string; url: string }
type SidebarLeague = { id: number; name: string }

const NAV_ITEMS: NavItem[] = [{ title: 'Countries', icon: 'fa-earth-americas', url: '/countries' }]

type LayoutProps = {
  title: string
  subTitle?: ReactNode
  children: ReactNode
  // Set by any page that already knows which country it's scoped to (its
  // own :countryId route param, or a country_id/countryId a fetched detail
  // payload carried back) — renders a second sidebar section listing that
  // country's leagues so navigating between them doesn't require going
  // back up to /countries first. Left unset, the sidebar stays flat.
  sidebarCountryId?: number
}

function Layout({ title, subTitle, children, sidebarCountryId }: LayoutProps) {
  const location = useLocation()
  const [countryLeagues, setCountryLeagues] = useState<SidebarLeague[] | null>(null)

  useEffect(() => {
    if (sidebarCountryId == null) {
      setCountryLeagues(null)
      return
    }
    callApi<SidebarLeague[]>(`/api/countries/${sidebarCountryId}/leagues`)
      .then(setCountryLeagues)
      .catch(() => setCountryLeagues(null))
  }, [sidebarCountryId])

  return (
    <div id="page-content">
      <div className="container-fluid">
        <div className="row">
          <div className="fm-sidebar">
            <nav className="fm-sidebar-scroll">
              <ul className="fm-nav-section">
                {NAV_ITEMS.map((item) => (
                  <li key={item.url} className={location.pathname.startsWith(item.url) ? 'active' : ''}>
                    <Link to={item.url}>
                      <i className={`fa ${item.icon}`} />
                      <span>{item.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              {countryLeagues && countryLeagues.length > 0 && (
                <ul className="fm-nav-section">
                  {countryLeagues.map((league) => (
                    <li
                      key={league.id}
                      className={location.pathname.startsWith(`/leagues/${league.id}`) ? 'active' : ''}
                    >
                      <Link to={`/leagues/${league.id}`}>
                        <i className="fa fa-trophy" />
                        <span>{league.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <ul className="fm-nav-section fm-nav-section-bottom">
                <li className="fm-sidebar-lang">
                  <div className="fm-sidebar-lang-toggle">
                    <Flag code="us" />
                    <span>English</span>
                  </div>
                </li>
              </ul>
            </nav>
          </div>
          <div className="fm-sidebar-overlay" onClick={() => document.body.classList.remove('fm-sidebar-open')} />
          <div className="col m-0 p-0">
            <div className="container-fluid">
              <div className="row">
                <div className="col m-0 p-0">
                  <div className="fm-header">
                    <button
                      className="fm-menu-toggle d-xl-none"
                      onClick={() => document.body.classList.toggle('fm-sidebar-open')}
                      aria-label="Toggle menu"
                    >
                      <span />
                    </button>
                    <div className="fm-header-title">
                      <h1>{title}</h1>
                      {subTitle && <span className="fm-header-sub">{subTitle}</span>}
                    </div>
                    <div className="fm-header-actions">
                      <AiSettingsBadge />
                      <Link className="fm-header-search" to="/watchlist" title="Watch list">
                        <i className="fa fa-star" />
                      </Link>
                      <Link className="fm-header-search" to="/search" title="Search">
                        <i className="fa fa-search" />
                      </Link>
                      <ProcessControl />
                    </div>
                  </div>
                  {children}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Layout
