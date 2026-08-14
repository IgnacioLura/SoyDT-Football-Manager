import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'

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
    <div className="fm-panel" style={{ flex: '1 1 0', textAlign: 'center' }}>
      <div className="fm-panel-head" style={{ justifyContent: 'center' }}>
        <h3>{label}</h3>
      </div>
      <div style={{ fontSize: '1.8rem', fontWeight: 700, color, padding: '0.5rem 0' }}>{count}</div>
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

        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>{relations.playerName}'s relationships</h3>
            <span className="fm-panel-count">{relations.relations.length}</span>
          </div>
          {relations.relations.length === 0 ? (
            <div className="fm-empty">No notable relationships</div>
          ) : (
            <table className="fm-squad">
              <thead>
                <tr>
                  <th className="sq-name">Teammate</th>
                  <th>Tier</th>
                  <th>Level</th>
                </tr>
              </thead>
              <tbody>
                {relations.relations.map((r, i) => (
                  <tr key={i}>
                    <td className="sq-name">
                      <Link to={`/players/${r.otherPlayerId}`}>{r.otherPlayerName}</Link>
                    </td>
                    <td>
                      <TierBadge tier={r.tier} />
                    </td>
                    <td>{r.level}</td>
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

export default PlayerRelationsPage
