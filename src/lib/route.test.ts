import { describe, expect, it } from 'vitest'
import { isISODate, isYearMonth } from './route'

describe('route parameters', () => {
  it('accept only real calendar dates', () => {
    expect(isISODate('2025-10-12')).toBe(true)
    expect(isISODate('2024-02-29')).toBe(true)
    for (const bad of ['2025-02-30', '2025-13-01', 'not-a-date', '2025-1-1', '', undefined]) expect(isISODate(bad)).toBe(false)
  })
  it('accept only months 01 to 12', () => {
    expect(isYearMonth('2025-10')).toBe(true)
    for (const bad of ['2099-99', '2025-00', '2025-1', 'abc', undefined]) expect(isYearMonth(bad)).toBe(false)
  })
})
