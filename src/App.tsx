import { useRef } from 'react'
import { useGame } from './game/useGame'
import Hud from './components/Hud'
import Overlays from './components/Overlays'
import TouchControls from './components/TouchControls'

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const {
    hud,
    soundOn,
    difficulty,
    lastLapFlash,
    start,
    pause,
    resume,
    restart,
    toMenu,
    setDifficulty,
    toggleSound,
    setInput,
  } = useGame(canvasRef)

  const racing = hud.phase === 'playing' || hud.phase === 'paused'

  return (
    <div className="relative h-full w-full overflow-hidden bg-night">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ touchAction: 'none' }}
      />

      {/* subtle vignette for depth */}
      <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_180px_rgba(0,0,0,0.55)]" />

      {racing && (
        <>
          <Hud
            hud={hud}
            soundOn={soundOn}
            onToggleSound={toggleSound}
            onPause={pause}
            lastLapFlash={lastLapFlash}
          />
          {hud.phase === 'playing' && <TouchControls setInput={setInput} />}
        </>
      )}

      <Overlays
        hud={hud}
        difficulty={difficulty}
        onStart={start}
        onResume={resume}
        onRestart={restart}
        onMenu={toMenu}
        onSetDifficulty={setDifficulty}
      />
    </div>
  )
}
