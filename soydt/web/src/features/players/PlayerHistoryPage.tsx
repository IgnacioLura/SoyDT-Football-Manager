import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'

// SIMPLIFIED port of open-football/src/web/src/player/history — the
// original renders an accordion of per-competition stat breakdowns backed
// by a live/historical merge projection. Here: a flat table of completed
// (League-kind) season_ledger rows only — no accordion, no in-progress
// current season, no transfer fee. See MIGRATION_CHECKLIST.md.

type PlayerHistoryRow = {
  season: string
  teamName: string
  played: number
  goals: number
  assists: number
  averageRating: number
}

function PlayerHistoryPage() {
  const { playerId } = useParams<{ playerId: string }>()
  const [rows, setRows] = useState<PlayerHistoryRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRows(null)
    setError(null)
    callApi<PlayerHistoryRow[]>(`/api/players/${playerId}/history`)
      .then(setRows)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [playerId])

  if (error) {
    return (
      <Layout title="Player History">
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!rows) {
    return (
      <Layout title="Player History">
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Player History">
      <div className="fm-page">
        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Season history</h3>
            <span className="fm-panel-count">{rows.length}</span>
          </div>
          {rows.length === 0 ? (
            <div className="fm-empty">No completed seasons</div>
          ) : (
            <table className="fm-squad">
              <thead>
                <tr>
                  <th>Season</th>
                  <th className="sq-name">Team</th>
                  <th>Played</th>
                  <th>Goals</th>
                  <th>Assists</th>
                  <th>Avg Rating</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td>{r.season}</td>
                    <td className="sq-name">{r.teamName}</td>
                    <td>{r.played}</td>
                    <td>{r.goals}</td>
                    <td>{r.assists}</td>
                    <td>{r.averageRating.toFixed(2)}</td>
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

export default PlayerHistoryPage
