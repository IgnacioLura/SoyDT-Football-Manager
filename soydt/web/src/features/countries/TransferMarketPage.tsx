import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import { PositionBadge } from '../../shared/positions'
import DataTable from '../../shared/ui/DataTable'
import SectionPanel from '../../shared/ui/SectionPanel'
import { countryTabs } from './tabs'

// New feature, not a port — the original app has no transfer-market
// browse page. See docs/superpowers/specs/2026-08-17-transfers-deep-logic-design.md.

type TransferListing = {
  playerId: number
  playerName: string
  position: string
  age: number
  teamId: number
  teamName: string
  teamSlug: string
  askingPrice: number
  listingType: string
  status: string
  listedDate: string
}

type CountryTransferMarket = {
  transferWindowOpen: boolean
  listings: TransferListing[]
}

function money(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

function TransferMarketPage() {
  const { countryId } = useParams<{ countryId: string }>()
  const [market, setMarket] = useState<CountryTransferMarket | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMarket(null)
    setError(null)
    callApi<CountryTransferMarket>(`/api/countries/${countryId}/transfer-market`)
      .then(setMarket)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [countryId])

  const tabs = countryTabs(countryId!, 'transfer_market')

  if (error) {
    return (
      <Layout title="Transfer Market" subTitle={tabs} sidebarCountryId={Number(countryId)}>
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!market) {
    return (
      <Layout title="Transfer Market" subTitle={tabs} sidebarCountryId={Number(countryId)}>
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Transfer Market" subTitle={tabs} sidebarCountryId={Number(countryId)}>
      <div className="fm-page">
        <SectionPanel
          title="Transfer Market"
          actions={
            <span className="fm-panel-count">
              {market.transferWindowOpen ? 'Window open' : 'Window closed'} · {market.listings.length}
            </span>
          }
        >
          <DataTable
            rows={market.listings}
            rowKey={(l) => l.playerId}
            emptyMessage="No players currently listed"
            columns={[
              {
                key: 'name',
                header: 'Player',
                render: (l) => <Link to={`/players/${l.playerId}`}>{l.playerName}</Link>,
              },
              { key: 'pos', header: 'Pos', align: 'center', render: (l) => <PositionBadge position={l.position} /> },
              { key: 'age', header: 'Age', align: 'center', render: (l) => l.age },
              {
                key: 'team',
                header: 'Team',
                render: (l) => <Link to={`/teams/${l.teamId}`}>{l.teamName}</Link>,
              },
              { key: 'price', header: 'Asking price', align: 'right', render: (l) => money(l.askingPrice) },
              { key: 'type', header: 'Type', render: (l) => l.listingType },
              { key: 'status', header: 'Status', render: (l) => l.status },
            ]}
          />
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default TransferMarketPage
