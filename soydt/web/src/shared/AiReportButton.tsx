import { useRef, useState } from 'react'
import { callApi } from './api'

// Ported from the original app's per-page "AI report" button/dialog
// (`player/get/index.html`'s `#fm-ai-report-btn`/`#fm-ai-report-dialog`) —
// same CSS classes already shipped in style.css. Reused by both
// PlayerPage and TeamPage since the start/poll/render mechanics are
// identical; only the start endpoint and dialog title differ per page.

type ReportStart = { jobId: number | null; error: string | null }
type ToolTrace = { name: string; arguments: string }
type JobSnapshot = { status: string; cursor: number; newToolCalls: ToolTrace[]; text: string; detail: string }

const TOOL_LABELS: Record<string, string> = {
  club_get_by_id: 'Looking up club record…',
  club_players: 'Reading squad list…',
  player_get_by_id: 'Reading player record…',
}

function renderText(md: string) {
  const escaped = md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
}

type Props = {
  title: string
  startUrl: string
}

function AiReportButton({ title, startUrl }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toolCalls, setToolCalls] = useState<ToolTrace[]>([])
  const [text, setText] = useState<string | null>(null)

  const openDialog = () => dialogRef.current?.showModal()
  const closeDialog = () => dialogRef.current?.close()

  const poll = async (jobId: number, cursor: number) => {
    try {
      const data = await callApi<JobSnapshot>(`/api/ai/progress?jobId=${jobId}&cursor=${cursor}`)
      setToolCalls((prev) => [...prev, ...data.newToolCalls])
      if (data.status === 'done') {
        setRunning(false)
        setText(data.text)
      } else if (data.status === 'error') {
        setRunning(false)
        setError(data.detail)
      } else {
        await poll(jobId, data.cursor)
      }
    } catch (e) {
      setRunning(false)
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const start = async () => {
    if (running) {
      openDialog()
      return
    }
    setRunning(true)
    setError(null)
    setToolCalls([])
    setText(null)
    openDialog()

    try {
      const data = await callApi<ReportStart>(startUrl, { method: 'POST' })
      if (data.jobId != null) {
        await poll(data.jobId, 0)
      } else {
        setRunning(false)
        setError(data.error ?? 'unknown error')
      }
    } catch (e) {
      setRunning(false)
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <>
      <button type="button" className="fm-ai-analyze-btn" onClick={start}>
        <i className="fa fa-robot" aria-hidden="true" /> AI report
      </button>
      <dialog className="fm-worker-dialog fm-ai-report-dialog" ref={dialogRef}>
        <div className="fm-worker-dialog-head">
          <h3>{title}</h3>
          <button type="button" className="fm-worker-dialog-close" onClick={closeDialog} aria-label="Close">
            <i className="fa fa-times" />
          </button>
        </div>
        <div className="fm-ai-report-body">
          {(running || error) && (
            <div className={`fm-ai-report-status${error ? ' fm-ai-report-status-error' : ''}`}>
              <span>{error ? `Error: ${error}` : 'Generating…'}</span>
              {running && <div className="spinner" />}
            </div>
          )}
          {running && (
            <ol className="fm-ai-report-live">
              {toolCalls.map((tc, i) => (
                <li key={i} className="fm-ai-tool-call">
                  {TOOL_LABELS[tc.name] ?? tc.name}
                </li>
              ))}
            </ol>
          )}
          {text !== null && (
            <div className="fm-ai-report-text" dangerouslySetInnerHTML={{ __html: renderText(text) }} />
          )}
        </div>
      </dialog>
    </>
  )
}

export default AiReportButton
