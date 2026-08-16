import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
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
        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Schedule</h3>
          </div>
          {items.length === 0 ? (
            <div className="fm-empty">No schedule</div>
          ) : (
            <table className="fm-schedule">
              <thead>
                <tr>
                  <th className="sch-date">Date</th>
                  <th>Opposition</th>
                  <th className="sch-venue">Venue</th>
                  <th className="sch-result">Result</th>
                  <th>Competition</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={i}>
                    <td className="sch-date">{item.date}</td>
                    <td>
                      <Link to={`/countries/${item.opponentCountryId}`}>{item.opponentName}</Link>
                    </td>
                    <td className="sch-venue">
                      <span className={`fm-venue ${item.isHome ? 'venue-h' : 'venue-a'}`}>{item.isHome ? 'H' : 'A'}</span>
                    </td>
                    <td className="sch-result">
                      {item.homeGoals !== null && item.awayGoals !== null ? (
                        <span className="fm-result">
                          {item.homeGoals} – {item.awayGoals}
                        </span>
                      ) : (
                        <span className="fm-pending">–</span>
                      )}
                    </td>
                    <td className="sch-comp">{item.competitionName}</td>
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

export default SchedulePage
