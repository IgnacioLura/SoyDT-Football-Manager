import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Flag from '../../shared/Flag'
import Layout from '../../shared/Layout'
import { staffTabs } from './tabs'

// Ported from open-football/src/web/src/staff/get/index.html — the
// `/{lang}/staff/{slug}` route (staff member overview: profile + coaching/
// mental/knowledge/goalkeeping/medical attributes). Distinct from
// countries/StaffPage.tsx (national-team staff LIST) — this is one club
// staff member by id.

type StaffCoaching = {
  attacking: number
  defending: number
  fitness: number
  mental: number
  tactical: number
  technical: number
  workingWithYoungsters: number
}

type StaffMental = {
  adaptability: number
  determination: number
  discipline: number
  manManagement: number
  motivating: number
}

type StaffKnowledge = {
  judgingPlayerAbility: number
  judgingPlayerPotential: number
  tacticalKnowledge: number
}

type StaffGoalkeeping = {
  distribution: number
  handling: number
  shotStopping: number
}

type StaffMedical = {
  physiotherapy: number
  sportsScience: number
}

type StaffDetail = {
  id: number
  firstName: string
  lastName: string
  age: number
  birthDate: string
  countryId: number
  countryCode: string
  countryName: string
  role: string
  teamId: number
  teamName: string
  salary: number | null
  contractExpiry: string | null
  coaching: StaffCoaching
  mental: StaffMental
  knowledge: StaffKnowledge
  goalkeeping: StaffGoalkeeping
  medical: StaffMedical
}

function AttrRow({ label, value }: { label: string; value: number }) {
  return (
    <tr>
      <td>{label}</td>
      <td>{value}</td>
    </tr>
  )
}

function StaffPage() {
  const { staffId } = useParams<{ staffId: string }>()
  const [staff, setStaff] = useState<StaffDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setStaff(null)
    setError(null)
    callApi<StaffDetail>(`/api/staff/${staffId}`)
      .then(setStaff)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [staffId])

  const tabs = staffTabs(staffId!, 'overview')

  if (error) {
    return (
      <Layout title="Staff" subTitle={tabs}>
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!staff) {
    return (
      <Layout title="Staff" subTitle={tabs}>
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title={`${staff.firstName} ${staff.lastName}`} subTitle={tabs}>
      <div className="fm-page">
        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Staff profile</h3>
          </div>
          <div style={{ padding: '14px' }}>
            <p>
              <Flag code={staff.countryCode} /> {staff.countryName} — Age: {staff.age} — Born: {staff.birthDate}
            </p>
            <p>Role: {staff.role}</p>
            <p>
              Contracted to: <Link to={`/teams/${staff.teamId}`}>{staff.teamName}</Link>
            </p>
            {staff.salary != null && (
              <p>
                {staff.salary.toLocaleString()} per week
                {staff.contractExpiry && <> — until {staff.contractExpiry}</>}
              </p>
            )}
          </div>
        </section>

        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Attributes</h3>
          </div>
          <div className="fm-staff-attrs" style={{ padding: '14px', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div>
              <h4>Coaching</h4>
              <table className="fm-skills">
                <tbody>
                  <AttrRow label="Attacking" value={staff.coaching.attacking} />
                  <AttrRow label="Defending" value={staff.coaching.defending} />
                  <AttrRow label="Fitness" value={staff.coaching.fitness} />
                  <AttrRow label="Mental" value={staff.coaching.mental} />
                  <AttrRow label="Tactical" value={staff.coaching.tactical} />
                  <AttrRow label="Technical" value={staff.coaching.technical} />
                  <AttrRow label="Working with youngsters" value={staff.coaching.workingWithYoungsters} />
                </tbody>
              </table>
            </div>
            <div>
              <h4>Mental</h4>
              <table className="fm-skills">
                <tbody>
                  <AttrRow label="Adaptability" value={staff.mental.adaptability} />
                  <AttrRow label="Determination" value={staff.mental.determination} />
                  <AttrRow label="Discipline" value={staff.mental.discipline} />
                  <AttrRow label="Man management" value={staff.mental.manManagement} />
                  <AttrRow label="Motivating" value={staff.mental.motivating} />
                </tbody>
              </table>
            </div>
            <div>
              <h4>Knowledge</h4>
              <table className="fm-skills">
                <tbody>
                  <AttrRow label="Judging player ability" value={staff.knowledge.judgingPlayerAbility} />
                  <AttrRow label="Judging player potential" value={staff.knowledge.judgingPlayerPotential} />
                  <AttrRow label="Tactical knowledge" value={staff.knowledge.tacticalKnowledge} />
                </tbody>
              </table>
            </div>
            <div>
              <h4>Goalkeeping</h4>
              <table className="fm-skills">
                <tbody>
                  <AttrRow label="Distribution" value={staff.goalkeeping.distribution} />
                  <AttrRow label="Handling" value={staff.goalkeeping.handling} />
                  <AttrRow label="Shot stopping" value={staff.goalkeeping.shotStopping} />
                </tbody>
              </table>
            </div>
            <div>
              <h4>Medical</h4>
              <table className="fm-skills">
                <tbody>
                  <AttrRow label="Physiotherapy" value={staff.medical.physiotherapy} />
                  <AttrRow label="Sports science" value={staff.medical.sportsScience} />
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  )
}

export default StaffPage
