import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import SectionPanel from '../../shared/ui/SectionPanel'
import { useTeamCountryId } from '../../shared/useTeamCountryId'

// Team finances page — deliberately simplified vs. the original app's
// finance tab: a current-snapshot view only. No 12-month history table, no
// sponsorship contract list, and no chart series — see
// engine-ffi/src/team_finances.rs's doc comment and MIGRATION_CHECKLIST.md.

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

function TeamFinancesPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const sidebarCountryId = useTeamCountryId(teamId)
  const [finances, setFinances] = useState<TeamFinances | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setFinances(null)
    setLoaded(false)
    setError(null)
    callApi<TeamFinances>(`/api/teams/${teamId}/finances`)
      .then((data) => {
        setFinances(data)
        setLoaded(true)
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [teamId])

  if (error) {
    return (
      <Layout title="Finances" sidebarCountryId={sidebarCountryId}>
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!loaded || !finances) {
    return (
      <Layout title="Finances" sidebarCountryId={sidebarCountryId}>
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Finances" sidebarCountryId={sidebarCountryId}>
      <div className="fm-page">
        <SectionPanel title="Overview" accent="secondary">
          <div className="fm-personal-detail">
            <div className="fm-detail-row">
              <span className="fm-detail-label">Balance</span>
              <span className="fm-detail-value">{money(finances.balance)}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Transfer budget</span>
              <span className="fm-detail-value">{money(finances.transferBudget)}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Wage budget</span>
              <span className="fm-detail-value">{money(finances.wageBudget)}</span>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel
          title="Income"
          accent="secondary"
          actions={<span className="fm-panel-count">{money(finances.incomeTotal)}</span>}
        >
          <div className="fm-personal-detail">
            <div className="fm-detail-row">
              <span className="fm-detail-label">TV</span>
              <span className="fm-detail-value">{money(finances.incomeTv)}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Matchday</span>
              <span className="fm-detail-value">{money(finances.incomeMatchday)}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Sponsorship</span>
              <span className="fm-detail-value">{money(finances.incomeSponsorship)}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Merchandising</span>
              <span className="fm-detail-value">{money(finances.incomeMerchandising)}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Prize money</span>
              <span className="fm-detail-value">{money(finances.incomePrizeMoney)}</span>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel
          title="Expenses"
          accent="secondary"
          actions={<span className="fm-panel-count">{money(finances.expenseTotal)}</span>}
        >
          <div className="fm-personal-detail">
            <div className="fm-detail-row">
              <span className="fm-detail-label">Player wages</span>
              <span className="fm-detail-value">{money(finances.expensePlayerWages)}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Staff wages</span>
              <span className="fm-detail-value">{money(finances.expenseStaffWages)}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Facilities</span>
              <span className="fm-detail-value">{money(finances.expenseFacilities)}</span>
            </div>
          </div>
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default TeamFinancesPage
