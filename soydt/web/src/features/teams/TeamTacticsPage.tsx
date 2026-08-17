import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'
import { PositionBadge } from '../../shared/positions'
import type { SortMode } from '../../shared/sortPlayers'
import { sortByMode } from '../../shared/sortPlayers'
import DataTable from '../../shared/ui/DataTable'
import SectionPanel from '../../shared/ui/SectionPanel'
import SortToggle from '../../shared/ui/SortToggle'
import { useTeamCountryId } from '../../shared/useTeamCountryId'

// Team tactics page — deliberately simplified vs. the original app's
// tactics tab: a text/table view only. No pitch graphic and no last-match/
// "recently used shapes" history strip — see
// engine-ffi/src/team_tactics.rs's doc comment and MIGRATION_CHECKLIST.md.

type TacticsPlayer = {
  playerId: number
  name: string
  position: string
  currentAbility: number
}

type TeamTactics = {
  formationName: string
  formationDescription: string
  tacticalStyle: string
  formationStrength: number
  pressingIntensity: number
  defensiveLineHeight: number
  compactness: number
  isAttacking: boolean
  isDefensive: boolean
  players: TacticsPlayer[]
}

function percent(value: number) {
  return `${Math.round(value * 100)}%`
}

function TeamTacticsPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const sidebarCountryId = useTeamCountryId(teamId)
  const [tactics, setTactics] = useState<TeamTactics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('position')

  useEffect(() => {
    setTactics(null)
    setError(null)
    callApi<TeamTactics>(`/api/teams/${teamId}/tactics`)
      .then(setTactics)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [teamId])

  if (error) {
    return (
      <Layout title="Tactics" sidebarCountryId={sidebarCountryId}>
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!tactics) {
    return (
      <Layout title="Tactics" sidebarCountryId={sidebarCountryId}>
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Tactics" sidebarCountryId={sidebarCountryId}>
      <div className="fm-page">
        <SectionPanel
          title="Formation"
          accent="tertiary"
          actions={<span className="fm-panel-action">{tactics.formationName}</span>}
        >
          <div className="fm-personal-detail">
            <div className="fm-detail-row">
              <span className="fm-detail-label">Shape</span>
              <span className="fm-detail-value">{tactics.formationDescription}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Style</span>
              <span className="fm-detail-value">{tactics.tacticalStyle}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Formation fit</span>
              <span className="fm-detail-value">{percent(tactics.formationStrength)}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Pressing intensity</span>
              <span className="fm-detail-value">{percent(tactics.pressingIntensity)}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Defensive line</span>
              <span className="fm-detail-value">{percent(tactics.defensiveLineHeight)}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Compactness</span>
              <span className="fm-detail-value">{percent(tactics.compactness)}</span>
            </div>
            <div className="fm-detail-row">
              <span className="fm-detail-label">Tendency</span>
              <span className="fm-detail-value">
                {tactics.isAttacking ? 'Attacking' : tactics.isDefensive ? 'Defensive' : 'Balanced'}
              </span>
            </div>
          </div>
        </SectionPanel>

        <SectionPanel
          title="Starting XI"
          accent="tertiary"
          actions={
            <>
              <SortToggle value={sortMode} onChange={setSortMode} />
              <span className="fm-panel-count">{tactics.players.length}</span>
            </>
          }
        >
          <DataTable
            rows={sortByMode(tactics.players, sortMode, (p) => p.position, (p) => p.currentAbility)}
            rowKey={(p) => p.playerId}
            columns={[
              {
                key: 'name',
                header: 'Name',
                className: 'st-club',
                render: (p) => <Link to={`/players/${p.playerId}`}>{p.name}</Link>,
              },
              { key: 'pos', header: 'Pos', render: (p) => <PositionBadge position={p.position} /> },
              { key: 'ovr', header: 'OVR', className: 'st-pts', render: (p) => p.currentAbility },
            ]}
          />
        </SectionPanel>
      </div>
    </Layout>
  )
}

export default TeamTacticsPage
