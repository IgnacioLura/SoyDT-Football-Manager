import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import TeamCrest from '../onboarding/TeamCrest'
import DataTable from '../../shared/ui/DataTable'
import SectionPanel from '../../shared/ui/SectionPanel'
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
  otherTeamSlug: string
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
  return (
    <DataTable
      rows={items}
      rowKey={(_, i) => i}
      emptyMessage="No transfers"
      columns={[
        {
          key: 'player',
          header: 'Player',
          className: 'sq-name',
          render: (t) => <Link to={`/players/${t.playerId}`}>{t.playerName}</Link>,
        },
        {
          key: 'other',
          header: otherLabel,
          render: (t) => (
            <span className="st-club-link">
              <TeamCrest slug={t.otherTeamSlug} name={t.otherTeamName} size={20} />
              <span>{t.otherTeamName}</span>
            </span>
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
        <SectionPanel
          title="Incoming transfers"
          actions={<span className="fm-panel-count">{transfers.incoming.length}</span>}
        >
          <TransferTable items={transfers.incoming} otherLabel="From" />
        </SectionPanel>

        <SectionPanel
          title="Outgoing transfers"
          actions={<span className="fm-panel-count">{transfers.outgoing.length}</span>}
        >
          <TransferTable items={transfers.outgoing} otherLabel="To" />
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default TeamTransfersPage
