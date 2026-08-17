// soydt/web/src/shared/ui/SectionPanel.tsx
import type { CSSProperties, ReactNode } from 'react'
import './SectionPanel.css'

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
    ...(index != null && { '--i': index }),
    ...(accent && { '--sp-accent': ACCENT_VARS[accent] }),
  } as CSSProperties

  return (
    <section className="sp-panel anim-fade-in-up" style={Object.keys(style).length ? style : undefined}>
      <div className="sp-head">
        <h3 className="sp-title">{title}</h3>
        {actions && <div className="sp-actions">{actions}</div>}
      </div>
      <div className="sp-body">{children}</div>
    </section>
  )
}

export default SectionPanel
