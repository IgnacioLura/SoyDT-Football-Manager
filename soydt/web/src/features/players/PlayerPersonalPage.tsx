import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import SectionPanel from '../../shared/ui/SectionPanel'

// Player "Personal" sub-tab — attributes/personality/morale/reputation.
// Simplified scope (see MIGRATION_CHECKLIST.md): no SVG radar chart, no
// manager-relationship cross-lookup, no favorite clubs — just the raw
// values rendered as plain label:value rows.

type PlayerLanguage = {
  name: string
  proficiency: number
  isNative: boolean
}

type PlayerPersonal = {
  preferredFoot: string
  leadership: number
  determination: number
  workRate: number
  conditionPct: number
  fitnessPct: number
  currentReputation: number
  homeReputation: number
  worldReputation: number
  adaptability: number
  ambition: number
  controversy: number
  loyalty: number
  pressure: number
  professionalism: number
  sportsmanship: number
  temperament: number
  morale: number
  languages: PlayerLanguage[]
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
      <span style={{ color: '#888' }}>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function PlayerPersonalPage() {
  const { playerId } = useParams<{ playerId: string }>()
  const [personal, setPersonal] = useState<PlayerPersonal | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPersonal(null)
    setError(null)
    callApi<PlayerPersonal>(`/api/players/${playerId}/personal`)
      .then(setPersonal)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [playerId])

  if (error) {
    return (
      <Layout title="Personal">
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!personal) {
    return (
      <Layout title="Personal">
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Personal">
      <div className="fm-page">
        <SectionPanel title="Attributes">
          <div style={{ padding: '14px' }}>
            <Row label="Preferred foot" value={personal.preferredFoot} />
            <Row label="Leadership" value={personal.leadership.toFixed(1)} />
            <Row label="Determination" value={personal.determination.toFixed(1)} />
            <Row label="Work rate" value={personal.workRate.toFixed(1)} />
            <Row label="Condition" value={`${personal.conditionPct}%`} />
            <Row label="Fitness" value={`${personal.fitnessPct}%`} />
            <Row label="Morale" value={personal.morale.toFixed(1)} />
          </div>
        </SectionPanel>

        <SectionPanel title="Reputation">
          <div style={{ padding: '14px' }}>
            <Row label="Current reputation" value={personal.currentReputation} />
            <Row label="Home reputation" value={personal.homeReputation} />
            <Row label="World reputation" value={personal.worldReputation} />
          </div>
        </SectionPanel>

        <SectionPanel title="Personality">
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
        </SectionPanel>

        <SectionPanel title="Languages">
          <div style={{ padding: '14px' }}>
            {personal.languages.length === 0 && <p>No languages recorded.</p>}
            {personal.languages.map((lang) => (
              <Row
                key={lang.name}
                label={lang.name}
                value={`${lang.proficiency}%${lang.isNative ? ' (native)' : ''}`}
              />
            ))}
          </div>
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default PlayerPersonalPage
