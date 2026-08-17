import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import DataTable from '../../shared/ui/DataTable'
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
          <DataTable
            rows={transfers}
            rowKey={(_, i) => i}
            emptyMessage="No transfers on record"
            columns={[
              { key: 'from', header: 'From', render: (t) => t.fromTeamName },
              { key: 'to', header: 'To', render: (t) => t.toTeamName },
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

export default PlayerTransfersPage
