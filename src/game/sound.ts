// Lightweight Web Audio engine — all sounds synthesized, no external assets.

export class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private engineOsc: OscillatorNode | null = null
  private engineOsc2: OscillatorNode | null = null
  private engineGain: GainNode | null = null
  private engineFilter: BiquadFilterNode | null = null
  private skidNode: AudioBufferSourceNode | null = null
  private skidGain: GainNode | null = null
  private noiseBuffer: AudioBuffer | null = null
  enabled = true
  private started = false

  private ensure() {
    if (this.ctx) return
    const AC: typeof AudioContext =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext
    this.ctx = new AC()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.enabled ? 0.9 : 0
    this.master.connect(this.ctx.destination)

    // Pre-render a short white-noise buffer for skids / crashes.
    const len = this.ctx.sampleRate * 1.2
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    this.noiseBuffer = buf
  }

  resume() {
    this.ensure()
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume()
  }

  setEnabled(on: boolean) {
    this.enabled = on
    if (this.master && this.ctx)
      this.master.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.02)
  }

  startEngine() {
    this.ensure()
    if (!this.ctx || !this.master || this.started) return
    this.started = true

    this.engineGain = this.ctx.createGain()
    this.engineGain.gain.value = 0.0

    this.engineFilter = this.ctx.createBiquadFilter()
    this.engineFilter.type = 'lowpass'
    this.engineFilter.frequency.value = 800

    this.engineOsc = this.ctx.createOscillator()
    this.engineOsc.type = 'sawtooth'
    this.engineOsc.frequency.value = 60

    this.engineOsc2 = this.ctx.createOscillator()
    this.engineOsc2.type = 'square'
    this.engineOsc2.frequency.value = 90

    this.engineOsc.connect(this.engineFilter)
    this.engineOsc2.connect(this.engineFilter)
    this.engineFilter.connect(this.engineGain)
    this.engineGain.connect(this.master)
    this.engineOsc.start()
    this.engineOsc2.start()
  }

  stopEngine() {
    if (!this.started) return
    try {
      this.engineOsc?.stop()
      this.engineOsc2?.stop()
    } catch {
      /* noop */
    }
    this.engineOsc = null
    this.engineOsc2 = null
    this.engineGain = null
    this.started = false
    this.stopSkid()
  }

  // speed 0..1, throttle boolean
  updateEngine(speedPct: number, throttle: boolean) {
    if (!this.ctx || !this.engineOsc || !this.engineOsc2 || !this.engineGain)
      return
    const t = this.ctx.currentTime
    const base = 55 + speedPct * 240
    this.engineOsc.frequency.setTargetAtTime(base, t, 0.05)
    this.engineOsc2.frequency.setTargetAtTime(base * 1.5, t, 0.05)
    if (this.engineFilter)
      this.engineFilter.frequency.setTargetAtTime(
        500 + speedPct * 2600,
        t,
        0.05,
      )
    const target = 0.06 + speedPct * 0.12 + (throttle ? 0.05 : 0)
    this.engineGain.gain.setTargetAtTime(target, t, 0.08)
  }

  startSkid() {
    this.ensure()
    if (!this.ctx || !this.master || !this.noiseBuffer || this.skidNode) return
    this.skidGain = this.ctx.createGain()
    this.skidGain.gain.value = 0.0
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'bandpass'
    filter.frequency.value = 1600
    filter.Q.value = 0.8
    this.skidNode = this.ctx.createBufferSource()
    this.skidNode.buffer = this.noiseBuffer
    this.skidNode.loop = true
    this.skidNode.connect(filter)
    filter.connect(this.skidGain)
    this.skidGain.connect(this.master)
    this.skidNode.start()
    this.skidGain.gain.setTargetAtTime(0.22, this.ctx.currentTime, 0.03)
  }

  stopSkid() {
    if (!this.ctx || !this.skidNode || !this.skidGain) return
    this.skidGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05)
    const node = this.skidNode
    window.setTimeout(() => {
      try {
        node.stop()
      } catch {
        /* noop */
      }
    }, 120)
    this.skidNode = null
    this.skidGain = null
  }

  crash() {
    this.ensure()
    if (!this.ctx || !this.master || !this.noiseBuffer) return
    const t = this.ctx.currentTime
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.5, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
    const filter = this.ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.setValueAtTime(1200, t)
    filter.frequency.exponentialRampToValueAtTime(120, t + 0.4)
    const src = this.ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    src.connect(filter)
    filter.connect(g)
    g.connect(this.master)
    src.start(t)
    src.stop(t + 0.45)
  }

  beep(freq: number, dur = 0.15, type: OscillatorType = 'square', vol = 0.3) {
    this.ensure()
    if (!this.ctx || !this.master) return
    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.001, t + dur)
    osc.connect(g)
    g.connect(this.master)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }
}
