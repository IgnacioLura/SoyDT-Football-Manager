import { useEffect, useState } from 'react'
import { callApi } from './api'

// Team subpages (schedule/transfers/finances/staff/stats/relations/academy/
// scouting/tactics) fetch team-scoped domain data that has no reason to
// carry country_id itself — reuse the already-existing `/api/teams/{id}`
// lookup (TeamPage's own endpoint) just for the sidebar's country context,
// instead of threading country_id through nine more engine-ffi exports.
export function useTeamCountryId(teamId: string | undefined): number | undefined {
  const [countryId, setCountryId] = useState<number | undefined>(undefined)

  useEffect(() => {
    setCountryId(undefined)
    if (!teamId) return
    callApi<{ countryId: number }>(`/api/teams/${teamId}`)
      .then((team) => setCountryId(team.countryId))
      .catch(() => setCountryId(undefined))
  }, [teamId])

  return countryId
}
