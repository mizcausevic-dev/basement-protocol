import type { DrumTemplate, NoteEvent } from '@/lib/types'

export type PresetId = 'sub' | 'acid' | 'reese' | 'growl'

interface Preset {
  label: string
  blurb: string
  oscA: OscillatorType
  oscB: OscillatorType
  mixA: number
  mixB: number
  detune: number
  sub: number
  cutoff: number
  q: number
  envAmt: number
  decay: number
  accent: number
  drive: number
  glide: number
  attack: number
  release: number
  sustain: number
}

export const PRESETS: Record<PresetId, Preset> = {
  sub: {
    label: 'Clean Sub', blurb: 'Sine plus a little triangle. Pure weight.',
    oscA: 'sine', oscB: 'triangle', mixA: 0.85, mixB: 0.22, detune: 0, sub: 0,
    cutoff: 900, q: 0.7, envAmt: 300, decay: 0.15, accent: 0.2, drive: 1.6, glide: 0.04,
    attack: 0.004, release: 0.05, sustain: 0.85,
  },
  acid: {
    label: 'Acid Saw', blurb: 'Resonant low-pass, accent drives the envelope.',
    oscA: 'sawtooth', oscB: 'sawtooth', mixA: 0.62, mixB: 0, detune: 0, sub: 0.22,
    cutoff: 260, q: 15, envAmt: 2600, decay: 0.17, accent: 1, drive: 2.6, glide: 0.055,
    attack: 0.002, release: 0.03, sustain: 0.6,
  },
  reese: {
    label: 'Reese', blurb: 'Two detuned saws over a sine sub.',
    oscA: 'sawtooth', oscB: 'sawtooth', mixA: 0.4, mixB: 0.4, detune: 14, sub: 0.55,
    cutoff: 650, q: 2, envAmt: 450, decay: 0.4, accent: 0.3, drive: 2.2, glide: 0.08,
    attack: 0.01, release: 0.12, sustain: 0.9,
  },
  growl: {
    label: 'Growl', blurb: 'Square and saw, heavy drive before the filter.',
    oscA: 'square', oscB: 'sawtooth', mixA: 0.5, mixB: 0.38, detune: 7, sub: 0.45,
    cutoff: 1100, q: 7, envAmt: 1800, decay: 0.12, accent: 0.6, drive: 7, glide: 0.03,
    attack: 0.002, release: 0.05, sustain: 0.7,
  },
}

const DRUMS: Record<DrumTemplate, { kick: number[]; snare: number[]; hat: number[]; snareKind: 'clap' | 'snare' }> = {
  four: { kick: [0, 4, 8, 12], snare: [4, 12], hat: [2, 6, 10, 14], snareKind: 'clap' },
  halftime: { kick: [0, 11], snare: [8], hat: [0, 2, 4, 6, 8, 10, 12, 14], snareKind: 'snare' },
  dnb: { kick: [0, 10], snare: [4, 12], hat: [0, 2, 4, 6, 8, 10, 12, 14], snareKind: 'snare' },
  footwork: { kick: [0, 3, 6, 10, 13], snare: [4, 12], hat: [2, 6, 10, 14], snareKind: 'clap' },
  broken: { kick: [0, 7, 10], snare: [4, 12], hat: [2, 6, 10, 14], snareKind: 'clap' },
}

interface LoopEvent {
  beat: number
  kind: 'note' | 'kick' | 'snare' | 'clap' | 'hat'
  note?: PreparedNote
}

interface PreparedNote {
  freq: number
  velocity: number
  durBeats: number
  legatoIn: boolean
  overlapNext: boolean
  touchNext: boolean
}

export interface LoadedPattern {
  notes: NoteEvent[]
  ppq: number
  loopBeats: number
  bpm: number
  swing: number
  drums: DrumTemplate
}

const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12)

function swingBeat(beat: number, swing: number) {
  if (swing === 50) return beat
  const eighth = 0.5
  const base = Math.floor(beat / eighth) * eighth
  const pos = beat - base
  const knee = 0.25 + ((swing - 50) / 100) * eighth
  const warped = pos <= 0.25 ? (pos * knee) / 0.25 : knee + ((pos - 0.25) * (eighth - knee)) / 0.25
  return base + warped
}

function driveCurve(drive: number) {
  const n = 2048
  const curve = new Float32Array(n)
  const norm = Math.tanh(drive)
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1
    curve[i] = Math.tanh(drive * x) / norm
  }
  return curve
}

export class BassEngine {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private bassBus!: GainNode
  private drumBus!: GainNode
  private analyser!: AnalyserNode
  private noise!: AudioBuffer
  private voice: {
    a: OscillatorNode; b: OscillatorNode; sub: OscillatorNode
    ga: GainNode; gb: GainNode; gsub: GainNode
    shaper: WaveShaperNode; filter: BiquadFilterNode; amp: GainNode
  } | null = null

  private timer: number | null = null
  private events: LoopEvent[] = []
  private cursor = 0
  private loopStart = 0
  private spb = 0.5
  private loopBeats = 4
  private loops: { start: number; spb: number }[] = []
  private pattern: LoadedPattern | null = null
  private pendingBpm: number | null = null

  presetId: PresetId = 'acid'
  drumsOn = true
  glideOnOverlap = true
  velocitySensitive = true
  volume = 0.8
  playing = false
  onStateChange: ((playing: boolean) => void) | null = null

  private ensureContext() {
    if (this.ctx) return this.ctx
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctor({ latencyHint: 'interactive' })
    this.ctx = ctx
    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -10
    comp.ratio.value = 4
    comp.attack.value = 0.003
    comp.release.value = 0.12
    this.master = ctx.createGain()
    this.master.gain.value = this.volume
    this.analyser = ctx.createAnalyser()
    this.analyser.fftSize = 2048
    this.bassBus = ctx.createGain()
    this.drumBus = ctx.createGain()
    this.drumBus.gain.value = 0.55
    this.bassBus.connect(this.master)
    this.drumBus.connect(this.master)
    this.master.connect(comp)
    comp.connect(this.analyser)
    this.analyser.connect(ctx.destination)
    const len = ctx.sampleRate
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = this.noise.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
    return ctx
  }

  getAnalyser() {
    return this.ctx ? this.analyser : null
  }

  private buildVoice() {
    const ctx = this.ctx!
    const a = ctx.createOscillator()
    const b = ctx.createOscillator()
    const sub = ctx.createOscillator()
    sub.type = 'sine'
    const ga = ctx.createGain()
    const gb = ctx.createGain()
    const gsub = ctx.createGain()
    const shaper = ctx.createWaveShaper()
    shaper.oversample = '4x'
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    const amp = ctx.createGain()
    amp.gain.value = 0
    a.connect(ga).connect(shaper)
    b.connect(gb).connect(shaper)
    shaper.connect(filter).connect(amp)
    sub.connect(gsub).connect(amp)
    amp.connect(this.bassBus)
    const t = ctx.currentTime
    for (const o of [a, b, sub]) {
      o.frequency.setValueAtTime(55, t)
      o.start(t)
    }
    this.voice = { a, b, sub, ga, gb, gsub, shaper, filter, amp }
    this.applyPreset()
  }

  private teardownVoice() {
    if (!this.voice || !this.ctx) return
    const v = this.voice
    const t = this.ctx.currentTime
    v.amp.gain.cancelScheduledValues(t)
    v.amp.gain.setTargetAtTime(0, t, 0.01)
    for (const o of [v.a, v.b, v.sub]) o.stop(t + 0.08)
    setTimeout(() => v.amp.disconnect(), 200)
    this.voice = null
  }

  applyPreset() {
    if (!this.voice) return
    const p = PRESETS[this.presetId]
    const v = this.voice
    v.a.type = p.oscA
    v.b.type = p.oscB
    v.a.detune.value = -p.detune
    v.b.detune.value = p.detune
    v.ga.gain.value = p.mixA
    v.gb.gain.value = p.mixB
    v.gsub.gain.value = p.sub
    v.shaper.curve = driveCurve(p.drive)
    v.filter.Q.value = p.q
    v.filter.frequency.value = p.cutoff
  }

  setPreset(id: PresetId) {
    this.presetId = id
    this.applyPreset()
  }

  setVolume(v: number) {
    this.volume = v
    if (this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02)
  }

  setBpm(bpm: number) {
    if (!this.pattern) return
    this.pattern = { ...this.pattern, bpm }
    if (this.playing) this.pendingBpm = bpm
  }

  private prepare(p: LoadedPattern): LoopEvent[] {
    const loopTicks = p.loopBeats * p.ppq
    const notes = [...p.notes].sort((a, b) => a.ticks - b.ticks)
    const out: LoopEvent[] = []
    notes.forEach((n, i) => {
      const prev = notes[i - 1]
      const next = notes[i + 1]
      const end = n.ticks + n.durationTicks
      const wrapTouch = !next && end === loopTicks && notes[0]?.ticks === 0
      out.push({
        beat: n.ticks / p.ppq,
        kind: 'note',
        note: {
          freq: mtof(n.midi),
          velocity: n.velocity,
          durBeats: n.durationTicks / p.ppq,
          legatoIn: !!prev && prev.ticks + prev.durationTicks > n.ticks,
          overlapNext: !!next && end > next.ticks,
          touchNext: (!!next && end === next.ticks) || wrapTouch,
        },
      })
    })
    if (this.drumsOn) {
      const tpl = DRUMS[p.drums]
      for (let bar = 0; bar < p.loopBeats / 4; bar++) {
        const at = (step: number) => swingBeat(bar * 4 + step / 4, p.swing)
        tpl.kick.forEach((s) => out.push({ beat: at(s), kind: 'kick' }))
        tpl.snare.forEach((s) => out.push({ beat: at(s), kind: tpl.snareKind }))
        tpl.hat.forEach((s) => out.push({ beat: at(s), kind: 'hat' }))
      }
    }
    return out.sort((a, b) => a.beat - b.beat || (a.kind === 'note' ? 1 : -1))
  }

  async play(p: LoadedPattern) {
    const ctx = this.ensureContext()
    if (ctx.state !== 'running') await ctx.resume()
    this.stopScheduler()
    if (!this.voice) this.buildVoice()
    this.pattern = p
    this.pendingBpm = null
    this.loopBeats = p.loopBeats
    this.spb = 60 / p.bpm
    this.events = this.prepare(p)
    this.cursor = 0
    this.loopStart = ctx.currentTime + 0.06
    this.loops = [{ start: this.loopStart, spb: this.spb }]
    this.playing = true
    this.onStateChange?.(true)
    this.pump()
    this.timer = window.setInterval(() => this.pump(), 25)
  }

  /** Re-prepares the running loop (drum toggle, pattern edits) at the next loop boundary. */
  refresh() {
    if (this.pattern && this.playing) this.pendingRebuild = true
  }
  private pendingRebuild = false

  stop() {
    this.stopScheduler()
    this.teardownVoice()
    if (this.playing) {
      this.playing = false
      this.onStateChange?.(false)
    }
  }

  private stopScheduler() {
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
  }

  /** Current position in beats within the loop, or null when stopped. */
  position(): number | null {
    if (!this.ctx || !this.playing) return null
    const now = this.ctx.currentTime
    let current = this.loops[0]
    for (const l of this.loops) if (l.start <= now) current = l
    if (!current || now < current.start) return null
    return Math.min(this.loopBeats - 1e-6, (now - current.start) / current.spb)
  }

  private pump() {
    const ctx = this.ctx
    if (!ctx || !this.pattern) return
    const horizon = ctx.currentTime + 0.15
    for (let guard = 0; guard < 512; guard++) {
      if (this.cursor >= this.events.length) {
        this.loopStart += this.loopBeats * this.spb
        this.cursor = 0
        if (this.pendingBpm !== null) {
          this.spb = 60 / this.pendingBpm
          this.pendingBpm = null
        }
        if (this.pendingRebuild) {
          this.events = this.prepare(this.pattern)
          this.pendingRebuild = false
        }
        this.loops.push({ start: this.loopStart, spb: this.spb })
        if (this.loops.length > 4) this.loops.shift()
      }
      const ev = this.events[this.cursor]
      if (!ev) break
      const t = this.loopStart + ev.beat * this.spb
      if (t > horizon) break
      if (t >= ctx.currentTime - 0.01) this.schedule(ev, Math.max(t, ctx.currentTime))
      this.cursor++
    }
  }

  private schedule(ev: LoopEvent, t: number) {
    switch (ev.kind) {
      case 'note': return this.scheduleNote(ev.note!, t)
      case 'kick': return this.kick(t)
      case 'snare': return this.snare(t)
      case 'clap': return this.clap(t)
      case 'hat': return this.hat(t)
    }
  }

  private scheduleNote(n: PreparedNote, t: number) {
    const v = this.voice
    if (!v) return
    const p = PRESETS[this.presetId]
    const velNorm = this.velocitySensitive ? n.velocity / 127 : 0.82
    const accent = this.velocitySensitive && n.velocity >= 115
    const peak = (0.3 + 0.7 * velNorm) * (accent ? 1 + 0.25 * p.accent : 1) * 0.5
    const glide = n.legatoIn && this.glideOnOverlap
    for (const osc of [v.a, v.b, v.sub]) {
      if (glide) osc.frequency.setTargetAtTime(n.freq, t, p.glide / 3)
      else osc.frequency.setValueAtTime(n.freq, t)
    }
    if (glide) {
      v.amp.gain.setTargetAtTime(peak * p.sustain, t, 0.02)
    } else {
      v.amp.gain.setTargetAtTime(peak, t, p.attack)
      v.amp.gain.setTargetAtTime(peak * p.sustain, t + p.attack * 4, p.decay * 1.5)
      const top = Math.min(16000, p.cutoff + p.envAmt * (0.4 + 0.6 * velNorm) * (accent ? 1 + p.accent : 1))
      v.filter.frequency.setTargetAtTime(top, t, 0.002)
      v.filter.frequency.setTargetAtTime(p.cutoff, t + 0.006, p.decay / 2.5)
    }
    const end = t + n.durBeats * this.spb
    if (n.overlapNext) return
    if (n.touchNext) v.amp.gain.setTargetAtTime(0, end - 0.006, 0.0025)
    else v.amp.gain.setTargetAtTime(0, end, p.release / 3)
  }

  private duck(t: number) {
    this.bassBus.gain.setTargetAtTime(0.45, t, 0.004)
    this.bassBus.gain.setTargetAtTime(1, t + 0.05, 0.07)
  }

  private kick(t: number) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.setValueAtTime(150, t)
    o.frequency.exponentialRampToValueAtTime(44, t + 0.11)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(1, t + 0.003)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38)
    o.connect(g).connect(this.drumBus)
    o.start(t)
    o.stop(t + 0.4)
    this.duck(t)
  }

  private noiseHit(t: number, type: BiquadFilterType, freq: number, q: number, level: number, decay: number) {
    const ctx = this.ctx!
    const src = ctx.createBufferSource()
    src.buffer = this.noise
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    f.Q.value = q
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(level, t + 0.002)
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay)
    src.connect(f).connect(g).connect(this.drumBus)
    src.start(t, Math.random() * 0.5)
    src.stop(t + decay + 0.02)
  }

  private hat(t: number) {
    this.noiseHit(t, 'highpass', 7500, 0.7, 0.22, 0.045)
  }

  private clap(t: number) {
    this.noiseHit(t, 'bandpass', 1500, 0.9, 0.5, 0.16)
    this.noiseHit(t + 0.012, 'bandpass', 1700, 0.9, 0.35, 0.12)
  }

  private snare(t: number) {
    const ctx = this.ctx!
    this.noiseHit(t, 'bandpass', 2200, 0.6, 0.45, 0.17)
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.setValueAtTime(220, t)
    o.frequency.exponentialRampToValueAtTime(160, t + 0.08)
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.4, t + 0.002)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12)
    o.connect(g).connect(this.drumBus)
    o.start(t)
    o.stop(t + 0.14)
  }
}

export const engine = new BassEngine()
