import { describe, expect, it } from 'vitest'
import { analyzePcm, tempoFromBpm } from './audio'
import { musicSignals } from './atmosphere'

const SR = 8000

/** A click track: a short decaying noise burst on every beat, with a quieter off-beat tick. */
function clicks(bpm: number, seconds = 30, gain = 0.6) {
  const out = new Float32Array(SR * seconds)
  const beat = (60 / bpm) * SR
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1
  for (let b = 0; b * beat < out.length; b++) {
    const at = Math.round(b * beat)
    for (let i = 0; i < 400 && at + i < out.length; i++) out[at + i] += rnd() * gain * Math.exp(-i / 60)
    const off = Math.round(at + beat / 2)
    for (let i = 0; i < 200 && off + i < out.length; i++) out[off + i] += rnd() * gain * 0.15 * Math.exp(-i / 30)
  }
  return out
}

function hum(seconds = 30, gain = 0.03) {
  const out = new Float32Array(SR * seconds)
  for (let i = 0; i < out.length; i++) out[i] = Math.sin((2 * Math.PI * 220 * i) / SR) * gain * (0.8 + 0.2 * Math.sin(i / SR))
  return out
}

describe('audio analysis', () => {
  for (const bpm of [72, 100, 128]) {
    it(`finds ${bpm} bpm in a click track`, () => {
      const r = analyzePcm(clicks(bpm), SR)
      expect(Math.abs(r.bpm - bpm)).toBeLessThan(2.5)
      expect(r.confidence).toBeGreaterThan(0.15)
    })
  }

  it('a loud, punchy track has more energy than a quiet hum', () => {
    const loud = analyzePcm(clicks(120, 20, 0.9), SR)
    const quiet = analyzePcm(hum(20), SR)
    expect(loud.energy).toBeGreaterThan(quiet.energy)
    expect(quiet.energy).toBeLessThan(0.35)
    expect(quiet.confidence).toBeLessThan(loud.confidence)
  })

  it('maps bpm onto the existing three tempo chips', () => {
    expect(tempoFromBpm(70)).toBe('slow')
    expect(tempoFromBpm(98)).toBe('mid')
    expect(tempoFromBpm(126)).toBe('fast')
  })
})

describe('songs saved before these fields existed', () => {
  it('still work: tempo stands in for bpm and energy', () => {
    const old = musicSignals({ title: 'Paper Lanterns', artist: 'Someone', tempo: 'slow' })!
    expect(old.bpm).toBe(72)
    expect(old.source.bpm).toBe('tempo')
    expect(old.energy).toBeGreaterThan(0)
    expect(old.mode).toBeUndefined()
  })

  it('a measured bpm wins over the tempo chip and is labelled as measured', () => {
    const s = musicSignals({ title: 'x', artist: 'y', tempo: 'slow', bpm: 131, bpmSource: 'measured', energy: 0.8 })!
    expect(s.bpm).toBe(131)
    expect(s.source.bpm).toBe('measured')
    expect(s.energy).toBe(0.8)
  })
})
