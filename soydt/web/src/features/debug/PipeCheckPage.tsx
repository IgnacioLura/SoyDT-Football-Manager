import { useState } from 'react'
import { callApi } from '../../shared/api'

// Phase 0 skeleton page: proves the pipe React -> SoyDT.Api -> engine-ffi
// (.so) -> JSON round-trips end to end. Kept around as a low-level debug
// tool now that Phase 1's real feature pages (see ../countries) exist.

type ContinentSummary = { id: number; name: string; countryCount: number }
type GameSnapshot = { date: string; continents: ContinentSummary[] }
type ProcessResult = { date: string; daysProcessed: number; matchesPlayed: number }

function PipeCheckPage() {
  const [log, setLog] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [countries, setCountries] = useState('AR,UY,BR')

  const append = (line: string) => setLog((prev) => [...prev, line])

  const runStep = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(true)
    try {
      const result = await fn()
      append(`${label}: ${JSON.stringify(result)}`)
    } catch (e) {
      append(`${label} FAILED: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main style={{ fontFamily: 'monospace', padding: '2rem', maxWidth: 720 }}>
      <h1>SoyDT — Phase 0 pipe check</h1>
      <p>React → SoyDT.Api → engine-ffi (Rust .so) → JSON, round-tripped.</p>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
        <input
          value={countries}
          onChange={(e) => setCountries(e.target.value)}
          placeholder="AR,UY,BR (empty = full world)"
          style={{ width: '14rem' }}
        />
        <button
          disabled={busy}
          onClick={() =>
            runStep('create', () =>
              callApi(`/api/game/create${countries.trim() ? `?countries=${encodeURIComponent(countries.trim())}` : ''}`, {
                method: 'POST',
              }),
            )
          }
        >
          1. Create game
        </button>
        <button disabled={busy} onClick={() => runStep('snapshot', () => callApi<GameSnapshot>('/api/game/snapshot'))}>
          2. Get snapshot
        </button>
        <button
          disabled={busy}
          onClick={() => runStep('process(1 day)', () => callApi<ProcessResult>('/api/game/process?days=1', { method: 'POST' }))}
        >
          3. Process 1 day
        </button>
      </div>

      <pre style={{ background: '#111', color: '#0f0', padding: '1rem', minHeight: '10rem', whiteSpace: 'pre-wrap' }}>
        {log.length === 0 ? '(no calls yet — click the buttons above in order)' : log.join('\n')}
      </pre>
    </main>
  )
}

export default PipeCheckPage
