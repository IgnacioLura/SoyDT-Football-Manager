import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import SectionPanel from '../../shared/ui/SectionPanel'

// Player's own career transfer history — SIMPLIFIED sub-page of the
// original app's player transfer-market tab: only the completed-transfers
// history is shown here. Live listing status, negotiations, and
// monitoring sections are deferred — see MIGRATION_CHECKLIST.md.

type PlayerTransferItem = {
  fromTeamName: string
  toTeamName: string
  fee: number
  isLoan: boolean
  isFree: boolean
  date: string
}

function PlayerTransfersPage() {
  const { playerId } = useParams<{ playerId: string }>()
  const [transfers, setTransfers] = useState<PlayerTransferItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setTransfers(null)
    setError(null)
    callApi<PlayerTransferItem[]>(`/api/players/${playerId}/transfers`)
      .then(setTransfers)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [playerId])

  if (error) {
    return (
      <Layout title="Transfers">
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!transfers) {
    return (
      <Layout title="Transfers">
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Transfers">
      <div className="fm-page">
        <SectionPanel title="Transfer history">
          {transfers.length === 0 ? (
            <div className="fm-empty">No transfers on record</div>
          ) : (
            <table className="fm-squad fm-transfer-history-table">
              <thead>
                <tr>
                  <th className="sq-from">From</th>
                  <th className="sq-to">To</th>
                  <th className="sq-fee">Fee</th>
                  <th className="sq-date">Date</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((t, i) => (
                  <tr key={i}>
                    <td className="sq-from">{t.fromTeamName}</td>
                    <td className="sq-to">{t.toTeamName}</td>
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

export default PlayerTransfersPage
