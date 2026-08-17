# Design system — EA FC visual language

Living doc for the "EA FC-style" restyle of `soydt/web`. Tracks tokens, the
EA Sports FC motifs we're borrowing, a backlog of improvements (researched
2026-08-17), and a migration plan for pages still on the old `fm-`/bootstrap
`style.css` classes. Update status as items land — same spirit as
`MIGRATION_CHECKLIST.md`.

## Sources

- [EA Sports FC 24 | BUCK](https://buck.co/work/ea-sports-fc-24) — official brand/motion system: triangle motif, 4 motion principles, 1,028 animated compositions, toggleable light/dark.
- [EA SPORTS FC PRO | Further](https://www.further.group/work/ea-sports-fc-pro) — F37 custom headline font cut at the triangle's angle, tournament-brand gradient tints off one base palette.
- `soydt/design-reference/` — frame grabs pulled from the BUCK reel (sources: `https://stream.mux.com/UcOQpa3BKYz00kJ01sa02F01XZFIF1Prw4zGHtkab00NHVhM.m3u8` — the 4-principles/triangle-grid reel; `https://stream.mux.com/Pu5DJGqbxOpsOY02QSyOW4KHo02s2gwGaqua92qOI4QDk.m3u8` — a second reel, background/texture reference specifically, no frames pulled from it yet), kept as local visual reference for the motion/motif work above (not shipped assets — do not import from `web/`):
  - `motion-principles-legend.png` — the 4-quadrant Trajectory/Formation/Momentum/Match Cut diagram; source for the "EA FC motifs we're borrowing" section below.
  - `triangle-grid-dark.png` / `triangle-grid-fade.png` — the triangle-tessellation background/fade treatment behind BUCK's motion diagrams; reference for the loading/empty-state triangle-motif backlog item.
  - `surface-swatch.png` — flat dark background color grab; sanity-check reference for `--surface-0`.

## Tokens (`soydt/web/src/shared/theme.css`)

Imported globally via `main.tsx`. `:root` custom properties only — no
element/class selectors, so pages that don't opt into the component kit are
unaffected.

- **Surfaces**: `--surface-0..3`, dark navy/charcoal scale.
- **Accents**: `--accent-primary` (pitch-green `#2ee6a6`), `--accent-secondary` (broadcast-cyan `#3fc7ff`).
- **Rating tiers**: `--tier-bronze/silver/gold/elite` + `-rgb` triplets for `rgba()` glows.
- **Type**: `--font-display` (condensed/italic headline stand-in for F37 — no license for the real EA font), `--font-body`.
- **Spacing/shape**: `--space-1..6`, `--radius-card`, `--shadow-card`.
- **Motion** (Fase C, 2026-08-17): `--transition-fast/base/slow`, `--ease-out`.
- **Motion** (Fase D, this pass): `--ease-momentum` (overshoot, "forward drive" — value reveals/counters), `--ease-trajectory` (fast linear-ish — badges/indicators moving on a line).
- **Triangle motif** (Fase D): `--clip-triangle` — `polygon(0 0, 100% 50%, 0 100%)`, the FC brand's core shape as a reusable clip-path.

## EA FC motifs we're borrowing

1. **Triangle** — the brand's foundational shape (BUCK: "integral to the brand identity"; FC Pro's headline font is literally cut at the triangle's angle). Use as a small accent/notch, not a background pattern — reserve it for markers (active state, panel titles), not decoration everywhere.
2. **Four motion principles** (BUCK):
   - *Trajectory* — ball/player straight-line movement. → `--ease-trajectory`.
   - *Formation* — staggered group choreography. → existing `.anim-fade-in-up` + `--i` stagger.
   - *Momentum* — forward drive, slight overshoot. → `--ease-momentum`.
   - *Match Cuts* — hard snap between states, not a soft crossfade. → not yet tokenized (see backlog).
3. **Toggleable light/dark with gradient tints per sub-brand** — FC Pro gives each tournament brand its own gradient tint off one base palette. Analogue here: per-section accent tint (finances/tactics/scouting) instead of one green everywhere.
4. **Kinetic typography** — numbers animate in rather than just appearing (FUT's OVR/stat reveal).

## Status

### Done (pre-existing, Fase A-C)
- FUT-style player card (`PlayerCard.css`): clipped shield silhouette, tier gradients, specular hover sweep, elite glow pulse.
- Rating tiers (bronze/silver/gold/elite) with radial-highlight badges.
- `.anim-fade-in-up` Formation-style staggered entrance (`motion.css`).
- `prefers-reduced-motion` guard.
- NavRail active-tab breathing glow.

### Done (Fase D — this pass)
- [x] `--ease-momentum` / `--ease-trajectory` tokens + `--clip-triangle` (`theme.css`).
- [x] `useCountUp` hook (`shared/useCountUp.ts`) — kinetic count-up with momentum easing, reduced-motion aware. Wired into `RatingBadge` (OVR) and `StatBar` (attribute values).
- [x] Triangle accent on `SectionPanel` titles (`.sp-title::before`).
- [x] Triangle active-tab marker on `NavRail`, sliding in via `--ease-trajectory` (replaces the old rectangle `border-left`).

### Done (Fase E — global retheme pass, this session)
- [x] **Header/tabbar dark-theme bug fixed** — `.fm-tabbar`/`.fm-tab`/`.fm-tabbar-dropdown-menu` in `style.css` had `var(--header-bg, #fff)`-style fallbacks left over from the original light FM17 template; since nothing sets `--header-bg` outside DT club-color pages, every non-DT page (leagues/countries/staff sub-tabs) rendered a **white bar inside the dark `lyt-header`**. Fixed by swapping fallbacks to `var(--surface-0/1/3)`/`var(--text-primary/muted)`/`var(--accent-primary)`, matching the pattern `DtLayout.css` already used correctly. Verified via computed styles (`getComputedStyle` in-browser) — tabbar/dropdown now render dark, DT club-color override still works unchanged.
- [x] **Bulk color-token unification in `style.css`** — the legacy stylesheet had 1,079 hardcoded hex colors (vs. 0 in `TeamPage.css`, 2 in `PlayerPage.css` — the newer kit files are fully tokenized already). Consolidated the ~18 most-repeated **text/border/link** hex values (9 near-duplicate muted grays, 3 near-duplicate light text colors, 3 near-duplicate border/divider colors, the old blue link color, the old green accent) into `theme.css` tokens — **260 occurrences** replaced (`4a9d5b`→`--accent-primary`, `546a78`/`6b7580`/`7a868e`/`7a8a96`/`6c8290`/`94a3af`/`8a949c`/`51626d`/`6a7a86`/`4e5a63`→`--text-muted`, `d0d6dc`/`d8dee4`/`c8d4de`→`--text-primary`, `263340`/`2a3640`/`2c3c4a`→`--surface-3`, `4a9eff`→`--accent-secondary`). Verified: `npm run build` (tsc + vite) clean, spot-checked computed colors in-browser match tokens exactly.
- **Deliberately left alone** (~800 remaining hex occurrences): semantic status colors (injury/loan/morale red-green-amber badges — not surface tokens, shouldn't unify), gradient stop *pairs* in panel backgrounds (`fm-panel`/`fm-panel-head` — collapsing both stops to one token would flatten the intentional depth), and sidebar-specific darks (already visually consistent with the rest, just a slightly different dark-navy shade — cosmetic, not a bug).

### Done (Phase 1 of the fm-/style.css migration plan, this session)
- [x] **`shared/ui/DataTable.tsx`/`.css`** — generic token-styled table (`columns`/`rows`/`rowKey`/`rowClassName`/`emptyMessage` props), replacing the ~20 bespoke `fm-*-table`/`fm-squad`/`fm-standings`/`fm-skills`/etc. table variants (the migration plan below originally assumed one shared `fm-table`/`fm-row` pair — that was wrong; real inventory was ~20 differently-named per-page table classes in `style.css`, none shared). Supports per-row highlighting (`.dt-row-highlight`) and standings zone striping (`.zone-ucl`/`.zone-uel`/`.zone-rel`) for the two pages that needed it (`DtTablePage`, `LeagueTablePage`).
- [x] **All ~45 raw `<table>` call sites migrated** across players/teams/leagues/cups/countries/staff/dt features — verified via `npm run build` (tsc + vite, clean) and `oxlint` (no new warnings) after the sweep; zero raw `<table>` elements remain outside `DataTable.tsx` itself.
- [x] **Fixed a correctness bug from that migration**: several pages kept legacy per-cell classNames (`sq-name`, `st-club`, `st-pts`, `st-name`/`st-role`/`st-nat`/`st-age`/`st-wage`, `sch-date`/`sch-time`/`sch-venue`/`sch-result`/`sch-comp`) whose `style.css` rules were scoped to the old ancestor table class (e.g. `.fm-squad .sq-name`) — since every table now renders as `.dt-table`, that ancestor scoping silently broke, dropping column widths/colors with no build error to catch it. Re-scoped the same rule bodies under `.dt-table` in `DataTable.css` (unchanged values) so the intended styling actually applies again. Also added two small reusable utilities, `.dt-cell-muted`/`.dt-cell-strong`, to restore `StaffPage`'s attribute-table label/value styling that depended on `.fm-skills td:first-child`/`:last-child`.
- [x] `soydt/design-reference/` added — BUCK reel frame grabs (4 motion principles diagram, triangle-grid textures) kept as local design reference, not shipped web assets (previously sitting unused in `web/public/static/images/videoframe_*.png`).

### Done (Phase 2 of the fm-/style.css migration plan, this session)
- [x] **`shared/ui/TabBar.tsx`/`.css`** — token-based replacement for `fm-tabbar`/`fm-tab`, same visual spec (italic condensed labels, bottom-border active indicator) and the same `--tab-fg`/`--tab-fg-active`/`--tab-active-border`/`--header-bg`/`--header-border` override hooks the old classes had (for DT club-color theming, if a tab bar ever needs it — currently unused since `DtLayout` renders its own `NavRail`, not these tabs).
- [x] All 3 call sites migrated: `leagues/tabs.tsx`, `countries/tabs.tsx`, `staff/tabs.tsx`. `dt`'s sub-nav was already on `NavRail`, not `fm-tabbar` — out of scope. Verified via `npm run build` (clean).
- Match Cuts snap-transition backlog item (instant active-indicator move) not done here — `TabBar`'s active state is still a plain CSS class swap; revisit when that token exists.

### Done (Match Cuts token, this session)
- [x] `--transition-snap` token (`theme.css`, 0.05s) + `.snap`/`.snap *` utility (`motion.css`) — forces instant `transition-duration`/linear timing on an element that already has its own state-change transition, for the Match Cuts principle (hard snap vs. Formation's soft `fadeInUp`).
- [x] Wired into `TabBar`'s active-indicator: `border-color` now transitions on `--transition-snap` (instant swap) while `color`/`background` keep the soft hover fade on `--transition-fast` — the exact case Phase 2's note flagged as a follow-up.

### Done (triangle-grid background texture, this session)
- [x] `shared/patterns.css` — `.bg-triangle-grid` utility, a CSS-only triangle tessellation (3 layered `repeating-linear-gradient`s at 0/60/-60deg) replicating `design-reference/triangle-grid-dark.png`'s look without shipping the PNG. Imported globally via `main.tsx`.
- [x] Applied to `ProcessOverlay.tsx`'s card background (layered over its existing `--card-bg` solid color).
- [x] Spinner replaced: `ProcessOverlay.tsx`'s loading indicator is now a rotating triangle (`clip-path` + `fm-process-tri-spin` keyframe) instead of the generic circular `.spinner` — scoped to this one call site only (the shared global `.spinner` class also backs the holiday button and AI-report status dot elsewhere in `style.css`; touching those wasn't in scope and would've widened the blast radius for no requested benefit).

### Done (per-section gradient tints, this session)
- [x] `--accent-tertiary` token added (`theme.css`, violet `#b98cf2`) alongside existing primary/secondary.
- [x] `SectionPanel` gained an `accent?: 'primary' | 'secondary' | 'tertiary' | 'gold'` prop — sets `--sp-accent`, which both the title's triangle notch and a new faint linear-gradient wash across `.sp-head` key off (`gold` maps to the existing `--tier-gold` token rather than adding a 5th palette color).
- [x] Wired: `TeamFinancesPage` → `secondary` (cyan), `TeamTacticsPage` → `tertiary` (violet), `TeamScoutingPage` → `gold`. `TeamAcademyPage` left on the `primary` default (green fits youth/pitch-growth framing).

### Done (card-body radial specular per tier, this session)
- [x] `PlayerCard.css`: `.pc-tier-gold .pc-shape::before`/`.pc-tier-elite .pc-shape::before` — a faint radial sheen (`radial-gradient` near the card top) layered under the photo/nameplate, extending the highlight language `.pc-rank-value`/`rb-badge` already used to the card body itself. Bronze/silver keep the flat linear tier gradient only, matching the backlog note's framing (gold/elite get the extra treatment, not every tier).

### Done (PlayerCard badge Trajectory entrance, this session)
- [x] `.pc-rank-value`/`.pc-pos-value`/`.pc-growth-badge` now slide in on `--ease-trajectory` (`pc-badge-in-left`/`pc-badge-in-right` keyframes) on mount, mirroring NavRail's active-tab triangle marker's "fast, direct path" entrance instead of rendering statically. Growth badge gets a small stagger delay so it reads as following the OVR badge in, not simultaneous.

Backlog is now empty — everything tracked above is done. Next candidates for a future pass: Phase 3/4 fine-grained dead-CSS removal in `style.css` (see Migration plan below), or a fresh BUCK-reel sweep if the second mux source above turns up more motifs worth adopting.

## Migration plan — retiring `fm-`/bootstrap `style.css`

Most feature pages are currently **hybrid**: wrapped in the new kit
(`SectionPanel`, `PlayerCard`) but with tables/rows/tabs still rendering old
`fm-table`/`fm-row`/`fm-tab` classes styled by the legacy `public/static/css/style.css`
(pre-port Bootstrap-derived sheet). Confirmed via grep: ~50 of ~53 feature
pages reference `fm-` classes; the same ~45 already use `SectionPanel` or
`PlayerCard`. So this isn't "old pages vs new pages" — it's finishing the
per-element swap within pages that are already half-migrated.

**Phase 1 — Data table kit — done, see Status above.** `shared/ui/DataTable.tsx`
+ `.css` built and every `<table>` call site migrated (leagues, teams,
players, dt, cups, countries, staff). Note for future phases: there was no
single shared `fm-table`/`fm-row` pair — each page had its own bespoke table
class (`fm-squad`, `fm-standings`, `fm-skills`, `fm-aw-season-table`, `fm-
workers-table`, etc., ~20 total in `style.css`) with different columns, so
the swap was per-page, not a single find/replace.

**Phase 2 — Tab bar kit — done, see Status above.** `shared/ui/TabBar.tsx`
built and wired into `countries/tabs.tsx`/`leagues/tabs.tsx`/`staff/tabs.tsx`
(`dt`'s sub-nav uses `NavRail`, not `fm-tabbar` — nothing to migrate there).
Match Cuts snap-transition still pending as a follow-up polish item.

**Phase 3 — reassessed, this session: mostly already done or not needed.**
Buttons: `ButtonKit.css` restyles every `<button>` globally via a bare
`button:not(.fm-menu-toggle):not(.fm-slot)` selector, independent of
className — "buttons not yet on ButtonKit" doesn't apply, every button
already gets the shared shape/shine/press. `fm-page` (131 call sites) is a
trivial one-rule page-padding wrapper, not duplicated boilerplate worth
extracting. The ~150 remaining distinct `fm-*` classes (`fm-ai-*` report
dialog, `fm-slot-*` squad drag-drop, `fm-ab-*` About-page prose, `fm-worker-
dialog-*`, `fm-cond-*`, badges, etc.) are almost all single-use and
page-specific — no cross-page duplication to collapse into a shared
component the way tables/tabs had. Treat these as legitimate bespoke
styling, not migration debt; only revisit a specific one if/when a second
page needs the same pattern (componentize on the 2nd occurrence, not
preemptively).

**Phase 4 — Delete legacy CSS: not applicable as originally scoped.** The
plan assumed Phase 3 would zero out all `fm-` references so `style.css`
could be deleted wholesale; per the Phase 3 reassessment above, most
remaining `fm-*` rules back real, still-referenced page-specific styling
and aren't going away. Fine-grained dead-code removal (rules for classes
with zero `.tsx` matches) is still worth doing eventually, but it's a
grep-and-verify sweep of `style.css` itself, not a page-by-page migration.

Do NOT attempt this as one PR — each phase is independently shippable and
individually verifiable against real game data, same rule as the main
migration checklist.
