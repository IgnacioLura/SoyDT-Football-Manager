# EA Sports FC-style UI Redesign (Fase A) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `soydt/web` an EA Sports FC-style dark theme + player-card visual language, applied to the shared `Layout` nav/header, the team squad view, and the player page — without touching any other page or any backend contract.

**Architecture:** New CSS custom-property theme (`shared/theme.css`) plus a small presentational component kit (`shared/ui/`) consumed only by `Layout.tsx`, `TeamPage.tsx`, and `PlayerPage.tsx`. Old `bootstrap.min.css`/`style.css` and every other page stay untouched — `theme.css` only defines `:root` custom properties (no bare-element selectors), so loading it globally cannot visually affect unmigrated pages.

**Tech Stack:** React 19 + TypeScript, Vite, plain CSS (no Tailwind, no CSS-in-JS, no new npm dependencies). `oxlint` for linting, `tsc -b` for type checking.

**Spec:** [docs/superpowers/specs/2026-08-16-ea-fc-ui-redesign-design.md](../specs/2026-08-16-ea-fc-ui-redesign-design.md)

## Global Constraints

- No new frontend dependencies — do not add Tailwind, styled-components, or any font/icon package to `soydt/web/package.json`.
- `shared/theme.css` must contain only `:root { --token: value; }` declarations — no element or class selectors — so importing it globally cannot affect pages that don't opt in.
- Do not modify `bootstrap.min.css`, `style.css`, or any file under `soydt/web/public/static/css`.
- Do not touch any page other than `shared/Layout.tsx`, `features/teams/TeamPage.tsx`, `features/players/PlayerPage.tsx` and the new `shared/ui/*` files this plan creates.
- No backend/API/DTO changes — every field this plan renders already exists on `TeamDetail`/`PlayerDetail` as defined in the current `TeamPage.tsx`/`PlayerPage.tsx`.
- `soydt/web` has no test runner configured (no vitest/jest in `package.json`). "Test cycle" for this plan means: `npx tsc -b` clean, `npm run lint` clean, and a manual browser check via the preview tools (dev server + Docker API backend, per `soydt/MIGRATION_CHECKLIST.md`'s existing verification pattern) — not automated unit tests. Do not add a test framework as part of this plan.
- Reuse existing logic instead of duplicating it: `attributeColor.ts` for value→color bucketing, `positionInfo`/`PositionBadge` from `shared/positions.tsx` for position codes/colors, the photo-with-fallback pattern already in `PlayerPage.tsx` (`/static/images/players/{id}.jpg` → `placeholder-face.svg` on error).

---

## File Structure

New files:
- `soydt/web/src/shared/theme.css` — design tokens (colors, typography, spacing, radius, shadow)
- `soydt/web/src/shared/ui/RatingBadge.tsx` + `.css`
- `soydt/web/src/shared/ui/StatBar.tsx` + `.css`
- `soydt/web/src/shared/ui/PlayerCard.tsx` + `.css`
- `soydt/web/src/shared/ui/SectionPanel.tsx` + `.css`
- `soydt/web/src/shared/ui/NavRail.tsx` + `.css`

Modified files:
- `soydt/web/src/main.tsx` — import `theme.css`
- `soydt/web/src/shared/Layout.tsx` — use `NavRail`, restyled header
- `soydt/web/src/features/teams/TeamPage.tsx` — squad table → `PlayerCard` grid
- `soydt/web/src/features/players/PlayerPage.tsx` — hero + `StatBar` attribute sections

Each `shared/ui/*` component is presentational only (props in, JSX out — no `callApi` calls), matching the rest of `soydt/web`'s pattern of pages owning data-fetching and components staying dumb.

---

## Task 1: Theme tokens

**Files:**
- Create: `soydt/web/src/shared/theme.css`
- Modify: `soydt/web/src/main.tsx`

**Interfaces:**
- Produces: CSS custom properties consumed by every task below — `--surface-0`, `--surface-1`, `--surface-2`, `--surface-3`, `--accent-primary`, `--accent-secondary`, `--tier-gold`, `--tier-silver`, `--tier-bronze`, `--tier-elite`, `--text-primary`, `--text-muted`, `--font-display`, `--font-body`, `--space-1`..`--space-6`, `--radius-card`, `--shadow-card`.

- [ ] **Step 1: Write `theme.css`**

```css
/* soydt/web/src/shared/theme.css
   EA Sports FC-style design tokens. :root custom properties ONLY — no
   element/class selectors here, so importing this globally cannot affect
   pages that don't opt into the new component kit (Fase A: Layout,
   TeamPage, PlayerPage only). */
:root {
  /* Surfaces — dark navy/charcoal scale, darkest to lightest */
  --surface-0: #0b0e14;
  --surface-1: #12161f;
  --surface-2: #1a1f2b;
  --surface-3: #242a38;

  /* Accents — pitch-green + broadcast-cyan */
  --accent-primary: #2ee6a6;
  --accent-secondary: #3fc7ff;

  /* Rating tiers, low to high CA */
  --tier-bronze: #b06a3a;
  --tier-silver: #b8c0cc;
  --tier-gold: #f2c94c;
  --tier-elite: #2ee6a6;

  /* Text */
  --text-primary: #f4f6fa;
  --text-muted: #8b93a7;

  /* Typography */
  --font-display: 'Arial Narrow', 'Oswald', 'Helvetica Neue', sans-serif;
  --font-body: -apple-system, 'Segoe UI', Roboto, sans-serif;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;

  /* Shape */
  --radius-card: 10px;
  --shadow-card: 0 4px 16px rgba(0, 0, 0, 0.45);
}
```

`--font-display` deliberately uses only system/widely-available font-stack
names (no `@font-face`, no external `<link>`) — Fase A avoids adding a
network-fetched webfont dependency. `public/static/fonts` was checked
during design (Fase 0 already ships fonts for the old FM theme, not a
condensed/italic display face suited to this token) — revisit if a real
matching font file is added later.

- [ ] **Step 2: Import it globally**

Edit `soydt/web/src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './shared/theme.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 3: Verify build stays clean**

Run: `cd soydt/web && npx tsc -b && npx vite build`
Expected: no errors.

- [ ] **Step 4: Spot-check an untouched page is unaffected**

Run the dev server (see Task 10 for the full preview setup) and open
`/countries` — it must render identically to before this change (theme.css
defines only custom properties, nothing selects on them yet).

- [ ] **Step 5: Commit**

```bash
git add soydt/web/src/shared/theme.css soydt/web/src/main.tsx
git commit -m "feat(web): add EA FC-style theme tokens"
```

---

## Task 2: RatingBadge component

**Files:**
- Create: `soydt/web/src/shared/ui/RatingBadge.tsx`
- Create: `soydt/web/src/shared/ui/RatingBadge.css`

**Interfaces:**
- Consumes: `--tier-bronze`/`--tier-silver`/`--tier-gold`/`--tier-elite`/`--font-display`/`--text-primary`/`--radius-card`/`--shadow-card` from Task 1's `theme.css`.
- Produces: `RatingBadge({ value: number, size?: 'sm' | 'lg' })` — a `<div>` with class `rb-badge rb-tier-<tier>`, tier computed by `ratingTier(value)` (also exported, used by `PlayerCard` in Task 4).

- [ ] **Step 1: Write the component**

```tsx
// soydt/web/src/shared/ui/RatingBadge.tsx
import './RatingBadge.css'

export type RatingTier = 'bronze' | 'silver' | 'gold' | 'elite'

// Current ability is a u8 (engine-ffi's `current_ability: u8`) — thresholds
// below are Fase A's initial bucketing for visual tiering, not a value
// pulled from game balance data. Tune freely without touching callers.
export function ratingTier(value: number): RatingTier {
  if (value >= 160) return 'elite'
  if (value >= 130) return 'gold'
  if (value >= 100) return 'silver'
  return 'bronze'
}

type RatingBadgeProps = {
  value: number
  size?: 'sm' | 'lg'
}

function RatingBadge({ value, size = 'lg' }: RatingBadgeProps) {
  const tier = ratingTier(value)
  return (
    <div className={`rb-badge rb-tier-${tier} rb-size-${size}`}>
      <span className="rb-value">{Math.round(value)}</span>
    </div>
  )
}

export default RatingBadge
```

- [ ] **Step 2: Write the CSS**

```css
/* soydt/web/src/shared/ui/RatingBadge.css */
.rb-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-card);
  font-family: var(--font-display);
  font-weight: 700;
  font-style: italic;
  color: var(--text-primary);
  box-shadow: var(--shadow-card);
  border: 2px solid transparent;
}

.rb-size-lg {
  width: 64px;
  height: 64px;
  font-size: 28px;
}

.rb-size-sm {
  width: 36px;
  height: 36px;
  font-size: 16px;
}

.rb-tier-bronze {
  background: linear-gradient(155deg, var(--tier-bronze), var(--surface-2));
  border-color: var(--tier-bronze);
}

.rb-tier-silver {
  background: linear-gradient(155deg, var(--tier-silver), var(--surface-2));
  border-color: var(--tier-silver);
  color: var(--surface-0);
}

.rb-tier-gold {
  background: linear-gradient(155deg, var(--tier-gold), var(--surface-2));
  border-color: var(--tier-gold);
  color: var(--surface-0);
}

.rb-tier-elite {
  background: linear-gradient(155deg, var(--accent-primary), var(--surface-2));
  border-color: var(--accent-primary);
  color: var(--surface-0);
}
```

- [ ] **Step 3: Verify build stays clean**

Run: `cd soydt/web && npx tsc -b`
Expected: no errors (component isn't imported anywhere yet, but must
type-check standalone).

- [ ] **Step 4: Commit**

```bash
git add soydt/web/src/shared/ui/RatingBadge.tsx soydt/web/src/shared/ui/RatingBadge.css
git commit -m "feat(web): add RatingBadge component"
```

---

## Task 3: StatBar component

**Files:**
- Create: `soydt/web/src/shared/ui/StatBar.tsx`
- Create: `soydt/web/src/shared/ui/StatBar.css`

**Interfaces:**
- Consumes: `attributeColor(value: number): 'red' | 'yellow' | 'green'` from `shared/attributeColor.ts` (existing, unmodified).
- Produces: `StatBar({ label: string, value: number, max?: number })` — labeled gradient progress bar. `max` defaults to `20` (engine skill values run 1.0–20.0 per `attributeColor.ts`'s existing comment).

- [ ] **Step 1: Write the component**

```tsx
// soydt/web/src/shared/ui/StatBar.tsx
import { attributeColor } from '../attributeColor'
import './StatBar.css'

type StatBarProps = {
  label: string
  value: number
  max?: number
}

function StatBar({ label, value, max = 20 }: StatBarProps) {
  const rounded = Math.round(value)
  const color = attributeColor(rounded)
  const pct = Math.max(0, Math.min(100, (value / max) * 100))
  return (
    <div className="sb-row">
      <span className="sb-label">{label}</span>
      <div className="sb-track">
        <div className={`sb-fill sb-fill-${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="sb-value">{rounded}</span>
    </div>
  )
}

export default StatBar
```

- [ ] **Step 2: Write the CSS**

```css
/* soydt/web/src/shared/ui/StatBar.css */
.sb-row {
  display: grid;
  grid-template-columns: 120px 1fr 32px;
  align-items: center;
  gap: var(--space-2);
  padding: 3px 0;
}

.sb-label {
  color: var(--text-muted);
  font-size: 13px;
}

.sb-track {
  height: 6px;
  background: var(--surface-3);
  border-radius: 3px;
  overflow: hidden;
}

.sb-fill {
  height: 100%;
  border-radius: 3px;
}

.sb-fill-red {
  background: linear-gradient(90deg, #7a1f2b, #e74c3c);
}

.sb-fill-yellow {
  background: linear-gradient(90deg, #7a6a1f, #f2c94c);
}

.sb-fill-green {
  background: linear-gradient(90deg, #1f7a4c, var(--accent-primary));
}

.sb-value {
  color: var(--text-primary);
  font-family: var(--font-display);
  font-weight: 700;
  text-align: right;
}
```

- [ ] **Step 3: Verify build stays clean**

Run: `cd soydt/web && npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add soydt/web/src/shared/ui/StatBar.tsx soydt/web/src/shared/ui/StatBar.css
git commit -m "feat(web): add StatBar component"
```

---

## Task 4: PlayerCard component

**Files:**
- Create: `soydt/web/src/shared/ui/PlayerCard.tsx`
- Create: `soydt/web/src/shared/ui/PlayerCard.css`

**Interfaces:**
- Consumes: `RatingBadge`, `ratingTier` (Task 2); `PositionBadge`, `positionInfo` from `shared/positions.tsx` (existing).
- Produces: `PlayerCard({ id, name, position, age, currentAbility }: PlayerCardProps)` — renders as a `<Link>` to `/players/{id}`, wraps the same photo-with-fallback pattern used in `PlayerPage.tsx` (`/static/images/players/{id}.jpg` → `/static/images/player/placeholder-face.svg`).

- [ ] **Step 1: Write the component**

```tsx
// soydt/web/src/shared/ui/PlayerCard.tsx
import { Link } from 'react-router-dom'
import { PositionBadge } from '../positions'
import RatingBadge, { ratingTier } from './RatingBadge'
import './PlayerCard.css'

export type PlayerCardProps = {
  id: number
  name: string
  position: string
  age: number
  currentAbility: number
}

function PlayerCard({ id, name, position, age, currentAbility }: PlayerCardProps) {
  const tier = ratingTier(currentAbility)
  return (
    <Link to={`/players/${id}`} className={`pc-card pc-tier-${tier}`}>
      <div className="pc-top">
        <RatingBadge value={currentAbility} size="sm" />
        <PositionBadge position={position} />
      </div>
      <img
        className="pc-photo"
        src={`/static/images/players/${id}.jpg`}
        onError={(e) => {
          e.currentTarget.onerror = null
          e.currentTarget.src = '/static/images/player/placeholder-face.svg'
        }}
        alt=""
        width={72}
        height={90}
      />
      <div className="pc-name">{name}</div>
      <div className="pc-age">Age {age}</div>
    </Link>
  )
}

export default PlayerCard
```

- [ ] **Step 2: Write the CSS**

```css
/* soydt/web/src/shared/ui/PlayerCard.css */
.pc-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-1);
  width: 140px;
  padding: var(--space-3);
  background: var(--surface-1);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  border: 1px solid var(--surface-3);
  text-decoration: none;
  color: var(--text-primary);
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.pc-card:hover {
  transform: translateY(-3px);
  border-color: var(--accent-primary);
}

.pc-tier-elite {
  border-color: var(--accent-primary);
}

.pc-tier-gold {
  border-color: var(--tier-gold);
}

.pc-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.pc-photo {
  border-radius: 6px;
  object-fit: cover;
  margin: var(--space-2) 0;
}

.pc-name {
  font-family: var(--font-display);
  font-weight: 700;
  text-align: center;
  font-size: 14px;
}

.pc-age {
  color: var(--text-muted);
  font-size: 12px;
}
```

- [ ] **Step 3: Verify build stays clean**

Run: `cd soydt/web && npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add soydt/web/src/shared/ui/PlayerCard.tsx soydt/web/src/shared/ui/PlayerCard.css
git commit -m "feat(web): add PlayerCard component"
```

---

## Task 5: SectionPanel component

**Files:**
- Create: `soydt/web/src/shared/ui/SectionPanel.tsx`
- Create: `soydt/web/src/shared/ui/SectionPanel.css`

**Interfaces:**
- Produces: `SectionPanel({ title, actions?, children }: SectionPanelProps)` — replaces the ad-hoc `<section className="fm-panel"><div className="fm-panel-head">...` markup currently duplicated in `TeamPage.tsx`/`PlayerPage.tsx`.

- [ ] **Step 1: Write the component**

```tsx
// soydt/web/src/shared/ui/SectionPanel.tsx
import type { ReactNode } from 'react'
import './SectionPanel.css'

type SectionPanelProps = {
  title: string
  actions?: ReactNode
  children: ReactNode
}

function SectionPanel({ title, actions, children }: SectionPanelProps) {
  return (
    <section className="sp-panel">
      <div className="sp-head">
        <h3 className="sp-title">{title}</h3>
        {actions && <div className="sp-actions">{actions}</div>}
      </div>
      <div className="sp-body">{children}</div>
    </section>
  )
}

export default SectionPanel
```

- [ ] **Step 2: Write the CSS**

```css
/* soydt/web/src/shared/ui/SectionPanel.css */
.sp-panel {
  background: var(--surface-1);
  border: 1px solid var(--surface-3);
  border-radius: var(--radius-card);
  box-shadow: var(--shadow-card);
  margin-bottom: var(--space-5);
  overflow: hidden;
}

.sp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  background: var(--surface-2);
  border-bottom: 1px solid var(--surface-3);
}

.sp-title {
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.sp-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.sp-body {
  padding: var(--space-4);
}
```

- [ ] **Step 3: Verify build stays clean**

Run: `cd soydt/web && npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add soydt/web/src/shared/ui/SectionPanel.tsx soydt/web/src/shared/ui/SectionPanel.css
git commit -m "feat(web): add SectionPanel component"
```

---

## Task 6: NavRail component

**Files:**
- Create: `soydt/web/src/shared/ui/NavRail.tsx`
- Create: `soydt/web/src/shared/ui/NavRail.css`

**Interfaces:**
- Consumes: same `NavItem`/`SidebarLeague` shapes currently inlined in `Layout.tsx`.
- Produces: `NavRail({ navItems, countryLeagues, activePath }: NavRailProps)` — icon-tile nav list, replacing `Layout.tsx`'s `<ul className="fm-nav-section">` markup 1:1 in behavior (same links, same active-state logic, same country-leagues conditional section).

- [ ] **Step 1: Write the component**

```tsx
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
```

- [ ] **Step 2: Write the CSS**

```css
/* soydt/web/src/shared/ui/NavRail.css */
.nr-rail {
  background: var(--surface-0);
  padding: var(--space-3);
}

.nr-section {
  list-style: none;
  margin: 0 0 var(--space-4) 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.nr-tile {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-card);
  color: var(--text-muted);
  text-decoration: none;
  font-family: var(--font-display);
  font-weight: 600;
  transition: background 0.15s ease, color 0.15s ease;
}

.nr-tile:hover {
  background: var(--surface-2);
  color: var(--text-primary);
}

.nr-active .nr-tile {
  background: var(--surface-2);
  color: var(--accent-primary);
  border-left: 3px solid var(--accent-primary);
}
```

- [ ] **Step 3: Verify build stays clean**

Run: `cd soydt/web && npx tsc -b`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add soydt/web/src/shared/ui/NavRail.tsx soydt/web/src/shared/ui/NavRail.css
git commit -m "feat(web): add NavRail component"
```

---

## Task 7: Wire NavRail + restyle header into Layout.tsx

**Files:**
- Modify: `soydt/web/src/shared/Layout.tsx`
- Create: `soydt/web/src/shared/Layout.css`

**Interfaces:**
- Consumes: `NavRail` (Task 6, `navItems`/`countryLeagues`/`activePath` props). All existing `Layout` props (`title`, `subTitle`, `children`, `sidebarCountryId`) and behavior (fetching `countryLeagues` via `callApi`, mobile sidebar toggle, `AiSettingsBadge`/`ProcessControl`/search/watchlist links) are unchanged.

- [ ] **Step 1: Replace the sidebar markup with `NavRail` and add `Layout.css`**

```tsx
// soydt/web/src/shared/Layout.tsx
import { useEffect, useState, type ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
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

const NAV_ITEMS: NavRailItem[] = [{ title: 'Countries', icon: 'fa-earth-americas', url: '/countries' }]

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
                        <i className="fa fa-star" />
                      </Link>
                      <Link className="lyt-header-icon" to="/search" title="Search">
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
```

- [ ] **Step 2: Write `Layout.css`**

```css
/* soydt/web/src/shared/Layout.css
   Only targets the new `lyt-*` classes introduced above — never redefines
   `fm-*`/bootstrap selectors, so this cannot bleed into pages that don't
   render through these specific elements. */
.lyt-root .fm-sidebar {
  background: var(--surface-0);
}

.lyt-header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-5);
  background: var(--surface-1);
  border-bottom: 1px solid var(--surface-3);
}

.lyt-header-title h1 {
  font-family: var(--font-display);
  font-style: italic;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
  text-transform: uppercase;
}

.lyt-header-sub {
  color: var(--text-muted);
  font-size: 13px;
}

.lyt-header-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.lyt-header-icon {
  color: var(--text-muted);
  font-size: 16px;
}

.lyt-header-icon:hover {
  color: var(--accent-primary);
}

.lyt-lang-toggle {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3);
  color: var(--text-muted);
  font-size: 13px;
}
```

- [ ] **Step 3: Verify build stays clean**

Run: `cd soydt/web && npx tsc -b && npx vite build`
Expected: no errors.

- [ ] **Step 4: Verify lint stays clean**

Run: `cd soydt/web && npm run lint`
Expected: no new warnings/errors.

- [ ] **Step 5: Browser verification**

Start the dev server + API backend per `soydt/MIGRATION_CHECKLIST.md`'s
existing verification setup, open any page (e.g. `/countries`), confirm:
- Sidebar renders as dark icon-tile nav, active route highlighted with the
  accent-colored left border.
- Country-leagues section still appears when navigating into a team/league
  and disappears when it shouldn't.
- Mobile sidebar toggle (`fm-menu-toggle`) still opens/closes the sidebar
  (resize to a narrow viewport to check).
- Header shows title/subtitle, search/watchlist icons, process control —
  all still functional (click search icon → navigates to `/search`).

- [ ] **Step 6: Commit**

```bash
git add soydt/web/src/shared/Layout.tsx soydt/web/src/shared/Layout.css
git commit -m "feat(web): restyle Layout nav/header with EA FC theme"
```

---

## Task 8: TeamPage squad grid

**Files:**
- Modify: `soydt/web/src/features/teams/TeamPage.tsx`
- Create: `soydt/web/src/features/teams/TeamPage.css`

**Interfaces:**
- Consumes: `SectionPanel` (Task 5), `PlayerCard` (Task 4). `TeamDetail`/`PlayerCard` (the API DTO type, unrelated to and pre-dating the new `shared/ui/PlayerCard` component — keep the existing local type name in this file since it's the API shape, not the UI component) types are unchanged.

- [ ] **Step 1: Replace the squad `<table>` with a `PlayerCard` grid**

```tsx
// soydt/web/src/features/teams/TeamPage.tsx
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import AiReportButton from '../../shared/AiReportButton'
import Layout from '../../shared/Layout'
import PlayerCard from '../../shared/ui/PlayerCard'
import SectionPanel from '../../shared/ui/SectionPanel'
import './TeamPage.css'

// Phase 1: team overview/squad page, mirrors the original app's
// `/{lang}/teams/{slug}` route (overview tab only so far — tactics/staff/
// transfers/etc. are separate tabs there, not yet ported).
//
// Fase A (2026-08-16 EA FC redesign spec): squad renders as a PlayerCard
// grid instead of a table — same underlying `players` data, no API change.

type TeamPlayer = { id: number; name: string; position: string; age: number; currentAbility: number }
type TeamDetail = {
  id: number
  name: string
  slug: string
  clubId: number
  countryId: number
  leagueId: number | null
  leagueName: string | null
  reputation: number
  players: TeamPlayer[]
}

function TeamPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const [team, setTeam] = useState<TeamDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setTeam(null)
    setError(null)
    callApi<TeamDetail>(`/api/teams/${teamId}`)
      .then(setTeam)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [teamId])

  if (error) {
    return (
      <Layout title="Team">
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!team) {
    return (
      <Layout title="Team">
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  const subTitle = team.leagueId ? (
    <Link to={`/leagues/${team.leagueId}`}>{team.leagueName}</Link>
  ) : undefined

  return (
    <Layout title={team.name} subTitle={subTitle} sidebarCountryId={team.countryId}>
      <div className="fm-page">
        <SectionPanel
          title="Squad"
          actions={
            <>
              <span className="tp-count">{team.players.length}</span>
              <AiReportButton title="AI scouting report" startUrl={`/api/teams/${teamId}/ai-report`} />
            </>
          }
        >
          <div className="tp-grid">
            {team.players.map((p) => (
              <PlayerCard
                key={p.id}
                id={p.id}
                name={p.name}
                position={p.position}
                age={p.age}
                currentAbility={p.currentAbility}
              />
            ))}
          </div>
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default TeamPage
```

- [ ] **Step 2: Write `TeamPage.css`**

```css
/* soydt/web/src/features/teams/TeamPage.css */
.tp-grid {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
}

.tp-count {
  color: var(--text-muted);
  font-family: var(--font-display);
  font-weight: 700;
}
```

- [ ] **Step 3: Verify build stays clean**

Run: `cd soydt/web && npx tsc -b && npx vite build`
Expected: no errors.

- [ ] **Step 4: Browser verification with real data**

Per `soydt/MIGRATION_CHECKLIST.md`'s verification pattern (`POST
/api/game/create?countries=AR,UY,BR` then `POST
/api/game/process?days=5` against the Docker API, dev server against it),
open a team page (e.g. Boca Juniors) and confirm:
- Squad renders as a card grid, one `PlayerCard` per player.
- Rating badge tier color visibly differs across the squad's CA range
  (compare a starter vs. a fringe player).
- Clicking a card navigates to `/players/{id}`.
- Photo shows the placeholder silhouette for players without a downloaded
  photo, and the real photo for the Nacional players that have one (per
  `MIGRATION_CHECKLIST.md`'s Fase 3 note).

- [ ] **Step 5: Commit**

```bash
git add soydt/web/src/features/teams/TeamPage.tsx soydt/web/src/features/teams/TeamPage.css
git commit -m "feat(web): render team squad as EA FC-style player card grid"
```

---

## Task 9: PlayerPage hero + StatBar attribute sections

**Files:**
- Modify: `soydt/web/src/features/players/PlayerPage.tsx`
- Modify: `soydt/web/src/features/players/AttributeGrid.tsx`
- Create: `soydt/web/src/features/players/PlayerPage.css`

**Interfaces:**
- Consumes: `RatingBadge` (Task 2), `SectionPanel` (Task 5), `StatBar` (Task 3).
- `AttributeGrid`'s existing exported type `AttributeEntry = { key: string; label: string; value: number }` and its `title`/`entries` props are unchanged — only its internal rendering switches from icon+color tiles to `StatBar` rows, so `PlayerPage.tsx`'s four `<AttributeGrid title=... entries=.../>` call sites need no changes.

- [ ] **Step 1: Switch `AttributeGrid`'s internals to `StatBar`**

```tsx
// soydt/web/src/features/players/AttributeGrid.tsx
import StatBar from '../../shared/ui/StatBar'

export type AttributeEntry = { key: string; label: string; value: number }

function AttributeGrid({ title, entries }: { title: string; entries: AttributeEntry[] }) {
  return (
    <div className="fm-attr-group">
      <h4>{title}</h4>
      <div>
        {entries.map((entry) => (
          <StatBar key={entry.key} label={entry.label} value={entry.value} />
        ))}
      </div>
    </div>
  )
}

export default AttributeGrid
```

`attributeIcons.tsx`'s `ATTRIBUTE_ICONS` map is no longer imported here —
leave the file itself alone (out of scope for Fase A; no other consumer
depends on this file being removed).

- [ ] **Step 2: Rebuild the hero section of `PlayerPage.tsx`**

```tsx
// soydt/web/src/features/players/PlayerPage.tsx
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import AiReportButton from '../../shared/AiReportButton'
import Flag from '../../shared/Flag'
import Layout from '../../shared/Layout'
import { PositionBadge } from '../../shared/positions'
import RatingBadge from '../../shared/ui/RatingBadge'
import SectionPanel from '../../shared/ui/SectionPanel'
import AttributeGrid, { type AttributeEntry } from './AttributeGrid'
import './PlayerPage.css'

// Phase 1: player overview page, mirrors the original app's
// `/{lang}/players/{slug}` route (overview tab only so far — contract/
// history/transfers/etc. are separate tabs there, not yet ported).
//
// Fase A (2026-08-16 EA FC redesign spec): hero header + StatBar attribute
// rows replace the plain text rows / icon-tile grid — same underlying
// `player` data, no API change.

type TechnicalAttributes = {
  corners: number
  crossing: number
  dribbling: number
  finishing: number
  firstTouch: number
  freeKicks: number
  heading: number
  longShots: number
  longThrows: number
  marking: number
  passing: number
  penaltyTaking: number
  tackling: number
  technique: number
}

type MentalAttributes = {
  aggression: number
  anticipation: number
  bravery: number
  composure: number
  concentration: number
  decisions: number
  determination: number
  flair: number
  leadership: number
  offTheBall: number
  positioning: number
  teamwork: number
  vision: number
  workRate: number
}

type PhysicalAttributes = {
  acceleration: number
  agility: number
  balance: number
  jumping: number
  naturalFitness: number
  pace: number
  stamina: number
  strength: number
  matchReadiness: number
}

type GoalkeepingAttributes = {
  aerialReach: number
  commandOfArea: number
  communication: number
  eccentricity: number
  firstTouch: number
  handling: number
  kicking: number
  oneOnOnes: number
  passing: number
  punching: number
  reflexes: number
  rushingOut: number
  throwing: number
}

type PlayerDetail = {
  id: number
  firstName: string
  lastName: string
  age: number
  position: string
  countryCode: string
  countryName: string
  currentAbility: number
  value: number
  currentReputation: number
  height: number
  weight: number
  isInjured: boolean
  isBanned: boolean
  technicalAvg: number
  mentalAvg: number
  physicalAvg: number
  technical: TechnicalAttributes
  mental: MentalAttributes
  physical: PhysicalAttributes
  goalkeeping: GoalkeepingAttributes | null
  teamId: number | null
  teamName: string | null
}

const TECHNICAL_LABELS: [keyof TechnicalAttributes, string][] = [
  ['corners', 'Corners'],
  ['crossing', 'Crossing'],
  ['dribbling', 'Dribbling'],
  ['finishing', 'Finishing'],
  ['firstTouch', 'First Touch'],
  ['freeKicks', 'Free Kicks'],
  ['heading', 'Heading'],
  ['longShots', 'Long Shots'],
  ['longThrows', 'Long Throws'],
  ['marking', 'Marking'],
  ['passing', 'Passing'],
  ['penaltyTaking', 'Penalty Taking'],
  ['tackling', 'Tackling'],
  ['technique', 'Technique'],
]

const MENTAL_LABELS: [keyof MentalAttributes, string][] = [
  ['aggression', 'Aggression'],
  ['anticipation', 'Anticipation'],
  ['bravery', 'Bravery'],
  ['composure', 'Composure'],
  ['concentration', 'Concentration'],
  ['decisions', 'Decisions'],
  ['determination', 'Determination'],
  ['flair', 'Flair'],
  ['leadership', 'Leadership'],
  ['offTheBall', 'Off the Ball'],
  ['positioning', 'Positioning'],
  ['teamwork', 'Teamwork'],
  ['vision', 'Vision'],
  ['workRate', 'Work Rate'],
]

const PHYSICAL_LABELS: [keyof PhysicalAttributes, string][] = [
  ['acceleration', 'Acceleration'],
  ['agility', 'Agility'],
  ['balance', 'Balance'],
  ['jumping', 'Jumping'],
  ['naturalFitness', 'Natural Fitness'],
  ['pace', 'Pace'],
  ['stamina', 'Stamina'],
  ['strength', 'Strength'],
  ['matchReadiness', 'Match Readiness'],
]

const GOALKEEPING_LABELS: [keyof GoalkeepingAttributes, string][] = [
  ['aerialReach', 'Aerial Reach'],
  ['commandOfArea', 'Command of Area'],
  ['communication', 'Communication'],
  ['eccentricity', 'Eccentricity'],
  ['firstTouch', 'First Touch'],
  ['handling', 'Handling'],
  ['kicking', 'Kicking'],
  ['oneOnOnes', 'One on Ones'],
  ['passing', 'Passing'],
  ['punching', 'Punching'],
  ['reflexes', 'Reflexes'],
  ['rushingOut', 'Rushing Out'],
  ['throwing', 'Throwing'],
]

function toEntries<T extends Record<string, number>>(labels: [keyof T, string][], values: T): AttributeEntry[] {
  return labels.map(([key, label]) => ({ key: key as string, label, value: values[key] }))
}

function PlayerPage() {
  const { playerId } = useParams<{ playerId: string }>()
  const [player, setPlayer] = useState<PlayerDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inWatchlist, setInWatchlist] = useState(false)

  useEffect(() => {
    setPlayer(null)
    setError(null)
    callApi<PlayerDetail>(`/api/players/${playerId}`)
      .then(setPlayer)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
    callApi<{ id: number }[]>('/api/watchlist').then((list) =>
      setInWatchlist(list.some((p) => p.id === Number(playerId))),
    )
  }, [playerId])

  const toggleWatchlist = async () => {
    if (inWatchlist) {
      await callApi(`/api/watchlist/${playerId}`, { method: 'DELETE' })
    } else {
      await callApi(`/api/watchlist/${playerId}`, { method: 'POST' })
    }
    setInWatchlist(!inWatchlist)
  }

  if (error) {
    return (
      <Layout title="Player">
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!player) {
    return (
      <Layout title="Player">
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  const subTitle = (
    <span>
      <Flag code={player.countryCode} /> {player.countryName}
      {player.teamId && (
        <>
          {' — '}
          <Link to={`/teams/${player.teamId}`}>{player.teamName}</Link>
        </>
      )}
    </span>
  )

  return (
    <Layout title={`${player.firstName} ${player.lastName}`} subTitle={subTitle}>
      <div className="fm-page">
        <SectionPanel
          title="Overview"
          actions={
            <>
              <button onClick={toggleWatchlist}>{inWatchlist ? '★ On watch list' : '☆ Add to watch list'}</button>
              <AiReportButton title="AI scouting dossier" startUrl={`/api/players/${playerId}/ai-report`} />
            </>
          }
        >
          <div className="pp-hero">
            <RatingBadge value={player.currentAbility} size="lg" />
            <img
              className="pp-photo"
              src={`/static/images/players/${player.id}.jpg`}
              onError={(e) => {
                e.currentTarget.onerror = null
                e.currentTarget.src = '/static/images/player/placeholder-face.svg'
              }}
              alt=""
              width={100}
              height={125}
            />
            <div className="pp-info">
              <p>
                <PositionBadge position={player.position} /> — Age: {player.age}
              </p>
              <p>
                Value: {player.value.toLocaleString()} — Reputation: {player.currentReputation}
              </p>
              <p>
                Height: {player.height}cm — Weight: {player.weight}kg
              </p>
              <p>
                Technical: {player.technicalAvg.toFixed(1)} — Mental: {player.mentalAvg.toFixed(1)} — Physical:{' '}
                {player.physicalAvg.toFixed(1)}
              </p>
              {player.isInjured && <p style={{ color: '#e74c3c' }}>Injured</p>}
              {player.isBanned && <p style={{ color: '#e74c3c' }}>Banned</p>}
            </div>
          </div>
        </SectionPanel>

        <SectionPanel title="Atributos">
          <AttributeGrid title="Technical" entries={toEntries(TECHNICAL_LABELS, player.technical)} />
          <AttributeGrid title="Mental" entries={toEntries(MENTAL_LABELS, player.mental)} />
          <AttributeGrid title="Physical" entries={toEntries(PHYSICAL_LABELS, player.physical)} />
          {player.goalkeeping && (
            <AttributeGrid title="Goalkeeping" entries={toEntries(GOALKEEPING_LABELS, player.goalkeeping)} />
          )}
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default PlayerPage
```

- [ ] **Step 3: Write `PlayerPage.css`**

```css
/* soydt/web/src/features/players/PlayerPage.css */
.pp-hero {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
}

.pp-photo {
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}

.pp-info p {
  margin: 4px 0;
  color: var(--text-primary);
}
```

- [ ] **Step 4: Verify build stays clean**

Run: `cd soydt/web && npx tsc -b && npx vite build`
Expected: no errors.

- [ ] **Step 5: Browser verification with real data**

Open a player page (e.g. Leandro Paredes, per
`MIGRATION_CHECKLIST.md`'s existing verification note) and confirm:
- Hero shows `RatingBadge` (large), photo, position badge, age, value,
  reputation, height/weight, technical/mental/physical averages — same
  values the old rendering showed.
- "Atributos" section shows `StatBar` rows per attribute, color matching
  the old red/yellow/green bucketing (compare a known low vs. high value).
- Goalkeeping section still only appears for a goalkeeper.
- Watch-list toggle and AI report button still work.

- [ ] **Step 6: Commit**

```bash
git add soydt/web/src/features/players/PlayerPage.tsx soydt/web/src/features/players/PlayerPage.css soydt/web/src/features/players/AttributeGrid.tsx
git commit -m "feat(web): rebuild PlayerPage hero and attributes with EA FC theme"
```

---

## Task 10: Full-suite verification and Fase A close-out

**Files:** none (verification only).

**Interfaces:** none — this task consumes the finished state of Tasks 1–9.

- [ ] **Step 1: Full build**

Run: `cd soydt/web && npm run build`
Expected: `tsc -b && vite build` completes with no errors.

- [ ] **Step 2: Lint**

Run: `cd soydt/web && npm run lint`
Expected: no errors/warnings introduced by this plan's files.

- [ ] **Step 3: Full-stack Docker verification**

Per `CLAUDE.md`'s documented commands:

```bash
docker build -f soydt/Dockerfile -t soydt-api .
docker run -p 8080:8080 soydt-api
```

Then, against that container (or the faster Rust-only loop +
`npm run dev` against it if only frontend files changed since the last
full build):

```bash
curl -X POST "http://localhost:8080/api/game/create?countries=AR,UY,BR"
curl -X POST "http://localhost:8080/api/game/process?days=5"
```

- [ ] **Step 4: Browser pass across all three touched surfaces**

Using the preview tools against the running dev server + API:
- `/countries` (untouched page) — confirm it still renders exactly as
  before this plan; theme.css must not have leaked any visual change here.
- Any team page — `Layout` nav rail + `TeamPage` player-card grid.
- Any player page from that team — `Layout` + `PlayerPage` hero/StatBars.
- Resize to mobile width — sidebar toggle still works, no horizontal
  overflow on the new components.

Capture a screenshot of each of the three touched surfaces as evidence.

- [ ] **Step 5: Update `MIGRATION_CHECKLIST.md`**

Add a note under a new "UI redesign (Fase A)" subsection (or the most
fitting existing section) recording that `Layout`/`TeamPage`/`PlayerPage`
now use the EA FC-style theme (`shared/theme.css` + `shared/ui/*`), and
that all other pages remain on the old Bootstrap/`style.css` styling
pending later fases — mirroring how other partial/simplified work is
already documented in that file.

- [ ] **Step 6: Commit**

```bash
git add soydt/MIGRATION_CHECKLIST.md
git commit -m "docs: record Fase A EA FC UI redesign in migration checklist"
```
