import { useEffect, useState } from 'react'
import { callApi } from '../../shared/api'
import DtLayout from './DtLayout'
import { useMyTeamId } from './useMyTeamId'

// Read-only competition context for the DT — the standings table, with the
// DT's own row highlighted. Deliberately NOT clickable through to other
// teams (the DT area is locked to the user's own club; Admin is where free
// browsing lives).

type LeagueTableRow = {
  teamId: number
  teamName: string
  position: number
  played: number
  won: number
  drawn: number
  lost: number
  goalDifference: number
  points: number
}
type LeagueTable = { leagueName: string; rows: LeagueTableRow[] }

const PRIMERA_LEAGUE_ID = 140

function DtTablePage() {
  const myTeamId = useMyTeamId()
  const [table, setTable] = useState<LeagueTable | null>(null)

  useEffect(() => {
    callApi<LeagueTable>(`/api/leagues/${PRIMERA_LEAGUE_ID}/table`).then(setTable)
  }, [])

  if (!table) {
    return (
      <DtLayout title="Tabla">
        <div className="fm-page">
          <p>Cargando…</p>
        </div>
      </DtLayout>
    )
  }

  return (
    <DtLayout title={table.leagueName}>
      <div className="fm-page">
        <section className="fm-panel">
          <table className="fm-standings">
            <thead>
              <tr>
                <th className="st-pos">#</th>
                <th className="st-club">Club</th>
                <th>P</th>
                <th>G</th>
                <th>E</th>
                <th>P</th>
                <th>DG</th>
                <th className="st-pts">Pts</th>
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row) => (
                <tr key={row.teamId} style={row.teamId === myTeamId ? { fontWeight: 700, background: 'rgba(74, 222, 128, 0.08)' } : undefined}>
                  <td className="st-pos">{row.position}</td>
                  <td className="st-club">{row.teamName}</td>
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
        </section>
      </div>
    </DtLayout>
  )
}

export default DtTablePage
