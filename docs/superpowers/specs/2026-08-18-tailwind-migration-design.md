# Tailwind migration — Fase 1 (pipeline + shared kit + toasts)

Status: approved by user, ready for implementation planning.

## Context

`soydt/web` currently styles everything with plain CSS custom properties
(`shared/theme.css`) consumed by hand-written `.css` files per component/page
— the EA Sports FC-style redesign documented in
`2026-08-16-ea-fc-ui-redesign-design.md` and tracked in `DESIGN_SYSTEM.md`.
That redesign explicitly chose "no new frontend dependencies (no Tailwind...)"
at the time.

User now wants to move the whole app onto Tailwind CSS (utility-first,
class-based dark mode), `tailwindcss-animate`, `lucide-react` for icons
(there are currently zero SVG icons in the app — every icon-like element is
an emoji/unicode glyph: ★ ☆ ⇄ ▲), and `sonner` for toast notifications
(there is currently no toast library and no `alert()` calls — confirmations
today are inline state, e.g. `DtSquadPage`'s "Guardada ✓" button label or
`DtTransfersPage`'s `setMessage('Transferencia completada.')` paragraph).

Full scope (~50 pages) is too large for one spec/plan — same reasoning the
original EA FC redesign spec used to scope itself to "Fase A". This document
covers **Fase 1 only**: the build pipeline, the shared UI kit
(`shared/ui/*` + `NavRail`), and app-wide toast adoption for action
confirmations. Migrating the ~50 individual feature pages off their
per-page `.css` files is **explicitly deferred** to later fases, tracked as
follow-up work once Fase 1's shared kit exists for them to build on.

## Decisions (confirmed with user)

- Keep the existing EA FC visual identity (tiers, triangle motif, motion
  language) — this is a technology migration (CSS-in-hand-file →
  Tailwind utility classes), not a visual redesign. Every existing
  `theme.css` token must still resolve to the same value.
- Fase 1 scope: Tailwind/PostCSS pipeline + `tailwind.config.js` token
  mapping + rewriting `shared/ui/*` (`SectionPanel`, `DataTable`,
  `RatingBadge`, `StatBar`, `PlayerCard`, `TabBar`, and any other file
  under `shared/ui/`) and `shared/NavRail`/`DtLayout`'s nav chrome in
  Tailwind, plus global `sonner` adoption for action-confirmation
  messages. The ~50 feature pages under `features/*` keep their existing
  per-page `.css` files in this fase — they still render correctly because
  the shared components they consume keep the same visual output.
- Icons (`lucide-react`) are introduced only inside the Fase 1 shared kit
  (nav rail entries, `SectionPanel` action slots, `DataTable` status-badge
  cells for injured/banned/loan) — no standalone sweep replacing emoji
  glyphs inside feature pages this fase.
- Toasts (`sonner`) replace the existing ad-hoc success-confirmation
  patterns app-wide now (it's a small, mechanical, high-value change):
  `DtSquadPage`'s "Guardada ✓" state, `DtTransfersPage`'s
  `setMessage('Transferencia completada.')`, and any other
  `setSaved`/`setMessage`-style success flag found via a repo-wide grep.
  Inline **error** paragraphs (`<p style={{color:'crimson'}}>Error: …`,
  ~50 call sites) are explicitly **out of scope** for Fase 1 — flagged as a
  possible Fase 3 follow-up, not touched here.
- Dark mode: Tailwind's `class` strategy, but the app is dark-only today
  (no light/dark toggle exists) — the class is set once, statically, no
  runtime switch logic needed.

## Architecture

### 1. Build pipeline

- Add dev dependencies: `tailwindcss`, `postcss`, `autoprefixer`,
  `tailwindcss-animate`. Add runtime dependencies: `lucide-react`,
  `sonner`.
- `postcss.config.js` — standard `tailwindcss` + `autoprefixer` plugin pair.
- `tailwind.config.js` — `darkMode: 'class'`; `content` globbed over
  `src/**/*.{ts,tsx}`; `theme.extend` maps every existing `theme.css`
  custom property into Tailwind's palette/spacing/etc. so utilities read
  the token, not a hardcoded literal (`colors.surface[0..3]` →
  `var(--surface-0)` etc., same for `accent-primary/secondary/tertiary`,
  `tier-bronze/silver/gold/elite`, `spacing` off `--space-1..6`,
  `borderRadius.card` off `--radius-card`, `boxShadow.card` off
  `--shadow-card`, `transitionTimingFunction` off `--ease-momentum`/
  `--ease-trajectory`/`--ease-out`). `theme.css` itself is unchanged and
  stays the single source of truth for the actual color/spacing values —
  Tailwind config only aliases into it.
- `tailwindcss-animate` registered as a Tailwind plugin; existing
  `motion.css` keyframes (`anim-fade-in-up`, `.snap`, reduced-motion guard)
  stay as-is in Fase 1 — they get ported to the plugin's utilities
  opportunistically when a component that uses them is touched, not as a
  blanket swap.
- Global stylesheet import order unchanged: `theme.css` still loads first
  in `main.tsx`; add one new Tailwind entry stylesheet
  (`@tailwind base; @tailwind components; @tailwind utilities;`) imported
  alongside it. `style.css` (the legacy pre-DataTable-migration sheet still
  serving un-migrated pages) and every existing per-page `.css` file keep
  working untouched — Tailwind's utility classes and hand-written CSS
  classes coexist on the same elements without conflict since neither
  redefines the other's class names.

### 2. Shared kit migration (`shared/ui/*`, `NavRail`, `DtLayout` chrome)

Each component gets its JSX rewritten to Tailwind utility classes (built
from the token mapping above, so colors/spacing/radii match exactly) and
its co-located `.css` file deleted once nothing references it. Order,
riskiest/most-reused first so problems surface early:

1. `RatingBadge` + `StatBar` — small, self-contained, easy to visually diff.
2. `SectionPanel` — used by nearly every page; verify the triangle-notch
   title accent and per-section gradient tint (`accent` prop) still render
   identically.
3. `DataTable` — verify row highlighting (`dt-row-highlight`) and standings
   zone striping (`zone-ucl`/`zone-uel`/`zone-rel`) still work; this is
   where `lucide-react` status-badge icons replace the emoji-style
   indicators for injured/banned/loan in the cells that show them.
4. `PlayerCard` — the most visually complex piece (clipped shield
   silhouette, tier gradients, specular hover sweep, elite glow pulse,
   Trajectory badge entrance). Highest risk of visual drift — plan for a
   careful side-by-side check against the current build.
5. `TabBar` — has DT club-color override hooks (`--tab-fg`,
   `--header-bg`, etc.) that must keep working through Tailwind's
   arbitrary-value syntax (`bg-[var(--header-bg)]`) or an equivalent.
6. `NavRail` / `DtLayout`'s header+sidebar chrome — touches every page's
   frame, so do this last within Fase 1, once the pieces it's built from
   are already verified.

Each step: rewrite → `npm run build` (tsc + vite) clean → `npm run lint`
clean → visual check in the Browser pane (the page(s) that exercise this
component) before moving to the next component. Same discipline the
`DESIGN_SYSTEM.md` migration log already used for the DataTable/TabBar
sweeps.

### 3. Icons (`lucide-react`)

Introduced exactly where the Fase 1 components need a status/action glyph:
- `DataTable` injured/banned/loan badge cells.
- `SectionPanel` action-slot buttons that today use a unicode glyph
  (e.g. `DtBoardPage`/`DtSquadPage`'s save/best-XI buttons) — only the ones
  living inside components actually touched this fase.
- `NavRail` nav entries, if the current nav uses text/emoji markers.

No global grep-and-replace of every emoji in `features/*` this fase.

### 4. Toasts (`sonner`)

- `<Toaster />` mounted once, in `App.tsx` alongside the existing
  `ProcessProvider`/`ProcessOverlay`/`DtEventModal` globals.
- Repo-wide grep for the `setSaved`/`setMessage`-style success-confirmation
  pattern (known instances: `DtSquadPage.save`, `DtTransfersPage.doTransfer`
  success path — full list confirmed via grep during implementation, not
  hand-enumerated here) — each replaced by a `toast.success(...)` call;
  the local state field driving the old inline text is removed if nothing
  else reads it.
- Error paragraphs are untouched, per the Decisions section above.

## Testing

- `npm run build` and `npm run lint` clean after each component migration
  step (not just once at the end) — catches regressions at the component
  that caused them.
- Browser-pane visual check against the running dev server + live game
  API for each migrated component: `RatingBadge`/`StatBar` on `PlayerPage`,
  `SectionPanel` tint variants on `TeamFinancesPage`/`TeamTacticsPage`/
  `TeamScoutingPage`, `DataTable` row highlighting on `DtTablePage`, zone
  striping on `LeagueTablePage`, `PlayerCard` tier rendering across
  bronze/silver/gold/elite examples, `TabBar` DT club-color override on a
  DT page, full `NavRail`/`DtLayout` frame on any DT page.
- Toast smoke test: trigger `DtSquadPage`'s lineup save and
  `DtTransfersPage`'s transfer flow against the live game, confirm the
  toast appears and the old inline confirmation text is gone.

## Out of scope (Fase 1)

- Migrating the ~50 `features/*` page-level `.css` files — later fase(s),
  page-by-page or by feature area, once this shared kit exists.
- Removing legacy `style.css` (still serving pages not yet migrated).
- Inline error-paragraph → toast conversion.
- Any new visual direction — output must match current EA FC styling
  pixel-for-pixel where token-driven, spot-checked where not.
- Light-mode / theme-toggle support (app is dark-only; `class` strategy is
  chosen for future-proofing only, not built out this fase).
