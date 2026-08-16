import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AiSettingsBadge from './AiSettingsBadge'
import Flag from './Flag'

// Ported 1:1 from open-football/src/web/src/layout.html — same wrapper
// div/class structure (fm-sidebar, fm-header, container-fluid/row/col from
// Bootstrap5) so style.css's existing rules apply unmodified. See the
// migration plan's pixel-perfect UI decision.
//
// `menu_sections`/`i18n`/theming (--header-bg etc.) are server-computed in
// the original Askama template; this is a static approximation until more
// feature areas exist to populate a real nav (Phase 1 only has Countries).

type NavItem = { title: string; icon: string; url: string }

const NAV_ITEMS: NavItem[] = [{ title: 'Countries', icon: 'fa-earth-americas', url: '/countries' }]

type LayoutProps = {
  title: string
  subTitle?: ReactNode
  children: ReactNode
}

function Layout({ title, subTitle, children }: LayoutProps) {
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
                    <div className="fm-header-actions">
                      <AiSettingsBadge />
                      <a className="fm-header-search" href="#" title="Search">
                        <i className="fa fa-search" />
                      </a>
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
