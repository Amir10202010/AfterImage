import { describe, expect, it } from 'vitest'
import { autoLayout, stampText } from './journal'
import { buildDemo } from '../demo/seed'

describe('journal', () => {
  it('cuts stamped headlines at whole words', () => {
    expect(stampText('Studio flat, 4th floor')).toBe('STUDIO FLAT')
    expect(stampText('The Night Everything Was Due')).toBe('THE NIGHT')
    expect(stampText('Linden Park')).toBe('LINDEN PARK')
  })
  it('lays out a day only with things that day has, using the user’s own words', () => {
    const { memories } = buildDemo(new Date('2026-11-20'))
    const day = { date: '2025-10-12', memories: [memories[0]], shots: [] }
    const items = autoLayout(day)
    expect(items.filter((i) => i.kind === 'photo')).toHaveLength(1)
    for (const n of items.filter((i) => i.kind === 'note')) expect(memories[0].story).toContain(n.text!)
    for (const i of items) expect(i.page === 0 || i.page === 1).toBe(true)
  })
})
