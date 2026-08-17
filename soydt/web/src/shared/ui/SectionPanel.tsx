// soydt/web/src/shared/ui/SectionPanel.tsx
import type { CSSProperties, ReactNode } from 'react'
import './SectionPanel.css'

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
}

function SectionPanel({ title, actions, children, index }: SectionPanelProps) {
  return (
    <section
      className="sp-panel anim-fade-in-up"
      style={index != null ? ({ '--i': index } as CSSProperties) : undefined}
    >
      <div className="sp-head">
        <h3 className="sp-title">{title}</h3>
        {actions && <div className="sp-actions">{actions}</div>}
      </div>
      <div className="sp-body">{children}</div>
    </section>
  )
}

export default SectionPanel
