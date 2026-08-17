import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Flag from '../../shared/Flag'
import Layout from '../../shared/Layout'
import SectionPanel from '../../shared/ui/SectionPanel'
import { useTeamCountryId } from '../../shared/useTeamCountryId'

// Club team staff roster — mirrors the original app's team staff tab, but
// as a single flat list sorted by last name rather than the original's
// 6-bucket role grouping (management/coaching/medical/scouting/
// boardroom/media). See engine-ffi/src/team_staff.rs for the simplification
// note.

type TeamStaffMember = {
  id: number
  firstName: string
  lastName: string
  role: string
  countryCode: string
  countryName: string
  age: number
  wage: number
}

const wageFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 })

function TeamStaffPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const sidebarCountryId = useTeamCountryId(teamId)
  const [staff, setStaff] = useState<TeamStaffMember[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setStaff(null)
    setError(null)
    callApi<TeamStaffMember[]>(`/api/teams/${teamId}/staff`)
      .then(setStaff)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [teamId])

  if (error) {
    return (
      <Layout title="Staff" sidebarCountryId={sidebarCountryId}>
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!staff) {
    return (
      <Layout title="Staff" sidebarCountryId={sidebarCountryId}>
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Staff" sidebarCountryId={sidebarCountryId}>
      <div className="fm-page">
        <SectionPanel title="Staff" actions={<span className="fm-panel-count">{staff.length}</span>}>
          {staff.length === 0 ? (
            <div className="fm-empty">No staff</div>
          ) : (
            <table className="fm-squad fm-staff-table">
              <thead>
                <tr>
                  <th className="st-name">Name</th>
                  <th className="st-role">Role</th>
                  <th className="st-nat">Nat</th>
                  <th className="st-age">Age</th>
                  <th className="st-wage">Wage</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((m) => (
                  <tr key={m.id}>
                    <td className="st-name">
                      {m.lastName} {m.firstName}
                    </td>
                    <td className="st-role">{m.role}</td>
                    <td className="st-nat">
                      <Flag code={m.countryCode} />
                    </td>
                    <td className="st-age">{m.age}</td>
                    <td className="st-wage">{wageFormatter.format(m.wage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default TeamStaffPage
