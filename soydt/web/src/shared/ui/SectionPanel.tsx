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
