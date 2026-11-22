import { describe, expect, it } from 'vitest'
import { analyse, tempoOf } from './audio'

const RATE = 22050

/** A click track: short decaying noise bursts on every beat, with a quieter off-beat. */
function clicks(bpm: number, seconds: number, gain = 0.8, hiss = 0) {
  const x = new Float32Array(RATE * seconds)
  let seed = 7
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1
  const beat = (60 / bpm) * RATE
  for (let b = 0; b * beat < x.length; b++) {
    const start = Math.round(b * beat)
    for (let i = 0; i < 900 && start + i < x.length; i++) x[start + i] += rnd() * gain * Math.exp(-i / 160)
  }
  if (hiss) for (let i = 0; i < x.length; i++) x[i] += rnd() * hiss
  return x
}

describe('analyse', () => {
  it('hears the tempo of a click track', () => {
    for (const bpm of [72, 96, 124, 140]) {
      const h = analyse(clicks(bpm, 30), RATE)
      expect(Math.abs(h.bpm - bpm), `${bpm} heard as ${h.bpm}`).toBeLessThanOrEqual(3)
    }
  })

  it('a loud busy track has more energy than a quiet sparse one', () => {
    const loud = analyse(clicks(132, 20, 0.95, 0.25), RATE)
    const quiet = analyse(clicks(66, 20, 0.08), RATE)
    expect(loud.energy).toBeGreaterThan(quiet.energy)
  })

  it('hiss makes a track brighter', () => {
    const plain = analyse(clicks(100, 10, 0.5), RATE)
    const bright = analyse(clicks(100, 10, 0.5, 0.3), RATE)
    expect(bright.brightness).toBeGreaterThan(plain.brightness)
  })

  it('survives silence', () => {
    const h = analyse(new Float32Array(RATE * 5), RATE)
    expect(h.energy).toBe(0)
    expect(Number.isFinite(h.bpm)).toBe(true)
  })

  it('puts a tempo on the right chip', () => {
    expect(tempoOf(70)).toBe('slow')
    expect(tempoOf(100)).toBe('mid')
    expect(tempoOf(128)).toBe('fast')
  })
})
