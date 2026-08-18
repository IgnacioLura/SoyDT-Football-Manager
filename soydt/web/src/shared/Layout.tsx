import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Globe2, Search, Shield, Star } from 'lucide-react'
import AiSettingsBadge from './AiSettingsBadge'
import Flag from './Flag'
import ProcessControl from './ProcessControl'
import { callApi } from './api'
import NavRail, { type NavRailItem, type NavRailLeague } from './ui/NavRail'
import './Layout.css'

// Ported 1:1 from open-football/src/web/src/layout.html — same wrapper
// div/class structure (fm-sidebar, fm-header, container-fluid/row/col from
// Bootstrap5) so style.css's existing rules apply unmodified. See the
// migration plan's pixel-perfect UI decision.
//
// Fase A (2026-08-16 EA FC redesign spec): the sidebar's *contents* now
// render via `NavRail` (dark theme, icon tiles) instead of the raw
// `fm-nav-section` list — wrapper divs/classes below are untouched so
// style.css's layout rules (sidebar width, scroll, mobile toggle) keep
// working unmodified for every other page still using this Layout.
//
// `menu_sections`/`i18n`/theming (--header-bg etc.) are server-computed in
// the original Askama template; this is a static approximation until more
// feature areas exist to populate a real nav (Phase 1 only has Countries).

const NAV_ITEMS: NavRailItem[] = [{ title: 'Countries', icon: Globe2, url: '/countries' }]

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
  const [countryLeagues, setCountryLeagues] = useState<NavRailLeague[] | null>(null)

  useEffect(() => {
    if (sidebarCountryId == null) {
      setCountryLeagues(null)
      return
    }
    callApi<NavRailLeague[]>(`/api/countries/${sidebarCountryId}/leagues`)
      .then(setCountryLeagues)
      .catch(() => setCountryLeagues(null))
  }, [sidebarCountryId])

  return (
    <div id="page-content" className="lyt-root">
      <div className="container-fluid">
        <div className="row">
          <div className="fm-sidebar">
            <div className="fm-sidebar-scroll">
              <NavRail navItems={NAV_ITEMS} countryLeagues={countryLeagues} activePath={location.pathname} />
              <Link
                to="/dt"
                className="lyt-mode-switch flex items-center gap-3 rounded-card p-3 font-display font-semibold text-text-muted no-underline transition-colors duration-fast hover:bg-surface-2 hover:text-text-primary"
              >
                <Shield size={18} />
                <span>Modo DT</span>
              </Link>
              <div className="lyt-lang-toggle">
                <Flag code="us" />
                <span>English</span>
              </div>
            </div>
          </div>
          <div className="fm-sidebar-overlay" onClick={() => document.body.classList.remove('fm-sidebar-open')} />
          <div className="col m-0 p-0">
            <div className="container-fluid">
              <div className="row">
                <div className="col m-0 p-0">
                  <div className="lyt-header">
                    <button
                      className="fm-menu-toggle d-xl-none"
                      onClick={() => document.body.classList.toggle('fm-sidebar-open')}
                      aria-label="Toggle menu"
                    >
                      <span />
                    </button>
                    <div className="lyt-header-title">
                      <h1>{title}</h1>
                      {subTitle && <span className="lyt-header-sub">{subTitle}</span>}
                    </div>
                    <div className="lyt-header-actions">
                      <AiSettingsBadge />
                      <Link className="lyt-header-icon" to="/watchlist" title="Watch list">
                        <Star size={18} />
                      </Link>
                      <Link className="lyt-header-icon" to="/search" title="Search">
                        <Search size={18} />
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
