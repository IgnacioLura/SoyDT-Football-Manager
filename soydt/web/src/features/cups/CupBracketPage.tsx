import { useEffect, useState, type CSSProperties } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import DataTable from '../../shared/ui/DataTable'
import SectionPanel from '../../shared/ui/SectionPanel'
import './CupBracketPage.css'

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
          <SectionPanel title="Champion">
            <p className="cup-champion-glow">
              <Link to={`/teams/${bracket.championTeamId}`}>{bracket.championTeamName}</Link>
            </p>
          </SectionPanel>
        )}

        {bracket.rounds.map((round, i) => (
          <SectionPanel title={`Round ${round.round}`} key={round.round} index={i}>
            <DataTable
              rows={round.ties}
              rowKey={(_, i) => i}
              columns={[
                { key: 'date', header: 'Date', align: 'center', render: (tie) => tie.date },
                {
                  key: 'home',
                  header: 'Home',
                  align: 'center',
                  render: (tie) => <Link to={`/teams/${tie.homeTeamId}`}>{tie.homeTeamName}</Link>,
                },
                {
                  key: 'away',
                  header: 'Away',
                  align: 'center',
                  render: (tie) => <Link to={`/teams/${tie.awayTeamId}`}>{tie.awayTeamName}</Link>,
                },
                {
                  key: 'result',
                  header: 'Result',
                  align: 'center',
                  render: (tie) =>
                    tie.homeGoals !== null && tie.awayGoals !== null ? `${tie.homeGoals} – ${tie.awayGoals}` : '–',
                },
              ]}
            />
          </SectionPanel>
        ))}

        <SectionPanel title="Past champions">
          {bracket.pastChampions.length === 0 ? (
            <p style={{ padding: '14px' }}>No completed editions yet.</p>
          ) : (
            <ul>
              {bracket.pastChampions.map((h, i) => (
                <li className="anim-fade-in-up" style={{ '--i': i } as CSSProperties} key={i}>
                  {h.seasonStartYear} — {h.championTeamName}
                  {h.runnerUpTeamName && ` (beat ${h.runnerUpTeamName})`}
                </li>
              ))}
            </ul>
          )}
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default CupBracketPage
