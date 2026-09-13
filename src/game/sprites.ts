// All game art is drawn procedurally with canvas primitives — zero external assets.

type Ctx = CanvasRenderingContext2D

function roundRect(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2)
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

// A shaded car body seen from behind. Base is centered at (cx, baseY).
export function drawCarSprite(
  ctx: Ctx,
  cx: number,
  baseY: number,
  w: number,
  color: string,
  shade = '#000',
) {
  const h = w * 0.62
  const x = cx - w / 2
  const y = baseY - h

  // shadow
  ctx.save()
  ctx.globalAlpha = 0.28
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.ellipse(cx, baseY, w * 0.5, h * 0.14, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // lower body
  ctx.fillStyle = shade
  roundRect(ctx, x + w * 0.06, y + h * 0.5, w * 0.88, h * 0.42, w * 0.08)
  ctx.fill()

  // main body
  ctx.fillStyle = color
  roundRect(ctx, x + w * 0.02, y + h * 0.28, w * 0.96, h * 0.42, w * 0.09)
  ctx.fill()

  // roof / cabin
  ctx.fillStyle = color
  roundRect(ctx, x + w * 0.2, y + h * 0.02, w * 0.6, h * 0.42, w * 0.1)
  ctx.fill()

  // rear window
  ctx.fillStyle = 'rgba(15,25,45,0.85)'
  roundRect(ctx, x + w * 0.26, y + h * 0.08, w * 0.48, h * 0.28, w * 0.06)
  ctx.fill()

  // spoiler
  ctx.fillStyle = shade
  ctx.fillRect(x + w * 0.08, y + h * 0.46, w * 0.84, h * 0.06)

  // tail lights
  ctx.fillStyle = '#ff3b3b'
  roundRect(ctx, x + w * 0.1, y + h * 0.6, w * 0.16, h * 0.12, w * 0.03)
  ctx.fill()
  roundRect(ctx, x + w * 0.74, y + h * 0.6, w * 0.16, h * 0.12, w * 0.03)
  ctx.fill()

  // wheels
  ctx.fillStyle = '#111318'
  ctx.fillRect(x - w * 0.02, y + h * 0.62, w * 0.1, h * 0.3)
  ctx.fillRect(x + w * 0.92, y + h * 0.62, w * 0.1, h * 0.3)
}

// The player's car seen from behind, with lean based on steering.
export function drawPlayerCar(
  ctx: Ctx,
  cx: number,
  baseY: number,
  w: number,
  steer: number, // -1..1
  updown: number, // slope, affects pitch subtly
  color = '#e93c2f',
) {
  const h = w * 0.6
  const lean = steer * w * 0.05
  const x = cx - w / 2 + lean
  const y = baseY - h + Math.abs(updown) * 2

  // ground shadow
  ctx.save()
  ctx.globalAlpha = 0.3
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.ellipse(cx, baseY + h * 0.02, w * 0.52, h * 0.13, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // wheels (rear, visible)
  ctx.fillStyle = '#0c0e12'
  roundRect(ctx, x - w * 0.02, y + h * 0.58, w * 0.16, h * 0.34, w * 0.03)
  ctx.fill()
  roundRect(ctx, x + w * 0.86, y + h * 0.58, w * 0.16, h * 0.34, w * 0.03)
  ctx.fill()
  ctx.fillStyle = '#3a3f4a'
  roundRect(ctx, x + w * 0.0, y + h * 0.66, w * 0.12, h * 0.18, w * 0.02)
  ctx.fill()
  roundRect(ctx, x + w * 0.88, y + h * 0.66, w * 0.12, h * 0.18, w * 0.02)
  ctx.fill()

  // rear diffuser
  ctx.fillStyle = '#1a1d24'
  roundRect(ctx, x + w * 0.08, y + h * 0.7, w * 0.84, h * 0.2, w * 0.05)
  ctx.fill()

  // main body (gradient)
  const g = ctx.createLinearGradient(0, y, 0, y + h)
  g.addColorStop(0, shadeColor(color, 24))
  g.addColorStop(0.55, color)
  g.addColorStop(1, shadeColor(color, -28))
  ctx.fillStyle = g
  roundRect(ctx, x + w * 0.02, y + h * 0.34, w * 0.96, h * 0.44, w * 0.1)
  ctx.fill()

  // cabin
  ctx.fillStyle = shadeColor(color, -8)
  roundRect(ctx, x + w * 0.18, y + h * 0.04, w * 0.64, h * 0.42, w * 0.12)
  ctx.fill()

  // rear window
  const gw = ctx.createLinearGradient(0, y, 0, y + h * 0.4)
  gw.addColorStop(0, 'rgba(120,160,220,0.9)')
  gw.addColorStop(1, 'rgba(20,30,55,0.95)')
  ctx.fillStyle = gw
  roundRect(ctx, x + w * 0.24, y + h * 0.1, w * 0.52, h * 0.26, w * 0.07)
  ctx.fill()

  // wing / spoiler
  ctx.fillStyle = '#15181e'
  ctx.fillRect(x + w * 0.05, y + h * 0.3, w * 0.9, h * 0.06)
  roundRect(ctx, x - w * 0.02, y + h * 0.22, w * 0.12, h * 0.14, w * 0.02)
  ctx.fill()
  roundRect(ctx, x + w * 0.9, y + h * 0.22, w * 0.12, h * 0.14, w * 0.02)
  ctx.fill()

  // tail lights (glow)
  ctx.save()
  ctx.shadowColor = '#ff2b2b'
  ctx.shadowBlur = w * 0.06
  ctx.fillStyle = '#ff3b3b'
  roundRect(ctx, x + w * 0.1, y + h * 0.5, w * 0.22, h * 0.12, w * 0.03)
  ctx.fill()
  roundRect(ctx, x + w * 0.68, y + h * 0.5, w * 0.22, h * 0.12, w * 0.03)
  ctx.fill()
  ctx.restore()

  // brand stripe
  ctx.fillStyle = shadeColor(color, 40)
  ctx.fillRect(x + w * 0.46, y + h * 0.36, w * 0.08, h * 0.4)
}

export type SceneryType = 'tree' | 'palm' | 'bush' | 'sign' | 'rock'

export function sceneryAspect(type: SceneryType): number {
  switch (type) {
    case 'tree':
      return 2.1
    case 'palm':
      return 2.4
    case 'bush':
      return 0.7
    case 'sign':
      return 1.3
    case 'rock':
      return 0.7
  }
}

export function drawScenery(
  ctx: Ctx,
  type: SceneryType,
  cx: number,
  baseY: number,
  w: number,
) {
  const h = w * sceneryAspect(type)
  const y = baseY - h

  // soft shadow at base
  ctx.save()
  ctx.globalAlpha = 0.22
  ctx.fillStyle = '#000'
  ctx.beginPath()
  ctx.ellipse(cx, baseY, w * 0.45, w * 0.12, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  switch (type) {
    case 'tree': {
      ctx.fillStyle = '#5a3a20'
      ctx.fillRect(cx - w * 0.07, y + h * 0.62, w * 0.14, h * 0.38)
      const layers = [
        { c: '#166b34', yy: 0.0, ww: 1.0, hh: 0.42 },
        { c: '#1f8a44', yy: 0.22, ww: 0.86, hh: 0.4 },
        { c: '#28a651', yy: 0.44, ww: 0.66, hh: 0.36 },
      ]
      for (const l of layers) {
        ctx.fillStyle = l.c
        ctx.beginPath()
        ctx.moveTo(cx, y + h * l.yy)
        ctx.lineTo(cx + (w * l.ww) / 2, y + h * (l.yy + l.hh))
        ctx.lineTo(cx - (w * l.ww) / 2, y + h * (l.yy + l.hh))
        ctx.closePath()
        ctx.fill()
      }
      break
    }
    case 'palm': {
      ctx.strokeStyle = '#6b4a2a'
      ctx.lineWidth = Math.max(2, w * 0.09)
      ctx.beginPath()
      ctx.moveTo(cx, baseY)
      ctx.quadraticCurveTo(cx + w * 0.12, y + h * 0.4, cx - w * 0.05, y + h * 0.2)
      ctx.stroke()
      ctx.fillStyle = '#1f9a4d'
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 5) * i - Math.PI * 0.1
        const lx = cx - w * 0.05
        const ly = y + h * 0.2
        ctx.beginPath()
        ctx.moveTo(lx, ly)
        ctx.quadraticCurveTo(
          lx + Math.cos(a) * w * 0.7,
          ly + Math.sin(a) * w * 0.3,
          lx + Math.cos(a) * w * 1.0,
          ly + Math.sin(a) * w * 0.75,
        )
        ctx.lineWidth = Math.max(2, w * 0.14)
        ctx.strokeStyle = '#1f9a4d'
        ctx.stroke()
      }
      break
    }
    case 'bush': {
      ctx.fillStyle = '#1f8a44'
      ctx.beginPath()
      ctx.ellipse(cx, y + h * 0.6, w * 0.5, h * 0.42, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#28a651'
      ctx.beginPath()
      ctx.ellipse(cx - w * 0.16, y + h * 0.5, w * 0.3, h * 0.34, 0, 0, Math.PI * 2)
      ctx.fill()
      break
    }
    case 'sign': {
      ctx.fillStyle = '#3a3f4a'
      ctx.fillRect(cx - w * 0.05, y + h * 0.28, w * 0.1, h * 0.72)
      const g = ctx.createLinearGradient(0, y, 0, y + h * 0.4)
      g.addColorStop(0, '#ffd34d')
      g.addColorStop(1, '#ff9f1c')
      ctx.fillStyle = g
      roundRect(ctx, cx - w * 0.5, y, w, h * 0.36, w * 0.06)
      ctx.fill()
      ctx.fillStyle = '#1a1d24'
      ctx.font = `bold ${Math.floor(h * 0.16)}px Orbitron, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('APEX', cx, y + h * 0.18)
      break
    }
    case 'rock': {
      ctx.fillStyle = '#8a8f99'
      ctx.beginPath()
      ctx.moveTo(cx - w * 0.5, baseY)
      ctx.lineTo(cx - w * 0.28, y + h * 0.2)
      ctx.lineTo(cx + w * 0.05, y)
      ctx.lineTo(cx + w * 0.4, y + h * 0.3)
      ctx.lineTo(cx + w * 0.5, baseY)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#6d727c'
      ctx.beginPath()
      ctx.moveTo(cx + w * 0.05, y)
      ctx.lineTo(cx + w * 0.4, y + h * 0.3)
      ctx.lineTo(cx + w * 0.5, baseY)
      ctx.lineTo(cx + w * 0.1, baseY)
      ctx.closePath()
      ctx.fill()
      break
    }
  }
}

export function shadeColor(hex: string, amt: number): string {
  const c = hex.replace('#', '')
  const num = parseInt(
    c.length === 3
      ? c
          .split('')
          .map((x) => x + x)
          .join('')
      : c,
    16,
  )
  let r = (num >> 16) + amt
  let g = ((num >> 8) & 0xff) + amt
  let b = (num & 0xff) + amt
  r = Math.max(0, Math.min(255, r))
  g = Math.max(0, Math.min(255, g))
  b = Math.max(0, Math.min(255, b))
  return `rgb(${r},${g},${b})`
}
