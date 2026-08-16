import { useEffect, useState } from 'react'
import { callApi } from '../../shared/api'

// Every DT page needs "my team id" — resolved once from `GET
// /api/game/my-team` (see GameController.MyTeam; a club's main team shares
// its numeric id with the club itself in this engine, so it's really just
// `MyClubId` echoed back). `null` means no club has been picked yet.
export function useMyTeamId(): number | null | undefined {
  const [teamId, setTeamId] = useState<number | null | undefined>(undefined)

  useEffect(() => {
    callApi<{ teamId: number | null }>('/api/game/my-team')
      .then((r) => setTeamId(r.teamId))
      .catch(() => setTeamId(null))
  }, [])

  return teamId
}
