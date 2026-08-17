import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Flag from '../../shared/Flag'
import Layout from '../../shared/Layout'
import DataTable from '../../shared/ui/DataTable'
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
          <DataTable
            rows={staff}
            rowKey={(_, i) => i}
            emptyMessage="No staff"
            columns={[
              { key: 'name', header: 'Name', render: (m) => `${m.lastName} ${m.firstName}` },
              { key: 'role', header: 'Role', render: (m) => m.role },
              { key: 'nat', header: 'Nat', render: (m) => <Flag code={m.countryCode} /> },
              { key: 'age', header: 'Age', align: 'center', render: (m) => m.age },
            ]}
          />
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default StaffPage
