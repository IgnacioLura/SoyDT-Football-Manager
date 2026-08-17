import { useEffect, useState } from 'react'
import { callApi } from '../../shared/api'
import SectionPanel from '../../shared/ui/SectionPanel'
import TeamCrest from '../onboarding/TeamCrest'
import DtLayout from './DtLayout'
import { useMyTeamId } from './useMyTeamId'

// Read-only competition context for the DT — the standings table, with the
// DT's own row highlighted. Deliberately NOT clickable through to other
// teams (the DT area is locked to the user's own club; Admin is where free
// browsing lives).

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
        <SectionPanel title={table.leagueName}>
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
                  <td className="st-club">
                    <span className="st-club-link">
                      <TeamCrest slug={row.teamSlug} name={row.teamName} size={20} />
                      <span>{row.teamName}</span>
                    </span>
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
        </SectionPanel>
      </div>
    </DtLayout>
  )
}

export default DtTablePage
