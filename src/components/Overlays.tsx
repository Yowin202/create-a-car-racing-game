import type { Difficulty, HudState } from '../game/types'
import { formatLap, formatTime } from '../utils/format'

type Props = {
  hud: HudState
  difficulty: Difficulty
  onStart: () => void
  onResume: () => void
  onRestart: () => void
  onMenu: () => void
  onSetDifficulty: (d: Difficulty) => void
}

const DIFFS: { id: Difficulty; label: string; desc: string }[] = [
  { id: 'easy', label: 'Rookie', desc: 'Light traffic' },
  { id: 'normal', label: 'Pro', desc: 'Busy roads' },
  { id: 'hard', label: 'Ace', desc: 'Rush hour' },
]

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md animate-slide-up rounded-3xl border border-sky-400/20 bg-gradient-to-b from-slate-900/95 to-slate-950/95 p-6 shadow-2xl shadow-sky-900/40 sm:p-8">
        {children}
      </div>
    </div>
  )
}

function PrimaryButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-sky-500 to-indigo-500 px-6 py-3.5 font-display text-lg font-bold tracking-wide text-white shadow-lg shadow-sky-500/30 transition hover:from-sky-400 hover:to-indigo-400 active:scale-[0.98]"
    >
      <span className="relative z-10">{children}</span>
      <span className="absolute inset-0 -translate-x-full bg-white/20 transition-transform duration-500 group-hover:translate-x-full" />
    </button>
  )
}

function GhostButton({
  children,
  onClick,
}: {
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-xl border border-sky-400/25 bg-slate-800/40 px-6 py-3 font-semibold text-sky-100 transition hover:bg-slate-700/50 active:scale-[0.98]"
    >
      {children}
    </button>
  )
}

function Logo() {
  return (
    <div className="mb-1 text-center">
      <h1 className="font-display text-4xl font-black tracking-tight sm:text-5xl">
        <span className="bg-gradient-to-r from-sky-300 via-indigo-300 to-fuchsia-300 bg-clip-text text-transparent">
          APEX
        </span>{' '}
        <span className="bg-gradient-to-r from-amber-300 to-rose-400 bg-clip-text text-transparent">
          RUSH
        </span>
      </h1>
      <p className="mt-1 text-xs tracking-[0.35em] text-sky-300/70">
        ARCADE STREET RACER
      </p>
    </div>
  )
}

function DifficultyPicker({
  difficulty,
  onSetDifficulty,
}: {
  difficulty: Difficulty
  onSetDifficulty: (d: Difficulty) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {DIFFS.map((d) => {
        const active = d.id === difficulty
        return (
          <button
            key={d.id}
            onClick={() => onSetDifficulty(d.id)}
            className={`rounded-xl border px-2 py-3 text-center transition ${
              active
                ? 'border-sky-400 bg-sky-500/20 shadow-inner'
                : 'border-white/10 bg-slate-800/40 hover:border-sky-400/40'
            }`}
          >
            <div
              className={`font-display text-base font-bold ${
                active ? 'text-sky-200' : 'text-slate-200'
              }`}
            >
              {d.label}
            </div>
            <div className="text-[10px] text-slate-400">{d.desc}</div>
          </button>
        )
      })}
    </div>
  )
}

export default function Overlays({
  hud,
  difficulty,
  onStart,
  onResume,
  onRestart,
  onMenu,
  onSetDifficulty,
}: Props) {
  // ---- Countdown ----
  if (hud.phase === 'countdown') {
    const n = hud.countdown
    return (
      <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
        <div
          key={n}
          className="animate-pop-in font-display text-8xl font-black text-white drop-shadow-[0_4px_20px_rgba(56,180,255,0.7)] sm:text-9xl"
        >
          {n > 0 ? n : 'GO!'}
        </div>
      </div>
    )
  }

  // ---- Menu ----
  if (hud.phase === 'menu') {
    return (
      <Panel>
        <Logo />
        <div className="mt-6 space-y-4">
          <div>
            <div className="mb-2 text-[10px] font-semibold tracking-[0.25em] text-sky-300/70">
              DIFFICULTY
            </div>
            <DifficultyPicker
              difficulty={difficulty}
              onSetDifficulty={onSetDifficulty}
            />
          </div>
          <PrimaryButton onClick={onStart}>START RACE</PrimaryButton>
          <div className="rounded-xl border border-white/10 bg-slate-800/30 p-3 text-center text-xs text-slate-300">
            <div className="mb-2 font-semibold tracking-widest text-sky-300/80">
              CONTROLS
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
              <span>
                <Kbd>↑</Kbd>/<Kbd>W</Kbd> Gas
              </span>
              <span>
                <Kbd>↓</Kbd>/<Kbd>S</Kbd> Brake
              </span>
              <span>
                <Kbd>←</Kbd>
                <Kbd>→</Kbd> Steer
              </span>
              <span>
                <Kbd>P</Kbd> Pause
              </span>
            </div>
            <div className="mt-2 text-slate-400">
              On mobile, use the on-screen pedals & arrows.
            </div>
          </div>
          {hud.bestLapTime > 0 && (
            <div className="text-center text-sm text-amber-300">
              Best lap:{' '}
              <span className="font-display font-bold tabular-nums">
                {formatLap(hud.bestLapTime)}
              </span>
            </div>
          )}
        </div>
      </Panel>
    )
  }

  // ---- Paused ----
  if (hud.phase === 'paused') {
    return (
      <Panel>
        <h2 className="text-center font-display text-3xl font-black text-sky-100">
          PAUSED
        </h2>
        <div className="mt-6 space-y-3">
          <PrimaryButton onClick={onResume}>RESUME</PrimaryButton>
          <GhostButton onClick={onRestart}>RESTART RACE</GhostButton>
          <GhostButton onClick={onMenu}>MAIN MENU</GhostButton>
        </div>
      </Panel>
    )
  }

  // ---- Finished ----
  if (hud.phase === 'finished') {
    return (
      <Panel>
        <div className="text-center">
          <div className="text-5xl">🏁</div>
          <h2 className="mt-2 font-display text-3xl font-black text-sky-100">
            RACE COMPLETE
          </h2>
        </div>
        <div className="mt-6 space-y-3">
          <ResultRow label="Total time" value={formatTime(hud.finishTime)} big />
          <ResultRow label="Best lap" value={formatLap(hud.bestLapTime)} accent />
          <ResultRow label="Laps" value={`${hud.totalLaps}`} />
        </div>
        <div className="mt-6 space-y-3">
          <PrimaryButton onClick={onRestart}>RACE AGAIN</PrimaryButton>
          <GhostButton onClick={onMenu}>MAIN MENU</GhostButton>
        </div>
      </Panel>
    )
  }

  return null
}

function ResultRow({
  label,
  value,
  big,
  accent,
}: {
  label: string
  value: string
  big?: boolean
  accent?: boolean
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-800/40 px-4 py-3">
      <span className="text-sm text-slate-300">{label}</span>
      <span
        className={`font-display font-bold tabular-nums ${
          big ? 'text-2xl' : 'text-xl'
        } ${accent ? 'text-amber-300' : 'text-sky-100'}`}
      >
        {value}
      </span>
    </div>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="mx-0.5 inline-flex min-w-[1.4rem] items-center justify-center rounded border border-white/20 bg-slate-900/80 px-1.5 py-0.5 font-mono text-[11px] text-sky-100">
      {children}
    </kbd>
  )
}
