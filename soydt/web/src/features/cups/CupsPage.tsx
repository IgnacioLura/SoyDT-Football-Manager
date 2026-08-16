import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'

// Index of domestic cups across scoped countries — mirrors the original's
// implicit "every country has a cup" (`cups/get.html` is normally reached
// per-country; this index lists every cup this world has, since there's no
// existing country->cup nav link elsewhere yet).

type CupListItem = { id: number; name: string; slug: string; countryId: number; countryName: string }

function CupsPage() {
  const [cups, setCups] = useState<CupListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    callApi<CupListItem[]>('/api/cups')
      .then(setCups)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  if (error) {
    return (
      <Layout title="Cups">
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!cups) {
    return (
      <Layout title="Cups">
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Cups">
      <div className="fm-page">
        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Domestic Cups</h3>
            <span className="fm-panel-count">{cups.length}</span>
          </div>
          <ul>
            {cups.map((c) => (
              <li key={c.id}>
                <Link to={`/cups/${c.id}`}>{c.name}</Link> — {c.countryName}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </Layout>
  )
}

export default CupsPage
