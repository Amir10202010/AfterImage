import { describe, expect, it } from 'vitest'
import { MORE_DEMO_IDS, buildDemo } from './seed'
import { TITLE_MAX, TITLE_MIN, folderTitle, wordCount } from '../lib/atmosphere'

const { memories } = buildDemo(new Date('2026-11-21T12:00:00'))

describe('demo days', () => {
  it('there are six, with unique ids, including the three later ones', () => {
    expect(memories).toHaveLength(6)
    expect(new Set(memories.map((m) => m.id)).size).toBe(6)
    for (const id of MORE_DEMO_IDS) expect(memories.some((m) => m.id === id)).toBe(true)
  })

  it('every title and folder name is 3–7 words', () => {
    for (const m of memories) {
      expect(wordCount(m.title)).toBeGreaterThanOrEqual(TITLE_MIN)
      const n = wordCount(folderTitle(m))
      expect(n).toBeGreaterThanOrEqual(TITLE_MIN)
      expect(n).toBeLessThanOrEqual(TITLE_MAX)
    }
  })

  it('only ever quotes the story: moments, recall sentences and threads are verbatim', () => {
    for (const m of memories) {
      for (const x of m.moments) expect(m.story).toContain(x.text)
      for (const r of m.recall) {
        expect(m.story).toContain(r.sentence)
        expect(r.sentence).toContain(r.word)
      }
      for (const t of m.threads) expect(m.story).toContain(t.quote)
    }
  })

  it('the favourite day is the most detailed one', () => {
    const picnic = memories.find((m) => m.id === 'demo-picnic')!
    const detail = (m: (typeof memories)[number]) => m.moments.length + m.details.length + m.recall.length + m.people.length
    for (const m of memories) if (m !== picnic) expect(detail(picnic)).toBeGreaterThan(detail(m))
    expect(picnic.story).toMatch(/keep one day from this year/)
    expect(picnic.song?.bpm).toBeGreaterThan(0)
  })
})
