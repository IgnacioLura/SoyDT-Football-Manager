import { useEffect, useState } from 'react'
import { callApi } from '../../shared/api'
import DataTable from '../../shared/ui/DataTable'
import SectionPanel from '../../shared/ui/SectionPanel'
import StatBar from '../../shared/ui/StatBar'
import DtLayout from './DtLayout'
import { useMyTeamId } from './useMyTeamId'

// DT-mode mirror of features/teams/TeamBoardPage.tsx — same data/layout,
// scoped to the DT's own club via useMyTeamId instead of a :teamId route
// param, and labeled in Spanish to match the rest of the DT area. See
// docs/superpowers/specs/2026-08-17-club-board-design.md for scope.

type SeasonTargets = {
  transferBudget: number
  wageBudget: number
  maxSquadSize: number
  minSquadSize: number
  expectedPosition: number
  minAcceptablePosition: number
}

type BoardPromise = {
  promiseType: string
  dueDate: string
  overdue: boolean
}

type TeamBoard = {
  confidenceLevel: number
  mood: string
  managerOnFinalWarning: boolean
  poorMoodMonths: number
  chairmanAmbition: string
  chairmanPatience: string
  chairmanManagerLoyalty: number
  ownershipType: string
  ownershipWealth: number
  ownershipInterference: number
  ownershipRiskTolerance: number
  ownershipExitPressure: number
  supporterPressure: number
  mediaPressure: number
  dressingRoomPressure: number
  financialPressure: number
  regulatoryPressure: number
  trustResults: number
  trustFinances: number
  trustSquadBuilding: number
  trustCommunication: number
  styleAlignment: number
  seasonTargets: SeasonTargets | null
  visionPlayingStyle: string
  visionYouthFocus: string
  visionSigningPreference: string
  visionFinancialStance: string
  visionLongTermGoal: string | null
  visionLongTermHorizonSeasons: number
  promises: BoardPromise[]
  takeoverStatus: string
  takeoverMonthsInStatus: number
}

function money(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

function DtBoardPage() {
  const myTeamId = useMyTeamId()
  const [board, setBoard] = useState<TeamBoard | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (myTeamId == null) return
    setBoard(null)
    setError(null)
    callApi<TeamBoard>(`/api/teams/${myTeamId}/board`)
      .then(setBoard)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [myTeamId])

  if (myTeamId === undefined) {
    return (
      <DtLayout title="Directiva">
        <div className="fm-page">
          <p>Cargando…</p>
        </div>
      </DtLayout>
    )
  }

  if (myTeamId == null) {
    return (
      <DtLayout title="Directiva">
        <div className="fm-page">
          <p>Todavía no elegiste tu club — andá a /new-game.</p>
        </div>
      </DtLayout>
    )
  }

  if (error) {
    return (
      <DtLayout title="Directiva">
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </DtLayout>
    )
  }

  if (!board) {
    return (
      <DtLayout title="Directiva">
        <div className="fm-page">
          <p>Cargando…</p>
        </div>
      </DtLayout>
    )
  }

  return (
    <DtLayout title="Directiva">
      <div className="fm-page">
        <SectionPanel title="Confianza de la directiva">
          <StatBar label="Confianza" value={board.confidenceLevel} max={100} />
          <div className="fm-personal-detail">
            <div className="fm-detail-row">
              <span className="fm-detail-label">Ánimo</span>
              <span className="fm-detail-value">{board.mood}</span>
            </div>
            {board.managerOnFinalWarning && (
              <div className="fm-detail-row">
                <span className="fm-detail-label">Estado</span>
                <span className="fm-detail-value" style={{ color: 'crimson' }}>
                  Última advertencia
                </span>
              </div>
            )}
            <div className="fm-detail-row">
              <span className="fm-detail-label">Meses de mal ánimo</span>
              <span className="fm-detail-value">{board.poorMoodMonths}</span>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel title="Propiedad">
          <div className="fm-personal-detail">
            <div className="fm-detail-row">
              <span className="fm-detail-label">Ambición del presidente</span>
              <span className="fm-detail-value">{board.chairmanAmbition}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Paciencia del presidente</span>
              <span className="fm-detail-value">{board.chairmanPatience}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Lealtad del presidente</span>
              <span className="fm-detail-value">{board.chairmanManagerLoyalty}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Tipo de propiedad</span>
              <span className="fm-detail-value">{board.ownershipType}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Riqueza</span>
              <span className="fm-detail-value">{board.ownershipWealth}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Injerencia</span>
              <span className="fm-detail-value">{board.ownershipInterference}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Tolerancia al riesgo</span>
              <span className="fm-detail-value">{board.ownershipRiskTolerance}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Presión de salida</span>
              <span className="fm-detail-value">{board.ownershipExitPressure}</span>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel title="Presión">
          <StatBar label="Hinchada" value={board.supporterPressure} max={100} tone="inverse" />
          <StatBar label="Prensa" value={board.mediaPressure} max={100} tone="inverse" />
          <StatBar label="Vestuario" value={board.dressingRoomPressure} max={100} tone="inverse" />
          <StatBar label="Financiera" value={board.financialPressure} max={100} tone="inverse" />
          <StatBar label="Regulatoria" value={board.regulatoryPressure} max={100} tone="inverse" />
        </SectionPanel>

        <SectionPanel title="Relación con el DT">
          <StatBar label="Resultados" value={board.trustResults} max={100} />
          <StatBar label="Finanzas" value={board.trustFinances} max={100} />
          <StatBar label="Armado de plantel" value={board.trustSquadBuilding} max={100} />
          <StatBar label="Comunicación" value={board.trustCommunication} max={100} />
          <StatBar label="Alineación de estilo" value={board.styleAlignment} max={100} />
        </SectionPanel>

        <SectionPanel title="Objetivos de temporada y visión">
          <div className="fm-personal-detail">
            {board.seasonTargets ? (
              <>
                <div className="fm-detail-row">
                  <span className="fm-detail-label">Posición esperada</span>
                  <span className="fm-detail-value">{board.seasonTargets.expectedPosition}</span>
                </div>
                <div className="fm-detail-row">
                  <span className="fm-detail-label">Posición mínima aceptable</span>
                  <span className="fm-detail-value">{board.seasonTargets.minAcceptablePosition}</span>
                </div>
                <div className="fm-detail-row">
                  <span className="fm-detail-label">Presupuesto de transferencias</span>
                  <span className="fm-detail-value">{money(board.seasonTargets.transferBudget)}</span>
                </div>
                <div className="fm-detail-row">
                  <span className="fm-detail-label">Presupuesto salarial</span>
                  <span className="fm-detail-value">{money(board.seasonTargets.wageBudget)}</span>
                </div>
                <div className="fm-detail-row">
                  <span className="fm-detail-label">Tamaño de plantel</span>
                  <span className="fm-detail-value">
                    {board.seasonTargets.minSquadSize}–{board.seasonTargets.maxSquadSize}
                  </span>
                </div>
              </>
            ) : (
              <div className="fm-detail-row">
                <span className="fm-detail-label">Objetivos de temporada</span>
                <span className="fm-detail-value">Todavía no definidos</span>
              </div>
            )}
            <div className="fm-detail-row">
              <span className="fm-detail-label">Estilo de juego</span>
              <span className="fm-detail-value">{board.visionPlayingStyle}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Foco en juveniles</span>
              <span className="fm-detail-value">{board.visionYouthFocus}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Preferencia de fichajes</span>
              <span className="fm-detail-value">{board.visionSigningPreference}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Postura financiera</span>
              <span className="fm-detail-value">{board.visionFinancialStance}</span>
            </div>
            {board.visionLongTermGoal && (
              <div className="fm-detail-row">
                <span className="fm-detail-label">Objetivo a largo plazo</span>
                <span className="fm-detail-value">
                  {board.visionLongTermGoal} (en {board.visionLongTermHorizonSeasons} temporada
                  {board.visionLongTermHorizonSeasons === 1 ? '' : 's'})
                </span>
              </div>
            )}
          </div>
        </SectionPanel>

        <SectionPanel title="Promesas" actions={<span className="fm-panel-count">{board.promises.length}</span>}>
          <DataTable
            rows={board.promises}
            rowKey={(p, i) => `${p.promiseType}-${i}`}
            emptyMessage="Sin promesas activas"
            columns={[
              { key: 'type', header: 'Promesa', render: (p) => p.promiseType },
              { key: 'due', header: 'Vencimiento', render: (p) => p.dueDate },
              {
                key: 'status',
                header: 'Estado',
                render: (p) => (p.overdue ? <span style={{ color: 'crimson' }}>Vencida</span> : 'En curso'),
              },
            ]}
          />
        </SectionPanel>

        {board.takeoverStatus !== 'None' && (
          <SectionPanel title="Vigilancia de venta del club">
            <div className="fm-personal-detail">
              <div className="fm-detail-row">
                <span className="fm-detail-label">Estado</span>
                <span className="fm-detail-value">{board.takeoverStatus}</span>
              </div>
              <div className="fm-detail-row">
                <span className="fm-detail-label">Meses en este estado</span>
                <span className="fm-detail-value">{board.takeoverMonthsInStatus}</span>
              </div>
            </div>
          </SectionPanel>
        )}
      </div>
    </DtLayout>
  )
}

export default DtBoardPage
