import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
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
          {filtered.length === 0 ? (
            <div className="fm-empty">No completed transfers</div>
          ) : (
            <table className="fm-squad fm-transfer-history-table">
              <thead>
                <tr>
                  <th className="sq-name">Player</th>
                  <th className="sq-from">From</th>
                  <th className="sq-to">To</th>
                  <th className="sq-fee">Fee</th>
                  <th className="sq-date">Date</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => (
                  <tr key={i}>
                    <td className="sq-name">
                      <Link to={`/players/${t.playerId}`}>{t.playerName}</Link>
                    </td>
                    <td className="sq-from">
                      <Link to={`/teams/${t.fromTeamId}`} className="st-club-link">
                        <TeamCrest slug={t.fromTeamSlug} name={t.fromTeamName} size={20} />
                        <span>{t.fromTeamName}</span>
                      </Link>
                    </td>
                    <td className="sq-to">
                      <Link to={`/teams/${t.toTeamId}`} className="st-club-link">
                        <TeamCrest slug={t.toTeamSlug} name={t.toTeamName} size={20} />
                        <span>{t.toTeamName}</span>
                      </Link>
                    </td>
                    <td className="sq-fee">
                      {t.isFree ? (
                        <span className="fm-loan-badge">Free</span>
                      ) : t.isLoan ? (
                        <span className="fm-loan-badge">Loan</span>
                      ) : (
                        <span className="fm-transfer-fee">{t.fee.toLocaleString()}</span>
                      )}
                    </td>
                    <td className="sq-date">{t.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default LeagueTransfersPage
