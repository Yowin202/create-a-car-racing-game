import type { Difficulty, GamePhase, HudState, InputState } from './types'
import {
  drawCarSprite,
  drawPlayerCar,
  drawScenery,
  sceneryAspect,
  type SceneryType,
} from './sprites'

// ---------- small math helpers ----------
const Util = {
  toInt: (v: number, d: number) => (isNaN(v) ? d : Math.round(v)),
  limit: (v: number, min: number, max: number) => Math.max(min, Math.min(v, max)),
  interpolate: (a: number, b: number, pct: number) => a + (b - a) * pct,
  accelerate: (v: number, accel: number, dt: number) => v + accel * dt,
  easeIn: (a: number, b: number, pct: number) => a + (b - a) * Math.pow(pct, 2),
  easeOut: (a: number, b: number, pct: number) =>
    a + (b - a) * (1 - Math.pow(1 - pct, 2)),
  easeInOut: (a: number, b: number, pct: number) =>
    a + (b - a) * (-Math.cos(pct * Math.PI) / 2 + 0.5),
  percentRemaining: (n: number, total: number) => (n % total) / total,
  exponentialFog: (distance: number, density: number) =>
    1 / Math.pow(Math.E, distance * distance * density),
  increase: (start: number, increment: number, max: number) => {
    let r = (start + increment) % max
    while (r < 0) r += max
    return r
  },
  overlap: (
    x1: number,
    w1: number,
    x2: number,
    w2: number,
    percent = 1,
  ) => {
    const half = percent / 2
    const min1 = x1 - w1 * half
    const max1 = x1 + w1 * half
    const min2 = x2 - w2 * half
    const max2 = x2 + w2 * half
    return !(max1 < min2 || min1 > max2)
  },
  randomInt: (min: number, max: number) =>
    Math.round(Util.interpolate(min, max, Math.random())),
  randomChoice: <T>(arr: T[]): T => arr[Util.randomInt(0, arr.length - 1)],
}

type SegColor = { road: string; grass: string; rumble: string; lane?: string }

const COLORS = {
  LIGHT: { road: '#69707d', grass: '#33bf6f', rumble: '#f2f4f8', lane: '#e6ebf5' } as SegColor,
  DARK: { road: '#636a77', grass: '#2bab63', rumble: '#d42b47' } as SegColor,
  FOG: '#bfe3ff',
}

type Point = {
  world: { x: number; y: number; z: number }
  camera: { x: number; y: number; z: number }
  screen: { x: number; y: number; w: number; scale: number }
}

type RoadSprite = { offset: number; type: SceneryType }

type Car = {
  offset: number
  z: number
  speed: number
  color: string
  shade: string
  percent: number
  segment: Segment | null
}

type Segment = {
  index: number
  p1: Point
  p2: Point
  curve: number
  color: SegColor
  sprites: RoadSprite[]
  cars: Car[]
  looped: boolean
  fog: number
  clip: number
  startLine: boolean
}

const CAR_COLORS = [
  ['#2e77ff', '#123a86'],
  ['#ffb703', '#a6740a'],
  ['#20c997', '#0f6a52'],
  ['#8b5cf6', '#4c2c8f'],
  ['#ff6b6b', '#9e2f2f'],
  ['#f8f9fa', '#8a8f99'],
  ['#111318', '#000000'],
  ['#ff7ac6', '#a33b7e'],
]

export type EngineCallbacks = {
  onCrash?: () => void
  onCountdownTick?: (n: number) => void
  onLap?: (lapTime: number, isBest: boolean) => void
  onFinish?: () => void
}

export class RacingGame {
  private ctx: CanvasRenderingContext2D
  width = 800
  height = 450

  // pseudo-3D camera
  private fov = 100
  private cameraHeight = 1000
  private cameraDepth = 0
  private drawDistance = 260
  private roadWidth = 2000
  private segmentLength = 200
  private rumbleLength = 3
  private lanes = 3
  private fogDensity = 4
  private playerZ = 0

  // road
  private segments: Segment[] = []
  private trackLength = 0

  // physics
  private maxSpeed = 0
  private accel = 0
  private braking = 0
  private decel = 0
  private offRoadDecel = 0
  private offRoadLimit = 0
  private centrifugal = 0.32

  // player state
  speed = 0
  private position = 0
  private prevPosition = 0
  playerX = 0
  private steer = 0

  // race state
  phase: GamePhase = 'menu'
  private countdown = 3.999
  private lap = 0
  totalLaps = 3
  private lapTime = 0
  private lastLapTime = 0
  bestLapTime = 0
  private totalTime = 0
  private finishTime = 0
  difficulty: Difficulty = 'normal'

  // fx
  private shake = 0
  private bgOffset = 0
  private skidding = false

  private cb: EngineCallbacks

  constructor(canvas: HTMLCanvasElement, cb: EngineCallbacks = {}) {
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('2D canvas not supported')
    this.ctx = ctx
    this.cb = cb
    this.bestLapTime = this.loadBest()
    this.resize(canvas.width, canvas.height)
    this.resetPlayer()
    this.buildTrack()
  }

  // ---------- setup ----------
  resize(w: number, h: number) {
    this.width = w
    this.height = h
    this.cameraDepth = 1 / Math.tan(((this.fov / 2) * Math.PI) / 180)
    this.playerZ = this.cameraHeight * this.cameraDepth
    this.drawDistance = w < 640 ? 200 : 260
  }

  private loadBest(): number {
    try {
      const v = localStorage.getItem('apexrush.bestlap')
      return v ? parseFloat(v) : 0
    } catch {
      return 0
    }
  }

  private saveBest(v: number) {
    try {
      localStorage.setItem('apexrush.bestlap', String(v))
    } catch {
      /* noop */
    }
  }

  setDifficulty(d: Difficulty) {
    this.difficulty = d
  }

  // ---------- track building ----------
  private lastY(): number {
    return this.segments.length === 0
      ? 0
      : this.segments[this.segments.length - 1].p2.world.y
  }

  private addSegment(curve: number, y: number) {
    const n = this.segments.length
    this.segments.push({
      index: n,
      p1: {
        world: { x: 0, y: this.lastY(), z: n * this.segmentLength },
        camera: { x: 0, y: 0, z: 0 },
        screen: { x: 0, y: 0, w: 0, scale: 0 },
      },
      p2: {
        world: { x: 0, y, z: (n + 1) * this.segmentLength },
        camera: { x: 0, y: 0, z: 0 },
        screen: { x: 0, y: 0, w: 0, scale: 0 },
      },
      curve,
      color:
        Math.floor(n / this.rumbleLength) % 2 ? COLORS.DARK : COLORS.LIGHT,
      sprites: [],
      cars: [],
      looped: false,
      fog: 0,
      clip: 0,
      startLine: n < 4,
    })
  }

  private addRoad(
    enter: number,
    hold: number,
    leave: number,
    curve: number,
    y: number,
  ) {
    const startY = this.lastY()
    const endY = startY + Util.toInt(y, 0) * this.segmentLength
    const total = enter + hold + leave
    for (let n = 0; n < enter; n++)
      this.addSegment(
        Util.easeIn(0, curve, n / enter),
        Util.easeInOut(startY, endY, n / total),
      )
    for (let n = 0; n < hold; n++)
      this.addSegment(curve, Util.easeInOut(startY, endY, (enter + n) / total))
    for (let n = 0; n < leave; n++)
      this.addSegment(
        Util.easeInOut(curve, 0, n / leave),
        Util.easeInOut(startY, endY, (enter + hold + n) / total),
      )
  }

  private buildTrack() {
    const L = { NONE: 0, SHORT: 8, MEDIUM: 16, LONG: 32 }
    const C = { NONE: 0, EASY: 2, MEDIUM: 4, HARD: 5.5 }
    const H = { NONE: 0, LOW: 20, MEDIUM: 40, HIGH: 60 }
    this.segments = []

    const straight = (n = L.MEDIUM) => this.addRoad(n, n, n, 0, 0)
    const curve = (n: number, c: number, h = 0) => this.addRoad(n, n, n, c, h)
    const hill = (n: number, h: number) => this.addRoad(n, n, n, 0, h)
    const sCurves = () => {
      this.addRoad(L.MEDIUM, L.MEDIUM, L.MEDIUM, -C.EASY, H.NONE)
      this.addRoad(L.MEDIUM, L.MEDIUM, L.MEDIUM, C.MEDIUM, H.MEDIUM)
      this.addRoad(L.MEDIUM, L.MEDIUM, L.MEDIUM, C.EASY, -H.LOW)
      this.addRoad(L.MEDIUM, L.MEDIUM, L.MEDIUM, -C.EASY, H.MEDIUM)
      this.addRoad(L.MEDIUM, L.MEDIUM, L.MEDIUM, -C.MEDIUM, -H.MEDIUM)
    }
    const rollingHills = (n = L.SHORT, h = H.LOW) => {
      this.addRoad(n, n, n, 0, h / 2)
      this.addRoad(n, n, n, 0, -h)
      this.addRoad(n, n, n, 0, h)
      this.addRoad(n, n, n, 0, 0)
      this.addRoad(n, n, n, 0, h / 2)
      this.addRoad(n, n, n, 0, 0)
    }
    const bumps = () => {
      const seq = [5, -3, -5, 8, -6, 5]
      for (const b of seq) this.addRoad(8, 8, 8, 0, b)
    }

    straight(L.SHORT)
    rollingHills()
    sCurves()
    curve(L.MEDIUM, C.MEDIUM, H.LOW)
    bumps()
    rollingHills()
    curve(L.LONG, -C.MEDIUM, H.MEDIUM)
    straight()
    hill(L.MEDIUM, H.HIGH)
    sCurves()
    curve(L.LONG, C.HARD, -H.LOW)
    hill(L.MEDIUM, H.HIGH)
    curve(L.LONG, -C.MEDIUM, -H.LOW)
    bumps()
    curve(L.MEDIUM, C.MEDIUM, H.MEDIUM)
    straight()
    sCurves()
    curve(L.LONG, -C.HARD, H.NONE)
    // ease hills back to zero so the loop seam is smooth
    this.addRoad(80, 80, 80, C.EASY, -this.lastY() / this.segmentLength)

    this.trackLength = this.segments.length * this.segmentLength

    this.addScenery()
    this.addTraffic()
  }

  private addScenery() {
    const scenery: SceneryType[] = ['tree', 'palm', 'bush', 'rock']
    // dense roadside vegetation
    for (let n = 12; n < this.segments.length; n += Util.randomInt(1, 6)) {
      const side = Math.random() > 0.5 ? 1 : -1
      const offset = side * (1.3 + Math.random() * 4)
      const type = Util.randomChoice(scenery)
      this.segments[n].sprites.push({ offset, type })
    }
    // occasional billboards close to the road
    for (let n = 60; n < this.segments.length; n += Util.randomInt(40, 90)) {
      const side = Math.random() > 0.5 ? 1 : -1
      this.segments[n].sprites.push({ offset: side * 1.15, type: 'sign' })
    }
  }

  private addTraffic() {
    const counts: Record<Difficulty, number> = {
      easy: 24,
      normal: 42,
      hard: 60,
    }
    const maxCarSpeedPct: Record<Difficulty, number> = {
      easy: 0.5,
      normal: 0.62,
      hard: 0.74,
    }
    const total = counts[this.difficulty]
    for (let i = 0; i < total; i++) {
      const offset = Math.random() * 2 - 1
      const z =
        Math.floor(Math.random() * this.segments.length) * this.segmentLength
      const speed =
        this.maxSpeed * 0.22 +
        Math.random() * this.maxSpeed * (maxCarSpeedPct[this.difficulty] - 0.22)
      const [color, shade] = Util.randomChoice(CAR_COLORS)
      const car: Car = {
        offset: offset * 0.8,
        z,
        speed,
        color,
        shade,
        percent: 0,
        segment: null,
      }
      const seg = this.findSegment(car.z)
      seg.cars.push(car)
      car.segment = seg
    }
  }

  private findSegment(z: number): Segment {
    return this.segments[
      Math.floor(z / this.segmentLength) % this.segments.length
    ]
  }

  // ---------- lifecycle ----------
  private resetPlayer() {
    this.maxSpeed = this.segmentLength * 60
    this.accel = this.maxSpeed / 4.5
    this.braking = -this.maxSpeed
    this.decel = -this.maxSpeed / 4.5
    this.offRoadDecel = -this.maxSpeed / 1.6
    this.offRoadLimit = this.maxSpeed / 4
    this.speed = 0
    this.position = 0
    this.prevPosition = 0
    this.playerX = 0
    this.steer = 0
    this.lap = 0
    this.lapTime = 0
    this.lastLapTime = 0
    this.totalTime = 0
    this.finishTime = 0
    this.shake = 0
  }

  startRace() {
    // rebuild traffic so density/speeds match difficulty and layout is fresh
    this.resetPlayer()
    for (const s of this.segments) s.cars = []
    this.addTraffic()
    this.countdown = 3.999
    this.phase = 'countdown'
  }

  togglePause() {
    if (this.phase === 'playing') this.phase = 'paused'
    else if (this.phase === 'paused') this.phase = 'playing'
  }

  backToMenu() {
    this.phase = 'menu'
    this.resetPlayer()
  }

  // ---------- update ----------
  update(dt: number, input: InputState) {
    this.skidding = false

    if (this.phase === 'countdown') {
      const prev = Math.ceil(this.countdown)
      this.countdown -= dt
      const now = Math.ceil(this.countdown)
      if (now !== prev && now >= 0) this.cb.onCountdownTick?.(now)
      // let the world drift a touch and keep engine idling
      this.updateCars(dt)
      if (this.countdown <= 0) {
        this.phase = 'playing'
        this.prevPosition = this.position
      }
      return
    }

    if (this.phase !== 'playing') return

    const playerSegment = this.findSegment(this.position + this.playerZ)
    const speedPercent = this.speed / this.maxSpeed
    const dx = dt * 2.2 * speedPercent

    this.totalTime += dt
    this.lapTime += dt

    // steering
    const steerDir = (input.left ? -1 : 0) + (input.right ? 1 : 0)
    this.steer = Util.interpolate(this.steer, steerDir, 0.25)
    if (input.left) this.playerX -= dx
    else if (input.right) this.playerX += dx

    // centrifugal push on curves
    this.playerX -= dx * speedPercent * playerSegment.curve * this.centrifugal

    // acceleration
    if (input.accel) this.speed = Util.accelerate(this.speed, this.accel, dt)
    else if (input.brake)
      this.speed = Util.accelerate(this.speed, this.braking, dt)
    else this.speed = Util.accelerate(this.speed, this.decel, dt)

    // off-road handling
    const offRoad = this.playerX < -1 || this.playerX > 1
    if (offRoad) {
      if (this.speed > this.offRoadLimit)
        this.speed = Util.accelerate(this.speed, this.offRoadDecel, dt)
      // rumble shake + drift back
      this.shake = Math.max(this.shake, 3 * speedPercent)
      // scenery collision when deep in the weeds
      for (const sprite of playerSegment.sprites) {
        const sw =
          (sceneryAspect(sprite.type) > 1 ? 0.9 : 0.7) // rough half-width in offset units
        if (Util.overlap(this.playerX, 0.5, sprite.offset, sw, 0.5)) {
          this.speed = this.maxSpeed / 5
          this.position = Util.increase(
            playerSegment.p1.world.z,
            -this.playerZ,
            this.trackLength,
          )
          this.triggerCrash()
          break
        }
      }
    }

    // skid detection (hard cornering at speed)
    if (speedPercent > 0.55 && Math.abs(steerDir) > 0 && Math.abs(playerSegment.curve) > 2)
      this.skidding = true
    if (offRoad && speedPercent > 0.3) this.skidding = true

    // traffic collisions
    for (const car of playerSegment.cars) {
      if (this.speed > car.speed) {
        if (Util.overlap(this.playerX, 0.5, car.offset, 0.6, 0.8)) {
          // bump down to a fraction of speed (never below the car we hit)
          this.speed = Math.max(car.speed * 0.9, this.speed * 0.5)
          this.position = Util.increase(
            car.z,
            -this.playerZ,
            this.trackLength,
          )
          this.triggerCrash()
          break
        }
      }
    }

    this.playerX = Util.limit(this.playerX, -2.6, 2.6)
    this.speed = Util.limit(this.speed, 0, this.maxSpeed)

    // advance
    this.position = Util.increase(this.position, dt * this.speed, this.trackLength)

    // lap detection: position wrapped forward past the seam
    if (
      this.prevPosition > this.position &&
      this.prevPosition - this.position > this.trackLength * 0.5
    ) {
      this.lap += 1
      this.lastLapTime = this.lapTime
      let isBest = false
      if (this.bestLapTime === 0 || this.lapTime < this.bestLapTime) {
        this.bestLapTime = this.lapTime
        this.saveBest(this.bestLapTime)
        isBest = true
      }
      this.cb.onLap?.(this.lapTime, isBest)
      this.lapTime = 0
      if (this.lap >= this.totalLaps) {
        this.phase = 'finished'
        this.finishTime = this.totalTime
        this.speed = 0
        this.cb.onFinish?.()
      }
    }
    this.prevPosition = this.position

    // parallax + shake decay
    this.bgOffset = Util.increase(
      this.bgOffset,
      playerSegment.curve * speedPercent * dt * 0.6,
      1000,
    )
    this.shake = Math.max(0, this.shake - dt * 12)

    this.updateCars(dt)
  }

  private updateCars(dt: number) {
    if (this.segments.length === 0) return
    const playerSegment = this.findSegment(this.position + this.playerZ)
    for (const seg of this.segments) {
      for (let i = seg.cars.length - 1; i >= 0; i--) {
        const car = seg.cars[i]
        const oldSegment = seg
        car.offset += this.carOffsetForce(car, oldSegment, playerSegment)
        car.offset = Util.limit(car.offset, -0.9, 0.9)
        car.z = Util.increase(car.z, dt * car.speed, this.trackLength)
        car.percent = Util.percentRemaining(car.z, this.segmentLength)
        const newSegment = this.findSegment(car.z)
        if (oldSegment !== newSegment) {
          seg.cars.splice(i, 1)
          newSegment.cars.push(car)
          car.segment = newSegment
        }
      }
    }
  }

  private carOffsetForce(
    car: Car,
    carSegment: Segment,
    playerSegment: Segment,
  ): number {
    const lookahead = 20
    const carW = 0.6
    if (carSegment.index - playerSegment.index > this.drawDistance) return 0
    for (let i = 1; i < lookahead; i++) {
      const segment =
        this.segments[(carSegment.index + i) % this.segments.length]
      if (
        segment === playerSegment &&
        this.speed > car.speed &&
        Util.overlap(this.playerX, 0.5, car.offset, carW, 1.2)
      ) {
        let dir: number
        if (this.playerX > 0.5) dir = -1
        else if (this.playerX < -0.5) dir = 1
        else dir = this.playerX > car.offset ? -1 : 1
        return ((dir / i) * (this.speed - car.speed)) / this.maxSpeed
      }
      for (const other of segment.cars) {
        if (
          car.speed > other.speed &&
          Util.overlap(car.offset, carW, other.offset, carW, 1.2)
        ) {
          let dir: number
          if (other.offset > 0.5) dir = -1
          else if (other.offset < -0.5) dir = 1
          else dir = car.offset > other.offset ? 1 : -1
          return ((dir / i) * (car.speed - other.speed)) / this.maxSpeed
        }
      }
    }
    if (car.offset < -0.9) return 0.1
    if (car.offset > 0.9) return -0.1
    return 0
  }

  private triggerCrash() {
    this.shake = 10
    this.cb.onCrash?.()
  }

  isSkidding() {
    return this.skidding
  }

  // ---------- projection ----------
  private project(
    p: Point,
    cameraX: number,
    cameraY: number,
    cameraZ: number,
  ) {
    p.camera.x = p.world.x - cameraX
    p.camera.y = p.world.y - cameraY
    p.camera.z = p.world.z - cameraZ
    p.screen.scale = this.cameraDepth / p.camera.z
    p.screen.x = Math.round(
      this.width / 2 + (p.screen.scale * p.camera.x * this.width) / 2,
    )
    p.screen.y = Math.round(
      this.height / 2 - (p.screen.scale * p.camera.y * this.height) / 2,
    )
    p.screen.w = Math.round((p.screen.scale * this.roadWidth * this.width) / 2)
  }

  // ---------- rendering ----------
  render() {
    const ctx = this.ctx
    const baseSegment = this.findSegment(this.position)
    const basePercent = Util.percentRemaining(this.position, this.segmentLength)
    const playerSegment = this.findSegment(this.position + this.playerZ)
    const playerPercent = Util.percentRemaining(
      this.position + this.playerZ,
      this.segmentLength,
    )
    const playerY = Util.interpolate(
      playerSegment.p1.world.y,
      playerSegment.p2.world.y,
      playerPercent,
    )

    ctx.save()
    // screen shake
    if (this.shake > 0.1) {
      ctx.translate(
        (Math.random() * 2 - 1) * this.shake,
        (Math.random() * 2 - 1) * this.shake,
      )
    }

    // sky + background
    this.drawBackground(playerY)

    let maxy = this.height
    let x = 0
    let dx = -(baseSegment.curve * basePercent)

    // project + draw road segments (near -> far), clipping by hills
    for (let n = 0; n < this.drawDistance; n++) {
      const segment =
        this.segments[(baseSegment.index + n) % this.segments.length]
      segment.looped = segment.index < baseSegment.index
      segment.fog = Util.exponentialFog(n / this.drawDistance, this.fogDensity)
      segment.clip = maxy

      const camZbase =
        this.position - (segment.looped ? this.trackLength : 0)
      this.project(
        segment.p1,
        this.playerX * this.roadWidth - x,
        playerY + this.cameraHeight,
        camZbase,
      )
      this.project(
        segment.p2,
        this.playerX * this.roadWidth - x - dx,
        playerY + this.cameraHeight,
        camZbase,
      )

      x += dx
      dx += segment.curve

      if (
        segment.p1.camera.z <= this.cameraDepth ||
        segment.p2.screen.y >= segment.p1.screen.y ||
        segment.p2.screen.y >= maxy
      )
        continue

      this.renderSegment(segment)
      maxy = segment.p2.screen.y
    }

    // draw sprites + traffic (far -> near) for correct overlap
    for (let n = this.drawDistance - 1; n > 0; n--) {
      const segment =
        this.segments[(baseSegment.index + n) % this.segments.length]

      for (const car of segment.cars) {
        const scale = Util.interpolate(
          segment.p1.screen.scale,
          segment.p2.screen.scale,
          car.percent,
        )
        const carX = Util.interpolate(
          segment.p1.screen.x,
          segment.p2.screen.x,
          car.percent,
        )
        const carY = Util.interpolate(
          segment.p1.screen.y,
          segment.p2.screen.y,
          car.percent,
        )
        this.renderSpriteScaled(
          scale,
          carX + scale * car.offset * this.roadWidth * (this.width / 2),
          carY,
          1200,
          segment.clip,
          segment.fog,
          (cx, by, w) =>
            drawCarSprite(ctx, cx, by, w, car.color, car.shade),
        )
      }

      for (const sprite of segment.sprites) {
        const worldW =
          sprite.type === 'tree'
            ? 1900
            : sprite.type === 'palm'
              ? 1500
              : sprite.type === 'sign'
                ? 1500
                : sprite.type === 'rock'
                  ? 1100
                  : 1000
        this.renderSpriteScaled(
          segment.p1.screen.scale,
          segment.p1.screen.x +
            segment.p1.screen.scale *
              sprite.offset *
              this.roadWidth *
              (this.width / 2),
          segment.p1.screen.y,
          worldW,
          segment.clip,
          segment.fog,
          (cx, by, w) => drawScenery(ctx, sprite.type, cx, by, w),
        )
      }
    }

    // the player's car
    this.renderPlayer(playerSegment, playerPercent)

    ctx.restore()
  }

  private renderSpriteScaled(
    scale: number,
    screenX: number,
    screenY: number,
    worldW: number,
    clip: number,
    fog: number,
    draw: (cx: number, baseY: number, w: number) => void,
  ) {
    const ctx = this.ctx
    const destW = worldW * scale * (this.width / 2)
    if (destW < 4) return
    ctx.save()
    // clip to hide the part occluded by nearer hills
    ctx.beginPath()
    ctx.rect(0, 0, this.width, clip)
    ctx.clip()
    ctx.globalAlpha = fog
    draw(screenX, screenY, destW)
    ctx.restore()
  }

  private polygon(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number,
    x4: number,
    y4: number,
    color: string,
  ) {
    const ctx = this.ctx
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.lineTo(x3, y3)
    ctx.lineTo(x4, y4)
    ctx.closePath()
    ctx.fill()
  }

  private renderSegment(segment: Segment) {
    const ctx = this.ctx
    const { p1, p2, color } = segment
    const x1 = p1.screen.x
    const y1 = p1.screen.y
    const w1 = p1.screen.w
    const x2 = p2.screen.x
    const y2 = p2.screen.y
    const w2 = p2.screen.w

    const r1 = w1 / Math.max(6, 2 * this.lanes)
    const r2 = w2 / Math.max(6, 2 * this.lanes)
    const l1 = w1 / Math.max(32, 8 * this.lanes)
    const l2 = w2 / Math.max(32, 8 * this.lanes)

    // grass band
    ctx.fillStyle = color.grass
    ctx.fillRect(0, y2, this.width, y1 - y2)

    // rumble strips
    this.polygon(x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, color.rumble)
    this.polygon(x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, color.rumble)

    // road
    this.polygon(x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, color.road)

    // lane dividers
    if (color.lane) {
      const lanew1 = (w1 * 2) / this.lanes
      const lanew2 = (w2 * 2) / this.lanes
      let lanex1 = x1 - w1 + lanew1
      let lanex2 = x2 - w2 + lanew2
      for (let lane = 1; lane < this.lanes; lane++) {
        this.polygon(
          lanex1 - l1 / 2,
          y1,
          lanex1 + l1 / 2,
          y1,
          lanex2 + l2 / 2,
          y2,
          lanex2 - l2 / 2,
          y2,
          color.lane,
        )
        lanex1 += lanew1
        lanex2 += lanew2
      }
    }

    // start / finish checker
    if (segment.startLine) {
      this.drawCheckerLine(x1, y1, w1, x2, y2, w2)
    }

    // fog overlay
    if (segment.fog < 1) {
      ctx.globalAlpha = 1 - segment.fog
      ctx.fillStyle = COLORS.FOG
      ctx.fillRect(0, y2, this.width, y1 - y2)
      ctx.globalAlpha = 1
    }
  }

  private drawCheckerLine(
    x1: number,
    y1: number,
    w1: number,
    _x2: number,
    _y2: number,
    _w2: number,
  ) {
    const ctx = this.ctx
    const cells = 12
    ctx.save()
    for (let i = 0; i < cells; i++) {
      const t1 = i / cells
      const t2 = (i + 1) / cells
      const ax = x1 - w1 + w1 * 2 * t1
      const bx = x1 - w1 + w1 * 2 * t2
      ctx.fillStyle = i % 2 === 0 ? '#0d0f14' : '#f4f6fb'
      ctx.fillRect(ax, y1 - Math.max(2, (y1 - _y2) * 0.9), bx - ax, Math.max(3, y1 - _y2))
    }
    ctx.restore()
  }

  private renderPlayer(playerSegment: Segment, playerPercent: number) {
    const ctx = this.ctx
    const speedPercent = this.speed / this.maxSpeed
    const updown = Util.interpolate(
      playerSegment.p1.world.y,
      playerSegment.p2.world.y,
      playerPercent,
    ) < playerSegment.p1.world.y
      ? -1
      : (playerSegment.p2.world.y - playerSegment.p1.world.y) / this.segmentLength

    const w = Util.limit(this.width * 0.34, 190, 470)
    const bob =
      Math.sin(this.totalTime * 26) * speedPercent * 2 +
      (Math.random() * 2 - 1) * speedPercent * 1.5
    const baseY = this.height - this.height * 0.06 + bob
    const steerLean = this.steer + (this.playerX * 0.0)

    // skid marks / dust when skidding
    if (this.skidding && this.phase === 'playing') {
      ctx.save()
      ctx.globalAlpha = 0.35
      ctx.fillStyle = '#dfe6f2'
      for (let i = 0; i < 5; i++) {
        const px = this.width / 2 + (Math.random() * 2 - 1) * w * 0.6
        const py = baseY - Math.random() * 20
        ctx.beginPath()
        ctx.arc(px, py, 4 + Math.random() * 6, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.restore()
    }

    drawPlayerCar(ctx, this.width / 2, baseY, w, steerLean, updown)
  }

  private drawBackground(playerY: number) {
    const ctx = this.ctx
    const w = this.width
    const h = this.height
    const horizon = h * 0.5 + (playerY / this.cameraHeight) * 0

    // sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, h * 0.62)
    sky.addColorStop(0, '#123a86')
    sky.addColorStop(0.5, '#3f7fe0')
    sky.addColorStop(1, '#bfe3ff')
    ctx.fillStyle = sky
    ctx.fillRect(0, 0, w, h)

    // sun
    const sunX = w * 0.72
    const sunY = h * 0.24
    const sunGrad = ctx.createRadialGradient(
      sunX,
      sunY,
      0,
      sunX,
      sunY,
      h * 0.4,
    )
    sunGrad.addColorStop(0, 'rgba(255,247,214,0.95)')
    sunGrad.addColorStop(0.2, 'rgba(255,230,150,0.55)')
    sunGrad.addColorStop(1, 'rgba(255,230,150,0)')
    ctx.fillStyle = sunGrad
    ctx.beginPath()
    ctx.arc(sunX, sunY, h * 0.4, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,250,235,0.95)'
    ctx.beginPath()
    ctx.arc(sunX, sunY, h * 0.07, 0, Math.PI * 2)
    ctx.fill()

    // parallax mountains: two layers
    const off = this.bgOffset
    this.drawMountains(horizon, h * 0.22, '#7c93c9', off * 0.15, 1.3)
    this.drawMountains(horizon, h * 0.3, '#4c649e', off * 0.35, 0.9)
  }

  private drawMountains(
    baseline: number,
    amp: number,
    color: string,
    offset: number,
    freq: number,
  ) {
    const ctx = this.ctx
    const w = this.width
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.moveTo(0, baseline)
    const step = 12
    for (let x = 0; x <= w; x += step) {
      const t = (x / w) * Math.PI * 2
      const p = t * (3 * freq) + offset * 0.02
      const y =
        baseline -
        (Math.sin(p) * 0.5 + Math.sin(p * 2.3 + 1.7) * 0.3 + Math.sin(p * 0.7) * 0.2) *
          amp -
        amp * 0.4
      ctx.lineTo(x, y)
    }
    ctx.lineTo(w, baseline + amp)
    ctx.lineTo(0, baseline + amp)
    ctx.closePath()
    ctx.fill()
  }

  // ---------- HUD ----------
  getHud(): HudState {
    const speedPct = this.speed / this.maxSpeed
    return {
      phase: this.phase,
      speed: Math.round(speedPct * 320),
      speedPct,
      gear: Util.limit(1 + Math.floor(speedPct * 5.999), 1, 6),
      lap: Util.limit(this.lap + 1, 1, this.totalLaps),
      totalLaps: this.totalLaps,
      lapTime: this.lapTime,
      lastLapTime: this.lastLapTime,
      bestLapTime: this.bestLapTime,
      totalTime: this.totalTime,
      countdown: Math.max(0, Math.ceil(this.countdown)),
      offRoad: this.playerX < -1 || this.playerX > 1,
      finishTime: this.finishTime,
    }
  }
}
