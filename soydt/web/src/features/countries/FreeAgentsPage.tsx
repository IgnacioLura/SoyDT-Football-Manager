import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import { PositionBadge } from '../../shared/positions'
import type { SortMode } from '../../shared/sortPlayers'
import { sortByMode } from '../../shared/sortPlayers'
import DataTable from '../../shared/ui/DataTable'
import SectionPanel from '../../shared/ui/SectionPanel'
import SortToggle from '../../shared/ui/SortToggle'
import { countryTabs } from './tabs'

// Ported from open-football/src/web/src/countries/free_agents/index.html —
// the `/{lang}/countries/{slug}/free-agents` route. Filters the world-level
// free agent pool by country_id (see engine-ffi/CONTRACT.md).

type FreeAgent = {
  playerId: number
  firstName: string
  lastName: string
  position: string
  age: number
  currentAbility: number
}

function FreeAgentsPage() {
  const { countryId } = useParams<{ countryId: string }>()
  const [players, setPlayers] = useState<FreeAgent[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('position')

  useEffect(() => {
    setPlayers(null)
    setError(null)
    callApi<FreeAgent[]>(`/api/countries/${countryId}/free-agents`)
      .then(setPlayers)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [countryId])

  const tabs = countryTabs(countryId!, 'free_agents')

  if (error) {
    return (
      <Layout title="Free agents" subTitle={tabs} sidebarCountryId={Number(countryId)}>
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!players) {
    return (
      <Layout title="Free agents" subTitle={tabs} sidebarCountryId={Number(countryId)}>
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Free agents" subTitle={tabs} sidebarCountryId={Number(countryId)}>
      <div className="fm-page">
        <SectionPanel
          title="Free agents"
          actions={
            <>
              <SortToggle value={sortMode} onChange={setSortMode} />
              <span className="fm-panel-count">{players.length}</span>
            </>
          }
        >
          <DataTable
            rows={sortByMode(players, sortMode, (p) => p.position, (p) => p.currentAbility)}
            rowKey={(p) => p.playerId}
            emptyMessage="No free agents"
            columns={[
              { key: 'pos', header: 'Pos', align: 'center', render: (p) => <PositionBadge position={p.position} /> },
              { key: 'age', header: 'Age', align: 'center', render: (p) => p.age },
              {
                key: 'name',
                header: 'Name',
                render: (p) => (
                  <Link to={`/players/${p.playerId}`}>
                    {p.firstName} {p.lastName}
                  </Link>
                ),
              },
              { key: 'ovr', header: 'OVR', render: (p) => p.currentAbility },
            ]}
          />
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default FreeAgentsPage
