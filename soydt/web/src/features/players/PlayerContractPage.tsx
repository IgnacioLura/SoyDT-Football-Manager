import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { callApi } from '../../shared/api'
import Layout from '../../shared/Layout'

// Player contract sub-tab — simplified scope: core contract terms only
// (club, shirt number, contract type, squad status, salary, dates,
// transfer-listed flag). Loan sub-detail, bonuses, and clauses are
// deliberately omitted for this pass (see MIGRATION_CHECKLIST.md).

type PlayerContract = {
  clubName: string
  shirtNumber: number | null
  contractType: string
  squadStatus: string
  salaryWeekly: number
  salaryAnnual: number
  started: string | null
  expiration: string
  isTransferListed: boolean
}

function money(value: number) {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

function PlayerContractPage() {
  const { playerId } = useParams<{ playerId: string }>()
  const [contract, setContract] = useState<PlayerContract | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setContract(null)
    setLoaded(false)
    setError(null)
    callApi<PlayerContract | null>(`/api/players/${playerId}/contract`)
      .then((data) => {
        setContract(data)
        setLoaded(true)
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
  }, [playerId])

  if (error) {
    return (
      <Layout title="Contract">
        <div className="fm-page">
          <p style={{ color: 'crimson' }}>Error: {error}</p>
        </div>
      </Layout>
    )
  }

  if (!loaded) {
    return (
      <Layout title="Contract">
        <div className="fm-page">
          <p>Loading…</p>
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Contract">
      <div className="fm-page">
        <section className="fm-panel">
          <div className="fm-panel-head">
            <h3>Contract</h3>
          </div>
          {!contract ? (
            <div className="fm-empty">No active contract</div>
          ) : (
            <div className="fm-personal-detail">
              <div className="fm-detail-row">
                <span className="fm-detail-label">Club</span>
                <span className="fm-detail-value">{contract.clubName}</span>
              </div>
              <div className="fm-detail-row">
                <span className="fm-detail-label">Shirt number</span>
                <span className="fm-detail-value">{contract.shirtNumber ?? '—'}</span>
              </div>
              <div className="fm-detail-row">
                <span className="fm-detail-label">Contract type</span>
                <span className="fm-detail-value">{contract.contractType}</span>
              </div>
              <div className="fm-detail-row">
                <span className="fm-detail-label">Squad status</span>
                <span className="fm-detail-value">{contract.squadStatus}</span>
              </div>
              <div className="fm-detail-row">
                <span className="fm-detail-label">Weekly salary</span>
                <span className="fm-detail-value">{money(contract.salaryWeekly)}</span>
              </div>
              <div className="fm-detail-row">
                <span className="fm-detail-label">Annual salary</span>
                <span className="fm-detail-value">{money(contract.salaryAnnual)}</span>
              </div>
              {contract.started && (
                <div className="fm-detail-row">
                  <span className="fm-detail-label">Started</span>
                  <span className="fm-detail-value">{contract.started}</span>
                </div>
              )}
              <div className="fm-detail-row">
                <span className="fm-detail-label">Expiration</span>
                <span className="fm-detail-value">{contract.expiration}</span>
              </div>
              <div className="fm-detail-row">
                <span className="fm-detail-label">Transfer listed</span>
                <span className="fm-detail-value">{contract.isTransferListed ? 'Yes' : 'No'}</span>
              </div>
            </div>
          )}
        </section>
      </div>
    </Layout>
  )
}

export default PlayerContractPage
