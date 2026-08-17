import { useEffect, useState } from 'react'
import { callApi } from '../../shared/api'
import DataTable from '../../shared/ui/DataTable'
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
          <DataTable
            rows={table.rows}
            rowKey={(row) => row.teamId}
            rowClassName={(row) => (row.teamId === myTeamId ? 'dt-row-highlight' : undefined)}
            columns={[
              { key: 'pos', header: '#', align: 'center', render: (row) => row.position },
              {
                key: 'club',
                header: 'Club',
                render: (row) => (
                  <span className="st-club-link">
                    <TeamCrest slug={row.teamSlug} name={row.teamName} size={20} />
                    <span>{row.teamName}</span>
                  </span>
                ),
              },
              { key: 'played', header: 'P', render: (row) => row.played },
              { key: 'won', header: 'G', render: (row) => row.won },
              { key: 'drawn', header: 'E', render: (row) => row.drawn },
              { key: 'lost', header: 'P', render: (row) => row.lost },
              {
                key: 'gd',
                header: 'DG',
                render: (row) => (
                  <>
                    {row.goalDifference > 0 ? '+' : ''}
                    {row.goalDifference}
                  </>
                ),
              },
              { key: 'pts', header: 'Pts', align: 'right', render: (row) => row.points },
            ]}
          />
        </SectionPanel>
      </div>
    </DtLayout>
  )
}

export default DtTablePage
