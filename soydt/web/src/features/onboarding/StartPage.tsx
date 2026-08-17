import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { callApi } from '../../shared/api'
import TeamCrest from './TeamCrest'

// Root landing page. A save now survives a redeploy (see the .NET-side
// autosave/autoload wired up in Program.cs), so this decides between
// picking up where the user left off and starting over — rather than
// silently dropping them onto the free-browse admin area (still reachable
// at /countries) or forcing a fresh world every time.

type GameStatus = { hasGame: boolean; myClubId: number | null }
type TeamDetail = { id: number; name: string; slug: string }

type Step = 'checking' | 'choice' | 'confirming-reset'

function StartPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('checking')
  const [team, setTeam] = useState<TeamDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const status = await callApi<GameStatus>('/api/game/status')
        if (!status.hasGame || status.myClubId == null) {
          navigate('/new-game', { replace: true })
          return
        }
        const teamDetail = await callApi<TeamDetail>(`/api/teams/${status.myClubId}`)
        setTeam(teamDetail)
        setStep('choice')
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })()
  }, [navigate])

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1.5rem',
        background: '#0e151b',
        color: '#fff',
      }}
    >
      <h1 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '2rem' }}>SoyDT</h1>

      {step === 'checking' && !error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="spinner" style={{ borderTopColor: '#fff', width: 24, height: 24 }} />
          <span>Cargando…</span>
        </div>
      )}

      {error && <p style={{ color: '#f87171' }}>Error: {error}</p>}

      {step !== 'checking' && team && (
        <>
          <TeamCrest slug={team.slug} name={team.name} size={140} />
          <p style={{ marginTop: '1rem', marginBottom: '2.5rem', color: '#88a4b8' }}>
            Tu carrera con <strong style={{ color: '#fff' }}>{team.name}</strong> sigue en curso
          </p>

          {step === 'choice' && (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                onClick={() => navigate('/dt')}
                style={{
                  padding: '0.75rem 2.5rem',
                  borderRadius: 8,
                  border: 'none',
                  background: '#4ade80',
                  color: '#0e151b',
                  fontWeight: 700,
                  fontSize: '1rem',
                  cursor: 'pointer',
                }}
              >
                Continuar carrera
              </button>
              <button
                type="button"
                onClick={() => setStep('confirming-reset')}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: 8,
                  border: '1px solid #3a5468',
                  background: 'transparent',
                  color: '#88a4b8',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Empezar de nuevo
              </button>
            </div>
          )}

          {step === 'confirming-reset' && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#f87171', marginBottom: '1rem' }}>
                Esto borra tu carrera actual con {team.name} y no se puede deshacer.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => navigate('/new-game?reset=1')}
                  style={{
                    padding: '0.75rem 2rem',
                    borderRadius: 8,
                    border: 'none',
                    background: '#f87171',
                    color: '#0e151b',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Sí, empezar de nuevo
                </button>
                <button
                  type="button"
                  onClick={() => setStep('choice')}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: 8,
                    border: '1px solid #3a5468',
                    background: 'transparent',
                    color: '#88a4b8',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default StartPage
