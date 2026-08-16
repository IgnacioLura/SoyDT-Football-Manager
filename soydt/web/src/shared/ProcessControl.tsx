import { useProcessContext } from './ProcessContext'

// Ported from the original app's shared layout `#process-btn` (advance one
// day) — same button lives in every page's header there
// (`web/src/layout.html`). State lives in `ProcessContext` (mounted once
// at the app root) rather than here, so it survives navigation — see the
// comment on `ProcessProvider`.

function ProcessControl() {
  const { date, processing, process } = useProcessContext()

  return (
    <>
      {date && (
        <div className="fm-date">
          <div className="fm-date-main">{date}</div>
        </div>
      )}
      <button
        className={`fm-process-btn${processing ? ' fm-processing' : ''}`}
        onClick={() => process(5)}
        disabled={processing}
        title="Advance 5 days"
      >
        <span className="fm-process-label">{processing ? 'Processing…' : 'Process'}</span>
        {processing && (
          <div className="spinner-wrapper">
            <div className="spinner" />
          </div>
        )}
      </button>
    </>
  )
}

export default ProcessControl
