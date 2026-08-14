import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import { staffTabs } from './tabs'

// Ported from open-football/src/web/src/staff/personal/index.html — the
// `/{lang}/staff/{slug}/personal` route. Simplified scope (see
// MIGRATION_CHECKLIST.md precedent set by PlayerPersonalPage.tsx): no SVG
// radar chart, no recent-events feed, no scout-workload/monitoring table —
// just the raw values rendered as plain label:value rows.

type StaffPersonal = {
  coachingStyle: string
  license: string
  determination: number
  manManagement: number
  motivating: number
  discipline: number
  behaviour: string
  jobSatisfactionPct: number
  fatiguePct: number
  role: string | null
  salary: number | null
  contractExpiry: string | null
  trainingEffectivenessPct: number
  playerDevelopmentPct: number
  injuryPreventionPct: number
  tacticalImplementationPct: number
  adaptability: number
  ambition: number
  controversy: number
  loyalty: number
  pressure: number
  professionalism: number
  sportsmanship: number
  temperament: number
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
      <span style={{ color: '#888' }}>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function StaffPersonalPage() {
  const { staffId } = useParams<{ staffId: string }>()
  const [personal, setPersonal] = useState<StaffPersonal | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPersonal(null)
    setError(null)
    callApi<StaffPersonal>(`/api/staff/${staffId}/personal`)
      .then(setPersonal)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [staffId])

  const tabs = staffTabs(staffId!, 'personal')

  if (error) {
    return (
      <Layout title="Personal" subTitle={tabs}>
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!personal) {
    return (
      <Layout title="Personal" subTitle={tabs}>
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Personal" subTitle={tabs}>
      <div className="fm-page">
        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Staff profile</h3>
          </div>
          <div style={{ padding: '14px' }}>
            <Row label="Coaching style" value={personal.coachingStyle} />
            <Row label="License" value={personal.license} />
            <Row label="Determination" value={personal.determination} />
            <Row label="Man management" value={personal.manManagement} />
            <Row label="Motivating" value={personal.motivating} />
            <Row label="Discipline" value={personal.discipline} />
            <Row label="Job satisfaction" value={`${personal.jobSatisfactionPct}%`} />
            <Row label="Fatigue" value={`${personal.fatiguePct}%`} />
            {personal.role && (
              <>
                <Row label="Role" value={personal.role} />
                <Row label="Wage" value={personal.salary ?? '-'} />
                <Row label="Contract" value={personal.contractExpiry ?? '-'} />
              </>
            )}
          </div>
        </section>

        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Performance</h3>
          </div>
          <div style={{ padding: '14px' }}>
            <Row label="Behaviour" value={personal.behaviour} />
            <Row label="Training effectiveness" value={`${personal.trainingEffectivenessPct}%`} />
            <Row label="Player development" value={`${personal.playerDevelopmentPct}%`} />
            <Row label="Injury prevention" value={`${personal.injuryPreventionPct}%`} />
            <Row label="Tactical implementation" value={`${personal.tacticalImplementationPct}%`} />
          </div>
        </section>

        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Personality</h3>
          </div>
          <div style={{ padding: '14px' }}>
            <Row label="Adaptability" value={personal.adaptability.toFixed(1)} />
            <Row label="Ambition" value={personal.ambition.toFixed(1)} />
            <Row label="Controversy" value={personal.controversy.toFixed(1)} />
            <Row label="Loyalty" value={personal.loyalty.toFixed(1)} />
            <Row label="Pressure" value={personal.pressure.toFixed(1)} />
            <Row label="Professionalism" value={personal.professionalism.toFixed(1)} />
            <Row label="Sportsmanship" value={personal.sportsmanship.toFixed(1)} />
            <Row label="Temperament" value={personal.temperament.toFixed(1)} />
          </div>
        </section>
      </div>
    </Layout>
  )
}

export default StaffPersonalPage
