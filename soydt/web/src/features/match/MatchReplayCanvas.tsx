import { useEffect, useRef, useState } from 'react'
import { Application, Graphics } from 'pixi.js'

// Pitch dimensions match the engine's own coordinate space
// (`FootballEngine::<840, 545>` in engine-ffi/src/match_detail.rs) — position
// samples are already in these units, no rescaling needed before drawing.
const PITCH_WIDTH = 840
const PITCH_HEIGHT = 545

// Compresses the full match into a fixed-length playback instead of
// matching real match duration 1:1 — nobody wants to sit through 90
// simulated minutes to see a replay.
const PLAYBACK_DURATION_MS = 60_000

export type MatchPositionData = {
  ball: number[][]
  players: Record<string, number[][]>
}

type Props = {
  positionData: MatchPositionData
  homePlayerIds: number[]
  // Not read directly — any player id not in `homePlayerIds` renders as
  // away by default. Kept in the prop list so callers can pass both id
  // lists symmetrically without the component silently ignoring one.
  awayPlayerIds: number[]
}

// Nearest-sample lookup — samples are at a fixed interval (see
// POSITION_SAMPLE_INTERVAL_MS in engine-ffi/src/match.rs), so a direct index
// computation is enough; no need to binary-search timestamps.
function sampleAt(series: number[][], matchTimeMs: number): [number, number] | null {
  if (series.length === 0) return null
  const interval = series.length > 1 ? series[1][0] - series[0][0] : 1
  const idx = Math.min(series.length - 1, Math.max(0, Math.round(matchTimeMs / interval)))
  const [, x, y] = series[idx]
  return [x, y]
}

function MatchReplayCanvas({ positionData, homePlayerIds }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const ballGraphicRef = useRef<Graphics | null>(null)
  const playerGraphicsRef = useRef<Map<string, Graphics>>(new Map())
  const [playing, setPlaying] = useState(false)
  const [matchTimeMs, setMatchTimeMs] = useState(0)

  const maxMatchTimeMs = positionData.ball.length > 0 ? positionData.ball[positionData.ball.length - 1][0] : 0
  const homeSet = new Set(homePlayerIds)

  useEffect(() => {
    let disposed = false
    const app = new Application()

    app
      .init({ width: PITCH_WIDTH, height: PITCH_HEIGHT, background: '#2e7d32', antialias: true })
      .then(() => {
        // StrictMode mounts effects twice; cleanup can fire before this
        // promise resolves. `app.destroy` on a not-yet-initialized
        // Application throws (Pixi's internal teardown, e.g.
        // `_cancelResize`, isn't set up yet) — so defer the destroy to
        // here instead of racing it in the cleanup function below.
        if (disposed) {
          app.destroy(true, { children: true })
          return
        }
        if (!containerRef.current) return
        containerRef.current.appendChild(app.canvas)
        appRef.current = app

        const pitch = new Graphics()
          .rect(0, 0, PITCH_WIDTH, PITCH_HEIGHT)
          .stroke({ color: 0xffffff, width: 2 })
          .circle(PITCH_WIDTH / 2, PITCH_HEIGHT / 2, 60)
          .stroke({ color: 0xffffff, width: 2 })
          .moveTo(PITCH_WIDTH / 2, 0)
          .lineTo(PITCH_WIDTH / 2, PITCH_HEIGHT)
          .stroke({ color: 0xffffff, width: 2 })
        app.stage.addChild(pitch)

        const ball = new Graphics().circle(0, 0, 5).fill(0xffffff)
        app.stage.addChild(ball)
        ballGraphicRef.current = ball

        const playerIds = Object.keys(positionData.players)
        const graphicsMap = new Map<string, Graphics>()
        for (const playerId of playerIds) {
          const isHome = homeSet.has(Number(playerId))
          const dot = new Graphics().circle(0, 0, 7).fill(isHome ? 0x1e88e5 : 0xe53935)
          app.stage.addChild(dot)
          graphicsMap.set(playerId, dot)
        }
        playerGraphicsRef.current = graphicsMap
      })

    return () => {
      disposed = true
      // Only destroy here if init already resolved (appRef.current set) —
      // otherwise the .then() above handles destroy once init finishes.
      if (appRef.current === app) {
        app.destroy(true, { children: true })
        appRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Position the ball + player dots for the current playback time.
  useEffect(() => {
    const ball = ballGraphicRef.current
    if (ball) {
      const pos = sampleAt(positionData.ball, matchTimeMs)
      if (pos) {
        ball.x = pos[0]
        ball.y = pos[1]
      }
    }
    for (const [playerId, dot] of playerGraphicsRef.current) {
      const series = positionData.players[playerId]
      const pos = series ? sampleAt(series, matchTimeMs) : null
      if (pos) {
        dot.x = pos[0]
        dot.y = pos[1]
        dot.visible = true
      } else {
        dot.visible = false
      }
    }
  }, [matchTimeMs, positionData])

  // Playback clock — real-time advances mapped onto match-time by the
  // compression ratio, independent of the position-sampling effect above.
  useEffect(() => {
    if (!playing) return
    let raf: number
    let last = performance.now()
    const speed = maxMatchTimeMs / PLAYBACK_DURATION_MS
    const tick = (now: number) => {
      const deltaMs = (now - last) * speed
      last = now
      setMatchTimeMs((t) => {
        const next = t + deltaMs
        if (next >= maxMatchTimeMs) {
          setPlaying(false)
          return maxMatchTimeMs
        }
        return next
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, maxMatchTimeMs])

  const minute = Math.floor(matchTimeMs / 60_000)

  return (
    <div className="fm-panel">
      <div ref={containerRef} style={{ width: PITCH_WIDTH, height: PITCH_HEIGHT, maxWidth: '100%' }} />
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem' }}>
        <button onClick={() => setPlaying((p) => !p)}>{playing ? 'Pause' : 'Play'}</button>
        <input
          type="range"
          min={0}
          max={maxMatchTimeMs}
          value={matchTimeMs}
          onChange={(e) => {
            setPlaying(false)
            setMatchTimeMs(Number(e.target.value))
          }}
          style={{ flex: 1 }}
        />
        <span>{minute}'</span>
      </div>
    </div>
  )
}

export default MatchReplayCanvas
