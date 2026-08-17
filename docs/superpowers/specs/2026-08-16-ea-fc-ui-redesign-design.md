# EA Sports FC-style UI/UX redesign — Fase A (design system + flagship pages)

Status: approved by user, ready for implementation planning.

## Context

`soydt/web` currently ports the original `open-football` Askama templates
pixel-for-pixel: `bootstrap.min.css` + a hand-written `style.css` using
`fm-sidebar`/`fm-header`/bootstrap grid classes. It looks like a generic
admin dashboard, not a football management game.

User wants the UI/UX pushed much closer to FIFA/EA Sports FC's Career Mode
visual language: player cards, dark theme with neon accents, stat
bars/radar-style attribute visuals, and a career-mode-style dashboard hub —
across the whole app.

Full scope (~50 pages) is too large for one spec/plan. This document covers
**Fase A only**: a reusable design system plus the 3 highest-visibility
surfaces (shared `Layout`, team squad view, player page). Remaining pages
roll out in later fases reusing the same system — tracked as follow-up work,
not part of this spec.

## Decisions (confirmed with user)

- Fase A scope: design system + `Layout` (nav/header) + `TeamPage` squad
  view + `PlayerPage`. Rest of the ~50 pages deferred to later fases.
- Visual pillars to capture: player cards (Ultimate Team style rating
  cards), dark theme with neon accents, stat bars / radar-style attribute
  visuals, career-mode dashboard feel for navigation.
- New CSS layer, not a Bootstrap override. Old `bootstrap.min.css`/
  `style.css` stay as-is and keep serving all pages not yet migrated —
  nothing in this fase removes them.
- No new frontend dependencies (no Tailwind, no CSS-in-JS lib). Plain CSS
  custom properties, matching the project's existing plain-CSS approach and
  the `soydt/web` "no unnecessary deps" convention.
- Build order: `Layout` first (nav/header touches every page, sets the
  visual frame), then `TeamPage`, then `PlayerPage`.

## Architecture

### 1. Theme tokens — `soydt/web/src/shared/theme.css`

New stylesheet, imported once (in `main.tsx` or `App.tsx`, alongside the
existing `index.css`/`bootstrap.min.css` imports — does not replace them).
Defines CSS custom properties only, no selectors beyond `:root`:

- Color: dark navy/charcoal surface scale (`--surface-0..3`), neon
  green/cyan accent pair (`--accent-primary`, `--accent-secondary`), rating
  tier colors (`--tier-gold`, `--tier-silver`, `--tier-bronze`,
  `--tier-green` for high CA), semantic text colors on dark
  (`--text-primary`, `--text-muted`).
- Typography: a bold condensed/italic display stack for headers and rating
  numbers (`--font-display`), regular stack for body (`--font-body`). No
  new font *files* — use a system/webfont already reachable (check
  `public/static/fonts` first before pulling anything external, since
  external font fetches are a network dependency Fase A should avoid).
- Spacing/radius/shadow scale reused by every new component
  (`--space-1..6`, `--radius-card`, `--shadow-card`).

### 2. New UI kit — `soydt/web/src/shared/ui/`

One file per component, each with a co-located `.css` file (matches no
existing convention exactly, but keeps new components self-contained and
easy to touch independently — see "Design for isolation" below). All
consume only `theme.css` tokens, no bootstrap classes.

- `RatingBadge.tsx` — big numeric badge (e.g. player CA/OVR), tier-colored
  border/background via a `tier` prop derived from the numeric value
  (thresholds reused from wherever the app already buckets CA, e.g.
  `attributeColor.ts` — check for an existing bucketing function before
  adding a new one).
- `StatBar.tsx` — labeled horizontal bar, gradient fill by value, reuses
  `attributeColor.ts`'s existing color-by-value logic if compatible rather
  than duplicating thresholds.
- `PlayerCard.tsx` — Ultimate-Team-style card: photo/silhouette (reuses the
  existing `placeholder-face.svg`/per-player photo logic from `PlayerPage`),
  `RatingBadge`, name, position, 3-4 key stats, tier-colored border/gradient
  driven by CA.
- `SectionPanel.tsx` — card/panel container replacing ad-hoc
  `panel`/`card` bootstrap divs in the 3 touched pages only.
- `NavRail.tsx` — icon-tile sidebar nav, replaces the flat `<ul
  className="fm-nav-section">` list in `Layout.tsx`. Same nav data
  (`NAV_ITEMS`, country leagues section, bottom lang toggle) — visual
  treatment only, no new nav items and no routing changes.

None of these components fetch data themselves — same pattern as the rest
of `soydt/web` (pages own their `callApi` calls, components are
presentational).

### 3. Pages touched

- **`shared/Layout.tsx`** — swap the sidebar `<ul>`/`<li>` markup for
  `NavRail`, swap header markup to use new theme tokens. Keeps
  `sidebarCountryId` prop, `ProcessControl`, `AiSettingsBadge`, search/
  watchlist links, and all existing routes exactly as they are — this is a
  visual pass, not a nav restructure.
- **`features/teams/...` squad tab** — replace the current table/list
  rendering of the squad with a `PlayerCard` grid. Exact file(s) to be
  identified during planning (`Glob` for the squad-rendering component
  under `features/teams/`).
- **`features/players/PlayerPage`** (or equivalent filename — confirm exact
  path during planning) — hero header combining `RatingBadge` + photo +
  position, attribute sections rendered via `StatBar` instead of the
  current icon+color-text rows (`attributeIcons.tsx`'s existing icon set
  stays; only the value visualization changes to bars).

No API/contract changes — engine-ffi, controllers, and DTOs are untouched.
This is presentation-layer only.

## Testing / verification

- `npm run build` (tsc + vite) must stay clean.
- `npm run lint` (oxlint) must stay clean.
- Dev server (`npm run dev`) + browser check for all 3 surfaces:
  - `Layout` nav rail renders, active-route highlighting still works,
    country-leagues section still appears/disappears correctly, mobile
    sidebar toggle still works.
  - `TeamPage` squad grid renders real player data (via the existing
    Docker/API dev setup), tier coloring visibly differs across a squad's
    CA range.
  - `PlayerPage` hero + stat bars render real player data, values match
    what the old rendering showed (no data regression, only visual).
  - Contrast check on dark theme (readable text/badges) and a quick
    resize/responsive pass on `Layout`'s sidebar collapse.
- No regression on pages *not* touched this fase — spot-check one untouched
  page (e.g. `countries`) still renders under old styles unaffected by
  `theme.css` being loaded globally (tokens are custom properties only, no
  bare-element selectors, so this should be inherently safe — verify it
  is).

## Out of scope (deferred to later fases)

- All other ~47 pages (leagues, cups, match, staff, countries detail
  pages, etc.) — rolled out incrementally reusing this same design system,
  each as its own small bounded task once Fase A is verified.
- Removing/replacing `bootstrap.min.css`/`style.css` — stays until every
  page has migrated.
- Radar-chart visuals (mentioned as a visual pillar) — `StatBar` covers the
  "stat bars" half of that pillar for Fase A; an actual radar/spider chart
  for player attribute comparison is a distinct, separable feature and
  should get its own bounded task later rather than being bundled here.
- Career-mode "dashboard hub" home screen — `NavRail` captures the
  navigation feel; a dedicated home/dashboard page with summary tiles is
  out of scope for Fase A (no such page currently exists to redesign).
