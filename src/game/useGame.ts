import { useCallback, useEffect, useRef, useState } from 'react'
import { RacingGame } from './engine'
import { SoundEngine } from './sound'
import type { Difficulty, HudState, InputState } from './types'

const KEY_MAP: Record<string, keyof InputState> = {
  ArrowUp: 'accel',
  KeyW: 'accel',
  ArrowDown: 'brake',
  KeyS: 'brake',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
}

const emptyHud: HudState = {
  phase: 'menu',
  speed: 0,
  speedPct: 0,
  gear: 1,
  lap: 1,
  totalLaps: 3,
  lapTime: 0,
  lastLapTime: 0,
  bestLapTime: 0,
  totalTime: 0,
  countdown: 3,
  offRoad: false,
  finishTime: 0,
}

export function useGame(canvasRef: React.RefObject<HTMLCanvasElement>) {
  const engineRef = useRef<RacingGame | null>(null)
  const soundRef = useRef<SoundEngine | null>(null)
  const inputRef = useRef<InputState>({
    left: false,
    right: false,
    accel: false,
    brake: false,
  })
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const accRef = useRef<number>(0)
  const frameRef = useRef<number>(0)

  const [hud, setHud] = useState<HudState>(emptyHud)
  const [soundOn, setSoundOn] = useState(true)
  const [difficulty, setDifficultyState] = useState<Difficulty>('normal')
  const [lastLapFlash, setLastLapFlash] = useState<{
    time: number
    best: boolean
    id: number
  } | null>(null)

  // ---------- initialise engine + loop ----------
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const sound = new SoundEngine()
    soundRef.current = sound

    const sizeCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const cssW = canvas.clientWidth || window.innerWidth
      const cssH = canvas.clientHeight || window.innerHeight
      canvas.width = Math.floor(cssW * dpr)
      canvas.height = Math.floor(cssH * dpr)
      engineRef.current?.resize(canvas.width, canvas.height)
    }

    const engine = new RacingGame(canvas, {
      onCrash: () => sound.crash(),
      onCountdownTick: (n) => {
        if (n > 0) sound.beep(440, 0.16, 'square', 0.35)
        else sound.beep(880, 0.4, 'sawtooth', 0.4)
      },
      onLap: (time, best) => {
        sound.beep(best ? 1046 : 660, 0.25, 'triangle', 0.35)
        setLastLapFlash({ time, best, id: Date.now() })
      },
      onFinish: () => {
        sound.beep(660, 0.14, 'triangle', 0.4)
        window.setTimeout(() => sound.beep(880, 0.14, 'triangle', 0.4), 150)
        window.setTimeout(() => sound.beep(1174, 0.4, 'triangle', 0.4), 300)
      },
    })
    engineRef.current = engine
    sizeCanvas()

    const loop = (t: number) => {
      rafRef.current = requestAnimationFrame(loop)
      if (!lastTimeRef.current) lastTimeRef.current = t
      let frameTime = (t - lastTimeRef.current) / 1000
      lastTimeRef.current = t
      if (frameTime > 0.1) frameTime = 0.1 // avoid huge jumps on tab switch

      const step = 1 / 60
      accRef.current += frameTime
      let guard = 0
      while (accRef.current >= step && guard < 6) {
        engine.update(step, inputRef.current)
        accRef.current -= step
        guard++
      }

      engine.render()

      // audio
      const h = engine.getHud()
      if (soundRef.current) {
        if (h.phase === 'playing' || h.phase === 'countdown') {
          soundRef.current.updateEngine(h.speedPct, inputRef.current.accel)
        }
        if (h.phase === 'playing' && engine.isSkidding()) {
          soundRef.current.startSkid()
        } else {
          soundRef.current.stopSkid()
        }
      }

      // throttle React HUD updates
      frameRef.current++
      if (frameRef.current % 2 === 0) setHud(h)
    }
    rafRef.current = requestAnimationFrame(loop)

    window.addEventListener('resize', sizeCanvas)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', sizeCanvas)
      sound.stopEngine()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------- keyboard ----------
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault()
        pause()
        return
      }
      const action = KEY_MAP[e.code]
      if (action) {
        e.preventDefault()
        inputRef.current[action] = true
      }
    }
    const up = (e: KeyboardEvent) => {
      const action = KEY_MAP[e.code]
      if (action) {
        e.preventDefault()
        inputRef.current[action] = false
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---------- actions ----------
  const start = useCallback(() => {
    const engine = engineRef.current
    const sound = soundRef.current
    if (!engine || !sound) return
    sound.resume()
    sound.setEnabled(soundOn)
    sound.startEngine()
    engine.setDifficulty(difficulty)
    engine.startRace()
  }, [difficulty, soundOn])

  const pause = useCallback(() => {
    engineRef.current?.togglePause()
  }, [])

  const resume = useCallback(() => {
    const engine = engineRef.current
    if (engine && engine.phase === 'paused') engine.togglePause()
  }, [])

  const restart = useCallback(() => {
    const engine = engineRef.current
    const sound = soundRef.current
    if (!engine || !sound) return
    sound.resume()
    sound.startEngine()
    engine.setDifficulty(difficulty)
    engine.startRace()
  }, [difficulty])

  const toMenu = useCallback(() => {
    engineRef.current?.backToMenu()
    soundRef.current?.stopSkid()
  }, [])

  const setDifficulty = useCallback((d: Difficulty) => {
    setDifficultyState(d)
    engineRef.current?.setDifficulty(d)
  }, [])

  const toggleSound = useCallback(() => {
    setSoundOn((s) => {
      const next = !s
      soundRef.current?.setEnabled(next)
      return next
    })
  }, [])

  const setInput = useCallback((key: keyof InputState, value: boolean) => {
    inputRef.current[key] = value
    soundRef.current?.resume()
  }, [])

  return {
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
  }
}
