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
