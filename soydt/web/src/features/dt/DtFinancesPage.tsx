import { useEffect, useState } from 'react'
import { callApi } from '../../shared/api'
import SectionPanel from '../../shared/ui/SectionPanel'
import DtLayout from './DtLayout'
import { useMyTeamId } from './useMyTeamId'

// DT's finances view — literally reuses `TeamFinancesPage`'s existing
// fetch/render (engine_get_team_finances is already read-only, no new
// engine work needed), just fixed to the DT's own team id and wrapped in
// DtLayout instead of the Admin Layout.

type TeamFinances = {
  balance: number
  transferBudget: number | null
  wageBudget: number | null
  incomeTotal: number
  expenseTotal: number
  incomeTv: number
  incomeMatchday: number
  incomeSponsorship: number
  incomeMerchandising: number
  incomePrizeMoney: number
  expensePlayerWages: number
  expenseStaffWages: number
  expenseFacilities: number
}

function money(value: number | null) {
  if (value === null) return '—'
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

function DtFinancesPage() {
  const myTeamId = useMyTeamId()
  const [finances, setFinances] = useState<TeamFinances | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (myTeamId == null) return
    callApi<TeamFinances>(`/api/teams/${myTeamId}/finances`)
      .then(setFinances)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [myTeamId])

  if (myTeamId === undefined || (myTeamId != null && !finances && !error)) {
    return (
      <DtLayout title="Finanzas">
        <div className="fm-page">
          <p>Cargando…</p>
        </div>
      </DtLayout>
    )
  }

  if (myTeamId == null) {
    return (
      <DtLayout title="Finanzas">
        <div className="fm-page">
          <p>Todavía no elegiste tu club — andá a /new-game.</p>
        </div>
      </DtLayout>
    )
  }

  if (error || !finances) {
    return (
      <DtLayout title="Finanzas">
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </DtLayout>
    )
  }

  return (
    <DtLayout title="Finanzas">
      <div className="fm-page">
        <SectionPanel title="Resumen">
          <div className="fm-personal-detail">
            <div className="fm-detail-row">
              <span className="fm-detail-label">Balance</span>
              <span className="fm-detail-value">{money(finances.balance)}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Presupuesto transferencias</span>
              <span className="fm-detail-value">{money(finances.transferBudget)}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Presupuesto salarios</span>
              <span className="fm-detail-value">{money(finances.wageBudget)}</span>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel title="Ingresos" actions={<span className="fm-panel-count">{money(finances.incomeTotal)}</span>}>
          <div className="fm-personal-detail">
            <div className="fm-detail-row">
              <span className="fm-detail-label">TV</span>
              <span className="fm-detail-value">{money(finances.incomeTv)}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Taquilla</span>
              <span className="fm-detail-value">{money(finances.incomeMatchday)}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Sponsors</span>
              <span className="fm-detail-value">{money(finances.incomeSponsorship)}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Merchandising</span>
              <span className="fm-detail-value">{money(finances.incomeMerchandising)}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Premios</span>
              <span className="fm-detail-value">{money(finances.incomePrizeMoney)}</span>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel title="Gastos" actions={<span className="fm-panel-count">{money(finances.expenseTotal)}</span>}>
          <div className="fm-personal-detail">
            <div className="fm-detail-row">
              <span className="fm-detail-label">Sueldos jugadores</span>
              <span className="fm-detail-value">{money(finances.expensePlayerWages)}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Sueldos cuerpo técnico</span>
              <span className="fm-detail-value">{money(finances.expenseStaffWages)}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Instalaciones</span>
              <span className="fm-detail-value">{money(finances.expenseFacilities)}</span>
            </div>
          </div>
        </SectionPanel>
      </div>
    </DtLayout>
  )
}

export default DtFinancesPage
