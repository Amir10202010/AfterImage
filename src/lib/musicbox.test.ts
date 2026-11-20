import { describe, expect, it } from 'vitest'
import { rowName, swatchToRow, tuneFromMonth } from './musicbox'
import { swatchesFromPixels } from './colors'

const px = (r: number, g: number, b: number, n = 100) => Uint8ClampedArray.from(Array.from({ length: n }, () => [r, g, b, 255]).flat())

describe('music box', () => {
  it('finds the main colour of a picture', () => {
    const sw = swatchesFromPixels(px(200, 90, 40))
    expect(sw[0].h).toBeGreaterThan(10)
    expect(sw[0].h).toBeLessThan(35)
  })
  it('warm sits low, cool sits high, light climbs an octave', () => {
    const warm = swatchToRow({ h: 20, s: 0.7, l: 0.5, weight: 1, hex: '' })
    const cool = swatchToRow({ h: 220, s: 0.7, l: 0.5, weight: 1, hex: '' })
    const light = swatchToRow({ h: 20, s: 0.7, l: 0.8, weight: 1, hex: '' })
    expect(cool).toBeGreaterThan(warm)
    expect(light).toBe(warm + 5)
    expect(rowName(0)).toBe('C4')
  })
  it('the same month always writes the same tune', () => {
    const days = [
      { day: 1, swatches: [[{ h: 30, s: 0.6, l: 0.5, weight: 0.6, hex: '' }]], memory: false },
      { day: 12, swatches: [[{ h: 200, s: 0.4, l: 0.7, weight: 0.5, hex: '' }], [{ h: 100, s: 0.5, l: 0.3, weight: 0.5, hex: '' }]], memory: true },
    ]
    const a = tuneFromMonth(days)
    expect(tuneFromMonth(days)).toEqual(a)
    expect(a).toContain('22:0') // the memory day rings the lowest tooth
    expect(a.some((h) => h.startsWith('23:'))).toBe(true) // a second photo echoes on the off-step
  })
})
