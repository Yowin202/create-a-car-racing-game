export function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '--:--.--'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  const cs = Math.floor((seconds * 100) % 100)
  const pad = (n: number, l = 2) => String(n).padStart(l, '0')
  return `${pad(m)}:${pad(s)}.${pad(cs)}`
}

export function formatLap(seconds: number): string {
  if (!seconds || seconds <= 0) return '--.--'
  const s = Math.floor(seconds % 60)
  const cs = Math.floor((seconds * 100) % 100)
  const pad = (n: number, l = 2) => String(n).padStart(l, '0')
  const m = Math.floor(seconds / 60)
  if (m > 0) return `${m}:${pad(s)}.${pad(cs)}`
  return `${pad(s)}.${pad(cs)}`
}
