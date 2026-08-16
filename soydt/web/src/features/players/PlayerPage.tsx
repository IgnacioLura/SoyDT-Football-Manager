import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import AiReportButton from '../../shared/AiReportButton'
import Flag from '../../shared/Flag'
import Layout from '../../shared/Layout'

// Phase 1: player overview page, mirrors the original app's
// `/{lang}/players/{slug}` route (overview tab only so far — contract/
// history/transfers/etc. are separate tabs there, not yet ported).

type PlayerDetail = {
  id: number
  firstName: string
  lastName: string
  age: number
  position: string
  countryCode: string
  countryName: string
  currentAbility: number
  value: number
  currentReputation: number
  height: number
  weight: number
  isInjured: boolean
  isBanned: boolean
  technicalAvg: number
  mentalAvg: number
  physicalAvg: number
  teamId: number | null
  teamName: string | null
}

function PlayerPage() {
  const { playerId } = useParams<{ playerId: string }>()
  const [player, setPlayer] = useState<PlayerDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setPlayer(null)
    setError(null)
    callApi<PlayerDetail>(`/api/players/${playerId}`)
      .then(setPlayer)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [playerId])

  if (error) {
    return (
      <Layout title="Player">
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!player) {
    return (
      <Layout title="Player">
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  const subTitle = (
    <span>
      <Flag code={player.countryCode} /> {player.countryName}
      {player.teamId && (
        <>
          {' — '}
          <Link to={`/teams/${player.teamId}`}>{player.teamName}</Link>
        </>
      )}
    </span>
  )

  return (
    <Layout title={`${player.firstName} ${player.lastName}`} subTitle={subTitle}>
      <div className="fm-page">
        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Overview</h3>
            <AiReportButton title="AI scouting dossier" startUrl={`/api/players/${playerId}/ai-report`} />
          </div>
          <div style={{ padding: '14px', display: 'flex', gap: '16px' }}>
            <img
              src="/static/images/player/placeholder-face.svg"
              alt=""
              width={100}
              height={125}
              style={{ borderRadius: '4px', flexShrink: 0 }}
            />
            <div>
              <p>
                Position: {player.position} — Age: {player.age}
              </p>
              <p>
                Current ability: {player.currentAbility} — Value: {player.value.toLocaleString()} — Reputation:{' '}
                {player.currentReputation}
              </p>
              <p>
                Height: {player.height}cm — Weight: {player.weight}kg
              </p>
              <p>
                Technical: {player.technicalAvg.toFixed(1)} — Mental: {player.mentalAvg.toFixed(1)} — Physical:{' '}
                {player.physicalAvg.toFixed(1)}
              </p>
              {player.isInjured && <p style={{ color: '#e74c3c' }}>Injured</p>}
              {player.isBanned && <p style={{ color: '#e74c3c' }}>Banned</p>}
            </div>
          </div>
        </section>
      </div>
    </Layout>
  )
}

export default PlayerPage
