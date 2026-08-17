import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { callApi } from '../../shared/api'
import TeamCrest from '../onboarding/TeamCrest'
import DataTable from '../../shared/ui/DataTable'
import SectionPanel from '../../shared/ui/SectionPanel'
import DtLayout from './DtLayout'
import { useMyTeamId } from './useMyTeamId'

// DT's schedule view — literally reuses `TeamSchedulePage`'s existing
// fetch/render (engine_get_team_schedule is already read-only, no new
// engine work needed), just fixed to the DT's own team id and wrapped in
// DtLayout instead of the Admin Layout.

type TeamScheduleItem = {
  date: string
  time: string
  opponentTeamId: number
  opponentName: string
  opponentSlug: string
  isHome: boolean
  competitionName: string
  matchId: string
  homeGoals: number | null
  awayGoals: number | null
}

function DtSchedulePage() {
  const myTeamId = useMyTeamId()
  const [items, setItems] = useState<TeamScheduleItem[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (myTeamId == null) return
    callApi<TeamScheduleItem[]>(`/api/teams/${myTeamId}/schedule`)
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [myTeamId])

  if (myTeamId === undefined || (myTeamId != null && !items && !error)) {
    return (
      <DtLayout title="Calendario">
        <div className="fm-page">
          <p>Cargando…</p>
        </div>
      </DtLayout>
    )
  }

  if (myTeamId == null) {
    return (
      <DtLayout title="Calendario">
        <div className="fm-page">
          <p>Todavía no elegiste tu club — andá a /new-game.</p>
        </div>
      </DtLayout>
    )
  }

  if (error || !items) {
    return (
      <DtLayout title="Calendario">
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </DtLayout>
    )
  }

  return (
    <DtLayout title="Calendario">
      <div className="fm-page">
        <SectionPanel title="Calendario">
          <DataTable
            rows={items}
            rowKey={(item) => item.matchId}
            columns={[
              { key: 'date', header: 'Fecha', render: (item) => item.date },
              { key: 'time', header: 'Hora', render: (item) => item.time },
              {
                key: 'opponent',
                header: 'Rival',
                render: (item) => (
                  <Link to={`/teams/${item.opponentTeamId}`} className="st-club-link">
                    <TeamCrest slug={item.opponentSlug} name={item.opponentName} size={20} />
                    <span>{item.opponentName}</span>
                  </Link>
                ),
              },
              {
                key: 'venue',
                header: 'Cancha',
                align: 'center',
                render: (item) => (
                  <span className={`fm-venue ${item.isHome ? 'venue-h' : 'venue-a'}`}>{item.isHome ? 'L' : 'V'}</span>
                ),
              },
              {
                key: 'result',
                header: 'Resultado',
                align: 'center',
                render: (item) =>
                  item.homeGoals !== null && item.awayGoals !== null ? (
                    <Link to={`/match/${item.matchId}`} className="fm-result">
                      {item.homeGoals} – {item.awayGoals}
                    </Link>
                  ) : (
                    <span className="fm-pending">–</span>
                  ),
              },
              { key: 'comp', header: 'Competición', render: (item) => item.competitionName },
            ]}
          />
        </SectionPanel>
      </div>
    </DtLayout>
  )
}

export default DtSchedulePage
