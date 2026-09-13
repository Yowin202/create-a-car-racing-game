import type { InputState } from '../game/types'

type Props = {
  setInput: (key: keyof InputState, value: boolean) => void
}

function HoldButton({
  onDown,
  onUp,
  className,
  children,
  label,
}: {
  onDown: () => void
  onUp: () => void
  className?: string
  children: React.ReactNode
  label: string
}) {
  const press = (e: React.PointerEvent) => {
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    onDown()
  }
  const release = (e: React.PointerEvent) => {
    e.preventDefault()
    onUp()
  }
  return (
    <button
      aria-label={label}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerLeave={release}
      onContextMenu={(e) => e.preventDefault()}
      className={`pointer-events-auto flex select-none items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white backdrop-blur-md transition active:scale-95 active:bg-white/25 ${className ?? ''}`}
    >
      {children}
    </button>
  )
}

const ArrowIcon = ({ dir }: { dir: 'left' | 'right' | 'up' | 'down' }) => {
  const rot = { up: 0, right: 90, down: 180, left: 270 }[dir]
  return (
    <svg
      width="34"
      height="34"
      viewBox="0 0 24 24"
      fill="currentColor"
      style={{ transform: `rotate(${rot}deg)` }}
    >
      <path d="M12 4l7 8h-4v8h-6v-8H5z" />
    </svg>
  )
}

export default function TouchControls({ setInput }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 md:hidden">
      {/* steering — bottom right */}
      <div className="absolute bottom-4 right-4 flex gap-3">
        <HoldButton
          label="Steer left"
          onDown={() => setInput('left', true)}
          onUp={() => setInput('left', false)}
          className="h-16 w-16"
        >
          <ArrowIcon dir="left" />
        </HoldButton>
        <HoldButton
          label="Steer right"
          onDown={() => setInput('right', true)}
          onUp={() => setInput('right', false)}
          className="h-16 w-16"
        >
          <ArrowIcon dir="right" />
        </HoldButton>
      </div>

      {/* pedals — bottom center-right, above steering isn't ideal; place accel/brake on the right stacked-left */}
      <div className="absolute bottom-4 left-4 flex flex-col items-center gap-3">
        <HoldButton
          label="Accelerate"
          onDown={() => setInput('accel', true)}
          onUp={() => setInput('accel', false)}
          className="h-20 w-20 bg-emerald-400/20 border-emerald-300/30"
        >
          <ArrowIcon dir="up" />
        </HoldButton>
        <HoldButton
          label="Brake"
          onDown={() => setInput('brake', true)}
          onUp={() => setInput('brake', false)}
          className="h-14 w-20 bg-rose-400/20 border-rose-300/30"
        >
          <ArrowIcon dir="down" />
        </HoldButton>
      </div>
    </div>
  )
}
