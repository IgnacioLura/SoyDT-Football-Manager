import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import DataTable from '../../shared/ui/DataTable'
import SectionPanel from '../../shared/ui/SectionPanel'
import StatBar from '../../shared/ui/StatBar'
import { useTeamCountryId } from '../../shared/useTeamCountryId'

// New feature, not a port — the original app never had a board page. See
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

function TeamBoardPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const sidebarCountryId = useTeamCountryId(teamId)
  const [board, setBoard] = useState<TeamBoard | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setBoard(null)
    setError(null)
    callApi<TeamBoard>(`/api/teams/${teamId}/board`)
      .then(setBoard)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [teamId])

  if (error) {
    return (
      <Layout title="Board" sidebarCountryId={sidebarCountryId}>
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!board) {
    return (
      <Layout title="Board" sidebarCountryId={sidebarCountryId}>
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Board" sidebarCountryId={sidebarCountryId}>
      <div className="fm-page">
        <SectionPanel title="Board confidence">
          <StatBar label="Confidence" value={board.confidenceLevel} max={100} />
          <div className="fm-personal-detail">
            <div className="fm-detail-row">
              <span className="fm-detail-label">Mood</span>
              <span className="fm-detail-value">{board.mood}</span>
            </div>
            {board.managerOnFinalWarning && (
              <div className="fm-detail-row">
                <span className="fm-detail-label">Status</span>
                <span className="fm-detail-value" style={{ color: 'crimson' }}>
                  On final warning
                </span>
              </div>
            )}
            <div className="fm-detail-row">
              <span className="fm-detail-label">Poor-mood months</span>
              <span className="fm-detail-value">{board.poorMoodMonths}</span>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel title="Ownership">
          <div className="fm-personal-detail">
            <div className="fm-detail-row">
              <span className="fm-detail-label">Chairman ambition</span>
              <span className="fm-detail-value">{board.chairmanAmbition}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Chairman patience</span>
              <span className="fm-detail-value">{board.chairmanPatience}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Chairman loyalty</span>
              <span className="fm-detail-value">{board.chairmanManagerLoyalty}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Ownership type</span>
              <span className="fm-detail-value">{board.ownershipType}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Wealth</span>
              <span className="fm-detail-value">{board.ownershipWealth}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Interference</span>
              <span className="fm-detail-value">{board.ownershipInterference}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Risk tolerance</span>
              <span className="fm-detail-value">{board.ownershipRiskTolerance}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Exit pressure</span>
              <span className="fm-detail-value">{board.ownershipExitPressure}</span>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel title="Pressure">
          <StatBar label="Supporters" value={board.supporterPressure} max={100} tone="inverse" />
          <StatBar label="Media" value={board.mediaPressure} max={100} tone="inverse" />
          <StatBar label="Dressing room" value={board.dressingRoomPressure} max={100} tone="inverse" />
          <StatBar label="Financial" value={board.financialPressure} max={100} tone="inverse" />
          <StatBar label="Regulatory" value={board.regulatoryPressure} max={100} tone="inverse" />
        </SectionPanel>

        <SectionPanel title="Manager relationship">
          <StatBar label="Results" value={board.trustResults} max={100} />
          <StatBar label="Finances" value={board.trustFinances} max={100} />
          <StatBar label="Squad building" value={board.trustSquadBuilding} max={100} />
          <StatBar label="Communication" value={board.trustCommunication} max={100} />
          <StatBar label="Style alignment" value={board.styleAlignment} max={100} />
        </SectionPanel>

        <SectionPanel title="Season targets & vision">
          <div className="fm-personal-detail">
            {board.seasonTargets && (
              <>
                <div className="fm-detail-row">
                  <span className="fm-detail-label">Expected position</span>
                  <span className="fm-detail-value">{board.seasonTargets.expectedPosition}</span>
                </div>
                <div className="fm-detail-row">
                  <span className="fm-detail-label">Min acceptable position</span>
                  <span className="fm-detail-value">{board.seasonTargets.minAcceptablePosition}</span>
                </div>
                <div className="fm-detail-row">
                  <span className="fm-detail-label">Transfer budget</span>
                  <span className="fm-detail-value">{board.seasonTargets.transferBudget}</span>
                </div>
                <div className="fm-detail-row">
                  <span className="fm-detail-label">Wage budget</span>
                  <span className="fm-detail-value">{board.seasonTargets.wageBudget}</span>
                </div>
                <div className="fm-detail-row">
                  <span className="fm-detail-label">Squad size</span>
                  <span className="fm-detail-value">
                    {board.seasonTargets.minSquadSize}–{board.seasonTargets.maxSquadSize}
                  </span>
                </div>
              </>
            )}
            <div className="fm-detail-row">
              <span className="fm-detail-label">Playing style</span>
              <span className="fm-detail-value">{board.visionPlayingStyle}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Youth focus</span>
              <span className="fm-detail-value">{board.visionYouthFocus}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Signing preference</span>
              <span className="fm-detail-value">{board.visionSigningPreference}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Financial stance</span>
              <span className="fm-detail-value">{board.visionFinancialStance}</span>
            </div>
            {board.visionLongTermGoal && (
              <div className="fm-detail-row">
                <span className="fm-detail-label">Long-term goal</span>
                <span className="fm-detail-value">
                  {board.visionLongTermGoal} ({board.visionLongTermHorizonSeasons}s)
                </span>
              </div>
            )}
          </div>
        </SectionPanel>

        <SectionPanel title="Promises" actions={<span className="fm-panel-count">{board.promises.length}</span>}>
          <DataTable
            rows={board.promises}
            rowKey={(p, i) => `${p.promiseType}-${i}`}
            emptyMessage="No active promises"
            columns={[
              { key: 'type', header: 'Promise', render: (p) => p.promiseType },
              { key: 'due', header: 'Due', render: (p) => p.dueDate },
              {
                key: 'status',
                header: 'Status',
                render: (p) => (p.overdue ? <span style={{ color: 'crimson' }}>Overdue</span> : 'On track'),
              },
            ]}
          />
        </SectionPanel>

        {board.takeoverStatus !== 'None' && (
          <SectionPanel title="Takeover watch">
            <div className="fm-personal-detail">
              <div className="fm-detail-row">
                <span className="fm-detail-label">Status</span>
                <span className="fm-detail-value">{board.takeoverStatus}</span>
              </div>
              <div className="fm-detail-row">
                <span className="fm-detail-label">Months in status</span>
                <span className="fm-detail-value">{board.takeoverMonthsInStatus}</span>
              </div>
            </div>
          </SectionPanel>
        )}
      </div>
    </Layout>
  )
}

export default TeamBoardPage
