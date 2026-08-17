import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import DataTable from '../../shared/ui/DataTable'
import SectionPanel from '../../shared/ui/SectionPanel'

// One component backs all four continental index pages
// (champions-league/europa-league/conference-league/copa-libertadores) —
// same shape on the backend (engine-ffi/src/continental.rs), so a single
// route parameterized by competition slug covers all four instead of
// four near-identical pages. In this app's scoped world (AR/UY/BR), only
// copa-libertadores has real data; the UEFA competitions render empty
// (no European clubs in scope) rather than erroring.

type GroupRow = { teamId: number; teamName: string; played: number; won: number; drawn: number; lost: number; gf: number; ga: number; points: number }
type Group = { name: string; rows: GroupRow[] }
type KnockoutTie = {
  homeTeamId: number
  homeTeamName: string
  awayTeamId: number
  awayTeamName: string
  leg1HomeGoals: number | null
  leg1AwayGoals: number | null
  leg2HomeGoals: number | null
  leg2AwayGoals: number | null
  winnerTeamId: number | null
  winnerTeamName: string | null
}
type ContinentalCompetition = { competition: string; stage: string; groups: Group[]; knockoutTies: KnockoutTie[] }

const TITLES: Record<string, string> = {
  'champions-league': 'Champions League',
  'europa-league': 'Europa League',
  'conference-league': 'Conference League',
  'copa-libertadores': 'Copa Libertadores',
}

function ContinentalCompetitionPage() {
  const location = useLocation()
  const competition = location.pathname.replace(/^\//, '')
  const [data, setData] = useState<ContinentalCompetition | null>(null)
  const [error, setError] = useState<string | null>(null)

  const slug = competition.replace(/-/g, '_')
  const title = TITLES[competition] ?? competition

  useEffect(() => {
    setData(null)
    setError(null)
    callApi<ContinentalCompetition>(`/api/continental/${slug}`)
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [slug])

  if (error) {
    return (
      <Layout title={title}>
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!data) {
    return (
      <Layout title={title}>
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  const isEmpty = data.groups.length === 0 && data.knockoutTies.length === 0

  return (
    <Layout title={title} subTitle={data.stage}>
      <div className="fm-page">
        {isEmpty ? (
          <section className="fm-panel">
            <p style={{ padding: '14px' }}>
              No data for this competition in the current scoped world — this competition has no participating clubs
              from the countries in scope.
            </p>
          </section>
        ) : (
          <>
            {data.groups.map((group) => (
              <SectionPanel title={group.name} key={group.name}>
                <DataTable
                  rows={group.rows}
                  rowKey={(row) => row.teamId}
                  columns={[
                    {
                      key: 'club',
                      header: 'Club',
                      align: 'left',
                      render: (row) => <Link to={`/teams/${row.teamId}`}>{row.teamName}</Link>,
                    },
                    { key: 'p', header: 'P', align: 'center', render: (row) => row.played },
                    { key: 'w', header: 'W', align: 'center', render: (row) => row.won },
                    { key: 'd', header: 'D', align: 'center', render: (row) => row.drawn },
                    { key: 'l', header: 'L', align: 'center', render: (row) => row.lost },
                    { key: 'gf', header: 'GF', align: 'center', render: (row) => row.gf },
                    { key: 'ga', header: 'GA', align: 'center', render: (row) => row.ga },
                    { key: 'pts', header: 'Pts', align: 'center', render: (row) => row.points },
                  ]}
                />
              </SectionPanel>
            ))}

            {data.knockoutTies.length > 0 && (
              <SectionPanel title="Knockout">
                <DataTable
                  rows={data.knockoutTies}
                  rowKey={(_, i) => i}
                  columns={[
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
                      key: 'leg1',
                      header: 'Leg 1',
                      align: 'center',
                      render: (tie) => (tie.leg1HomeGoals !== null ? `${tie.leg1HomeGoals} – ${tie.leg1AwayGoals}` : '–'),
                    },
                    {
                      key: 'leg2',
                      header: 'Leg 2',
                      align: 'center',
                      render: (tie) => (tie.leg2HomeGoals !== null ? `${tie.leg2HomeGoals} – ${tie.leg2AwayGoals}` : '–'),
                    },
                    { key: 'winner', header: 'Winner', align: 'center', render: (tie) => tie.winnerTeamName ?? '–' },
                  ]}
                />
              </SectionPanel>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}

export default ContinentalCompetitionPage
