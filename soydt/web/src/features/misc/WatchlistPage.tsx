import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import { PositionBadge } from '../../shared/positions'

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
        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Watch List</h3>
            <span className="fm-panel-count">{players.length}</span>
          </div>
          {players.length === 0 ? (
            <p style={{ padding: '14px' }}>No players on your watch list yet — add one from a player's page.</p>
          ) : (
            <table className="fm-standings">
              <thead>
                <tr>
                  <th className="st-club">Name</th>
                  <th>Pos</th>
                  <th>Age</th>
                  <th className="st-pts">OVR</th>
                  <th className="st-pts">PA</th>
                  <th>Club</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id}>
                    <td className="st-club">
                      <Link to={`/players/${p.id}`}>{p.name}</Link>
                    </td>
                    <td>
                      <PositionBadge position={p.position} />
                    </td>
                    <td>{p.age}</td>
                    <td className="st-pts">{p.currentAbility}</td>
                    <td className="st-pts">{p.potentialAbility}</td>
                    <td>{p.teamName}</td>
                    <td>
                      {p.retired && 'Retired'}
                      {p.injured && 'Injured '}
                      {p.unhappy && 'Unhappy '}
                      {p.transferListed && 'Listed'}
                    </td>
                    <td>
                      <button onClick={() => remove(p.id)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </Layout>
  )
}

export default WatchlistPage
