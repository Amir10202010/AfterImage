// Generative darkroom soundscapes, synthesised live with WebAudio.
// No samples, nothing to license — the song you attach chooses the key and the tempo.
import type { Tempo } from './types'
import { hash } from './extract'

export const BPM: Record<Tempo, number> = { slow: 72, mid: 96, fast: 124 }

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12)

/** bpm, when known (measured or typed), replaces the tempo's default beat */
type Profile = { tempo: Tempo; seed: string; bpm?: number }

class Soundscape {
  private ctx?: AudioContext
  private master?: GainNode
  private delay?: DelayNode
  private noise?: AudioBuffer
  private timer?: number
  private nextBeat = 0
  private beat = 0
  private profile?: Profile
  playing = false

  private ensure() {
    if (this.ctx) return this.ctx
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = new Ctx()
    const master = ctx.createGain()
    master.gain.value = 0
    const comp = ctx.createDynamicsCompressor()
    master.connect(comp).connect(ctx.destination)
    // a small feedback delay for space
    const delay = ctx.createDelay(2)
    delay.delayTime.value = 0.42
    const fb = ctx.createGain()
    fb.gain.value = 0.32
    const wet = ctx.createGain()
    wet.gain.value = 0.35
    delay.connect(fb).connect(delay)
    delay.connect(wet).connect(master)
    const buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    Object.assign(this, { ctx, master, delay, noise: buf })
    return ctx
  }

  start(p: Profile) {
    const ctx = this.ensure()
    ctx.resume()
    this.stopScheduler()
    this.profile = p
    this.playing = true
    this.beat = 0
    this.nextBeat = ctx.currentTime + 0.1
    this.master!.gain.cancelScheduledValues(ctx.currentTime)
    this.master!.gain.setTargetAtTime(p.tempo === 'fast' ? 0.5 : 0.6, ctx.currentTime, 0.8)
    this.timer = window.setInterval(() => this.schedule(), 40)
  }

  stop() {
    this.playing = false
    if (!this.ctx || !this.master) return
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4)
    const t = this.timer
    window.setTimeout(() => {
      if (this.timer === t) this.stopScheduler()
    }, 1500)
  }

  private stopScheduler() {
    if (this.timer) window.clearInterval(this.timer)
    this.timer = undefined
  }

  private schedule() {
    const ctx = this.ctx!
    const p = this.profile!
    const spb = 60 / (p.bpm ?? BPM[p.tempo])
    while (this.nextBeat < ctx.currentTime + 0.2) {
      this.play(this.beat, this.nextBeat, spb, p)
      this.nextBeat += spb
      this.beat++
    }
  }

  private root(p: Profile) {
    return 48 + (hash(p.seed) % 7) // C3..F#3
  }

  private play(b: number, t: number, spb: number, p: Profile) {
    const root = this.root(p)
    const h = hash(p.seed + b)
    if (p.tempo === 'slow') {
      // Imaj7 – vi7 – IVmaj7 – V, a chord every 8 beats; sparse pentatonic notes on top
      const prog = [[0, 4, 7, 11], [-3, 0, 4, 7], [-7, -3, 0, 4], [-5, -1, 2, 7]]
      if (b % 8 === 0) prog[(b / 8) % 4].forEach((n) => this.pad(root + n, t, spb * 8.4, 0.05, 'triangle', 900))
      if (h % 3 === 0) {
        const penta = [0, 2, 4, 7, 9, 12, 14, 16]
        this.pluck(root + 24 + penta[h % penta.length], t + (h % 2) * spb * 0.5, 2.6, 0.07, 'sine')
      }
    } else if (p.tempo === 'mid') {
      // music box arpeggio + tape hiss, a little crooked like an old cassette
      const prog = [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]]
      const chord = prog[Math.floor(b / 8) % 4]
      if (b % 8 === 0) chord.forEach((n) => this.pad(root + 12 + n, t, spb * 8.2, 0.03, 'sine', 1400))
      const pattern = [0, 1, 2, 1, 2, 0, 2, 1]
      if (h % 5 !== 0) this.pluck(root + 36 + chord[pattern[b % 8]], t, 1.4, 0.06, 'sine', true)
      if (b % 4 === 0) this.hiss(t, spb * 4, 0.012, 3000, 'lowpass')
    } else {
      // four-on-the-floor kick, offbeat hats, a minor pad that breathes
      const prog = [[0, 3, 7], [-4, 0, 3], [-2, 2, 5], [-5, -2, 2]]
      this.kick(t)
      this.hiss(t + spb / 2, 0.06, 0.08, 7000, 'highpass')
      if (b % 16 === 0) prog[(b / 16) % 4].forEach((n) => this.pad(root + 12 + n, t, spb * 16.2, 0.035, 'sawtooth', 700, spb * 8))
      if (b % 2 === 1 && h % 3 !== 0) {
        const chord = prog[Math.floor(b / 16) % 4]
        this.pluck(root + 36 + chord[h % 3], t + spb * 0.25, 0.25, 0.035, 'square')
      }
    }
  }

  private pad(n: number, t: number, dur: number, vol: number, type: OscillatorType, cutoff: number, lfo?: number) {
    const ctx = this.ctx!
    const g = ctx.createGain()
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = cutoff
    if (lfo) {
      f.frequency.setValueAtTime(cutoff * 0.5, t)
      f.frequency.linearRampToValueAtTime(cutoff * 2.2, t + lfo)
      f.frequency.linearRampToValueAtTime(cutoff * 0.5, t + dur)
    }
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + dur * 0.3)
    g.gain.linearRampToValueAtTime(0, t + dur)
    f.connect(g).connect(this.master!)
    for (const det of [-6, 5]) {
      const o = ctx.createOscillator()
      o.type = type
      o.frequency.value = midi(n)
      o.detune.value = det
      o.connect(f)
      o.start(t)
      o.stop(t + dur + 0.1)
    }
  }

  private pluck(n: number, t: number, dur: number, vol: number, type: OscillatorType, bell = false) {
    const ctx = this.ctx!
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    g.connect(this.master!)
    g.connect(this.delay!)
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.value = midi(n)
    o.connect(g)
    o.start(t)
    o.stop(t + dur + 0.05)
    if (bell) {
      const o2 = ctx.createOscillator()
      const g2 = ctx.createGain()
      g2.gain.value = 0.3
      o2.frequency.value = midi(n) * 4.2
      o2.connect(g2).connect(g)
      o2.start(t)
      o2.stop(t + 0.3)
    }
  }

  private kick(t: number) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.frequency.setValueAtTime(140, t)
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12)
    g.gain.setValueAtTime(0.55, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35)
    o.connect(g).connect(this.master!)
    o.start(t)
    o.stop(t + 0.4)
  }

  private hiss(t: number, dur: number, vol: number, freq: number, type: BiquadFilterType) {
    const ctx = this.ctx!
    const s = ctx.createBufferSource()
    s.buffer = this.noise!
    s.loop = true
    const f = ctx.createBiquadFilter()
    f.type = type
    f.frequency.value = freq
    const g = ctx.createGain()
    g.gain.setValueAtTime(vol, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    s.connect(f).connect(g).connect(this.master!)
    s.start(t, Math.random())
    s.stop(t + dur + 0.05)
  }

  /** One tooth of a music box. Works on its own, without a soundscape running. */
  box(n: number, vol = 0.08) {
    const ctx = this.ensure()
    if (ctx.state === 'suspended') ctx.resume()
    if (!this.playing) {
      this.master!.gain.cancelScheduledValues(ctx.currentTime)
      this.master!.gain.setValueAtTime(0.75, ctx.currentTime)
    }
    const t = ctx.currentTime + 0.004
    this.pluck(n, t, 2.4, vol, 'sine', true)
    this.pluck(n + 12, t, 0.5, vol * 0.18, 'triangle')
  }

  /** a soft "fixed" chime for satisfying feedback */
  chime(up = true) {
    if (!this.ctx || !this.playing) return
    const t = this.ctx.currentTime
    const root = this.profile ? this.root(this.profile) : 60
    ;(up ? [24, 31, 36] : [24, 27]).forEach((n, i) => this.pluck(root + n, t + i * 0.07, 1.2, 0.05, 'sine', true))
  }
}

export const sound = new Soundscape()

const KEY = 'afterimage.sound'
export function soundPreferred() {
  try {
    return localStorage.getItem(KEY) !== 'off'
  } catch {
    return true
  }
}
export function setSoundPreferred(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off')
  } catch {
    /* private mode — fine */
  }
}
