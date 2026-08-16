import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import { useTeamCountryId } from '../../shared/useTeamCountryId'

// Ported from open-football/src/web/src/teams/transfers/index.html —
// the `/{lang}/teams/{slug}/transfers` route. Simplified: the original
// splits permanent/loan into four panels (incoming/outgoing transfers,
// incoming/outgoing loans) behind a season selector; here incoming and
// outgoing each combine permanent+loan into one table, and there is no
// season filter — see MIGRATION_CHECKLIST.md.

type TeamTransferItem = {
  playerId: number
  playerName: string
  otherTeamName: string
  fee: number
  isLoan: boolean
  isFree: boolean
  date: string
}

type TeamTransfers = {
  incoming: TeamTransferItem[]
  outgoing: TeamTransferItem[]
}

function TransferTable({ items, otherLabel }: { items: TeamTransferItem[]; otherLabel: string }) {
  if (items.length === 0) {
    return <div className="fm-empty">No transfers</div>
  }

  return (
    <table className="fm-squad">
      <thead>
        <tr>
          <th className="sq-name">Player</th>
          <th>{otherLabel}</th>
          <th>Fee</th>
          <th>Date</th>
        </tr>
      </thead>
      <tbody>
        {items.map((t, i) => (
          <tr key={i}>
            <td className="sq-name">
              <Link to={`/players/${t.playerId}`}>{t.playerName}</Link>
            </td>
            <td>{t.otherTeamName}</td>
            <td>
              {t.isFree ? (
                <span className="fm-loan-badge">Free</span>
              ) : t.isLoan ? (
                <span className="fm-loan-badge">Loan</span>
              ) : (
                <span className="fm-transfer-fee">{t.fee.toLocaleString()}</span>
              )}
            </td>
            <td>{t.date}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TeamTransfersPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const sidebarCountryId = useTeamCountryId(teamId)
  const [transfers, setTransfers] = useState<TeamTransfers | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setTransfers(null)
    setError(null)
    callApi<TeamTransfers>(`/api/teams/${teamId}/transfers`)
      .then(setTransfers)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [teamId])

  if (error) {
    return (
      <Layout title="Transfers" sidebarCountryId={sidebarCountryId}>
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!transfers) {
    return (
      <Layout title="Transfers" sidebarCountryId={sidebarCountryId}>
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Transfers" sidebarCountryId={sidebarCountryId}>
      <div className="fm-page">
        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Incoming transfers</h3>
            <span className="fm-panel-count">{transfers.incoming.length}</span>
          </div>
          <TransferTable items={transfers.incoming} otherLabel="From" />
        </section>

        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Outgoing transfers</h3>
            <span className="fm-panel-count">{transfers.outgoing.length}</span>
          </div>
          <TransferTable items={transfers.outgoing} otherLabel="To" />
        </section>
      </div>
    </Layout>
  )
}

export default TeamTransfersPage
