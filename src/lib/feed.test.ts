import { describe, expect, it } from 'vitest'
import { FEED_MAX, feedDays } from './feed'

describe('feed', () => {
  const d = (date: string, time?: string) => ({ date, time })

  it('puts the newest day first, by date and then time', () => {
    const out = feedDays([d('2025-10-12'), d('2025-11-20', '09:00'), d('2025-11-20', '21:30'), d('2019-03-03')])
    expect(out.map((m) => m.date + (m.time ?? ''))).toEqual(['2025-11-2021:30', '2025-11-2009:00', '2025-10-12', '2019-03-03'])
  })

  it('shows at most seven days and leaves the input alone', () => {
    const all = Array.from({ length: 12 }, (_, i) => d(`2025-01-${String(i + 1).padStart(2, '0')}`))
    const out = feedDays(all)
    expect(out).toHaveLength(FEED_MAX)
    expect(out[0].date).toBe('2025-01-12')
    expect(all[0].date).toBe('2025-01-01')
  })
})
