import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import { PositionBadge } from '../../shared/positions'
import type { SortMode } from '../../shared/sortPlayers'
import { sortByMode } from '../../shared/sortPlayers'
import DataTable from '../../shared/ui/DataTable'
import SectionPanel from '../../shared/ui/SectionPanel'
import SortToggle from '../../shared/ui/SortToggle'
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
  const [sortMode, setSortMode] = useState<SortMode>('position')

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
      <Layout title="National team" subTitle={tabs} sidebarCountryId={Number(countryId)}>
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!squad) {
    return (
      <Layout title="National team" subTitle={tabs} sidebarCountryId={Number(countryId)}>
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={u21 ? 'U21 squad' : 'Squad'} subTitle={tabs} sidebarCountryId={Number(countryId)}>
      <div className="fm-page">
        <SectionPanel
          title={u21 ? 'U21 squad' : 'Squad'}
          actions={
            <>
              <SortToggle value={sortMode} onChange={setSortMode} />
              <span className="fm-panel-count">{squad.length}</span>
            </>
          }
        >
          <DataTable
            rows={sortByMode(squad, sortMode, (p) => p.position, (p) => p.currentAbility)}
            rowKey={(p) => p.playerId}
            emptyMessage="No squad"
            columns={[
              { key: 'pos', header: 'Pos', render: (p) => <PositionBadge position={p.position} /> },
              {
                key: 'name',
                header: 'Name',
                render: (p) => (
                  <Link to={`/players/${p.playerId}`}>
                    {p.firstName} {p.lastName}
                  </Link>
                ),
              },
              { key: 'age', header: 'Age', align: 'center', render: (p) => p.age },
              {
                key: 'club',
                header: 'Club',
                render: (p) => (p.clubId ? <Link to={`/teams/${p.clubId}`}>{p.clubName}</Link> : p.clubName || '—'),
              },
              { key: 'ability', header: 'Ability', render: (p) => <Stars value={p.currentAbility} /> },
              { key: 'potential', header: 'Potential', render: (p) => <Stars value={p.currentAbility} /> },
              {
                key: 'cond',
                header: 'Condition',
                render: (p) => (
                  <div className="fm-cond">
                    <div className="fm-cond-bar">
                      <div className="fm-cond-fill" style={{ width: `${p.conditionPct}%` }} />
                    </div>
                    <span className="fm-cond-val">{p.conditionPct}%</span>
                  </div>
                ),
              },
              { key: 'caps', header: 'Caps', align: 'center', render: (p) => p.internationalApps },
              { key: 'goals', header: 'Goals', align: 'center', render: (p) => p.internationalGoals },
              { key: 'reason', header: 'Reason', render: (p) => p.reason },
            ]}
          />
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default NationalSquadPage
