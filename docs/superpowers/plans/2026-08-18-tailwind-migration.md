# Tailwind migration Fase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the Tailwind CSS build pipeline in `soydt/web` and migrate the shared UI kit (`shared/ui/*`, `NavRail`, `Layout`/`DtLayout` chrome) plus app-wide toast adoption onto it, without changing any visual output.

**Architecture:** `tailwind.config.js` aliases every `theme.css` custom property into Tailwind's theme (`theme.extend`) so utility classes read the existing token, not a new literal. Each `shared/ui/*` component's JSX is rewritten with those utilities and its co-located `.css` file is deleted once nothing references it — except `DataTable.css`, which keeps the rules driven by caller-supplied classNames (feature pages outside this fase's scope still pass literal strings like `zone-ucl`/`dt-row-highlight`/`sq-name` into it). `lucide-react` replaces the FontAwesome `<i className="fa ...">` icons inside the touched shared components only. `sonner` is mounted once in `App.tsx` and replaces the two existing ad-hoc success-confirmation state patterns.

**Tech Stack:** Tailwind CSS 3 (class-based dark mode), `tailwindcss-animate`, `lucide-react`, `sonner`, existing Vite + React 19 + TypeScript setup.

**Spec:** `docs/superpowers/specs/2026-08-18-tailwind-migration-design.md`

## Global Constraints

- Every existing `theme.css` custom property must still resolve to the same value — Tailwind config only aliases into `theme.css`, never redefines a value. `theme.css` itself is not edited in this plan.
- Visual output must match current EA FC styling pixel-for-pixel where token-driven, spot-checked where not (no new visual direction this fase).
- Dark mode: `darkMode: 'class'`, class set once statically on `<html>` — no runtime toggle logic (app is dark-only today).
- The ~50 `features/*` page-level `.css` files are explicitly out of scope this fase — do not touch them except the two files that get the toast conversion in Task 9 (`DtSquadPage.tsx`, `DtTransfersPage.tsx`), and only the specific state/JSX named in that task.
- `npm run build` (`tsc -b && vite build`) and `npm run lint` (`oxlint`) must be clean after **every** task, not just once at the end.
- **Note before starting:** `git status` in the repo currently shows uncommitted changes to `App.tsx`, `DtLayout.tsx`, `DtSquadPage.tsx`, `DtTransfersPage.tsx`, `PlayerPage.tsx`, `style.css`, and new untracked `DtBoardPage.tsx`/`PlayerComparePage.tsx`/`PlayerComparePage.css` — unrelated in-progress feature work, not this migration. Each task below reads the file's *current* on-disk content before editing (some line numbers/content shown here may already have shifted) rather than assuming the snapshot quoted in this plan is still exact.

---

### Task 1: Tailwind/PostCSS build pipeline

**Files:**
- Modify: `soydt/web/package.json`
- Create: `soydt/web/postcss.config.js`
- Create: `soydt/web/tailwind.config.js`
- Create: `soydt/web/src/shared/tailwind.css`
- Modify: `soydt/web/src/main.tsx`
- Modify: `soydt/web/index.html`

**Interfaces:**
- Produces: `tailwind.config.js`'s `theme.extend` token names (`colors.surface.0-3`, `colors.accent.primary/secondary/tertiary`, `colors.tier.bronze/silver/gold/elite`, `colors.text.primary/muted`, `fontFamily.display/body`, `spacing.1-6`, `borderRadius.card`, `boxShadow.card`, `transitionTimingFunction.momentum/trajectory/out`, `transitionDuration.fast/base/slow/snap`, and the `animation`/`keyframes` names `rb-elite-pulse`, `pc-card-shine`, `pc-badge-in-left`, `pc-badge-in-right`, `nr-tri-in`, `nr-active-glow`) — every later task's Tailwind classes reference these exact names.

- [ ] **Step 1: Install dependencies**

Run:
```bash
cd soydt/web
npm install -D tailwindcss postcss autoprefixer tailwindcss-animate
npm install lucide-react sonner
```

- [ ] **Step 2: Create `postcss.config.js`**

```js
// soydt/web/postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
```

- [ ] **Step 3: Create `tailwind.config.js`**

```js
// soydt/web/tailwind.config.js
module.exports = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          0: 'var(--surface-0)',
          1: 'var(--surface-1)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
        },
        accent: {
          primary: 'var(--accent-primary)',
          secondary: 'var(--accent-secondary)',
          tertiary: 'var(--accent-tertiary)',
        },
        tier: {
          bronze: 'var(--tier-bronze)',
          silver: 'var(--tier-silver)',
          gold: 'var(--tier-gold)',
          elite: 'var(--tier-elite)',
        },
        text: {
          primary: 'var(--text-primary)',
          muted: 'var(--text-muted)',
        },
      },
      fontFamily: {
        display: 'var(--font-display)',
        body: 'var(--font-body)',
      },
      spacing: {
        1: 'var(--space-1)',
        2: 'var(--space-2)',
        3: 'var(--space-3)',
        4: 'var(--space-4)',
        5: 'var(--space-5)',
        6: 'var(--space-6)',
      },
      borderRadius: {
        card: 'var(--radius-card)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
      },
      transitionTimingFunction: {
        momentum: 'var(--ease-momentum)',
        trajectory: 'var(--ease-trajectory)',
        out: 'var(--ease-out)',
      },
      transitionDuration: {
        fast: 'var(--transition-fast)',
        base: 'var(--transition-base)',
        slow: 'var(--transition-slow)',
        snap: 'var(--transition-snap)',
      },
      keyframes: {
        'rb-elite-pulse': {
          '0%, 100%': { boxShadow: 'var(--shadow-card), 0 0 0 0 rgba(var(--accent-primary-rgb), 0.45)' },
          '50%': { boxShadow: 'var(--shadow-card), 0 0 14px 2px rgba(var(--accent-primary-rgb), 0.4)' },
        },
        'pc-card-shine': {
          to: { transform: 'translateX(120%)' },
        },
        'pc-badge-in-left': {
          from: { transform: 'translateX(-14px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'pc-badge-in-right': {
          from: { transform: 'translateX(14px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'nr-tri-in': {
          from: { transform: 'translate(-10px, -50%)', opacity: '0' },
          to: { transform: 'translate(-2px, -50%)', opacity: '1' },
        },
        'nr-active-glow': {
          '0%, 100%': { boxShadow: 'none' },
          '50%': { boxShadow: '0 0 12px rgba(var(--accent-primary-rgb), 0.3)' },
        },
      },
      animation: {
        'rb-elite-pulse': 'rb-elite-pulse 2.2s ease-in-out infinite',
        'pc-card-shine': 'pc-card-shine 0.85s ease forwards',
        'pc-badge-in-left': 'pc-badge-in-left var(--transition-base) var(--ease-trajectory) both',
        'pc-badge-in-right': 'pc-badge-in-right var(--transition-base) var(--ease-trajectory) both',
        'nr-tri-in': 'nr-tri-in var(--transition-fast) var(--ease-trajectory) both',
        'nr-active-glow': 'nr-active-glow 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
```

- [ ] **Step 4: Create the Tailwind entry stylesheet**

```css
/* soydt/web/src/shared/tailwind.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Import it in `main.tsx`, right after `theme.css`**

```tsx
// soydt/web/src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './shared/theme.css'
import './shared/tailwind.css'
import './shared/motion.css'
import './shared/patterns.css'
import './shared/ButtonKit.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 6: Add the static `dark` class to `index.html`**

Edit `soydt/web/index.html`'s `<html>` tag:

```html
<html lang="en" class="dark">
```

- [ ] **Step 7: Verify the pipeline builds clean**

Run:
```bash
cd soydt/web
npm run build
npm run lint
```
Expected: both exit 0. No components use Tailwind classes yet, so this only proves the pipeline itself compiles.

- [ ] **Step 8: Commit**

```bash
git add soydt/web/package.json soydt/web/package-lock.json soydt/web/postcss.config.js soydt/web/tailwind.config.js soydt/web/src/shared/tailwind.css soydt/web/src/main.tsx soydt/web/index.html
git commit -m "build(web): add Tailwind/PostCSS pipeline"
```

---

### Task 2: RatingBadge + StatBar → Tailwind

**Files:**
- Modify: `soydt/web/src/shared/ui/RatingBadge.tsx`
- Delete: `soydt/web/src/shared/ui/RatingBadge.css`
- Modify: `soydt/web/src/shared/ui/StatBar.tsx`
- Delete: `soydt/web/src/shared/ui/StatBar.css`

**Interfaces:**
- Consumes: `useCountUp` (`../useCountUp`), `tailwind.config.js`'s `animate-rb-elite-pulse`, `border-tier-bronze/silver/gold`, `bg-accent-primary` etc. from Task 1.
- Produces: `RatingBadge`'s exported `ratingTier(value): RatingTier` signature is unchanged — `PlayerCard` (Task 5) imports it as-is.

- [ ] **Step 1: Rewrite `RatingBadge.tsx`**

```tsx
// soydt/web/src/shared/ui/RatingBadge.tsx
import { useCountUp } from '../useCountUp'

export type RatingTier = 'bronze' | 'silver' | 'gold' | 'elite'

// Current ability is a u8 (engine-ffi's `current_ability: u8`) — thresholds
// below are Fase A's initial bucketing for visual tiering, not a value
// pulled from game balance data. Recalibrated against the AR/UY/BR scoped
// world's actual pool (736 free agents, max observed ~124) so gold/elite
// are reachable instead of empty tiers. Tune freely without touching callers.
export function ratingTier(value: number): RatingTier {
  if (value >= 140) return 'elite'
  if (value >= 125) return 'gold'
  if (value >= 95) return 'silver'
  return 'bronze'
}

type RatingBadgeProps = {
  value: number
  size?: 'sm' | 'lg'
}

const TIER_CLASSES: Record<RatingTier, string> = {
  bronze: 'border-tier-bronze bg-[linear-gradient(155deg,var(--tier-bronze),var(--surface-2))]',
  silver: 'border-tier-silver bg-[linear-gradient(155deg,var(--tier-silver),var(--surface-2))] text-surface-0',
  gold: 'border-tier-gold bg-[linear-gradient(155deg,var(--tier-gold),var(--surface-2))] text-surface-0',
  elite:
    'border-accent-primary bg-[linear-gradient(155deg,var(--accent-primary),var(--surface-2))] text-surface-0 animate-rb-elite-pulse',
}

const SIZE_CLASSES: Record<'sm' | 'lg', string> = {
  lg: 'w-16 h-16 text-[28px]',
  sm: 'w-9 h-9 text-base',
}

function RatingBadge({ value, size = 'lg' }: RatingBadgeProps) {
  const tier = ratingTier(value)
  const displayed = useCountUp(value)
  return (
    <div
      className={`inline-flex items-center justify-center rounded-card border-2 border-transparent font-display font-bold italic text-text-primary shadow-card ${SIZE_CLASSES[size]} ${TIER_CLASSES[tier]}`}
    >
      <span className="leading-none">{displayed}</span>
    </div>
  )
}

export default RatingBadge
```

- [ ] **Step 2: Delete `RatingBadge.css`**

- [ ] **Step 3: Rewrite `StatBar.tsx`**

```tsx
// soydt/web/src/shared/ui/StatBar.tsx
import { useCountUp } from '../useCountUp'

type StatBarTone = 'normal' | 'inverse'

// Percentage-of-max bands, not absolute thresholds, so this scales to any
// `max` — equivalent to the old attributeColor(rounded) behavior at the
// default max=20 (its <=8/<=13 cutoffs are exactly 40%/65% of 20) for
// integer inputs; takes `rounded` rather than raw `value` so it stays
// exactly equivalent for fractional inputs too (e.g. value=8.4 rounds to
// 8, same red bucket as before, instead of reading as 42%/yellow).
// `tone="inverse"` flips which end reads as "good" (green) — needed for
// gauges where high = bad, e.g. board pressure (see
// docs/superpowers/specs/2026-08-17-club-board-design.md).
function barColor(pct: number, tone: StatBarTone): 'red' | 'yellow' | 'green' {
  const effective = tone === 'inverse' ? 100 - pct : pct
  if (effective <= 40) return 'red'
  if (effective <= 65) return 'yellow'
  return 'green'
}

const FILL_CLASSES: Record<'red' | 'yellow' | 'green', string> = {
  red: 'bg-[linear-gradient(90deg,#7a1f2b,#e74c3c)]',
  yellow: 'bg-[linear-gradient(90deg,#7a6a1f,#f2c94c)]',
  green: 'bg-[linear-gradient(90deg,#1f7a4c,var(--accent-primary))]',
}

type StatBarProps = {
  label: string
  value: number
  max?: number
  tone?: StatBarTone
}

function StatBar({ label, value, max = 20, tone = 'normal' }: StatBarProps) {
  const rounded = Math.round(value)
  const displayed = useCountUp(rounded)
  const pct = Math.max(0, Math.min(100, (rounded / max) * 100))
  const color = barColor(pct, tone)
  return (
    <div className="grid grid-cols-[120px_1fr_32px] items-center gap-2 py-[3px]">
      <span className="text-[13px] text-text-muted">{label}</span>
      <div className="h-1.5 overflow-hidden rounded-[3px] bg-surface-3">
        <div
          className={`h-full rounded-[3px] transition-[width] duration-slow ease-out ${FILL_CLASSES[color]}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-right font-display font-bold text-text-primary">{displayed}</span>
    </div>
  )
}

export default StatBar
```

- [ ] **Step 4: Delete `StatBar.css`**

- [ ] **Step 5: Verify build/lint clean**

```bash
cd soydt/web
npm run build
npm run lint
```

- [ ] **Step 6: Browser check**

Start the dev server (`npm run dev`) against the running game API, open `/players/:playerId` for a player of each tier (bronze/silver/gold/elite — use `/debug` pipe-check or browse via `/countries` to find examples), confirm `RatingBadge` renders the same gradient/border/pulse and `StatBar` renders the same bar colors/widths as before.

- [ ] **Step 7: Commit**

```bash
git add soydt/web/src/shared/ui/RatingBadge.tsx soydt/web/src/shared/ui/StatBar.tsx
git rm soydt/web/src/shared/ui/RatingBadge.css soydt/web/src/shared/ui/StatBar.css
git commit -m "refactor(web): migrate RatingBadge and StatBar to Tailwind"
```

---

### Task 3: SectionPanel → Tailwind

**Files:**
- Modify: `soydt/web/src/shared/ui/SectionPanel.tsx`
- Delete: `soydt/web/src/shared/ui/SectionPanel.css`

**Interfaces:**
- Consumes: `shared/motion.css`'s `.anim-fade-in-up` class (untouched, still imported globally via `main.tsx`) and its `--i` custom-property convention.
- Produces: `SectionPanel`'s prop signature (`title`, `actions`, `children`, `index`, `accent`) is unchanged — every page importing it (out of scope this fase) keeps working with no caller-side changes.

- [ ] **Step 1: Rewrite `SectionPanel.tsx`**

```tsx
// soydt/web/src/shared/ui/SectionPanel.tsx
import type { CSSProperties, ReactNode } from 'react'

type SectionPanelAccent = 'primary' | 'secondary' | 'tertiary' | 'gold'

const ACCENT_VARS: Record<SectionPanelAccent, string> = {
  primary: 'var(--accent-primary)',
  secondary: 'var(--accent-secondary)',
  tertiary: 'var(--accent-tertiary)',
  gold: 'var(--tier-gold)',
}

type SectionPanelProps = {
  title: string
  actions?: ReactNode
  children: ReactNode
  // Position among sibling panels rendered from a `.map()` (e.g. bracket
  // rounds, one panel per round) — staggers this panel's mount-in fade via
  // `shared/motion.css`'s `--i` convention. Omit for a lone panel or a
  // fixed handful stacked on a page (those fade in together, which reads
  // fine — staggering only helps for panels generated from a list).
  index?: number
  // Per-section gradient tint (see DESIGN_SYSTEM.md) — swaps the title
  // triangle/head accent off `--accent-primary` (default) to distinguish
  // domains (finances/tactics/scouting/academy) instead of every panel
  // using the same green, mirroring FC Pro's per-tournament tint approach.
  accent?: SectionPanelAccent
}

function SectionPanel({ title, actions, children, index, accent }: SectionPanelProps) {
  const style = {
    '--sp-accent': accent ? ACCENT_VARS[accent] : 'var(--accent-primary)',
    ...(index != null && { '--i': index }),
  } as CSSProperties

  return (
    <section
      className="anim-fade-in-up mb-5 overflow-hidden rounded-card border border-surface-3 bg-surface-1 shadow-card"
      style={style}
    >
      <div className="flex items-center justify-between border-b border-surface-3 bg-[linear-gradient(90deg,color-mix(in_srgb,var(--sp-accent)_10%,var(--surface-2)),var(--surface-2)_60%)] px-4 py-3">
        <h3 className="m-0 flex items-center gap-2 font-display italic font-bold uppercase tracking-[0.5px] text-text-primary before:h-[10px] before:w-2 before:shrink-0 before:bg-[var(--sp-accent)] before:[clip-path:var(--clip-triangle)] before:content-['']">
          {title}
        </h3>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="p-4">{children}</div>
    </section>
  )
}

export default SectionPanel
```

- [ ] **Step 2: Delete `SectionPanel.css`**

- [ ] **Step 3: Verify build/lint clean**

```bash
cd soydt/web
npm run build
npm run lint
```

- [ ] **Step 4: Browser check**

Open `TeamFinancesPage`, `TeamTacticsPage`, `TeamScoutingPage` (each uses a different `accent` prop) — confirm the title triangle notch and header gradient tint still render identically per page, and panel stagger (`index` prop, e.g. `CupBracketPage`) still cascades in.

- [ ] **Step 5: Commit**

```bash
git add soydt/web/src/shared/ui/SectionPanel.tsx
git rm soydt/web/src/shared/ui/SectionPanel.css
git commit -m "refactor(web): migrate SectionPanel to Tailwind"
```

---

### Task 4: DataTable → Tailwind (shell only)

**Files:**
- Modify: `soydt/web/src/shared/ui/DataTable.tsx`
- Modify: `soydt/web/src/shared/ui/DataTable.css` (trimmed, not deleted)

**Interfaces:**
- Consumes: nothing new.
- Produces: `DataTable`'s exported `DataTableColumn<T>` type and component props are unchanged.

**Why this one keeps its CSS file (unlike the others):** `DataTable.tsx` renders whatever `rowClassName`/column `className` strings its *callers* (the ~50 out-of-scope feature pages) pass in — e.g. `'zone-ucl'`, `'dt-row-highlight'`, `'sq-name'`. Those callers aren't touched this fase, so the CSS rules matching those literal class names must keep working. Only the classes `DataTable.tsx` itself fully owns (the base table/row/cell shell, and the `dt-align-*` strings it generates from the `align` prop) convert to Tailwind. The table keeps rendering the literal `dt-table` class too — with no rules of its own left in CSS — purely so `.dt-table .sq-name` etc. still match in the DOM.

- [ ] **Step 1: Check whether any icon-worthy status cell exists inside a `DataTable` column today**

Run:
```bash
cd soydt/web
grep -rn "injured\|banned\|suspend\|lesionad\|suspendid" src/features --include=*.tsx
```
Read each hit's surrounding component. Confirm (as of writing this plan) that the only such indicator is `DtSquadPage`'s `dt-squad-badge-unavailable` (`unavailableLabel(p)`), which renders inside that page's own custom lineup-slot grid markup, **not** as a `DataTable` column — so there is no in-scope `DataTable` status-badge cell to convert to `lucide-react` icons this fase. If the grep turns up a genuine `DataTable`-rendered status cell that didn't exist when this plan was written, swap its glyph for the matching `lucide-react` icon (`AlertCircle` for injured, `Ban` for suspended/banned, `ArrowRightLeft` for on-loan) using the same pattern as Task 7's icon swaps; otherwise skip and move to Step 2.

- [ ] **Step 2: Rewrite `DataTable.tsx`'s shell classes**

```tsx
// soydt/web/src/shared/ui/DataTable.tsx
// Generic replacement for the page-specific `fm-*-table`/`fm-squad`/`fm-standings`
// markup (see DESIGN_SYSTEM.md — Phase 1 of the fm-/style.css migration plan).
// Each page keeps its own column definitions/render logic; this just owns the
// <table> shell and token-based styling so every list looks consistent.
import type { Key, ReactNode } from 'react'
import './DataTable.css'

export type DataTableColumn<T> = {
  key: string
  header: ReactNode
  align?: 'left' | 'center' | 'right'
  className?: string
  render: (row: T, index: number) => ReactNode
}

function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowClassName,
  emptyMessage = 'No data',
}: {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T, index: number) => Key
  rowClassName?: (row: T, index: number) => string | undefined
  emptyMessage?: ReactNode
}) {
  if (rows.length === 0) {
    return <div className="dt-empty p-3.5 text-[13px] text-text-muted">{emptyMessage}</div>
  }

  return (
    <table className="dt-table w-full border-collapse [font-variant-numeric:tabular-nums]">
      <thead>
        <tr>
          {columns.map((c) => (
            <th
              key={c.key}
              className={`whitespace-nowrap border-b border-surface-3 px-[10px] py-[9px] text-left text-[10px] font-bold uppercase tracking-[0.5px] text-text-muted ${
                c.align ? `text-${c.align}` : ''
              }`}
            >
              {c.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={rowKey(row, i)}
            className={`border-l-[3px] border-l-transparent transition-colors duration-fast ease-linear even:bg-black/[0.12] hover:bg-white/[0.04] ${rowClassName?.(row, i) ?? ''}`}
          >
            {columns.map((c) => (
              <td
                key={c.key}
                className={[
                  'border-b border-white/[0.04] px-[10px] py-2 text-[13px] text-text-primary',
                  c.align ? `text-${c.align}` : '',
                  c.className ?? '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {c.render(row, i)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export default DataTable
```

- [ ] **Step 3: Trim `DataTable.css`** — remove only the rules now inlined as Tailwind utilities above; keep every rule driven by caller-supplied class names untouched

```css
/* soydt/web/src/shared/ui/DataTable.css
   `.dt-table` carries no rules of its own anymore — its base shell moved to
   Tailwind utilities in DataTable.tsx (see Fase 1 Tailwind migration).
   The class name itself stays on the <table> purely so the descendant
   selectors below (driven by rowClassName/column className strings that
   out-of-scope feature pages still pass into DataTable) keep matching. */

.dt-row-highlight td {
  font-weight: 700;
  background: rgba(74, 222, 128, 0.08);
}

/* Standings zone striping (UCL/UEL/relegation) — matches legacy
   .fm-standings tbody tr.zone-* colors in style.css. */
.dt-table tbody tr.zone-ucl {
  border-left-color: #2ecc71;
}

.dt-table tbody tr.zone-uel {
  border-left-color: #3498db;
}

.dt-table tbody tr.zone-rel {
  border-left-color: #e74c3c;
}

.dt-cell-muted {
  color: var(--text-muted, #8b93a7);
}

.dt-cell-strong {
  font-weight: 700;
  width: 28px;
}

/* Legacy per-column cell classNames carried over from the fm-squad/
   fm-standings/fm-staff-table/fm-schedule markup they replaced (see
   DESIGN_SYSTEM.md Phase 1) — those rules were scoped to the old ancestor
   table class (e.g. `.fm-squad .sq-name`), which no longer wraps them now
   that every table renders as `.dt-table`. Re-scoped here, unchanged
   values, so pages that kept these classNames on DataTable columns still
   get their intended width/color. */
.dt-table .sq-name {
  white-space: nowrap;
}

.dt-table .sq-name a {
  font-weight: 400;
}

.dt-table .st-club {
  text-align: left;
  padding-left: 12px;
}

.dt-table .st-club a {
  color: var(--text-primary, #f4f6fa);
  font-weight: 400;
  font-size: 15px;
}

.dt-table .st-pts {
  font-weight: 700;
  color: #fff;
  width: 46px;
  font-size: 14px;
}

.dt-table .st-name {
  width: 30%;
}

.dt-table .st-name a {
  font-weight: 500;
}

.dt-table .st-role {
  width: 22%;
  color: var(--text-muted, #8b93a7);
  font-size: 12px;
}

.dt-table .st-nat {
  width: 48px;
}

.dt-table .st-age {
  width: 60px;
  text-align: center;
}

.dt-table .st-wage {
  width: 120px;
}

.dt-table .sch-date {
  width: 100px;
  color: var(--text-muted, #8b93a7);
  font-size: 12px;
}

.dt-table .sch-time {
  width: 70px;
  color: var(--text-muted, #8b93a7);
  font-size: 12px;
}

.dt-table .sch-venue {
  width: 70px;
  text-align: center;
}

.dt-table .sch-result {
  width: 100px;
  text-align: center;
}

.dt-table .sch-comp {
  color: var(--text-muted, #8b93a7);
  font-size: 12px;
}
```

- [ ] **Step 4: Verify build/lint clean**

```bash
cd soydt/web
npm run build
npm run lint
```

- [ ] **Step 5: Browser check**

Open `DtTablePage` (row highlighting) and `LeagueTablePage` (zone striping) — confirm both still render identically to before this task.

- [ ] **Step 6: Commit**

```bash
git add soydt/web/src/shared/ui/DataTable.tsx soydt/web/src/shared/ui/DataTable.css
git commit -m "refactor(web): migrate DataTable shell to Tailwind"
```

---

### Task 5: PlayerCard → Tailwind

**Files:**
- Modify: `soydt/web/src/shared/ui/PlayerCard.tsx`
- Delete: `soydt/web/src/shared/ui/PlayerCard.css`

**Interfaces:**
- Consumes: `ratingTier`/`RatingTier` from `./RatingBadge` (Task 2), `positionInfo` from `../positions`, `playerPhotoOnError`/`playerPhotoSrc` from `../playerPhoto`, `useOvrGrowth` from `../useOvrGrowth`, and `animate-pc-badge-in-left`/`animate-pc-badge-in-right`/`animate-pc-card-shine` from `tailwind.config.js` (Task 1).
- Produces: `PlayerCardProps` (`id`, `name`, `position`, `age`, `currentAbility`, `index`) unchanged.

**Highest visual-drift risk in this fase** (per spec) — do a careful side-by-side check against the current build before moving on.

- [ ] **Step 1: Rewrite `PlayerCard.tsx`**

```tsx
// soydt/web/src/shared/ui/PlayerCard.tsx
import type { CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { positionInfo } from '../positions'
import { playerPhotoOnError, playerPhotoSrc } from '../playerPhoto'
import { useOvrGrowth } from '../useOvrGrowth'
import { ratingTier, type RatingTier } from './RatingBadge'

export type PlayerCardProps = {
  id: number
  name: string
  position: string
  age: number
  currentAbility: number
  // Position in the grid it renders in — staggers this card's mount-in
  // animation (`--i` consumed by `shared/motion.css`'s `.anim-fade-in-up`)
  // so a squad grid cascades in instead of popping in all at once. Omit
  // for a single card rendered on its own (e.g. outside a grid).
  index?: number
}

const TIER_SHAPE_BG: Record<RatingTier, string> = {
  bronze: 'linear-gradient(165deg, var(--tier-bronze) 0%, var(--surface-0) 72%)',
  silver: 'linear-gradient(165deg, var(--tier-silver) 0%, var(--surface-0) 72%)',
  gold: 'linear-gradient(165deg, var(--tier-gold) 0%, var(--surface-0) 72%)',
  elite: 'linear-gradient(165deg, var(--accent-primary) 0%, var(--surface-0) 72%)',
}

const TIER_RANK_COLOR: Record<RatingTier, string> = {
  bronze: 'var(--tier-bronze)',
  silver: 'var(--tier-silver)',
  gold: 'var(--tier-gold)',
  elite: 'var(--accent-primary)',
}

// Card-body radial specular per tier (see DESIGN_SYSTEM.md) — bronze/silver
// only had the flat linear tier gradient; gold/elite get an extra faint
// radial sheen across the body.
const TIER_HAS_SHEEN: Record<RatingTier, boolean> = {
  bronze: false,
  silver: false,
  gold: true,
  elite: true,
}

const TIER_HOVER_GLOW: Record<RatingTier, string> = {
  bronze: 'drop-shadow(var(--shadow-card))',
  silver: 'drop-shadow(var(--shadow-card))',
  gold: 'drop-shadow(var(--shadow-card)) drop-shadow(0 0 12px rgba(var(--tier-gold-rgb), 0.4))',
  elite: 'drop-shadow(var(--shadow-card)) drop-shadow(0 0 14px rgba(var(--accent-primary-rgb), 0.5))',
}

function PlayerCard({ id, name, position, age, currentAbility, index }: PlayerCardProps) {
  const tier = ratingTier(currentAbility)
  const pos = positionInfo(position)
  const ovrGrowth = useOvrGrowth(id, currentAbility)

  return (
    <Link
      to={`/players/${id}`}
      className="group relative block h-[236px] w-44 text-text-primary no-underline transition-transform duration-base ease-out hover:-translate-y-1 hover:scale-[1.03]"
      style={index != null ? ({ '--i': index } as CSSProperties) : undefined}
      draggable={false}
    >
      {/* Rank/position badges live outside the clipped shape on purpose —
          that inner div carries the clip-path that cuts the shield
          silhouette, and any child of a clipped element gets clipped too.
          Keeping the badges as siblings lets them overflow above the
          shield's corners instead of being sliced off by it. */}
      <span
        className="absolute -top-[10px] left-3 z-[4] flex h-[42px] w-[42px] animate-pc-badge-in-left items-center justify-center rounded-full border-2 border-white/65 font-display text-xl font-bold italic leading-none text-surface-0 shadow-[0_3px_8px_rgba(0,0,0,0.55)]"
        style={{ background: `radial-gradient(circle at 32% 28%, #fff8 0%, transparent 45%), ${TIER_RANK_COLOR[tier]}` }}
      >
        {Math.round(currentAbility)}
      </span>
      {ovrGrowth > 0 && (
        <span className="absolute left-3 top-8 z-[5] min-w-[42px] animate-pc-badge-in-left whitespace-nowrap rounded-lg bg-[#4ade80] px-1 py-px text-center font-display text-[11px] font-bold text-[#052e16] shadow-[0_2px_4px_rgba(0,0,0,0.4)] [animation-delay:0.08s]">
          ▲ +{ovrGrowth}
        </span>
      )}
      <span
        className="absolute -top-[10px] right-3 z-[4] flex h-[42px] w-[42px] animate-pc-badge-in-right items-center justify-center rounded-full border-2 border-white/65 font-display text-sm font-bold italic leading-none text-text-primary shadow-[0_3px_8px_rgba(0,0,0,0.55)]"
        style={{ background: `radial-gradient(circle at 32% 28%, #fff5 0%, transparent 45%), ${pos.color}` }}
      >
        {pos.code}
      </span>
      <div
        className="relative isolate flex h-full w-full flex-col items-center px-2 pb-4 pt-3 transition-[filter] duration-base ease-linear [clip-path:polygon(50%_0%,88%_8%,100%_36%,100%_82%,50%_100%,0%_82%,0%_36%,12%_8%)]"
        style={
          {
            background: TIER_SHAPE_BG[tier],
            filter: 'drop-shadow(var(--shadow-card))',
            '--pc-hover-glow': TIER_HOVER_GLOW[tier],
          } as CSSProperties
        }
      >
        {TIER_HAS_SHEEN[tier] && (
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_50%_12%,rgba(255,255,255,0.16),transparent_60%)]" />
        )}
        {/* FUT-style specular sweep on hover — an oversized diagonal
            gradient bar, parked off-screen at rest and only animated
            across while the card is hovered. */}
        <div className="pointer-events-none absolute -inset-1/2 z-[3] -translate-x-[120%] bg-[linear-gradient(115deg,transparent_40%,rgba(255,255,255,0.28)_50%,transparent_60%)] group-hover:animate-pc-card-shine" />
        <div className="mt-[-8px] flex flex-1 items-end justify-center">
          <img
            className="object-cover [mask-image:radial-gradient(ellipse_68%_82%_at_50%_40%,black_55%,transparent_100%)]"
            src={playerPhotoSrc(id)}
            onError={playerPhotoOnError}
            alt=""
            width={140}
            height={172}
            draggable={false}
          />
        </div>
        <div className="z-[2] flex w-[78%] flex-col items-center gap-px border-t border-white/25 pt-1">
          <div className="text-center font-display text-sm font-bold italic tracking-[0.02em] [text-shadow:0_1px_2px_rgba(0,0,0,0.5)]">
            {name}
          </div>
          <div className="text-[11px] text-text-muted">Age {age}</div>
        </div>
      </div>
    </Link>
  )
}

export default PlayerCard
```

Add this one Tailwind-plugin-level rule the JSX above depends on but Tailwind can't express as a plain utility (the group-hover filter reads a per-tier CSS variable) — it's already covered by the `group-hover:animate-pc-card-shine` and the inline `--pc-hover-glow` variable, but the *shape* div's own hover filter swap needs one arbitrary-property utility added to the shape `className` string above:

```
group-hover:[filter:var(--pc-hover-glow)]
```

Add `group-hover:[filter:var(--pc-hover-glow)]` to the shape `<div>`'s className (append it after `ease-linear`) so hovering the card swaps to the per-tier glow filter.

- [ ] **Step 2: Delete `PlayerCard.css`**

- [ ] **Step 3: Verify build/lint clean**

```bash
cd soydt/web
npm run build
npm run lint
```

- [ ] **Step 4: Browser check — all four tiers**

Open a squad/free-agents grid with players across bronze/silver/gold/elite CA bands (e.g. `/countries/:countryId/free-agents`). For each tier confirm: shield clip-path renders correctly, tier gradient matches, gold/elite show the radial sheen, hover triggers the specular sweep + lift + tier-glow filter, rank/growth/position badges slide in from the correct side, elite rank badge doesn't clip against the shield.

- [ ] **Step 5: Commit**

```bash
git add soydt/web/src/shared/ui/PlayerCard.tsx
git rm soydt/web/src/shared/ui/PlayerCard.css
git commit -m "refactor(web): migrate PlayerCard to Tailwind"
```

---

### Task 6: TabBar → Tailwind

**Files:**
- Modify: `soydt/web/src/shared/ui/TabBar.tsx`
- Delete: `soydt/web/src/shared/ui/TabBar.css`

**Interfaces:**
- Consumes: `--header-bg`/`--header-border`/`--tab-fg`/`--tab-fg-active`/`--tab-active-border`/`--tab-hover-bg` CSS custom properties set by `DtLayout.tsx` (Task 7) for club-color theming.
- Produces: `TabBarItem<T>` type and component props unchanged.

- [ ] **Step 1: Rewrite `TabBar.tsx`**

```tsx
// soydt/web/src/shared/ui/TabBar.tsx
// Generic replacement for the fm-tabbar/fm-tab markup duplicated across
// leagues/tabs.tsx, countries/tabs.tsx, staff/tabs.tsx (see DESIGN_SYSTEM.md
// Phase 2 of the fm-/style.css migration plan).
import { Link } from 'react-router-dom'

export type TabBarItem<T extends string> = {
  key: T
  label: string
  to: string
}

function TabBar<T extends string>({ items, active }: { items: TabBarItem<T>[]; active: T }) {
  return (
    <div className="flex max-w-full overflow-x-auto bg-[var(--header-bg,var(--surface-0))] border-b border-[var(--header-border,var(--surface-3))]">
      {items.map((item) => (
        <Link
          key={item.key}
          className={`inline-flex items-center whitespace-nowrap px-[18px] py-[10px] font-display text-[10px] font-semibold italic uppercase leading-none tracking-[0.6px] cursor-pointer border-b-2 [transition:color_var(--transition-fast)_ease,background-color_var(--transition-fast)_ease,border-color_var(--transition-snap)_linear] hover:text-[var(--tab-fg-active,var(--text-primary))] hover:bg-[var(--tab-hover-bg,rgba(255,255,255,0.04))] ${
            active === item.key
              ? 'text-[var(--tab-fg-active,var(--text-primary))] border-b-[var(--tab-active-border,var(--accent-primary))]'
              : 'text-[var(--tab-fg,var(--text-muted))] border-b-transparent'
          }`}
          to={item.to}
        >
          {item.label}
        </Link>
      ))}
    </div>
  )
}

export default TabBar
```

Note: the arbitrary `[transition:...]` value keeps the original's "Match Cuts" distinction — color/background fade at `--transition-fast`, but the active-tab border swap snaps instantly at `--transition-snap` — which a single `transition-colors duration-fast` utility would collapse into one duration.

- [ ] **Step 2: Delete `TabBar.css`**

- [ ] **Step 3: Verify build/lint clean**

```bash
cd soydt/web
npm run build
npm run lint
```

- [ ] **Step 4: Browser check**

Open a page using `TabBar` under DT club-color theming (any `/dt/*` page that renders tabs, or a `TeamPage` sub-tab) — confirm the active-tab underline/color still picks up the club's `--tab-active-border`/`--tab-fg-active` override, and the border-color swap still reads as an instant snap on click rather than an eased fade.

- [ ] **Step 5: Commit**

```bash
git add soydt/web/src/shared/ui/TabBar.tsx
git rm soydt/web/src/shared/ui/TabBar.css
git commit -m "refactor(web): migrate TabBar to Tailwind"
```

---

### Task 7: NavRail + Layout/DtLayout chrome → Tailwind + lucide-react icons

**Files:**
- Modify: `soydt/web/src/shared/ui/NavRail.tsx`
- Delete: `soydt/web/src/shared/ui/NavRail.css`
- Modify: `soydt/web/src/shared/Layout.tsx`
- Modify: `soydt/web/src/features/dt/DtLayout.tsx`

**Interfaces:**
- Consumes: `animate-nr-tri-in`/`animate-nr-active-glow` from `tailwind.config.js` (Task 1), `lucide-react`'s `LucideIcon` type and named icon components.
- Produces: `NavRailItem`'s `icon` field changes type from `string` (a `fa-*` class suffix) to `LucideIcon` (a component reference) — this is a breaking change to every caller of `NavRail`, both of which (`Layout.tsx`, `DtLayout.tsx`) are updated in this same task.

Last in Fase 1's shared-kit order — touches every page's frame, done once the pieces it's built from (SectionPanel, TabBar) are already verified.

- [ ] **Step 1: Rewrite `NavRail.tsx`**

```tsx
// soydt/web/src/shared/ui/NavRail.tsx
import { Link } from 'react-router-dom'
import { Trophy, type LucideIcon } from 'lucide-react'

export type NavRailItem = { title: string; icon: LucideIcon; url: string }
export type NavRailLeague = { id: number; name: string }

type NavRailProps = {
  navItems: NavRailItem[]
  countryLeagues: NavRailLeague[] | null
  activePath: string
}

const TILE_BASE =
  'relative flex items-center gap-3 rounded-card p-3 font-display font-semibold no-underline transition-[background-color,color,transform] duration-fast ease-linear hover:bg-surface-2 hover:text-text-primary hover:translate-x-0.5'

// Triangle motif (see DESIGN_SYSTEM.md) — active-tab marker as the FC
// brand's triangle instead of a plain rectangle bar, sliding in along its
// own point. Slow breathing glow matches the DT lineup's "actively
// selected" pulse language elsewhere in the app.
const TILE_ACTIVE =
  'bg-surface-2 text-accent-primary animate-nr-active-glow before:content-[\'\'] before:absolute before:left-0 before:top-1/2 before:h-3.5 before:w-1.5 before:-translate-x-0.5 before:-translate-y-1/2 before:animate-nr-tri-in before:bg-accent-primary before:[clip-path:var(--clip-triangle)]'

const TILE_INACTIVE = 'text-text-muted'

function NavRail({ navItems, countryLeagues, activePath }: NavRailProps) {
  return (
    <nav className="bg-surface-0 p-3">
      <ul className="mb-4 flex list-none flex-col gap-1 p-0">
        {navItems.map((item) => {
          const Icon = item.icon
          const active = activePath.startsWith(item.url)
          return (
            <li key={item.url}>
              <Link to={item.url} className={`${TILE_BASE} ${active ? TILE_ACTIVE : TILE_INACTIVE}`}>
                <Icon size={18} />
                <span>{item.title}</span>
              </Link>
            </li>
          )
        })}
      </ul>
      {countryLeagues && countryLeagues.length > 0 && (
        <ul className="mb-4 flex list-none flex-col gap-1 p-0">
          {countryLeagues.map((league) => {
            const active = activePath.startsWith(`/leagues/${league.id}`)
            return (
              <li key={league.id}>
                <Link to={`/leagues/${league.id}`} className={`${TILE_BASE} ${active ? TILE_ACTIVE : TILE_INACTIVE}`}>
                  <Trophy size={18} />
                  <span>{league.name}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </nav>
  )
}

export default NavRail
```

- [ ] **Step 2: Delete `NavRail.css`**

- [ ] **Step 3: Update `Layout.tsx`'s `NAV_ITEMS` and its own raw chrome icons/tile**

Read `soydt/web/src/shared/Layout.tsx`'s current content first (it may have shifted from what's quoted in this plan's earlier exploration). Apply these changes:

- Add `import { Globe2, Search, Shield, Star } from 'lucide-react'` near the top.
- Change `const NAV_ITEMS: NavRailItem[] = [{ title: 'Countries', icon: 'fa-earth-americas', url: '/countries' }]` to:
  ```tsx
  const NAV_ITEMS: NavRailItem[] = [{ title: 'Countries', icon: Globe2, url: '/countries' }]
  ```
- Change the "Modo DT" mode-switch link from:
  ```tsx
  <Link to="/dt" className="nr-tile lyt-mode-switch">
    <i className="fa fa-futbol" />
    <span>Modo DT</span>
  </Link>
  ```
  to:
  ```tsx
  <Link
    to="/dt"
    className="lyt-mode-switch flex items-center gap-3 rounded-card p-3 font-display font-semibold text-text-muted no-underline transition-colors duration-fast hover:bg-surface-2 hover:text-text-primary"
  >
    <Shield size={18} />
    <span>Modo DT</span>
  </Link>
  ```
- Change the header's watchlist/search icon links from:
  ```tsx
  <Link className="lyt-header-icon" to="/watchlist" title="Watch list">
    <i className="fa fa-star" />
  </Link>
  <Link className="lyt-header-icon" to="/search" title="Search">
    <i className="fa fa-search" />
  </Link>
  ```
  to:
  ```tsx
  <Link className="lyt-header-icon" to="/watchlist" title="Watch list">
    <Star size={18} />
  </Link>
  <Link className="lyt-header-icon" to="/search" title="Search">
    <Search size={18} />
  </Link>
  ```
  (`lyt-header-icon`'s own layout rules live in `Layout.css`, out of scope — keep the className.)

- [ ] **Step 4: Update `DtLayout.tsx`'s `NAV_ITEMS` and its mode-switch link**

Read `soydt/web/src/features/dt/DtLayout.tsx`'s current content first (it's in the dirty working tree — confirm the `NAV_ITEMS` array and mode-switch link still look like the excerpt below before editing). Apply these changes:

- Add `import { Building2, Calendar, Coins, Globe2, ListOrdered, Users, Zap } from 'lucide-react'` (icon for "Transferencias" below) near the top, plus `import { ArrowLeftRight } from 'lucide-react'`.
- Change:
  ```tsx
  const NAV_ITEMS: NavRailItem[] = [
    { title: 'Plantel', icon: 'fa-users', url: '/dt/squad' },
    { title: 'Transferencias', icon: 'fa-right-left', url: '/dt/transfers' },
    { title: 'Calendario', icon: 'fa-calendar', url: '/dt/schedule' },
    { title: 'Finanzas', icon: 'fa-coins', url: '/dt/finances' },
    { title: 'Tabla', icon: 'fa-list-ol', url: '/dt/table' },
    { title: 'Eventos', icon: 'fa-bolt', url: '/dt/events' },
    { title: 'Directiva', icon: 'fa-building-columns', url: '/dt/board' },
  ]
  ```
  to:
  ```tsx
  const NAV_ITEMS: NavRailItem[] = [
    { title: 'Plantel', icon: Users, url: '/dt/squad' },
    { title: 'Transferencias', icon: ArrowLeftRight, url: '/dt/transfers' },
    { title: 'Calendario', icon: Calendar, url: '/dt/schedule' },
    { title: 'Finanzas', icon: Coins, url: '/dt/finances' },
    { title: 'Tabla', icon: ListOrdered, url: '/dt/table' },
    { title: 'Eventos', icon: Zap, url: '/dt/events' },
    { title: 'Directiva', icon: Building2, url: '/dt/board' },
  ]
  ```
- Change the "Modo Admin" mode-switch link from:
  ```tsx
  <Link to="/countries" className="nr-tile lyt-mode-switch">
    <i className="fa fa-earth-americas" />
    <span>Modo Admin</span>
  </Link>
  ```
  to:
  ```tsx
  <Link
    to="/countries"
    className="lyt-mode-switch flex items-center gap-3 rounded-card p-3 font-display font-semibold text-text-muted no-underline transition-colors duration-fast hover:bg-surface-2 hover:text-text-primary"
  >
    <Globe2 size={18} />
    <span>Modo Admin</span>
  </Link>
  ```

- [ ] **Step 5: Verify build/lint clean**

```bash
cd soydt/web
npm run build
npm run lint
```

- [ ] **Step 6: Browser check**

Open any `/countries/*` page (Layout chrome) and any `/dt/*` page (DtLayout chrome). Confirm: nav tiles show the new icons, active-tab triangle marker + glow still animate in on the current route, hover slide/scale still works, DT club-color header background/foreground still overrides `TabBar`'s CSS variables where used, mobile sidebar toggle still works.

- [ ] **Step 7: Commit**

```bash
git add soydt/web/src/shared/ui/NavRail.tsx soydt/web/src/shared/Layout.tsx soydt/web/src/features/dt/DtLayout.tsx
git rm soydt/web/src/shared/ui/NavRail.css
git commit -m "refactor(web): migrate NavRail and Layout/DtLayout chrome to Tailwind + lucide-react"
```

---

### Task 8: Mount `sonner`'s `<Toaster />`

**Files:**
- Modify: `soydt/web/src/App.tsx`

**Interfaces:**
- Produces: a global `toast` import point (`import { toast } from 'sonner'`) that Task 9 uses.

- [ ] **Step 1: Read `App.tsx`'s current content first** (it's in the dirty working tree — confirm the `ProcessProvider`/`ProcessOverlay`/`DtEventModal` block still looks like below before editing).

- [ ] **Step 2: Add the `Toaster` import and mount it alongside the other app-wide globals**

Change:
```tsx
import { ProcessProvider } from './shared/ProcessContext'
import ProcessOverlay from './shared/ProcessOverlay'
import DtEventModal from './shared/DtEventModal'

function App() {
  return (
    <ProcessProvider>
      <ProcessOverlay />
      <DtEventModal />
      <BrowserRouter>
```
to:
```tsx
import { Toaster } from 'sonner'
import { ProcessProvider } from './shared/ProcessContext'
import ProcessOverlay from './shared/ProcessOverlay'
import DtEventModal from './shared/DtEventModal'

function App() {
  return (
    <ProcessProvider>
      <ProcessOverlay />
      <DtEventModal />
      <Toaster theme="dark" position="top-right" richColors />
      <BrowserRouter>
```

- [ ] **Step 3: Verify build/lint clean**

```bash
cd soydt/web
npm run build
npm run lint
```

- [ ] **Step 4: Browser check**

Open any page, run `import('sonner').then(m => m.toast('test'))` in the browser devtools console, confirm a toast renders top-right in the dark theme.

- [ ] **Step 5: Commit**

```bash
git add soydt/web/src/App.tsx
git commit -m "feat(web): mount sonner Toaster app-wide"
```

---

### Task 9: Replace ad-hoc success confirmations with `toast.success`

**Files:**
- Modify: `soydt/web/src/features/dt/DtSquadPage.tsx`
- Modify: `soydt/web/src/features/dt/DtTransfersPage.tsx`

**Interfaces:**
- Consumes: `toast` from `sonner`, mounted globally in Task 8.

Confirmed via grep (`grep -rn "setSaved\|setMessage" src/features`) — these are the only two `setSaved`/`setMessage`-style success-confirmation call sites in the app today. Error paragraphs are untouched per the spec's out-of-scope list.

- [ ] **Step 1: Read `DtSquadPage.tsx`'s current content first** (dirty working tree — confirm the `saved` state and its three call sites still look like below; line numbers will have shifted from the earlier exploration).

- [ ] **Step 2: Remove the `saved` state and wire `toast.success` into `save()`**

- Add `import { toast } from 'sonner'` near the top.
- Remove the line `const [saved, setSaved] = useState(false)`.
- Remove the three `setSaved(false)` calls (in the drag-drop assign handler, `fillBestAvailable`, and `clearSlot`).
- Change `save()` from:
  ```tsx
  const save = async () => {
    if (!myTeamId || filledCount !== 11) return
    setError(null)
    try {
      await callApi(`/api/teams/${myTeamId}/lineup`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerIds: slots.filter((id): id is number => id != null) }),
      })
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }
  ```
  to:
  ```tsx
  const save = async () => {
    if (!myTeamId || filledCount !== 11) return
    setError(null)
    try {
      await callApi(`/api/teams/${myTeamId}/lineup`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerIds: slots.filter((id): id is number => id != null) }),
      })
      toast.success('Alineación guardada.')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }
  ```
- Change the save button's label from:
  ```tsx
  {saved ? 'Guardada ✓' : 'Guardar alineación'}
  ```
  to:
  ```tsx
  Guardar alineación
  ```

- [ ] **Step 3: Read `DtTransfersPage.tsx`'s current content first** (dirty working tree — confirm the `message` state and its call sites still look like below).

- [ ] **Step 4: Remove the `message` state and wire `toast.success` into `doTransfer()`**

- Add `import { toast } from 'sonner'` near the top.
- Remove the line `const [message, setMessage] = useState<string | null>(null)`.
- Change `doTransfer()` from:
  ```tsx
  const doTransfer = async (playerId: number, fromTeamId: number, toTeamId: number, fee: number) => {
    setError(null)
    setMessage(null)
    try {
      await callApi('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, fromTeamId, toTeamId, fee }),
      })
      setMessage('Transferencia completada.')
      reloadMyTeam()
      reloadHistory()
      if (browseTeamId) callApi<TeamDetail>(`/api/teams/${browseTeamId}`).then(setBrowseTeam)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }
  ```
  to:
  ```tsx
  const doTransfer = async (playerId: number, fromTeamId: number, toTeamId: number, fee: number) => {
    setError(null)
    try {
      await callApi('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, fromTeamId, toTeamId, fee }),
      })
      toast.success('Transferencia completada.')
      reloadMyTeam()
      reloadHistory()
      if (browseTeamId) callApi<TeamDetail>(`/api/teams/${browseTeamId}`).then(setBrowseTeam)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }
  ```
- Remove the now-dead inline confirmation paragraph:
  ```tsx
  {message && <p style={{ color: '#4ade80' }}>{message}</p>}
  ```
  (leave the sibling `{error && <p style={{ color: 'crimson' }}>Error: {error}</p>}` line untouched — error paragraphs are out of scope this fase).

- [ ] **Step 5: Verify build/lint clean**

```bash
cd soydt/web
npm run build
npm run lint
```

- [ ] **Step 6: Toast smoke test against the live game**

With the API running (`docker run -p 8080:8080 soydt-api` or the .NET dev server) and a game created:
- Open `/dt/squad`, fill all 11 slots, click save — confirm a `toast.success` toast appears and the button label no longer flips to "Guardada ✓".
- Open `/dt/transfers`, complete a transfer — confirm a `toast.success` toast appears and the old inline green confirmation paragraph is gone.

- [ ] **Step 7: Commit**

```bash
git add soydt/web/src/features/dt/DtSquadPage.tsx soydt/web/src/features/dt/DtTransfersPage.tsx
git commit -m "feat(web): replace ad-hoc save/transfer confirmations with sonner toasts"
```
