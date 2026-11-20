import { describe, expect, it } from 'vitest'
import { connections, stem } from './connect'
import { buildDemo } from '../demo/seed'

describe('connections', () => {
  const { memories } = buildDemo(new Date('2026-11-20'))
  const [autumn, ambition, night] = memories
  it('stems lightly', () => {
    expect(stem('laughing')).toBe(stem('laughed'))
    expect(stem('leaves')).toBe('leav')
  })
  it('quotes both sentences verbatim', () => {
    for (const [a, b] of [[autumn, ambition], [autumn, night], [ambition, night]]) {
      const cs = connections(a, b)
      for (const c of cs) if (c.kind === 'word') {
        expect(a.story).toContain(c.a)
        expect(b.story).toContain(c.b)
      }
      console.log(a.id, b.id, cs.map((c) => c.label))
    }
  })
})
