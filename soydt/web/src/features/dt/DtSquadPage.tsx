import { useEffect, useState } from 'react'
import { callApi } from '../../shared/api'
import DtLayout from './DtLayout'
import { useMyTeamId } from './useMyTeamId'

// DT's squad + lineup editor — picks the starting XI that actually gets
// pinned via `PUT /api/teams/{id}/lineup` (see engine-ffi/src/team_lineup.rs).
// No pitch/formation graphic (consistent with the repo's existing "no SVG
// pitch graphics" simplification precedent) — a flat checkbox list capped
// at 11 is enough for the DT MVP.

type LineupPlayer = { playerId: number; name: string; position: string; currentAbility: number; pinned: boolean }

function DtSquadPage() {
  const myTeamId = useMyTeamId()
  const [players, setPlayers] = useState<LineupPlayer[] | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (myTeamId == null) return
    callApi<LineupPlayer[]>(`/api/teams/${myTeamId}/lineup`)
      .then((rows) => {
        setPlayers(rows)
        setSelected(new Set(rows.filter((p) => p.pinned).map((p) => p.playerId)))
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [myTeamId])

  const toggle = (playerId: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(playerId)) {
        next.delete(playerId)
      } else if (next.size < 11) {
        next.add(playerId)
      }
      return next
    })
    setSaved(false)
  }

  const save = async () => {
    if (!myTeamId || selected.size !== 11) return
    setError(null)
    try {
      await callApi(`/api/teams/${myTeamId}/lineup`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerIds: Array.from(selected) }),
      })
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  if (myTeamId === undefined || (myTeamId != null && !players)) {
    return (
      <DtLayout title="Plantel">
        <div className="fm-page">
          <p>Cargando…</p>
        </div>
      </DtLayout>
    )
  }

  if (myTeamId == null) {
    return (
      <DtLayout title="Plantel">
        <div className="fm-page">
          <p>Todavía no elegiste tu club — andá a /new-game.</p>
        </div>
      </DtLayout>
    )
  }

  return (
    <DtLayout title="Plantel" subTitle={`${selected.size}/11 titulares`}>
      <div className="fm-page">
        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Alineación titular</h3>
            <span className="fm-panel-count">{selected.size}/11</span>
          </div>
          {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}
          <table className="fm-standings">
            <thead>
              <tr>
                <th></th>
                <th className="st-club">Nombre</th>
                <th>Pos</th>
                <th className="st-pts">CA</th>
              </tr>
            </thead>
            <tbody>
              {players!.map((p) => (
                <tr key={p.playerId}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.has(p.playerId)}
                      onChange={() => toggle(p.playerId)}
                      disabled={!selected.has(p.playerId) && selected.size >= 11}
                    />
                  </td>
                  <td className="st-club">{p.name}</td>
                  <td>{p.position}</td>
                  <td className="st-pts">{p.currentAbility}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button
              type="button"
              className="fm-worker-dialog-btn fm-worker-dialog-btn-add"
              disabled={selected.size !== 11}
              onClick={save}
            >
              Guardar alineación
            </button>
            {saved && <span style={{ color: '#4ade80' }}>Guardada ✓</span>}
          </div>
        </section>
      </div>
    </DtLayout>
  )
}

export default DtSquadPage
