import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import Flag from '../../shared/Flag'

// Stripped-down sibling of `shared/Layout.tsx` for the DT/"Mi Equipo"
// experience: same header/sidebar chrome so style.css's rules still apply,
// but the nav is hard-coded to only the DT's own pages (no free country/
// league/team browsing) and there is deliberately NO `ProcessControl` in
// the header — that's the actual mechanism enforcing "the DT never sees or
// triggers day-advancement," not a permission check (this app has no auth
// model to enforce one).

type NavItem = { title: string; icon: string; url: string }

const NAV_ITEMS: NavItem[] = [
  { title: 'Plantel', icon: 'fa-users', url: '/dt/squad' },
  { title: 'Transferencias', icon: 'fa-right-left', url: '/dt/transfers' },
  { title: 'Finanzas', icon: 'fa-coins', url: '/dt/finances' },
  { title: 'Tabla', icon: 'fa-list-ol', url: '/dt/table' },
]

type DtLayoutProps = {
  title: string
  subTitle?: ReactNode
  children: ReactNode
}

function DtLayout({ title, subTitle, children }: DtLayoutProps) {
  const location = useLocation()

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
                    {/* Deliberately no header-actions here: no search/watchlist
                        (both lead into Admin's free-browsing area) and no
                        ProcessControl (day-advancement is Admin-only). */}
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

export default DtLayout
