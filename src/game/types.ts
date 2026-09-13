export type InputState = {
  left: boolean
  right: boolean
  accel: boolean
  brake: boolean
}

export type GamePhase = 'menu' | 'countdown' | 'playing' | 'paused' | 'finished'

export type HudState = {
  phase: GamePhase
  speed: number // km/h
  speedPct: number // 0..1 of max speed
  gear: number
  lap: number
  totalLaps: number
  lapTime: number // seconds, current lap
  lastLapTime: number
  bestLapTime: number
  totalTime: number
  countdown: number // 3,2,1,0(GO)
  offRoad: boolean
  finishTime: number
}

export type Difficulty = 'easy' | 'normal' | 'hard'
