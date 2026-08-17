import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import { countryTabs } from '../countries/tabs'
import Layout from '../../shared/Layout'
import SectionPanel from '../../shared/ui/SectionPanel'

// Ported 1:1 from open-football/src/web/src/countries/list/index.html
// (extends countries_layout.html's tab bar) — the
// `/{lang}/countries/{slug}/leagues` route.

type LeagueListItem = {
  id: number
  name: string
  slug: string
  countryId: number
  tier: number
  reputation: number
  teamCount: number
}

function LeaguesPage() {
  const { countryId } = useParams<{ countryId: string }>()
  const [leagues, setLeagues] = useState<LeagueListItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLeagues(null)
    setError(null)
    callApi<LeagueListItem[]>(`/api/countries/${countryId}/leagues`)
      .then(setLeagues)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [countryId])

  const tabs = countryTabs(countryId!, 'leagues')

  if (error) {
    return (
      <Layout title="Leagues" subTitle={tabs} sidebarCountryId={Number(countryId)}>
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!leagues) {
    return (
      <Layout title="Leagues" subTitle={tabs} sidebarCountryId={Number(countryId)}>
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  const sorted = leagues.slice().sort((a, b) => a.tier - b.tier)

  return (
    <Layout title="Leagues" subTitle={tabs} sidebarCountryId={Number(countryId)}>
      <div className="fm-page">
        <SectionPanel title="Leagues">
          <div className="fm-league-list">
            {sorted.map((l) => (
              <Link key={l.id} to={`/leagues/${l.id}`} className="fm-league-item">
                <i className="fa fa-trophy" />
                <span>{l.name}</span>
              </Link>
            ))}
          </div>
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default LeaguesPage
