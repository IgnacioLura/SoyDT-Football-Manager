import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { callApi } from '../../shared/api'
import TeamCrest from '../onboarding/TeamCrest'
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
          <table className="fm-schedule">
            <thead>
              <tr>
                <th className="sch-date">Fecha</th>
                <th className="sch-time">Hora</th>
                <th>Rival</th>
                <th className="sch-venue">Cancha</th>
                <th className="sch-result">Resultado</th>
                <th>Competición</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.matchId}>
                  <td className="sch-date">{item.date}</td>
                  <td className="sch-time">{item.time}</td>
                  <td className="sch-opponent">
                    <Link to={`/teams/${item.opponentTeamId}`} className="st-club-link">
                      <TeamCrest slug={item.opponentSlug} name={item.opponentName} size={20} />
                      <span>{item.opponentName}</span>
                    </Link>
                  </td>
                  <td className="sch-venue">
                    <span className={`fm-venue ${item.isHome ? 'venue-h' : 'venue-a'}`}>{item.isHome ? 'L' : 'V'}</span>
                  </td>
                  <td className="sch-result">
                    {item.homeGoals !== null && item.awayGoals !== null ? (
                      <Link to={`/match/${item.matchId}`} className="fm-result">
                        {item.homeGoals} – {item.awayGoals}
                      </Link>
                    ) : (
                      <span className="fm-pending">–</span>
                    )}
                  </td>
                  <td className="sch-comp">{item.competitionName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionPanel>
      </div>
    </DtLayout>
  )
}

export default DtSchedulePage
