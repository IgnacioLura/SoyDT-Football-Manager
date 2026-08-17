import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import { PositionBadge } from '../../shared/positions'
import type { SortMode } from '../../shared/sortPlayers'
import { sortByMode } from '../../shared/sortPlayers'
import DataTable from '../../shared/ui/DataTable'
import SectionPanel from '../../shared/ui/SectionPanel'
import SortToggle from '../../shared/ui/SortToggle'

// Mirrors the original app's `watchlist/index.html` (`/{lang}/watchlist`) —
// a plain list of player ids on `SimulatorData.watchlist`, resolved against
// clubs/retirees/free agents. `current_ability`/`potential_ability` are raw
// numbers rather than the original's star-rating view (see the
// simplification note in engine-ffi/src/watchlist.rs).

type WatchlistPlayer = {
  id: number
  name: string
  position: string
  countryCode: string
  countryName: string
  age: number
  currentAbility: number
  potentialAbility: number
  conditionPct: number
  teamName: string
  leagueName: string
  injured: boolean
  unhappy: boolean
  transferListed: boolean
  retired: boolean
}

function WatchlistPage() {
  const [players, setPlayers] = useState<WatchlistPlayer[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('position')

  const load = () => {
    callApi<WatchlistPlayer[]>('/api/watchlist')
      .then(setPlayers)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }

  useEffect(load, [])

  const remove = async (playerId: number) => {
    await callApi(`/api/watchlist/${playerId}`, { method: 'DELETE' })
    load()
  }

  if (error) {
    return (
      <Layout title="Watch List">
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!players) {
    return (
      <Layout title="Watch List">
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Watch List">
      <div className="fm-page">
        <SectionPanel
          title="Watch List"
          actions={
            <>
              <SortToggle value={sortMode} onChange={setSortMode} />
              <span className="fm-panel-count">{players.length}</span>
            </>
          }
        >
          {players.length === 0 ? (
            <p style={{ padding: '14px' }}>No players on your watch list yet — add one from a player's page.</p>
          ) : (
            <DataTable
              rows={sortByMode(players, sortMode, (p) => p.position, (p) => p.currentAbility)}
              rowKey={(p) => p.id}
              columns={[
                {
                  key: 'name',
                  header: 'Name',
                  render: (p) => <Link to={`/players/${p.id}`}>{p.name}</Link>,
                },
                { key: 'pos', header: 'Pos', render: (p) => <PositionBadge position={p.position} /> },
                { key: 'age', header: 'Age', render: (p) => p.age },
                { key: 'ovr', header: 'OVR', align: 'right', render: (p) => p.currentAbility },
                { key: 'pa', header: 'PA', align: 'right', render: (p) => p.potentialAbility },
                { key: 'club', header: 'Club', render: (p) => p.teamName },
                {
                  key: 'status',
                  header: 'Status',
                  render: (p) => (
                    <>
                      {p.retired && 'Retired'}
                      {p.injured && 'Injured '}
                      {p.unhappy && 'Unhappy '}
                      {p.transferListed && 'Listed'}
                    </>
                  ),
                },
                {
                  key: 'actions',
                  header: '',
                  render: (p) => <button onClick={() => remove(p.id)}>Remove</button>,
                },
              ]}
            />
          )}
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default WatchlistPage
