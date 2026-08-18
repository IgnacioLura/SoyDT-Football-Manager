// soydt/web/src/shared/PlayerCompareModal.tsx
// Overlay wrapper around PlayerCompareView — lets a page (currently
// DtSquadPage's squad grid) show a head-to-head comparison in place,
// without navigating to /players/compare. Escape/backdrop click/× all
// close it; the closing animation is a fixed-duration class swap (no
// AnimatePresence-style library here) matched to the `duration-200` used
// below.
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import PlayerCompareView from './PlayerCompareView'

const CLOSE_MS = 180

type PlayerCompareModalProps = {
  idA: number
  idB: number
  onClose: () => void
}

function PlayerCompareModal({ idA, idB, onClose }: PlayerCompareModalProps) {
  const [closing, setClosing] = useState(false)

  const close = () => {
    setClosing(true)
    setTimeout(onClose, CLOSE_MS)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div
      className={`fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200 ${closing ? 'animate-out fade-out' : ''}`}
      onClick={close}
    >
      <div
        className={`relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-card bg-surface-0 p-4 shadow-card animate-in fade-in zoom-in-95 slide-in-from-bottom-2 duration-200 ${closing ? 'animate-out fade-out zoom-out-95 slide-out-to-bottom-2' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={close}
          aria-label="Cerrar"
          className="absolute right-3 top-3 z-10 rounded-card p-1.5 text-text-muted transition-colors duration-fast hover:bg-surface-2 hover:text-text-primary"
        >
          <X size={20} />
        </button>
        <PlayerCompareView idA={idA} idB={idB} />
      </div>
    </div>
  )
}

export default PlayerCompareModal
