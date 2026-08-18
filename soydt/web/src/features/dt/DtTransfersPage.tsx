import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { callApi } from '../../shared/api'
import { PositionBadge } from '../../shared/positions'
import TeamCrest from '../onboarding/TeamCrest'
import DataTable from '../../shared/ui/DataTable'
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
type TeamDetail = { id: number; name: string; countryId: number; players: RosterPlayer[] }
type LeagueTableRow = { teamId: number; teamName: string }
type LeagueTable = { rows: LeagueTableRow[] }

type TransferListing = {
  playerId: number
  playerName: string
  position: string
  age: number
  teamId: number
  teamName: string
  teamSlug: string
  askingPrice: number
  listingType: string
  status: string
  listedDate: string
}
type CountryTransferMarket = { transferWindowOpen: boolean; listings: TransferListing[] }

type TeamTransferItem = {
  playerId: number
  playerName: string
  otherTeamName: string
  otherTeamSlug: string
  fee: number
  isLoan: boolean
  isFree: boolean
  date: string
}
type TeamTransfers = { incoming: TeamTransferItem[]; outgoing: TeamTransferItem[] }

const PRIMERA_LEAGUE_ID = 140 // Uruguay Primera División — this MVP's only competition.

function TransferHistoryTable({ items, otherLabel }: { items: TeamTransferItem[]; otherLabel: string }) {
  return (
    <DataTable
      rows={items}
      rowKey={(_, i) => i}
      emptyMessage="Sin transferencias"
      columns={[
        {
          key: 'name',
          header: 'Jugador',
          render: (t) => <Link to={`/players/${t.playerId}`}>{t.playerName}</Link>,
        },
        {
          key: 'other',
          header: otherLabel,
          render: (t) => (
            <span className="st-club-link">
              <TeamCrest slug={t.otherTeamSlug} name={t.otherTeamName} size={20} />
              <span>{t.otherTeamName}</span>
            </span>
          ),
        },
        {
          key: 'fee',
          header: 'Fee',
          render: (t) =>
            t.isFree ? (
              <span className="fm-loan-badge">Gratis</span>
            ) : t.isLoan ? (
              <span className="fm-loan-badge">Préstamo</span>
            ) : (
              <span className="fm-transfer-fee">{t.fee.toLocaleString()}</span>
            ),
        },
        { key: 'date', header: 'Fecha', render: (t) => t.date },
      ]}
    />
  )
}

function DtTransfersPage() {
  const myTeamId = useMyTeamId()
  const [myTeam, setMyTeam] = useState<TeamDetail | null>(null)
  const [otherTeams, setOtherTeams] = useState<LeagueTableRow[]>([])
  const [browseTeamId, setBrowseTeamId] = useState<number | null>(null)
  const [browseTeam, setBrowseTeam] = useState<TeamDetail | null>(null)
  const [fees, setFees] = useState<Record<number, string>>({})
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<TeamTransfers | null>(null)
  const [market, setMarket] = useState<CountryTransferMarket | null>(null)

  const reloadMyTeam = () => {
    if (!myTeamId) return
    callApi<TeamDetail>(`/api/teams/${myTeamId}`).then(setMyTeam)
  }

  const reloadHistory = () => {
    if (!myTeamId) return
    callApi<TeamTransfers>(`/api/teams/${myTeamId}/transfers`).then(setHistory)
  }

  useEffect(reloadMyTeam, [myTeamId])
  useEffect(reloadHistory, [myTeamId])

  useEffect(() => {
    if (myTeam == null) return
    callApi<CountryTransferMarket>(`/api/countries/${myTeam.countryId}/transfer-market`)
      .then(setMarket)
      .catch(() => setMarket(null))
  }, [myTeam])

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
    try {
      await callApi('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, fromTeamId, toTeamId, fee }),
      })
      toast.success('Transferencia completada.')
      reloadMyTeam()
      reloadHistory()
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

        <SectionPanel title="Vender jugador (a otro club)">
          <div className="relative mb-3 inline-block">
            <select
              value={browseTeamId ?? ''}
              onChange={(e) => setBrowseTeamId(e.target.value ? Number(e.target.value) : null)}
              className="appearance-none rounded-card border border-surface-3 bg-surface-1 py-2 pl-3 pr-9 text-text-primary outline-none focus:border-accent-primary"
              style={{ borderColor: 'var(--surface-3)' }}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'var(--accent-primary)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--surface-3)')}
            >
              <option value="" className="bg-surface-1 text-text-primary">
                Elegí el club comprador…
              </option>
              {otherTeams.map((t) => (
                <option key={t.teamId} value={t.teamId} className="bg-surface-1 text-text-primary">
                  {t.teamName}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          </div>
          {myTeam && (
            <DataTable
              rows={myTeam.players}
              rowKey={(p) => p.id}
              columns={[
                { key: 'name', header: 'Nombre', render: (p) => p.name },
                { key: 'pos', header: 'Pos', render: (p) => <PositionBadge position={p.position} /> },
                { key: 'age', header: 'Edad', render: (p) => p.age },
                { key: 'ovr', header: 'OVR', align: 'right', render: (p) => p.currentAbility },
                {
                  key: 'fee',
                  header: 'Fee',
                  render: (p) => (
                    <input
                      type="number"
                      min={0}
                      style={{ width: 100 }}
                      value={fees[p.id] ?? p.value}
                      onChange={(e) => setFees((f) => ({ ...f, [p.id]: e.target.value }))}
                    />
                  ),
                },
                {
                  key: 'actions',
                  header: '',
                  render: (p) => (
                    <button
                      type="button"
                      disabled={!browseTeamId}
                      onClick={() => browseTeamId && doTransfer(p.id, myTeamId, browseTeamId, Number(fees[p.id] ?? p.value))}
                    >
                      Vender
                    </button>
                  ),
                },
              ]}
            />
          )}
        </SectionPanel>

        {browseTeam && (
          <SectionPanel title={`Fichar de ${browseTeam.name}`}>
            <DataTable
              rows={browseTeam.players}
              rowKey={(p) => p.id}
              columns={[
                { key: 'name', header: 'Nombre', render: (p) => p.name },
                { key: 'pos', header: 'Pos', render: (p) => <PositionBadge position={p.position} /> },
                { key: 'age', header: 'Edad', render: (p) => p.age },
                { key: 'ovr', header: 'OVR', align: 'right', render: (p) => p.currentAbility },
                {
                  key: 'fee',
                  header: 'Fee',
                  render: (p) => (
                    <input
                      type="number"
                      min={0}
                      style={{ width: 100 }}
                      value={fees[p.id] ?? p.value}
                      onChange={(e) => setFees((f) => ({ ...f, [p.id]: e.target.value }))}
                    />
                  ),
                },
                {
                  key: 'actions',
                  header: '',
                  render: (p) => (
                    <button type="button" onClick={() => doTransfer(p.id, browseTeam.id, myTeamId, Number(fees[p.id] ?? p.value))}>
                      Fichar
                    </button>
                  ),
                },
              ]}
            />
          </SectionPanel>
        )}

        {market && (
          <SectionPanel
            title="Mercado de pases"
            actions={
              <span className="fm-panel-count">
                {market.transferWindowOpen ? 'Ventana abierta' : 'Ventana cerrada'} ·{' '}
                {market.listings.filter((l) => l.teamId !== myTeamId).length}
              </span>
            }
          >
            <DataTable
              rows={market.listings.filter((l) => l.teamId !== myTeamId)}
              rowKey={(l) => `${l.playerId}-${l.listingType}`}
              emptyMessage="Sin jugadores en el mercado"
              columns={[
                {
                  key: 'name',
                  header: 'Jugador',
                  render: (l) => <Link to={`/players/${l.playerId}`}>{l.playerName}</Link>,
                },
                { key: 'pos', header: 'Pos', render: (l) => <PositionBadge position={l.position} /> },
                { key: 'age', header: 'Edad', render: (l) => l.age },
                {
                  key: 'team',
                  header: 'Club',
                  render: (l) => (
                    <span className="st-club-link">
                      <TeamCrest slug={l.teamSlug} name={l.teamName} size={20} />
                      <span>{l.teamName}</span>
                    </span>
                  ),
                },
                { key: 'price', header: 'Precio pedido', align: 'right', render: (l) => l.askingPrice.toLocaleString() },
                { key: 'type', header: 'Tipo', render: (l) => l.listingType },
                {
                  key: 'actions',
                  header: '',
                  render: (l) => (
                    <button type="button" onClick={() => doTransfer(l.playerId, l.teamId, myTeamId, l.askingPrice)}>
                      Fichar
                    </button>
                  ),
                },
              ]}
            />
          </SectionPanel>
        )}

        {history && (
          <>
            <SectionPanel
              title="Fichajes (entradas)"
              actions={<span className="fm-panel-count">{history.incoming.length}</span>}
            >
              <TransferHistoryTable items={history.incoming} otherLabel="Desde" />
            </SectionPanel>

            <SectionPanel
              title="Fichajes (salidas)"
              actions={<span className="fm-panel-count">{history.outgoing.length}</span>}
            >
              <TransferHistoryTable items={history.outgoing} otherLabel="Hacia" />
            </SectionPanel>
          </>
        )}
      </div>
    </DtLayout>
  )
}

export default DtTransfersPage
