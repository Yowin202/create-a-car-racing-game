import type { HudState } from '../game/types'
import { formatLap, formatTime } from '../utils/format'

type Props = {
  hud: HudState
  soundOn: boolean
  onToggleSound: () => void
  onPause: () => void
  lastLapFlash: { time: number; best: boolean; id: number } | null
}

function Speedo({ hud }: { hud: HudState }) {
  const size = 116
  const r = 48
  const cx = size / 2
  const cy = size / 2
  // gauge sweeps 270deg from -225deg to +45deg
  const startAngle = 135
  const sweep = 270
  const pct = Math.min(1, hud.speedPct)
  const angle = startAngle + sweep * pct
  const rad = (angle * Math.PI) / 180
  const nx = cx + Math.cos(rad) * (r - 6)
  const ny = cy + Math.sin(rad) * (r - 6)

  const ticks = []
  for (let i = 0; i <= 10; i++) {
    const a = ((startAngle + (sweep * i) / 10) * Math.PI) / 180
    const x1 = cx + Math.cos(a) * r
    const y1 = cy + Math.sin(a) * r
    const x2 = cx + Math.cos(a) * (r - (i % 5 === 0 ? 10 : 6))
    const y2 = cy + Math.sin(a) * (r - (i % 5 === 0 ? 10 : 6))
    ticks.push(
      <line
        key={i}
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={i >= 8 ? '#ff5a5a' : 'rgba(200,220,255,0.7)'}
        strokeWidth={i % 5 === 0 ? 2.4 : 1.4}
      />,
    )
  }

  return (
    <div className="relative">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <radialGradient id="dialbg" cx="50%" cy="45%" r="60%">
            <stop offset="0%" stopColor="rgba(20,40,80,0.95)" />
            <stop offset="100%" stopColor="rgba(4,10,24,0.95)" />
          </radialGradient>
        </defs>
        <circle
          cx={cx}
          cy={cy}
          r={r + 8}
          fill="url(#dialbg)"
          stroke="rgba(120,170,255,0.35)"
          strokeWidth={1.5}
        />
        {/* arc track */}
        <path
          d={describeArc(cx, cy, r - 1, startAngle, startAngle + sweep)}
          fill="none"
          stroke="rgba(120,170,255,0.18)"
          strokeWidth={4}
          strokeLinecap="round"
        />
        <path
          d={describeArc(cx, cy, r - 1, startAngle, angle)}
          fill="none"
          stroke={hud.offRoad ? '#ffb020' : '#39d4ff'}
          strokeWidth={4}
          strokeLinecap="round"
        />
        {ticks}
        <line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke="#ff4d4d"
          strokeWidth={3}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={5} fill="#ff4d4d" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-end pb-3 pointer-events-none">
        <div className="font-display text-2xl font-black leading-none tabular-nums">
          {hud.speed}
        </div>
        <div className="text-[9px] tracking-[0.2em] text-sky-300/80">KM/H</div>
      </div>
    </div>
  )
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const a = (angleDeg * Math.PI) / 180
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return [
    'M',
    start.x,
    start.y,
    'A',
    r,
    r,
    0,
    largeArcFlag,
    0,
    end.x,
    end.y,
  ].join(' ')
}

export default function Hud({
  hud,
  soundOn,
  onToggleSound,
  onPause,
  lastLapFlash,
}: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      {/* top bar */}
      <div className="absolute left-0 right-0 top-0 flex items-start justify-between p-3 sm:p-5">
        <div className="flex gap-2 sm:gap-3">
          <StatCard label="LAP">
            <span className="tabular-nums">
              {hud.lap}
              <span className="text-sky-300/70 text-sm">/{hud.totalLaps}</span>
            </span>
          </StatCard>
          <StatCard label="TIME">
            <span className="tabular-nums text-xl sm:text-2xl">
              {formatTime(hud.totalTime)}
            </span>
          </StatCard>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <StatCard label="LAP TIME" align="right">
            <span className="tabular-nums text-xl sm:text-2xl">
              {formatLap(hud.lapTime)}
            </span>
          </StatCard>
          <StatCard label="BEST" align="right">
            <span className="tabular-nums text-lg sm:text-xl text-amber-300">
              {formatLap(hud.bestLapTime)}
            </span>
          </StatCard>
          <div className="flex flex-col gap-2 pointer-events-auto">
            <IconButton onClick={onPause} title="Pause (P)">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            </IconButton>
            <IconButton onClick={onToggleSound} title="Toggle sound">
              {soundOn ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 9v6h4l5 5V4L8 9H4z" />
                  <path
                    d="M16 8c1.5 1 1.5 7 0 8"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4 9v6h4l5 5V4L8 9H4z" />
                  <path
                    d="M16 9l5 6M21 9l-5 6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </IconButton>
          </div>
        </div>
      </div>

      {/* bottom-left speedo + gear */}
      <div className="absolute bottom-3 left-3 sm:bottom-6 sm:left-6 flex items-end gap-3">
        <Speedo hud={hud} />
        <div className="mb-1 flex flex-col items-center rounded-xl border border-sky-400/25 bg-slate-900/60 px-3 py-2 backdrop-blur">
          <div className="text-[9px] tracking-[0.2em] text-sky-300/70">GEAR</div>
          <div className="font-display text-3xl font-black leading-none text-sky-100">
            {hud.gear}
          </div>
        </div>
      </div>

      {/* off-road warning */}
      {hud.offRoad && hud.phase === 'playing' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-pulse-fast rounded-full border border-amber-400/50 bg-amber-500/15 px-4 py-1.5 text-xs font-bold tracking-widest text-amber-300">
          OFF TRACK — SLOW DOWN
        </div>
      )}

      {/* lap flash */}
      {lastLapFlash && (
        <LapFlash key={lastLapFlash.id} flash={lastLapFlash} />
      )}
    </div>
  )
}

function LapFlash({
  flash,
}: {
  flash: { time: number; best: boolean; id: number }
}) {
  return (
    <div className="absolute left-1/2 top-24 -translate-x-1/2 animate-pop-in">
      <div
        className={`rounded-xl border px-5 py-2 text-center backdrop-blur ${
          flash.best
            ? 'border-amber-300/60 bg-amber-500/20 text-amber-200'
            : 'border-sky-300/50 bg-sky-500/15 text-sky-100'
        }`}
      >
        <div className="text-[10px] tracking-[0.25em] opacity-80">
          {flash.best ? 'NEW BEST LAP' : 'LAP COMPLETE'}
        </div>
        <div className="font-display text-2xl font-black tabular-nums">
          {formatLap(flash.time)}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label,
  children,
  align = 'left',
}: {
  label: string
  children: React.ReactNode
  align?: 'left' | 'right'
}) {
  return (
    <div
      className={`rounded-xl border border-sky-400/20 bg-slate-900/55 px-3 py-1.5 backdrop-blur ${
        align === 'right' ? 'text-right' : ''
      }`}
    >
      <div className="text-[9px] font-semibold tracking-[0.2em] text-sky-300/70">
        {label}
      </div>
      <div className="font-display text-2xl font-bold leading-tight text-sky-50">
        {children}
      </div>
    </div>
  )
}

function IconButton({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode
  onClick: () => void
  title: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-sky-400/25 bg-slate-900/60 text-sky-100 backdrop-blur transition hover:bg-slate-800/80 active:scale-95"
    >
      {children}
    </button>
  )
}
