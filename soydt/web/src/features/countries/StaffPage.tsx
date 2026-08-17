import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Flag from '../../shared/Flag'
import Layout from '../../shared/Layout'
import SectionPanel from '../../shared/ui/SectionPanel'
import { countryTabs } from './tabs'

// Ported from open-football/src/web/src/countries/staff/index.html — the
// `/{lang}/countries/{slug}/staff` route (national team staff roster).

type StaffMember = {
  firstName: string
  lastName: string
  role: string
  countryCode: string
  countryName: string
  age: number
}

function StaffPage() {
  const { countryId } = useParams<{ countryId: string }>()
  const [staff, setStaff] = useState<StaffMember[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setStaff(null)
    setError(null)
    callApi<StaffMember[]>(`/api/countries/${countryId}/staff`)
      .then(setStaff)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [countryId])

  const tabs = countryTabs(countryId!, 'staff')

  if (error) {
    return (
      <Layout title="Staff" subTitle={tabs} sidebarCountryId={Number(countryId)}>
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!staff) {
    return (
      <Layout title="Staff" subTitle={tabs} sidebarCountryId={Number(countryId)}>
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Staff" subTitle={tabs} sidebarCountryId={Number(countryId)}>
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
                </tr>
              </thead>
              <tbody>
                {staff.map((m, i) => (
                  <tr key={i}>
                    <td className="st-name">
                      {m.lastName} {m.firstName}
                    </td>
                    <td className="st-role">{m.role}</td>
                    <td className="st-nat">
                      <Flag code={m.countryCode} />
                    </td>
                    <td className="st-age">{m.age}</td>
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

export default StaffPage
