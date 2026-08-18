import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ArrowLeftRight, Building2, Calendar, Coins, Globe2, ListOrdered, Users, Zap } from 'lucide-react'
import { callApi } from '../../shared/api'
import Flag from '../../shared/Flag'
import ProcessControl from '../../shared/ProcessControl'
import NavRail, { type NavRailItem } from '../../shared/ui/NavRail'
import '../../shared/Layout.css'
import TeamCrest from '../onboarding/TeamCrest'
import { useMyTeamId } from './useMyTeamId'
import './DtLayout.css'

// Stripped-down sibling of `shared/Layout.tsx` for the DT/"Mi Equipo"
// experience: same header/sidebar chrome so style.css's rules still apply,
// but the nav is hard-coded to only the DT's own pages (no free country/
// league/team browsing). `ProcessControl` (day-advancement) IS shown here —
// the DT drives their own career now, same button as the admin/free-browse
// Layout uses, backed by the same app-wide ProcessContext.
//
// Fase B (2026-08-16 EA FC redesign, Task B1): sidebar contents now render
// via the shared `NavRail` (dark theme, icon tiles) instead of the raw
// `fm-nav-section` list, and the header reuses `Layout.css`'s `lyt-header*`
// classes for the same dark visual treatment — mirrors `shared/Layout.tsx`.

const NAV_ITEMS: NavRailItem[] = [
  { title: 'Plantel', icon: Users, url: '/dt/squad' },
  { title: 'Transferencias', icon: ArrowLeftRight, url: '/dt/transfers' },
  { title: 'Calendario', icon: Calendar, url: '/dt/schedule' },
  { title: 'Finanzas', icon: Coins, url: '/dt/finances' },
  { title: 'Tabla', icon: ListOrdered, url: '/dt/table' },
  { title: 'Eventos', icon: Zap, url: '/dt/events' },
  { title: 'Directiva', icon: Building2, url: '/dt/board' },
]

type DtLayoutProps = {
  title: string
  subTitle?: ReactNode
  children: ReactNode
}

function DtLayout({ title, subTitle, children }: DtLayoutProps) {
  const location = useLocation()
  const myTeamId = useMyTeamId()
  // Themes the header around the DT's own club — same `--header-bg`/
  // `--header-border`/`--tab-fg`/`--tab-fg-active` custom properties (and
  // `.fm-header-colored` class) the original Askama template already
  // defined per-club colors for; this is the first place in the port to
  // actually wire them up. Loaded once per team id (colors don't change
  // mid-session) rather than duplicated in every DT page's own fetch.
  const [colors, setColors] = useState<{ background: string; foreground: string } | null>(null)
  const [crest, setCrest] = useState<{ name: string; slug: string } | null>(null)

  useEffect(() => {
    setColors(null)
    setCrest(null)
    if (myTeamId == null) return
    callApi<{ name: string; slug: string; backgroundColor: string; foregroundColor: string }>(`/api/teams/${myTeamId}`)
      .then((t) => {
        setColors({ background: t.backgroundColor, foreground: t.foregroundColor })
        setCrest({ name: t.name, slug: t.slug })
      })
      .catch(() => {
        setColors(null)
        setCrest(null)
      })
  }, [myTeamId])

  const headerStyle: CSSProperties | undefined = colors
    ? {
        '--header-bg': colors.background,
        '--header-border': `${colors.foreground}66`,
        '--tab-fg': `${colors.foreground}99`,
        '--tab-fg-active': colors.foreground,
      } as CSSProperties
    : undefined

  return (
    <div id="page-content">
      <div className="container-fluid">
        <div className="row">
          <div className="fm-sidebar">
            <div className="fm-sidebar-scroll">
              <NavRail navItems={NAV_ITEMS} countryLeagues={null} activePath={location.pathname} />
              <Link
                to="/countries"
                className="lyt-mode-switch flex items-center gap-3 rounded-card p-3 font-display font-semibold text-text-muted no-underline transition-colors duration-fast hover:bg-surface-2 hover:text-text-primary"
              >
                <Globe2 size={18} />
                <span>Modo Admin</span>
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
                  <div
                    className={`lyt-header${colors ? ' fm-header-colored' : ''}`}
                    style={headerStyle}
                  >
                    <button
                      className="fm-menu-toggle d-xl-none"
                      onClick={() => document.body.classList.toggle('fm-sidebar-open')}
                      aria-label="Toggle menu"
                    >
                      <span />
                    </button>
                    {crest && (
                      <div className="fm-dt-crest" style={{ marginRight: '0.75rem' }}>
                        <TeamCrest slug={crest.slug} name={crest.name} size={48} />
                      </div>
                    )}
                    <div className="lyt-header-title">
                      <h1>{title}</h1>
                      {subTitle && <span className="lyt-header-sub">{subTitle}</span>}
                    </div>
                    {/* No search/watchlist here — both lead into the
                        free-browse Admin area, out of scope for the DT's
                        own club. ProcessControl IS shown: the DT drives
                        their own career now. */}
                    <div className="lyt-header-actions">
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

export default DtLayout
