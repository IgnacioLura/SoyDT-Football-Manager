import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import DataTable from '../../shared/ui/DataTable'
import SectionPanel from '../../shared/ui/SectionPanel'
import TeamCrest from '../onboarding/TeamCrest'
import { leagueTabs } from './tabs'

// Ported from open-football/src/web/src/leagues/transfers/index.html —
// the `/{lang}/leagues/{slug}/transfers` route. Permanent/loan split via
// client-side filter (same data set, like the original's tab toggle).
// Active negotiations are not exported yet — see MIGRATION_CHECKLIST.md.

type CompletedTransfer = {
  playerId: number
  playerName: string
  fromTeamId: number
  fromTeamName: string
  fromTeamSlug: string
  toTeamId: number
  toTeamName: string
  toTeamSlug: string
  fee: number
  isLoan: boolean
  isFree: boolean
  date: string
}

function LeagueTransfersPage() {
  const { leagueId } = useParams<{ leagueId: string }>()
  const [transfers, setTransfers] = useState<CompletedTransfer[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showLoans, setShowLoans] = useState(false)

  useEffect(() => {
    setTransfers(null)
    setError(null)
    callApi<CompletedTransfer[]>(`/api/leagues/${leagueId}/transfers`)
      .then(setTransfers)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [leagueId])

  const tabs = leagueTabs(leagueId!, 'transfers')

  if (error) {
    return (
      <Layout title="Transfers" subTitle={tabs}>
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!transfers) {
    return (
      <Layout title="Transfers" subTitle={tabs}>
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  const filtered = transfers.filter((t) => t.isLoan === showLoans)

  return (
    <Layout title="Transfers" subTitle={tabs}>
      <div className="fm-page">
        <SectionPanel title="Completed transfers">
          <div className="fm-transfer-tabs">
            <button className={`fm-ttab${!showLoans ? ' active' : ''}`} onClick={() => setShowLoans(false)}>
              Permanent
            </button>
            <button className={`fm-ttab${showLoans ? ' active' : ''}`} onClick={() => setShowLoans(true)}>
              Loans
            </button>
          </div>
          <DataTable
            rows={filtered}
            rowKey={(_, i) => i}
            emptyMessage="No completed transfers"
            columns={[
              {
                key: 'player',
                header: 'Player',
                render: (t) => <Link to={`/players/${t.playerId}`}>{t.playerName}</Link>,
              },
              {
                key: 'from',
                header: 'From',
                render: (t) => (
                  <Link to={`/teams/${t.fromTeamId}`} className="st-club-link">
                    <TeamCrest slug={t.fromTeamSlug} name={t.fromTeamName} size={20} />
                    <span>{t.fromTeamName}</span>
                  </Link>
                ),
              },
              {
                key: 'to',
                header: 'To',
                render: (t) => (
                  <Link to={`/teams/${t.toTeamId}`} className="st-club-link">
                    <TeamCrest slug={t.toTeamSlug} name={t.toTeamName} size={20} />
                    <span>{t.toTeamName}</span>
                  </Link>
                ),
              },
              {
                key: 'fee',
                header: 'Fee',
                render: (t) =>
                  t.isFree ? (
                    <span className="fm-loan-badge">Free</span>
                  ) : t.isLoan ? (
                    <span className="fm-loan-badge">Loan</span>
                  ) : (
                    <span className="fm-transfer-fee">{t.fee.toLocaleString()}</span>
                  ),
              },
              { key: 'date', header: 'Date', render: (t) => t.date },
            ]}
          />
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default LeagueTransfersPage
