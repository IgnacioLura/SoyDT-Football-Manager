import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Flag from '../../shared/Flag'
import Layout from '../../shared/Layout'
import DataTable from '../../shared/ui/DataTable'
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
          <DataTable
            rows={staff}
            rowKey={(m) => m.id}
            emptyMessage="No staff"
            columns={[
              {
                key: 'name',
                header: 'Name',
                className: 'st-name',
                render: (m) => (
                  <>
                    {m.lastName} {m.firstName}
                  </>
                ),
              },
              { key: 'role', header: 'Role', className: 'st-role', render: (m) => m.role },
              { key: 'nat', header: 'Nat', className: 'st-nat', render: (m) => <Flag code={m.countryCode} /> },
              { key: 'age', header: 'Age', align: 'center', className: 'st-age', render: (m) => m.age },
              { key: 'wage', header: 'Wage', className: 'st-wage', render: (m) => wageFormatter.format(m.wage) },
            ]}
          />
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default TeamStaffPage
