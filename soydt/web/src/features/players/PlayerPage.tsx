// soydt/web/src/features/players/PlayerPage.tsx
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import AiReportButton from '../../shared/AiReportButton'
import Flag from '../../shared/Flag'
import Layout from '../../shared/Layout'
import { playerPhotoOnError, playerPhotoSrc } from '../../shared/playerPhoto'
import { PositionBadge } from '../../shared/positions'
import { useOvrGrowth } from '../../shared/useOvrGrowth'
import RatingBadge from '../../shared/ui/RatingBadge'
import SectionPanel from '../../shared/ui/SectionPanel'
import AttributeGrid, { type AttributeEntry } from './AttributeGrid'
import './PlayerPage.css'

// Phase 1: player overview page, mirrors the original app's
// `/{lang}/players/{slug}` route (overview tab only so far — contract/
// history/transfers/etc. are separate tabs there, not yet ported).
//
// Fase A (2026-08-16 EA FC redesign spec): hero header + StatBar attribute
// rows replace the plain text rows / icon-tile grid — same underlying
// `player` data, no API change.

type TechnicalAttributes = {
  corners: number
  crossing: number
  dribbling: number
  finishing: number
  firstTouch: number
  freeKicks: number
  heading: number
  longShots: number
  longThrows: number
  marking: number
  passing: number
  penaltyTaking: number
  tackling: number
  technique: number
}

type MentalAttributes = {
  aggression: number
  anticipation: number
  bravery: number
  composure: number
  concentration: number
  decisions: number
  determination: number
  flair: number
  leadership: number
  offTheBall: number
  positioning: number
  teamwork: number
  vision: number
  workRate: number
}

type PhysicalAttributes = {
  acceleration: number
  agility: number
  balance: number
  jumping: number
  naturalFitness: number
  pace: number
  stamina: number
  strength: number
  matchReadiness: number
}

type GoalkeepingAttributes = {
  aerialReach: number
  commandOfArea: number
  communication: number
  eccentricity: number
  firstTouch: number
  handling: number
  kicking: number
  oneOnOnes: number
  passing: number
  punching: number
  reflexes: number
  rushingOut: number
  throwing: number
}

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
  technical: TechnicalAttributes
  mental: MentalAttributes
  physical: PhysicalAttributes
  goalkeeping: GoalkeepingAttributes | null
  teamId: number | null
  teamName: string | null
}

const TECHNICAL_LABELS: [keyof TechnicalAttributes, string][] = [
  ['corners', 'Corners'],
  ['crossing', 'Crossing'],
  ['dribbling', 'Dribbling'],
  ['finishing', 'Finishing'],
  ['firstTouch', 'First Touch'],
  ['freeKicks', 'Free Kicks'],
  ['heading', 'Heading'],
  ['longShots', 'Long Shots'],
  ['longThrows', 'Long Throws'],
  ['marking', 'Marking'],
  ['passing', 'Passing'],
  ['penaltyTaking', 'Penalty Taking'],
  ['tackling', 'Tackling'],
  ['technique', 'Technique'],
]

const MENTAL_LABELS: [keyof MentalAttributes, string][] = [
  ['aggression', 'Aggression'],
  ['anticipation', 'Anticipation'],
  ['bravery', 'Bravery'],
  ['composure', 'Composure'],
  ['concentration', 'Concentration'],
  ['decisions', 'Decisions'],
  ['determination', 'Determination'],
  ['flair', 'Flair'],
  ['leadership', 'Leadership'],
  ['offTheBall', 'Off the Ball'],
  ['positioning', 'Positioning'],
  ['teamwork', 'Teamwork'],
  ['vision', 'Vision'],
  ['workRate', 'Work Rate'],
]

const PHYSICAL_LABELS: [keyof PhysicalAttributes, string][] = [
  ['acceleration', 'Acceleration'],
  ['agility', 'Agility'],
  ['balance', 'Balance'],
  ['jumping', 'Jumping'],
  ['naturalFitness', 'Natural Fitness'],
  ['pace', 'Pace'],
  ['stamina', 'Stamina'],
  ['strength', 'Strength'],
  ['matchReadiness', 'Match Readiness'],
]

const GOALKEEPING_LABELS: [keyof GoalkeepingAttributes, string][] = [
  ['aerialReach', 'Aerial Reach'],
  ['commandOfArea', 'Command of Area'],
  ['communication', 'Communication'],
  ['eccentricity', 'Eccentricity'],
  ['firstTouch', 'First Touch'],
  ['handling', 'Handling'],
  ['kicking', 'Kicking'],
  ['oneOnOnes', 'One on Ones'],
  ['passing', 'Passing'],
  ['punching', 'Punching'],
  ['reflexes', 'Reflexes'],
  ['rushingOut', 'Rushing Out'],
  ['throwing', 'Throwing'],
]

function toEntries<T extends Record<string, number>>(labels: [keyof T, string][], values: T): AttributeEntry[] {
  return labels.map(([key, label]) => ({ key: key as string, label, value: values[key] }))
}

function PlayerPage() {
  const { playerId } = useParams<{ playerId: string }>()
  const [player, setPlayer] = useState<PlayerDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [inWatchlist, setInWatchlist] = useState(false)

  useEffect(() => {
    setPlayer(null)
    setError(null)
    callApi<PlayerDetail>(`/api/players/${playerId}`)
      .then(setPlayer)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
    callApi<{ id: number }[]>('/api/watchlist').then((list) =>
      setInWatchlist(list.some((p) => p.id === Number(playerId))),
    )
  }, [playerId])

  const toggleWatchlist = async () => {
    if (inWatchlist) {
      await callApi(`/api/watchlist/${playerId}`, { method: 'DELETE' })
    } else {
      await callApi(`/api/watchlist/${playerId}`, { method: 'POST' })
    }
    setInWatchlist(!inWatchlist)
  }

  // Called unconditionally (hooks can't follow the early returns below) —
  // harmless no-op key `soydt:ovr-snapshot:0` while `player` hasn't loaded
  // yet, replaced by the real id once it has.
  const ovrGrowth = useOvrGrowth(player?.id ?? 0, player?.currentAbility ?? 0)

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
        <SectionPanel
          title="Overview"
          actions={
            <>
              <button onClick={toggleWatchlist}>{inWatchlist ? '★ On watch list' : '☆ Add to watch list'}</button>
              <AiReportButton title="AI scouting dossier" startUrl={`/api/players/${playerId}/ai-report`} />
            </>
          }
        >
          <div className="pp-hero">
            <div className="pp-rating-wrap">
              <RatingBadge value={player.currentAbility} size="lg" />
              {ovrGrowth > 0 && <span className="pp-growth-badge">▲ +{ovrGrowth}</span>}
            </div>
            <img
              className="pp-photo"
              src={playerPhotoSrc(player.id)}
              onError={playerPhotoOnError}
              alt=""
              width={100}
              height={125}
            />
            <div className="pp-info">
              <p>
                <PositionBadge position={player.position} /> — Age: {player.age}
              </p>
              <p>
                Value: {player.value.toLocaleString()} — Reputation: {player.currentReputation}
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
        </SectionPanel>

        <SectionPanel title="Atributos">
          <AttributeGrid title="Technical" entries={toEntries(TECHNICAL_LABELS, player.technical)} />
          <AttributeGrid title="Mental" entries={toEntries(MENTAL_LABELS, player.mental)} />
          <AttributeGrid title="Physical" entries={toEntries(PHYSICAL_LABELS, player.physical)} />
          {player.goalkeeping && (
            <AttributeGrid title="Goalkeeping" entries={toEntries(GOALKEEPING_LABELS, player.goalkeeping)} />
          )}
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default PlayerPage
