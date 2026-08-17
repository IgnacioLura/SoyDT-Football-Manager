# EA Sports FC-style UI Redesign — Fase B (full rollout)

> **For agentic workers:** Use superpowers:subagent-driven-development. Batches touch disjoint files — dispatch one implementer per batch, sequentially (no parallel implementers, per skill). Fast/low-validation mode: implementer runs `npx tsc -b` after its batch and commits; no separate task-reviewer subagent per batch (owner reviews the final diff). Full formal review only at the end if requested.

**Goal:** Extend Fase A's EA FC dark theme (`shared/theme.css`, `shared/ui/*`) to every remaining page, so the whole app looks consistent — not just Layout/TeamPage/PlayerPage.

**Root cause of "no changes in DT mode":** `features/dt/DtLayout.tsx` is a hand-duplicated copy of the pre-Fase-A `Layout.tsx` — it never used `NavRail` and was never touched by Fase A, so every `/dt/*` route (squad, transfers, finances, table, events) still renders the old raw `fm-nav-section` sidebar. Fixing this one file is the highest-impact task.

## Global Constraints

- Reuse existing kit only: `SectionPanel`, `RatingBadge`, `StatBar`, `PlayerCard`, `NavRail` from `shared/ui/*`, `PositionBadge`/`positionInfo` from `shared/positions.tsx`, `attributeColor` — do not invent parallel components.
- No new npm dependencies. No changes to `bootstrap.min.css`, `style.css`, anything under `public/static/css`.
- No backend/API/DTO changes.
- Simplification precedent applies: pages with bespoke non-table UI (formation editor, match replay canvas, cup bracket tree) get their outer wrapper reskinned (`<section className="fm-panel">` → `<SectionPanel>`) but their internal bespoke markup is left as-is — do not attempt to redesign those interiors in this pass.
- Every batch: after editing, run `cd soydt/web && npx tsc -b` (must be clean) before committing.
- Mechanical transform per page (the common case — a page with one or more `<section className="fm-panel"><div className="fm-panel-head"><h3>X</h3>...</div>...</section>` blocks):
  1. Replace the `<section className="fm-panel">` + its `fm-panel-head` div with `<SectionPanel title="X" actions={...}>` (`actions` only if the head has more than the `<h3>`, e.g. a count badge or button — move those nodes into `actions`), closing with `</SectionPanel>`.
  2. Add `import SectionPanel from '.../shared/ui/SectionPanel'` (path depth depends on the file's location).
  3. Where a bare current-ability/OVR number renders via a `fm-ability`/similar span (not already using `RatingBadge`), swap it for `<RatingBadge value={n} size="sm" />` and import it — only where it's a simple scalar swap, not inside bespoke markup like `DtSquadPage`'s formation slots (those stay as designed, out of scope here).
  4. Leave all data-fetching, routing, and business logic completely unchanged — this is presentation-only.
- If a page has no `fm-panel` at all (e.g. it's just a `<p>` or a bespoke full-bleed canvas), leave it alone and note that in the report — not every page needs a change.

---

## Task B1: Restyle `DtLayout` to match `Layout` (highest impact — fixes all 5 `/dt/*` pages at once)

**Files:**
- Modify: `soydt/web/src/features/dt/DtLayout.tsx`
- Create: `soydt/web/src/features/dt/DtLayout.css`

**What to do:**
- Replace the hand-written `<div className="fm-sidebar">...<ul className="fm-nav-section">...` sidebar markup with `NavRail` (`import NavRail, { type NavRailItem } from '../../shared/ui/NavRail'`), passing the existing `NAV_ITEMS` (add `icon`/`title`/`url` — already shaped like `NavRailItem`) and `countryLeagues={null}` (DT mode has no country-leagues sidebar section), `activePath={location.pathname}`.
- Keep the per-club color theming (`--header-bg`/`--header-border`/`--tab-fg`/`--tab-fg-active` CSS custom properties + `fm-header-colored` class + `headerStyle`) exactly as-is — that's DT-specific and orthogonal to the dark theme; it still applies on top of the new dark header background.
- Add `DtLayout.css` mirroring `Layout.css`'s `.lyt-*` treatment (header background/padding/typography using `--surface-1`/`--font-display`/`--text-primary` etc.) applied to DtLayout's own header/title classes (`fm-header`→ keep the existing class name since the color-theming logic keys off it, but add the same visual polish Layout.css gives `.lyt-header`; simplest: rename the wrapper classes to reuse `lyt-header`/`lyt-header-title`/`lyt-header-sub`/`lyt-header-actions` from `Layout.css` directly instead of duplicating rules — check that `fm-header-colored`'s inline custom-property overrides still take effect since they're set via inline `style`, independent of class name).
- Verify: `npx tsc -b`, then manually confirm in the running dev server that `/dt/squad` now shows the dark `NavRail` sidebar with the DT-only 5 items, and the per-club header color override still visibly tints the header background.
- Commit: `git add soydt/web/src/features/dt/DtLayout.tsx soydt/web/src/features/dt/DtLayout.css && git commit -m "feat(web): restyle DtLayout nav/header with EA FC theme (Fase B)"`

---

## Task B2: `dt/*` pages — panel/rating swap

**Files:** `DtSquadPage.tsx`, `DtTransfersPage.tsx`, `DtFinancesPage.tsx`, `DtTablePage.tsx`, `DtEventsPage.tsx`

Apply the mechanical transform from Global Constraints. `DtSquadPage`'s formation-slot markup itself (photo tokens, dropdowns) stays untouched — only its outer `<section className="fm-panel">` wrapper becomes `SectionPanel`. Commit: `feat(web): reskin DT pages with SectionPanel (Fase B)`.

## Task B3: `countries/*` pages

**Files:** `CountriesPage.tsx`, `FreeAgentsPage.tsx`, `NationalSquadPage.tsx`, `SchedulePage.tsx`, `StaffPage.tsx`

Same transform. `NationalSquadPage` — if its squad list is a flat player list/table (check at implementation time), prefer swapping to the `PlayerCard` grid (same pattern as `TeamPage.tsx` Task 8 in Fase A) if the row shape already has `id`/`name`/`position`/`age`/`currentAbility`; otherwise just `SectionPanel`. Commit: `feat(web): reskin countries pages with SectionPanel (Fase B)`.

## Task B4: `leagues/*` pages

**Files:** `LeaguesPage.tsx`, `LeagueTablePage.tsx`, `LeagueTransfersPage.tsx`, `LeagueAwardsPage.tsx`, `LeagueSchedulePage.tsx`

Same transform — standings/table pages keep their `<table>` internals (per Global Constraints simplification note), only the wrapper becomes `SectionPanel`. Commit: `feat(web): reskin leagues pages with SectionPanel (Fase B)`.

## Task B5: `teams/*` remaining pages

**Files:** `TeamSchedulePage.tsx`, `TeamTransfersPage.tsx`, `TeamFinancesPage.tsx`, `TeamStaffPage.tsx`, `TeamStatsPage.tsx`, `TeamRelationsPage.tsx`, `TeamAcademyPage.tsx`, `TeamScoutingPage.tsx`, `TeamTacticsPage.tsx`

Same transform. `TeamFinancesPage` has several `fin-*` panels already listed in `style.css` — wrap each in its own `SectionPanel`, don't merge them into one. Commit: `feat(web): reskin remaining team pages with SectionPanel (Fase B)`.

## Task B6: `players/*` remaining pages

**Files:** `PlayerHistoryPage.tsx`, `PlayerContractPage.tsx`, `PlayerAwardsPage.tsx`, `PlayerMatchesPage.tsx`, `PlayerPersonalPage.tsx`, `PlayerTransfersPage.tsx`, `PlayerEventsPage.tsx`, `PlayerRelationsPage.tsx`

Same transform. Commit: `feat(web): reskin remaining player pages with SectionPanel (Fase B)`.

## Task B7: `staff/*`, `cups/*`, `misc/*`, `onboarding/*`, `match/*`

**Files:** `StaffPage.tsx`, `StaffPersonalPage.tsx`, `CupsPage.tsx`, `CupBracketPage.tsx`, `ContinentalCompetitionPage.tsx`, `AboutPage.tsx`, `SearchPage.tsx`, `WatchlistPage.tsx`, `NewGamePage.tsx`, `StartPage.tsx`, `MatchDetailPage.tsx`

Same transform where a `fm-panel` exists. `MatchReplayCanvas.tsx` (canvas-based) and `TeamCrest.tsx` (small icon component) are out of scope — don't touch. `StartPage`/`NewGamePage` are onboarding screens outside `Layout` (no sidebar) — only wrap their content panels if they use `fm-panel`, otherwise skip and note it. Commit: `feat(web): reskin remaining pages with SectionPanel (Fase B)`.

---

## Task B8: Full verification

- `cd soydt/web && npx tsc -b && npx vite build` clean.
- `npm run lint` (or `./node_modules/.bin/oxlint` directly if the npm wrapper misbehaves in-sandbox, per Fase A note) — no new errors.
- Manual browser pass: `/dt/squad`, `/dt/finances`, a league table, a team finances page, a player history page — confirm dark `SectionPanel` headers appear consistently, nothing visually broken (overlapping text, unreadable contrast).
- Commit any final fixups.
