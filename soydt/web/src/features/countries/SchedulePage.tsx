import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import DataTable from '../../shared/ui/DataTable'
import SectionPanel from '../../shared/ui/SectionPanel'
import { countryTabs } from './tabs'

// Ported from open-football/src/web/src/countries/schedule/index.html —
// the `/{lang}/countries/{slug}/schedule` route (national team fixtures).

type ScheduleItem = {
  date: string
  opponentCountryId: number
  opponentName: string
  isHome: boolean
  competitionName: string
  matchId: string
  homeGoals: number | null
  awayGoals: number | null
}

function SchedulePage() {
  const { countryId } = useParams<{ countryId: string }>()
  const [items, setItems] = useState<ScheduleItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setItems(null)
    setError(null)
    callApi<ScheduleItem[]>(`/api/countries/${countryId}/schedule`)
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [countryId])

  const tabs = countryTabs(countryId!, 'schedule')

  if (error) {
    return (
      <Layout title="Schedule" subTitle={tabs} sidebarCountryId={Number(countryId)}>
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!items) {
    return (
      <Layout title="Schedule" subTitle={tabs} sidebarCountryId={Number(countryId)}>
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Schedule" subTitle={tabs} sidebarCountryId={Number(countryId)}>
      <div className="fm-page">
        <SectionPanel title="Schedule">
          <DataTable
            rows={items}
            rowKey={(_, i) => i}
            emptyMessage="No schedule"
            columns={[
              { key: 'date', header: 'Date', render: (item) => item.date },
              {
                key: 'opposition',
                header: 'Opposition',
                render: (item) => <Link to={`/countries/${item.opponentCountryId}`}>{item.opponentName}</Link>,
              },
              {
                key: 'venue',
                header: 'Venue',
                align: 'center',
                render: (item) => (
                  <span className={`fm-venue ${item.isHome ? 'venue-h' : 'venue-a'}`}>{item.isHome ? 'H' : 'A'}</span>
                ),
              },
              {
                key: 'result',
                header: 'Result',
                align: 'center',
                render: (item) =>
                  item.homeGoals !== null && item.awayGoals !== null ? (
                    <span className="fm-result">
                      {item.homeGoals} – {item.awayGoals}
                    </span>
                  ) : (
                    <span className="fm-pending">–</span>
                  ),
              },
              { key: 'competition', header: 'Competition', render: (item) => item.competitionName },
            ]}
          />
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default SchedulePage
