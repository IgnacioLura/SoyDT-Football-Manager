import { useState } from 'react'
import { Link } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import SectionPanel from '../../shared/ui/SectionPanel'

// Mirrors the original app's `search/index.html` + `/api/search?q=...`
// (`web/src/search/mod.rs`) — cross-entity substring search, 4-char
// minimum, capped at 15 results per category (same thresholds as the
// original, enforced server-side in engine-ffi/src/search.rs).

type SearchResults = {
  countries: { name: string; slug: string; code: string }[]
  clubs: { name: string; teamSlug: string }[]
  players: { id: number; name: string; countryCode: string; teamName: string; age: number; isFreeAgent: boolean }[]
}

function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const [error, setError] = useState<string | null>(null)

  const run = async (q: string) => {
    setQuery(q)
    if (q.trim().length < 4) {
      setResults(null)
      return
    }
    try {
      const data = await callApi<SearchResults>(`/api/search?q=${encodeURIComponent(q)}`)
      setResults(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <Layout title="Search">
      <div className="fm-page">
        <SectionPanel title="Search">
          <div style={{ padding: '14px' }}>
            <input
              value={query}
              onChange={(e) => run(e.target.value)}
              placeholder="Search countries, clubs, players… (min 4 characters)"
              style={{ width: '100%', maxWidth: '28rem' }}
              autoFocus
            />
          </div>

          {error && <p style={{ color: 'crimson', padding: '0 14px' }}>Error: {error}</p>}

          {results && (
            <div style={{ padding: '0 14px 14px' }}>
              {results.countries.length === 0 && results.clubs.length === 0 && results.players.length === 0 ? (
                <p>No results.</p>
              ) : (
                <>
                  {results.countries.length > 0 && (
                    <>
                      <h4>Countries</h4>
                      <ul>
                        {results.countries.map((c) => (
                          <li key={c.slug}>{c.name}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {results.clubs.length > 0 && (
                    <>
                      <h4>Clubs</h4>
                      <ul>
                        {results.clubs.map((c) => (
                          <li key={c.teamSlug}>{c.name}</li>
                        ))}
                      </ul>
                    </>
                  )}
                  {results.players.length > 0 && (
                    <>
                      <h4>Players</h4>
                      <ul>
                        {results.players.map((p) => (
                          <li key={p.id}>
                            <Link to={`/players/${p.id}`}>{p.name}</Link> — {p.isFreeAgent ? 'Free agent' : p.teamName} (
                            {p.age})
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default SearchPage
