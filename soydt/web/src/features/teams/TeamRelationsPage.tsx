import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import SectionPanel from '../../shared/ui/SectionPanel'
import { useTeamCountryId } from '../../shared/useTeamCountryId'

// SIMPLIFIED reinterpretation of open-football/src/web/src/teams/relations/
// index.html — the `/{lang}/teams/{slug}/relations` route. The original
// renders an interactive force-directed social graph (SVG + physics) of
// every player-to-player relationship in the squad; that is out of scope
// here. Instead: 4 summary tiles + a flat table of each same-team player
// pair's strongest relationship, tiered bond/friendly/tension/rivalry by
// thresholds on `level` (see engine-ffi/CONTRACT.md). Cross-team
// relationships are not shown even though the underlying engine data
// supports them.

type RelationPair = {
  playerAId: number
  playerAName: string
  playerBId: number
  playerBName: string
  tier: 'bond' | 'friendly' | 'tension' | 'rivalry'
  level: number
}

type TeamRelations = {
  bondCount: number
  friendlyCount: number
  tensionCount: number
  rivalryCount: number
  pairs: RelationPair[]
}

const TIER_COLOR: Record<RelationPair['tier'], string> = {
  bond: '#2e7d32',
  friendly: '#1565c0',
  tension: '#e65100',
  rivalry: '#c62828',
}

const TIER_LABEL: Record<RelationPair['tier'], string> = {
  bond: 'Bond',
  friendly: 'Friendly',
  tension: 'Tension',
  rivalry: 'Rivalry',
}

function TierBadge({ tier }: { tier: RelationPair['tier'] }) {
  return (
    <span
      className="fm-loan-badge"
      style={{ backgroundColor: TIER_COLOR[tier], color: '#fff' }}
    >
      {TIER_LABEL[tier]}
    </span>
  )
}

function SummaryTile({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={{ flex: '1 1 0' }}>
      <SectionPanel title={label}>
        <div
          style={{ fontSize: '1.8rem', fontWeight: 700, color, padding: '0.5rem 0', textAlign: 'center' }}
        >
          {count}
        </div>
      </SectionPanel>
    </div>
  )
}

function TeamRelationsPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const sidebarCountryId = useTeamCountryId(teamId)
  const [relations, setRelations] = useState<TeamRelations | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRelations(null)
    setError(null)
    callApi<TeamRelations>(`/api/teams/${teamId}/relations`)
      .then(setRelations)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [teamId])

  if (error) {
    return (
      <Layout title="Relations" sidebarCountryId={sidebarCountryId}>
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!relations) {
    return (
      <Layout title="Relations" sidebarCountryId={sidebarCountryId}>
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Relations" sidebarCountryId={sidebarCountryId}>
      <div className="fm-page">
        <section style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <SummaryTile label="Bond" count={relations.bondCount} color={TIER_COLOR.bond} />
          <SummaryTile label="Friendly" count={relations.friendlyCount} color={TIER_COLOR.friendly} />
          <SummaryTile label="Tension" count={relations.tensionCount} color={TIER_COLOR.tension} />
          <SummaryTile label="Rivalry" count={relations.rivalryCount} color={TIER_COLOR.rivalry} />
        </section>

        <SectionPanel
          title="Player relationships"
          actions={<span className="fm-panel-count">{relations.pairs.length}</span>}
        >
          {relations.pairs.length === 0 ? (
            <div className="fm-empty">No notable relationships</div>
          ) : (
            <table className="fm-squad">
              <thead>
                <tr>
                  <th className="sq-name">Player</th>
                  <th className="sq-name">Other player</th>
                  <th>Tier</th>
                  <th>Level</th>
                </tr>
              </thead>
              <tbody>
                {relations.pairs.map((p, i) => (
                  <tr key={i}>
                    <td className="sq-name">
                      <Link to={`/players/${p.playerAId}`}>{p.playerAName}</Link>
                    </td>
                    <td className="sq-name">
                      <Link to={`/players/${p.playerBId}`}>{p.playerBName}</Link>
                    </td>
                    <td>
                      <TierBadge tier={p.tier} />
                    </td>
                    <td>{p.level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default TeamRelationsPage
