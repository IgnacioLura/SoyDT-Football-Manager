import { useEffect, useState } from 'react'
import { callApi } from '../../shared/api'
import { PositionBadge } from '../../shared/positions'
import SectionPanel from '../../shared/ui/SectionPanel'
import DtLayout from './DtLayout'
import { useMyTeamId } from './useMyTeamId'

// DT's manual transfer action page — no negotiation/AI-market involvement,
// just a direct move for a fee (see engine-ffi/src/team_transfer_action.rs).
// Both directions (buy/sell) post to the same `POST /api/transfers`.

// `value` is the engine's own market-value figure (same one the player
// detail page shows) — used to pre-fill (still editable) the fee input,
// since this MVP has no negotiation step to arrive at a price otherwise.
type RosterPlayer = { id: number; name: string; position: string; age: number; currentAbility: number; value: number }
type TeamDetail = { id: number; name: string; players: RosterPlayer[] }
type LeagueTableRow = { teamId: number; teamName: string }
type LeagueTable = { rows: LeagueTableRow[] }

const PRIMERA_LEAGUE_ID = 140 // Uruguay Primera División — this MVP's only competition.

function DtTransfersPage() {
  const myTeamId = useMyTeamId()
  const [myTeam, setMyTeam] = useState<TeamDetail | null>(null)
  const [otherTeams, setOtherTeams] = useState<LeagueTableRow[]>([])
  const [browseTeamId, setBrowseTeamId] = useState<number | null>(null)
  const [browseTeam, setBrowseTeam] = useState<TeamDetail | null>(null)
  const [fees, setFees] = useState<Record<number, string>>({})
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reloadMyTeam = () => {
    if (!myTeamId) return
    callApi<TeamDetail>(`/api/teams/${myTeamId}`).then(setMyTeam)
  }

  useEffect(reloadMyTeam, [myTeamId])

  useEffect(() => {
    callApi<LeagueTable>(`/api/leagues/${PRIMERA_LEAGUE_ID}/table`).then((t) =>
      setOtherTeams(t.rows.filter((r) => r.teamId !== myTeamId)),
    )
  }, [myTeamId])

  useEffect(() => {
    if (browseTeamId == null) {
      setBrowseTeam(null)
      return
    }
    callApi<TeamDetail>(`/api/teams/${browseTeamId}`).then(setBrowseTeam)
  }, [browseTeamId])

  const doTransfer = async (playerId: number, fromTeamId: number, toTeamId: number, fee: number) => {
    setError(null)
    setMessage(null)
    try {
      await callApi('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, fromTeamId, toTeamId, fee }),
      })
      setMessage('Transferencia completada.')
      reloadMyTeam()
      if (browseTeamId) callApi<TeamDetail>(`/api/teams/${browseTeamId}`).then(setBrowseTeam)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  if (myTeamId === undefined) {
    return (
      <DtLayout title="Transferencias">
        <div className="fm-page">
          <p>Cargando…</p>
        </div>
      </DtLayout>
    )
  }

  if (myTeamId == null) {
    return (
      <DtLayout title="Transferencias">
        <div className="fm-page">
          <p>Todavía no elegiste tu club — andá a /new-game.</p>
        </div>
      </DtLayout>
    )
  }

  return (
    <DtLayout title="Transferencias">
      <div className="fm-page">
        {error && <p style={{ color: 'crimson' }}>Error: {error}</p>}
        {message && <p style={{ color: '#4ade80' }}>{message}</p>}

        <SectionPanel title="Vender jugador (a otro club)">
          <select
            value={browseTeamId ?? ''}
            onChange={(e) => setBrowseTeamId(e.target.value ? Number(e.target.value) : null)}
            style={{ marginBottom: '0.75rem' }}
          >
            <option value="">Elegí el club comprador…</option>
            {otherTeams.map((t) => (
              <option key={t.teamId} value={t.teamId}>
                {t.teamName}
              </option>
            ))}
          </select>
          {myTeam && (
            <table className="fm-standings">
              <thead>
                <tr>
                  <th className="st-club">Nombre</th>
                  <th>Pos</th>
                  <th>Edad</th>
                  <th className="st-pts">OVR</th>
                  <th>Fee</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {myTeam.players.map((p) => (
                  <tr key={p.id}>
                    <td className="st-club">{p.name}</td>
                    <td>
                      <PositionBadge position={p.position} />
                    </td>
                    <td>{p.age}</td>
                    <td className="st-pts">{p.currentAbility}</td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        style={{ width: 100 }}
                        value={fees[p.id] ?? p.value}
                        onChange={(e) => setFees((f) => ({ ...f, [p.id]: e.target.value }))}
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        disabled={!browseTeamId}
                        onClick={() => browseTeamId && doTransfer(p.id, myTeamId, browseTeamId, Number(fees[p.id] ?? p.value))}
                      >
                        Vender
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionPanel>

        {browseTeam && (
          <SectionPanel title={`Fichar de ${browseTeam.name}`}>
            <table className="fm-standings">
              <thead>
                <tr>
                  <th className="st-club">Nombre</th>
                  <th>Pos</th>
                  <th>Edad</th>
                  <th className="st-pts">OVR</th>
                  <th>Fee</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {browseTeam.players.map((p) => (
                  <tr key={p.id}>
                    <td className="st-club">{p.name}</td>
                    <td>
                      <PositionBadge position={p.position} />
                    </td>
                    <td>{p.age}</td>
                    <td className="st-pts">{p.currentAbility}</td>
                    <td>
                      <input
                        type="number"
                        min={0}
                        style={{ width: 100 }}
                        value={fees[p.id] ?? p.value}
                        onChange={(e) => setFees((f) => ({ ...f, [p.id]: e.target.value }))}
                      />
                    </td>
                    <td>
                      <button type="button" onClick={() => doTransfer(p.id, browseTeam.id, myTeamId, Number(fees[p.id] ?? p.value))}>
                        Fichar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </SectionPanel>
        )}
      </div>
    </DtLayout>
  )
}

export default DtTransfersPage
