import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
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
        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Free agents</h3>
            <span className="fm-panel-count">{players.length}</span>
          </div>
          {players.length === 0 ? (
            <div className="fm-empty">No free agents</div>
          ) : (
            <table className="fm-squad fm-squad-fa">
              <thead>
                <tr>
                  <th className="sq-pos">Pos</th>
                  <th className="sq-age">Age</th>
                  <th className="sq-name">Name</th>
                  <th className="sq-ability">Ability</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.playerId}>
                    <td className="sq-pos">{p.position}</td>
                    <td className="sq-age">{p.age}</td>
                    <td className="sq-name">
                      <Link to={`/players/${p.playerId}`}>
                        {p.firstName} {p.lastName}
                      </Link>
                    </td>
                    <td>{p.currentAbility}</td>
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

export default FreeAgentsPage
