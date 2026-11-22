import { describe, expect, it } from 'vitest'
import { ago } from './time'

describe('ago', () => {
  it('counts calendar days, whatever the time of day', () => {
    expect(ago('2026-11-22', new Date(2026, 10, 22, 14, 10))).toBe('today')
    expect(ago('2026-11-22', new Date(2026, 10, 22, 23, 59))).toBe('today')
    expect(ago('2026-11-21', new Date(2026, 10, 22, 0, 5))).toBe('yesterday')
    expect(ago('2026-11-20', new Date(2026, 10, 22, 13, 0))).toBe('2 days ago')
    expect(ago('2024-11-22', new Date(2026, 10, 22, 13, 0))).toBe('2 years ago')
    expect(ago('2025-05-22', new Date(2026, 10, 22, 13, 0))).toBe('a year ago')
    expect(ago('2025-11-22', new Date(2026, 10, 22, 13, 0))).toBe('12 months ago')
  })
})
