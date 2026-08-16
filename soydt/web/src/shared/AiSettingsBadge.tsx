import { useEffect, useRef, useState } from 'react'
import { callApi } from './api'

// Ported from the original app's home-page AI settings badge/dialog
// (`countries/list/index.html`'s `#fm-ai-btn`/`#fm-ai-dialog`) — same CSS
// classes (`fm-ai-btn`/`fm-ai-dialog`/...) already shipped in style.css, so
// this only needed the interaction logic rewritten as a React component.

type AiConfigDto = { configured: boolean; baseUrl: string; model: string; apiKey: string }

function AiSettingsBadge() {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [configured, setConfigured] = useState(false)
  const [baseUrl, setBaseUrl] = useState('')
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)

  const loadConfig = () => {
    callApi<AiConfigDto>('/api/ai/config').then((cfg) => {
      setConfigured(cfg.configured)
      setBaseUrl(cfg.baseUrl)
      setModel(cfg.model)
      setApiKey(cfg.apiKey)
    })
  }

  useEffect(loadConfig, [])

  const openDialog = () => {
    loadConfig()
    setResult(null)
    dialogRef.current?.showModal()
  }
  const closeDialog = () => dialogRef.current?.close()

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await callApi<{ status: string; detail: string }>('/api/ai/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseUrl, model, apiKey }),
      })
      if (res.status === 'ok') {
        setResult({ ok: true, text: 'Saved' })
        setConfigured(true)
        setTimeout(closeDialog, 600)
      } else {
        setResult({ ok: false, text: res.detail })
      }
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : String(err) })
    }
  }

  const disable = async () => {
    await callApi('/api/ai/config', { method: 'DELETE' })
    setConfigured(false)
    setResult({ ok: true, text: 'Disabled' })
    setTimeout(closeDialog, 600)
  }

  return (
    <>
      <button
        className={`fm-ai-btn${configured ? ' fm-ai-btn-on' : ''}`}
        type="button"
        title="AI settings"
        aria-label="AI settings"
        onClick={openDialog}
      >
        <i className="fa fa-robot fm-ai-btn-ic" aria-hidden="true" />
        <span className="fm-ai-btn-dot" aria-hidden="true" />
        <span className="fm-ai-btn-label">AI</span>
      </button>
      <dialog className="fm-worker-dialog fm-ai-dialog" ref={dialogRef}>
        <form className="fm-worker-dialog-form" onSubmit={save}>
          <div className="fm-worker-dialog-head">
            <h3>AI settings</h3>
            <button type="button" className="fm-worker-dialog-close" onClick={closeDialog} aria-label="Cancel">
              <i className="fa fa-times" />
            </button>
          </div>
          <div className="fm-worker-dialog-body fm-ai-dialog-body">
            <label className="fm-worker-dialog-field">
              <span>Base URL</span>
              <input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} autoComplete="off" spellCheck={false} required />
            </label>
            <label className="fm-worker-dialog-field">
              <span>Model</span>
              <input value={model} onChange={(e) => setModel(e.target.value)} autoComplete="off" spellCheck={false} required />
            </label>
            <label className="fm-worker-dialog-field">
              <span>API key</span>
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="optional — most local endpoints don't need one"
              />
            </label>
          </div>
          {result && <div className="fm-worker-dialog-result">{result.text}</div>}
          <div className="fm-worker-dialog-actions">
            {configured && (
              <button type="button" className="fm-worker-dialog-btn fm-worker-dialog-btn-disable" onClick={disable}>
                Disable
              </button>
            )}
            <button type="button" className="fm-worker-dialog-btn fm-worker-dialog-btn-cancel" onClick={closeDialog}>
              Cancel
            </button>
            <button type="submit" className="fm-worker-dialog-btn fm-worker-dialog-btn-add">
              Save
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}

export default AiSettingsBadge
