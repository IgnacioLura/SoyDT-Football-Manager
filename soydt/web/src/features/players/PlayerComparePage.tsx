// soydt/web/src/features/players/PlayerComparePage.tsx
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Flag from '../../shared/Flag'
import Layout from '../../shared/Layout'
import { playerPhotoOnError, playerPhotoSrc } from '../../shared/playerPhoto'
import { PositionBadge } from '../../shared/positions'
import RatingBadge from '../../shared/ui/RatingBadge'
import SectionPanel from '../../shared/ui/SectionPanel'
import './PlayerComparePage.css'

// Head-to-head comparison of two players — new page, not part of the
// original template (no `compare` route there to port). Reuses the same
// `GET /api/players/{id}` shape `PlayerPage.tsx` already consumes (fetched
// twice, once per side) and `GET /api/search?q=` (see `SearchPage.tsx`) for
// the two name pickers, so no backend change is needed.
//
// Deliberately skips the historical per-FIFA-version bar charts a mockup
// might show — that's season-history data this repo already treats as out
// of scope (see MIGRATION_CHECKLIST.md's "no season-history charts"
// precedent). Comparison is current-snapshot only: per-stat cell
// highlighting (who's better right now) plus summary bars for the
// aggregate categories.

type TechnicalAttributes = Record<
  | 'corners'
  | 'crossing'
  | 'dribbling'
  | 'finishing'
  | 'firstTouch'
  | 'freeKicks'
  | 'heading'
  | 'longShots'
  | 'longThrows'
  | 'marking'
  | 'passing'
  | 'penaltyTaking'
  | 'tackling'
  | 'technique',
  number
>

type MentalAttributes = Record<
  | 'aggression'
  | 'anticipation'
  | 'bravery'
  | 'composure'
  | 'concentration'
  | 'decisions'
  | 'determination'
  | 'flair'
  | 'leadership'
  | 'offTheBall'
  | 'positioning'
  | 'teamwork'
  | 'vision'
  | 'workRate',
  number
>

type PhysicalAttributes = Record<
  'acceleration' | 'agility' | 'balance' | 'jumping' | 'naturalFitness' | 'pace' | 'stamina' | 'strength' | 'matchReadiness',
  number
>

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
  teamId: number | null
  teamName: string | null
}

type SearchPlayer = { id: number; name: string; countryCode: string; teamName: string; age: number; isFreeAgent: boolean }
type SearchResults = { players: SearchPlayer[] }

const TECHNICAL_LABELS: [keyof TechnicalAttributes, string][] = [
  ['corners', 'Corners'],
  ['crossing', 'Centros'],
  ['dribbling', 'Regate'],
  ['finishing', 'Definición'],
  ['firstTouch', 'Primer toque'],
  ['freeKicks', 'Tiros libres'],
  ['heading', 'Cabeceo'],
  ['longShots', 'Disparo lejano'],
  ['longThrows', 'Saque largo'],
  ['marking', 'Marca'],
  ['passing', 'Pase'],
  ['penaltyTaking', 'Penales'],
  ['tackling', 'Entrada'],
  ['technique', 'Técnica'],
]

const MENTAL_LABELS: [keyof MentalAttributes, string][] = [
  ['aggression', 'Agresividad'],
  ['anticipation', 'Anticipación'],
  ['bravery', 'Valentía'],
  ['composure', 'Compostura'],
  ['concentration', 'Concentración'],
  ['decisions', 'Decisiones'],
  ['determination', 'Determinación'],
  ['flair', 'Talento'],
  ['leadership', 'Liderazgo'],
  ['offTheBall', 'Desmarque'],
  ['positioning', 'Posicionamiento'],
  ['teamwork', 'Trabajo en equipo'],
  ['vision', 'Visión'],
  ['workRate', 'Entrega'],
]

const PHYSICAL_LABELS: [keyof PhysicalAttributes, string][] = [
  ['acceleration', 'Aceleración'],
  ['agility', 'Agilidad'],
  ['balance', 'Equilibrio'],
  ['jumping', 'Salto'],
  ['naturalFitness', 'Fondo físico'],
  ['pace', 'Velocidad'],
  ['stamina', 'Resistencia'],
  ['strength', 'Fuerza'],
  ['matchReadiness', 'Puesta a punto'],
]

function PlayerPicker({
  side,
  player,
  onPick,
}: {
  side: 'a' | 'b'
  player: PlayerDetail | null
  onPick: (id: number) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchPlayer[]>([])

  const run = async (q: string) => {
    setQuery(q)
    if (q.trim().length < 4) {
      setResults([])
      return
    }
    const data = await callApi<SearchResults>(`/api/search?q=${encodeURIComponent(q)}`)
    setResults(data.players)
  }

  if (player) {
    return null
  }

  return (
    <div className={`pc-picker pc-picker-${side}`}>
      <p className="pc-picker-label">{side === 'a' ? 'Jugador A' : 'Jugador B'}</p>
      <input
        value={query}
        onChange={(e) => run(e.target.value)}
        placeholder="Buscar jugador… (mín. 4 caracteres)"
        autoFocus={side === 'a'}
      />
      {results.length > 0 && (
        <ul className="pc-picker-results">
          {results.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => onPick(p.id)}>
                {p.name} — {p.isFreeAgent ? 'Agente libre' : p.teamName} ({p.age})
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Grows two fills from a shared center line, proportional to each value's
// share of the max of the two (not a fixed scale) — so a 20-cap attribute
// and a 200-cap overall rating both read as "who's ahead" at a glance
// without one side always looking tiny. The higher value's fill and number
// pick up its side's accent color; a tie leaves both muted.
function CompareBar({ label, valueA, valueB, decimals = 0 }: { label: string; valueA: number; valueB: number; decimals?: number }) {
  const max = Math.max(valueA, valueB, 1)
  const pctA = (valueA / max) * 100
  const pctB = (valueB / max) * 100
  const aWins = valueA > valueB
  const bWins = valueB > valueA
  return (
    <div className="pc-bar-row">
      <span className={`pc-bar-value pc-bar-value-a${aWins ? ' pc-bar-winner' : ''}`}>{valueA.toFixed(decimals)}</span>
      <div className="pc-bar-track">
        <div className="pc-bar-half pc-bar-half-a">
          <div className={`pc-bar-fill pc-bar-fill-a${aWins ? ' pc-bar-fill-winner' : ''}`} style={{ width: `${pctA}%` }} />
        </div>
        <span className="pc-bar-label">{label}</span>
        <div className="pc-bar-half pc-bar-half-b">
          <div className={`pc-bar-fill pc-bar-fill-b${bWins ? ' pc-bar-fill-winner' : ''}`} style={{ width: `${pctB}%` }} />
        </div>
      </div>
      <span className={`pc-bar-value pc-bar-value-b${bWins ? ' pc-bar-winner' : ''}`}>{valueB.toFixed(decimals)}</span>
    </div>
  )
}

// Attributes come back as floats (engine's underlying skill values) — round
// to whole numbers for display and for the winner comparison, same as
// `StatBar` already does elsewhere on the player page, so two players who'd
// display identically (e.g. 11.2 vs 11.4) don't get a spurious arrow.
function AttributeCompareRow({ label, valueA, valueB }: { label: string; valueA: number; valueB: number }) {
  const roundedA = Math.round(valueA)
  const roundedB = Math.round(valueB)
  const aWins = roundedA > roundedB
  const bWins = roundedB > roundedA
  return (
    <div className="pc-attr-row">
      <span className={`pc-attr-value${aWins ? ' pc-attr-winner-a' : ''}`}>
        {roundedA}
        {aWins && <span className="pc-attr-arrow"> ▲</span>}
      </span>
      <span className="pc-attr-label">{label}</span>
      <span className={`pc-attr-value${bWins ? ' pc-attr-winner-b' : ''}`}>
        {bWins && <span className="pc-attr-arrow">▲ </span>}
        {roundedB}
      </span>
    </div>
  )
}

function AttributeCompareGroup({
  title,
  labels,
  a,
  b,
}: {
  title: string
  labels: [string, string][]
  a: Record<string, number>
  b: Record<string, number>
}) {
  return (
    <div className="pc-attr-group">
      <h4 className="pc-attr-group-title">{title}</h4>
      {labels.map(([key, label]) => (
        <AttributeCompareRow key={key} label={label} valueA={a[key]} valueB={b[key]} />
      ))}
    </div>
  )
}

function PlayerHero({ player, side }: { player: PlayerDetail; side: 'a' | 'b' }) {
  return (
    <div className={`pc-hero pc-hero-${side}`}>
      <img className="pc-hero-photo" src={playerPhotoSrc(player.id)} onError={playerPhotoOnError} alt="" width={90} height={112} />
      <div className="pc-hero-info">
        <h3 className="pc-hero-name">
          {player.firstName} {player.lastName}
        </h3>
        <p className="pc-hero-sub">
          <Flag code={player.countryCode} /> {player.countryName}
          {player.teamName && <> — {player.teamName}</>}
        </p>
        <p className="pc-hero-sub">
          <PositionBadge position={player.position} /> — {player.age} años
        </p>
        <p className="pc-hero-sub">
          Altura: {player.height}cm — Peso: {player.weight}kg
        </p>
      </div>
      <RatingBadge value={player.currentAbility} size="lg" />
    </div>
  )
}

function PlayerComparePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [a, setA] = useState<PlayerDetail | null>(null)
  const [b, setB] = useState<PlayerDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  const idA = searchParams.get('a')
  const idB = searchParams.get('b')

  useEffect(() => {
    if (!idA) {
      setA(null)
      return
    }
    callApi<PlayerDetail>(`/api/players/${idA}`)
      .then(setA)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [idA])

  useEffect(() => {
    if (!idB) {
      setB(null)
      return
    }
    callApi<PlayerDetail>(`/api/players/${idB}`)
      .then(setB)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [idB])

  const pick = (side: 'a' | 'b', id: number) => {
    const next = new URLSearchParams(searchParams)
    next.set(side, String(id))
    setSearchParams(next)
  }

  const clear = () => setSearchParams({})

  // Which player wins more individual attribute rows overall — the plain-
  // language summary above the bars/table, since scanning highlighted
  // cells alone doesn't answer "who's better" at a glance.
  const summary = (() => {
    if (!a || !b) return null
    const all = [
      ...TECHNICAL_LABELS.map(([k]) => [a.technical[k], b.technical[k]] as const),
      ...MENTAL_LABELS.map(([k]) => [a.mental[k], b.mental[k]] as const),
      ...PHYSICAL_LABELS.map(([k]) => [a.physical[k], b.physical[k]] as const),
    ]
    const aWins = all.filter(([va, vb]) => Math.round(va) > Math.round(vb)).length
    const bWins = all.filter(([va, vb]) => Math.round(vb) > Math.round(va)).length
    if (a.currentAbility === b.currentAbility && aWins === bWins) return 'Nivel muy parejo entre ambos.'
    const overallWinner = a.currentAbility > b.currentAbility ? `${a.firstName} ${a.lastName}` : `${b.firstName} ${b.lastName}`
    const attrWinner = aWins > bWins ? `${a.firstName} ${a.lastName}` : bWins > aWins ? `${b.firstName} ${b.lastName}` : null
    if (attrWinner && attrWinner !== overallWinner) {
      return `${overallWinner} tiene mejor rating general, pero ${attrWinner} gana más atributos individuales (${Math.max(aWins, bWins)} de ${all.length}).`
    }
    return `${overallWinner} está mejor actualmente — gana ${Math.max(aWins, bWins)} de ${all.length} atributos comparados.`
  })()

  return (
    <Layout title="Comparar jugadores">
      <div className="fm-page">
        {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}

        {(!a || !b) && (
          <SectionPanel title="Elegí dos jugadores">
            <div className="pc-pickers">
              <PlayerPicker side="a" player={a} onPick={(id) => pick('a', id)} />
              <PlayerPicker side="b" player={b} onPick={(id) => pick('b', id)} />
            </div>
          </SectionPanel>
        )}

        {a && b && (
          <>
            <SectionPanel
              title="Comparación"
              actions={
                <button type="button" onClick={clear}>
                  Elegir otros
                </button>
              }
            >
              <div className="pc-heroes">
                <PlayerHero player={a} side="a" />
                <PlayerHero player={b} side="b" />
              </div>
              {summary && <p className="pc-summary">{summary}</p>}
              <div className="pc-bars">
                <CompareBar label="Overall" valueA={a.currentAbility} valueB={b.currentAbility} />
                <CompareBar label="Técnica" valueA={a.technicalAvg} valueB={b.technicalAvg} decimals={1} />
                <CompareBar label="Mental" valueA={a.mentalAvg} valueB={b.mentalAvg} decimals={1} />
                <CompareBar label="Física" valueA={a.physicalAvg} valueB={b.physicalAvg} decimals={1} />
              </div>
            </SectionPanel>

            <SectionPanel title="Atributos">
              <AttributeCompareGroup title="Técnica" labels={TECHNICAL_LABELS} a={a.technical} b={b.technical} />
              <AttributeCompareGroup title="Mental" labels={MENTAL_LABELS} a={a.mental} b={b.mental} />
              <AttributeCompareGroup title="Física" labels={PHYSICAL_LABELS} a={a.physical} b={b.physical} />
            </SectionPanel>
          </>
        )}
      </div>
    </Layout>
  )
}

export default PlayerComparePage
