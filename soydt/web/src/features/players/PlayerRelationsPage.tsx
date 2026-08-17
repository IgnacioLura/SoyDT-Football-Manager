import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import DataTable from '../../shared/ui/DataTable'
import SectionPanel from '../../shared/ui/SectionPanel'

// SIMPLIFIED reinterpretation of open-football/src/web/src/player/relations/
// index.html — the `/{lang}/players/{slug}/relations` route. The original
// renders an interactive force-directed "ego web" (SVG + physics) of one
// player and their teammates; that is out of scope here. Instead: 4 summary
// tiles + a flat list of this player's strongest 1-3 same-team
// relationships, tiered bond/friendly/tension/rivalry by thresholds on
// `level` (see engine-ffi/CONTRACT.md) — same rendering approach as
// TeamRelationsPage, scoped to one player.

type PlayerRelation = {
  otherPlayerId: number
  otherPlayerName: string
  tier: 'bond' | 'friendly' | 'tension' | 'rivalry'
  level: number
}

type PlayerRelations = {
  playerId: number
  playerName: string
  bondCount: number
  friendlyCount: number
  tensionCount: number
  rivalryCount: number
  relations: PlayerRelation[]
}

const TIER_COLOR: Record<PlayerRelation['tier'], string> = {
  bond: '#2e7d32',
  friendly: '#1565c0',
  tension: '#e65100',
  rivalry: '#c62828',
}

const TIER_LABEL: Record<PlayerRelation['tier'], string> = {
  bond: 'Bond',
  friendly: 'Friendly',
  tension: 'Tension',
  rivalry: 'Rivalry',
}

function TierBadge({ tier }: { tier: PlayerRelation['tier'] }) {
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
        <div style={{ fontSize: '1.8rem', fontWeight: 700, color, padding: '0.5rem 0', textAlign: 'center' }}>
          {count}
        </div>
      </SectionPanel>
    </div>
  )
}

function PlayerRelationsPage() {
  const { playerId } = useParams<{ playerId: string }>()
  const [relations, setRelations] = useState<PlayerRelations | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRelations(null)
    setError(null)
    callApi<PlayerRelations>(`/api/players/${playerId}/relations`)
      .then(setRelations)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [playerId])

  if (error) {
    return (
      <Layout title="Relations">
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!relations) {
    return (
      <Layout title="Relations">
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Relations">
      <div className="fm-page">
        <section style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
          <SummaryTile label="Bond" count={relations.bondCount} color={TIER_COLOR.bond} />
          <SummaryTile label="Friendly" count={relations.friendlyCount} color={TIER_COLOR.friendly} />
          <SummaryTile label="Tension" count={relations.tensionCount} color={TIER_COLOR.tension} />
          <SummaryTile label="Rivalry" count={relations.rivalryCount} color={TIER_COLOR.rivalry} />
        </section>

        <SectionPanel
          title={`${relations.playerName}'s relationships`}
          actions={<span className="fm-panel-count">{relations.relations.length}</span>}
        >
          <DataTable
            rows={relations.relations}
            rowKey={(_, i) => i}
            emptyMessage="No notable relationships"
            columns={[
              {
                key: 'teammate',
                header: 'Teammate',
                render: (r) => <Link to={`/players/${r.otherPlayerId}`}>{r.otherPlayerName}</Link>,
              },
              { key: 'tier', header: 'Tier', render: (r) => <TierBadge tier={r.tier} /> },
              { key: 'level', header: 'Level', render: (r) => r.level },
            ]}
          />
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default PlayerRelationsPage
