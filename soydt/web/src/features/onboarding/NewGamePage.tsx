import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { callApi } from '../../shared/api'
import TeamCrest from './TeamCrest'

// First-run flow for the DT/"Mi Equipo" experience: create the Uruguay-only
// world (if one doesn't exist yet), then let the user pick which Primera
// División club is theirs — an EA FC–style crest grid rather than a plain
// dropdown, since "which club is mine" is the one choice this whole
// experience hinges on and deserves to feel like picking a side, not
// filling out a form.

type CountryListItem = { id: number; code: string; name: string; continentId: number; continentName: string; leagueCount: number }
type LeagueListItem = { id: number; name: string; slug: string; countryId: number; tier: number; reputation: number; teamCount: number }
type LeagueTableRow = { teamId: number; teamName: string; teamSlug: string }
type LeagueTable = { leagueId: number; leagueName: string; rows: LeagueTableRow[] }

type Step = 'creating' | 'loading-clubs' | 'picking' | 'confirming' | 'error'

function NewGamePage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('creating')
  const [error, setError] = useState<string | null>(null)
  const [clubs, setClubs] = useState<LeagueTableRow[]>([])
  const [selected, setSelected] = useState<LeagueTableRow | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        // A world may already exist (e.g. an Admin created one via curl) —
        // `create` always resets it, so only create if we truly need to.
        const status = await callApi<{ hasGame: boolean; myClubId: number | null }>('/api/game/status')
        if (!status.hasGame) {
          await callApi('/api/game/create?countries=UY', { method: 'POST' })
          // A queued-but-undismissed DT event from a previous game must not
          // pop up in the fresh one — the log/buff state it refers to no
          // longer exists once the world's been re-created.
          sessionStorage.removeItem('dtPendingEvents')
        }

        setStep('loading-clubs')
        const countries = await callApi<CountryListItem[]>('/api/countries')
        const uruguay = countries.find((c) => c.code.toLowerCase() === 'uy')
        if (!uruguay) throw new Error('Uruguay not found in the generated world')

        const leagues = await callApi<LeagueListItem[]>(`/api/countries/${uruguay.id}/leagues`)
        const primera = leagues.find((l) => l.tier === 1)
        if (!primera) throw new Error('Primera División not found')

        const table = await callApi<LeagueTable>(`/api/leagues/${primera.id}/table`)
        setClubs(table.rows)
        setStep('picking')
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
        setStep('error')
      }
    })()
  }, [])

  const confirm = async () => {
    if (!selected) return
    setStep('confirming')
    try {
      await callApi(`/api/game/my-club?clubId=${selected.teamId}`, { method: 'POST' })
      navigate('/dt')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setStep('error')
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '3rem 1.5rem',
        background: '#0e151b',
        color: '#fff',
      }}
    >
      <style>{`
        @keyframes fm-crest-in { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .fm-club-card {
          display: flex; flex-direction: column; align-items: center; gap: 0.6rem;
          padding: 1.1rem 0.75rem; border-radius: 10px; cursor: pointer;
          background: linear-gradient(160deg, #1a2432 0%, #131c26 100%);
          border: 2px solid transparent; transition: transform 0.15s, border-color 0.15s, box-shadow 0.15s;
          animation: fm-crest-in 0.3s ease;
        }
        .fm-club-card:hover { transform: translateY(-4px) scale(1.03); border-color: #3a5468; }
        .fm-club-card.selected {
          border-color: #4ade80; box-shadow: 0 0 0 1px #4ade80, 0 8px 24px rgba(74, 222, 128, 0.25);
          transform: translateY(-4px) scale(1.05);
        }
      `}</style>

      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.25rem' }}>SoyDT</h1>
      <p style={{ color: '#88a4b8', marginBottom: '2rem' }}>Elegí tu club — Primera División de Uruguay</p>

      {(step === 'creating' || step === 'loading-clubs') && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="spinner" style={{ borderTopColor: '#fff', width: 24, height: 24 }} />
          <span>{step === 'creating' ? 'Generando el mundo…' : 'Cargando clubes…'}</span>
        </div>
      )}

      {step === 'error' && (
        <div style={{ color: '#f87171', textAlign: 'center' }}>
          <p>Error: {error}</p>
        </div>
      )}

      {(step === 'picking' || step === 'confirming') && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
              gap: '1rem',
              width: 'min(900px, 100%)',
            }}
          >
            {clubs.map((c) => (
              <div
                key={c.teamId}
                className={`fm-club-card${selected?.teamId === c.teamId ? ' selected' : ''}`}
                onClick={() => setSelected(c)}
              >
                <TeamCrest slug={c.teamSlug} name={c.teamName} />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, textAlign: 'center' }}>{c.teamName}</span>
              </div>
            ))}
          </div>

          <button
            type="button"
            disabled={!selected || step === 'confirming'}
            onClick={confirm}
            style={{
              marginTop: '2.5rem',
              padding: '0.75rem 2.5rem',
              borderRadius: 8,
              border: 'none',
              background: selected ? '#4ade80' : '#2c3c4a',
              color: selected ? '#0e151b' : '#88a4b8',
              fontWeight: 700,
              fontSize: '1rem',
              cursor: selected ? 'pointer' : 'not-allowed',
            }}
          >
            {step === 'confirming' ? 'Confirmando…' : selected ? `Dirigir a ${selected.teamName}` : 'Elegí un club'}
          </button>
        </>
      )}
    </div>
  )
}

export default NewGamePage
