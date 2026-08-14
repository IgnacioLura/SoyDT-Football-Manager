import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Flag from '../../shared/Flag'
import Layout from '../../shared/Layout'

// Ported 1:1 from open-football/src/web/src/countries/get/index.html — the
// `/{lang}/countries` continents/countries index page. Same section/grid
// structure and fm-* classes so style.css's rules apply unmodified.

type CountryListItem = {
  id: number
  code: string
  slug: string
  name: string
  continentId: number
  continentName: string
  leagueCount: number
}

function groupByContinent(countries: CountryListItem[]) {
  const groups = new Map<string, CountryListItem[]>()
  for (const country of countries) {
    const list = groups.get(country.continentName) ?? []
    list.push(country)
    groups.set(country.continentName, list)
  }
  return groups
}

function CountriesPage() {
  const [countries, setCountries] = useState<CountryListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  const load = () => {
    setError(null)
    callApi<CountryListItem[]>('/api/countries')
      .then(setCountries)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }

  useEffect(load, [])

  const createScopedGame = async () => {
    setCreating(true)
    try {
      await callApi('/api/game/create?countries=AR,UY,BR', { method: 'POST' })
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setCreating(false)
    }
  }

  if (error?.startsWith('no_active_game')) {
    return (
      <Layout title="Countries">
        <div className="fm-page">
          <p>No game created yet.</p>
          <button disabled={creating} onClick={createScopedGame}>
            Create a scoped game (AR, UY, BR)
          </button>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout title="Countries">
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!countries) {
    return (
      <Layout title="Countries">
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  const groups = groupByContinent(countries)

  return (
    <Layout title="Countries">
      <div className="fm-page">
        {[...groups.entries()].map(([continent, list], i) => (
          <section key={continent} className={`fm-panel${i > 0 ? ' mt-3' : ''}`}>
            <div className="fm-panel-head">
              <h3>{continent}</h3>
              <span className="fm-panel-count">{list.length}</span>
            </div>
            <div className="fm-country-grid">
              {list.map((c) => (
                <Link key={c.id} to={`/countries/${c.id}/leagues`} className="fm-country-item">
                  <Flag code={c.code} />
                  <span>{c.name}</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Layout>
  )
}

export default CountriesPage
