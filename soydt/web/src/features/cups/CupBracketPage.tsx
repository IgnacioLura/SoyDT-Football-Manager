import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'

// Mirrors `cups/get.html` (bracket) + `cups/history.html` (past champions)
// combined into one page — the original splits them into separate routes,
// but the data is small enough here to show both at once without a tab.

type CupTie = {
  date: string
  homeTeamId: number
  homeTeamName: string
  awayTeamId: number
  awayTeamName: string
  homeGoals: number | null
  awayGoals: number | null
}
type CupRound = { round: number; ties: CupTie[] }
type CupHistoryEntry = { seasonStartYear: number; championTeamName: string; runnerUpTeamName: string | null }
type CupBracket = {
  id: number
  name: string
  rounds: CupRound[]
  championTeamId: number | null
  championTeamName: string | null
  pastChampions: CupHistoryEntry[]
}

function CupBracketPage() {
  const { cupId } = useParams<{ cupId: string }>()
  const [bracket, setBracket] = useState<CupBracket | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setBracket(null)
    setError(null)
    callApi<CupBracket>(`/api/cups/${cupId}`)
      .then(setBracket)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [cupId])

  if (error) {
    return (
      <Layout title="Cup">
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!bracket) {
    return (
      <Layout title="Cup">
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={bracket.name}>
      <div className="fm-page">
        {bracket.championTeamName && (
          <section className="fm-panel">
            <div className="fm-panel-head">
              <h3>Champion</h3>
            </div>
            <p style={{ padding: '14px' }}>
              <Link to={`/teams/${bracket.championTeamId}`}>{bracket.championTeamName}</Link>
            </p>
          </section>
        )}

        {bracket.rounds.map((round) => (
          <section className="fm-panel" key={round.round}>
            <div className="fm-panel-head">
              <h3>Round {round.round}</h3>
            </div>
            <table className="fm-standings">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Home</th>
                  <th>Away</th>
                  <th className="st-pts">Result</th>
                </tr>
              </thead>
              <tbody>
                {round.ties.map((tie, i) => (
                  <tr key={i}>
                    <td>{tie.date}</td>
                    <td>
                      <Link to={`/teams/${tie.homeTeamId}`}>{tie.homeTeamName}</Link>
                    </td>
                    <td>
                      <Link to={`/teams/${tie.awayTeamId}`}>{tie.awayTeamName}</Link>
                    </td>
                    <td className="st-pts">
                      {tie.homeGoals !== null && tie.awayGoals !== null ? `${tie.homeGoals} – ${tie.awayGoals}` : '–'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}

        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Past champions</h3>
          </div>
          {bracket.pastChampions.length === 0 ? (
            <p style={{ padding: '14px' }}>No completed editions yet.</p>
          ) : (
            <ul>
              {bracket.pastChampions.map((h, i) => (
                <li key={i}>
                  {h.seasonStartYear} — {h.championTeamName}
                  {h.runnerUpTeamName && ` (beat ${h.runnerUpTeamName})`}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Layout>
  )
}

export default CupBracketPage
