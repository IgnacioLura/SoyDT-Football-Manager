import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import { countryTabs } from './tabs'

// Ported from open-football/src/web/src/countries/squad/index.html — the
// `/{lang}/countries/{slug}` (senior) and `/{lang}/countries/{slug}/u21`
// routes. Same template is reused for both levels in the original app via
// a `u21` query flag here instead of a separate route file.
//
// Deviation from the original: the "potential" star column is fed
// current_ability (not potential_ability, a hidden attribute never shown
// to clubs/scouts in `core` — see engine-ffi/CONTRACT.md) so the column
// layout matches without leaking the hidden field.

type NationalSquadRow = {
  playerId: number
  position: string
  firstName: string
  lastName: string
  age: number
  clubId: number | null
  clubName: string
  currentAbility: number
  conditionPct: number
  internationalApps: number
  internationalGoals: number
  reason: string
}

function Stars({ value }: { value: number }) {
  // current_ability is 1-200; map to a 0-5 star rating like the original's
  // star-rating struct (full/half/empty) would have rendered.
  const rating = Math.max(0, Math.min(5, value / 40))
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  const empty = 5 - full - (half ? 1 : 0)
  return (
    <div className="fm-stars">
      {Array.from({ length: full }).map((_, i) => (
        <span key={`f${i}`} className="star on" />
      ))}
      {half && <span className="star half" />}
      {Array.from({ length: empty }).map((_, i) => (
        <span key={`e${i}`} className="star" />
      ))}
    </div>
  )
}

function NationalSquadPage() {
  const { countryId } = useParams<{ countryId: string }>()
  const [searchParams] = useSearchParams()
  const u21 = searchParams.get('u21') === 'true'
  const [squad, setSquad] = useState<NationalSquadRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setSquad(null)
    setError(null)
    callApi<NationalSquadRow[]>(`/api/countries/${countryId}/squad?u21=${u21}`)
      .then(setSquad)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [countryId, u21])

  const tabs = countryTabs(countryId!, 'squad')

  if (error) {
    return (
      <Layout title="National team" subTitle={tabs}>
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!squad) {
    return (
      <Layout title="National team" subTitle={tabs}>
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={u21 ? 'U21 squad' : 'Squad'} subTitle={tabs}>
      <div className="fm-page">
        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>{u21 ? 'U21 squad' : 'Squad'}</h3>
            <span className="fm-panel-count">{squad.length}</span>
          </div>
          {squad.length === 0 ? (
            <div className="fm-empty">No squad</div>
          ) : (
            <table className="fm-squad">
              <thead>
                <tr>
                  <th>Pos</th>
                  <th className="sq-name">Name</th>
                  <th className="sq-age">Age</th>
                  <th>Club</th>
                  <th className="sq-ability">Ability</th>
                  <th className="sq-potential">Potential</th>
                  <th className="sq-cond">Condition</th>
                  <th className="sq-games">Caps</th>
                  <th className="sq-games">Goals</th>
                  <th className="sq-reason">Reason</th>
                </tr>
              </thead>
              <tbody>
                {squad.map((p) => (
                  <tr key={p.playerId}>
                    <td className="sq-pos">{p.position}</td>
                    <td className="sq-name">
                      <Link to={`/players/${p.playerId}`}>
                        {p.firstName} {p.lastName}
                      </Link>
                    </td>
                    <td className="sq-age">{p.age}</td>
                    <td>{p.clubId ? <Link to={`/teams/${p.clubId}`}>{p.clubName}</Link> : p.clubName || '—'}</td>
                    <td>
                      <Stars value={p.currentAbility} />
                    </td>
                    <td>
                      <Stars value={p.currentAbility} />
                    </td>
                    <td className="sq-cond">
                      <div className="fm-cond">
                        <div className="fm-cond-bar">
                          <div className="fm-cond-fill" style={{ width: `${p.conditionPct}%` }} />
                        </div>
                        <span className="fm-cond-val">{p.conditionPct}%</span>
                      </div>
                    </td>
                    <td className="sq-games">{p.internationalApps}</td>
                    <td className="sq-games">{p.internationalGoals}</td>
                    <td className="sq-reason">{p.reason}</td>
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

export default NationalSquadPage
