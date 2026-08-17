import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import TeamCrest from '../onboarding/TeamCrest'
import { leagueTabs } from './tabs'

// Ported 1:1 from open-football/src/web/src/leagues/get/index.html — the
// `/{lang}/leagues/{slug}` standings table. Same column set as the
// original (position/club/P/W/D/L/GD/Pts — no GF/GA columns, the original
// only shows combined goal difference) and the same zone-ucl/zone-uel/
// zone-rel row-highlighting convention.

type LeagueTableRow = {
  teamId: number
  teamName: string
  teamSlug: string
  position: number
  played: number
  won: number
  drawn: number
  lost: number
  goalDifference: number
  points: number
}

type LeagueTable = {
  leagueId: number
  leagueName: string
  leagueSlug: string
  countryId: number
  rows: LeagueTableRow[]
}

function zoneClass(position: number, total: number): string {
  if (position <= 4) return 'zone-ucl'
  if (position <= 6) return 'zone-uel'
  if (position > total - 3) return 'zone-rel'
  return ''
}

function LeagueTablePage() {
  const { leagueId } = useParams<{ leagueId: string }>()
  const [table, setTable] = useState<LeagueTable | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setTable(null)
    setError(null)
    callApi<LeagueTable>(`/api/leagues/${leagueId}/table`)
      .then(setTable)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [leagueId])

  const tabs = leagueTabs(leagueId!, 'overview')

  if (error) {
    return (
      <Layout title="League" subTitle={tabs}>
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!table) {
    return (
      <Layout title="League" subTitle={tabs}>
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={table.leagueName} subTitle={tabs} sidebarCountryId={table.countryId}>
      <div className="fm-page">
        <section className="fm-panel">
          <table className="fm-standings">
            <thead>
              <tr>
                <th className="st-pos">#</th>
                <th className="st-club">Club</th>
                <th>P</th>
                <th>W</th>
                <th>D</th>
                <th>L</th>
                <th>GD</th>
                <th className="st-pts">Pts</th>
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row) => (
                <tr key={row.teamId} className={zoneClass(row.position, table.rows.length)}>
                  <td className="st-pos">{row.position}</td>
                  <td className="st-club">
                    <Link to={`/teams/${row.teamId}`} className="st-club-link">
                      <TeamCrest slug={row.teamSlug} name={row.teamName} size={20} />
                      <span>{row.teamName}</span>
                    </Link>
                  </td>
                  <td>{row.played}</td>
                  <td>{row.won}</td>
                  <td>{row.drawn}</td>
                  <td>{row.lost}</td>
                  <td className="st-gd">
                    {row.goalDifference > 0 ? '+' : ''}
                    {row.goalDifference}
                  </td>
                  <td className="st-pts">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="fm-legend">
            <span>
              <i className="legend-dot ucl" /> Champions League
            </span>
            <span>
              <i className="legend-dot uel" /> Europa League
            </span>
            <span>
              <i className="legend-dot rel" /> Relegation
            </span>
          </div>
        </section>
      </div>
    </Layout>
  )
}

export default LeagueTablePage
