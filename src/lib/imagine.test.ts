import { describe, expect, it } from 'vitest'
import { cropBox } from './imagine'

describe('cropBox', () => {
  it('drops the bottom strip and lands on 3:2 when the image is tall enough', () => {
    const b = cropBox(1200, 864)
    expect(b).toEqual({ x: 0, y: 0, w: 1200, h: 800 })
  })
  it('trims the sides when the bottom cut leaves it too wide', () => {
    const b = cropBox(1200, 800)
    expect(b.y).toBe(0)
    expect(b.h).toBe(752)
    expect(b.w / b.h).toBeCloseTo(1.5, 2)
    expect(b.x * 2 + b.w).toBeLessThanOrEqual(1200)
  })
  it('always removes at least 6% from the bottom', () => {
    for (const [w, h] of [[1024, 1024], [940, 627], [1216, 880]]) {
      const b = cropBox(w, h)
      expect(b.y + b.h).toBeLessThanOrEqual(Math.round(h * 0.94))
    }
  })
})
