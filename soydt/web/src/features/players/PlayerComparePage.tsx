// soydt/web/src/features/players/PlayerComparePage.tsx
import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import PlayerCompareView from '../../shared/PlayerCompareView'
import SectionPanel from '../../shared/ui/SectionPanel'
import './PlayerComparePage.css'

// Head-to-head comparison of two players — new page, not part of the
// original template (no `compare` route there to port). The picker below
// uses `GET /api/search?q=` (see `SearchPage.tsx`); the comparison render
// itself lives in `shared/PlayerCompareView.tsx`, shared with
// `PlayerCompareModal` (opened from DtSquadPage's squad grid) so both
// callers fetch/render head-to-head data the same way.
//
// Deliberately skips the historical per-FIFA-version bar charts a mockup
// might show — that's season-history data this repo already treats as out
// of scope (see MIGRATION_CHECKLIST.md's "no season-history charts"
// precedent). Comparison is current-snapshot only: per-stat cell
// highlighting (who's better right now) plus summary bars for the
// aggregate categories.

type SearchPlayer = { id: number; name: string; countryCode: string; teamName: string; age: number; isFreeAgent: boolean }
type SearchResults = { players: SearchPlayer[] }

function PlayerPicker({ side, onPick }: { side: 'a' | 'b'; onPick: (id: number) => void }) {
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

function PlayerComparePage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const idA = searchParams.get('a')
  const idB = searchParams.get('b')

  const pick = (side: 'a' | 'b', id: number) => {
    const next = new URLSearchParams(searchParams)
    next.set(side, String(id))
    setSearchParams(next)
  }

  const clear = () => setSearchParams({})

  return (
    <Layout title="Comparar jugadores">
      <div className="fm-page">
        {(!idA || !idB) && (
          <SectionPanel title="Elegí dos jugadores">
            <div className="pc-pickers">
              {!idA && <PlayerPicker side="a" onPick={(id) => pick('a', id)} />}
              {!idB && <PlayerPicker side="b" onPick={(id) => pick('b', id)} />}
            </div>
          </SectionPanel>
        )}

        {idA && idB && (
          <PlayerCompareView
            idA={Number(idA)}
            idB={Number(idB)}
            headerActions={
              <button type="button" onClick={clear}>
                Elegir otros
              </button>
            }
          />
        )}
      </div>
    </Layout>
  )
}

export default PlayerComparePage
