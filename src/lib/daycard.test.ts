import { describe, expect, it } from 'vitest'
import { buildDemo } from '../demo/seed'
import { atmosphere, folderTitle, TITLE_MAX, TITLE_MIN, wordCount } from './atmosphere'
import { cardModel, dateLine } from './daycard'
import type { Memory } from './types'

const demos = buildDemo(new Date('2026-11-21T12:00:00')).memories
const vars = (s: object) => s as Record<string, string>

describe('the day card', () => {
  it('draws exactly what atmosphere() decided: palette, treatment, rhythm', () => {
    for (const m of demos) {
      const card = cardModel(m)
      const atm = atmosphere(m)
      const v = vars(card.style)
      expect(card.technique).toBe(atm.technique.id)
      expect(v['--dc-paper']).toBe(atm.palette.paper)
      expect(v['--dc-accent']).toBe(atm.palette.accent)
      expect(v['--dc-filter']).toBe(atm.treatment.filter)
      expect(v['--dc-hold']).toBe(`${atm.rhythm.hold}s`)
      expect(v['--dc-grain']).toBe(String(atm.grain))
    }
  })

  it('keeps the constant frame: a 3–7 word folder name, a verbatim line, a date line', () => {
    for (const m of demos) {
      const card = cardModel(m)
      expect(card.title).toBe(folderTitle(m))
      expect(wordCount(card.title)).toBeGreaterThanOrEqual(TITLE_MIN)
      expect(wordCount(card.title)).toBeLessThanOrEqual(TITLE_MAX)
      if (card.caption) expect(m.story).toContain(card.caption)
      expect(card.dateLine).toMatch(/^[A-Z]{3} · \d{1,2} [A-Z]{3} \d{4}/)
    }
  })

  it('is deterministic: the same day always gets the same marks and frames', () => {
    for (const m of demos) expect(cardModel(m)).toEqual(cardModel(m))
  })

  it('marks use only the day’s own colours', () => {
    for (const m of demos) {
      const card = cardModel(m)
      const p = card.atm.palette
      const own = new Set([p.paper, p.ink, p.accent, p.second, p.shadow, '#F3E9C9'])
      for (const k of card.marks) {
        const colours = [('fill' in k ? k.fill : undefined), ('stroke' in k ? k.stroke : undefined)].filter(Boolean)
        for (const c of colours) expect(own.has(c!), `${card.technique}: ${c}`).toBe(true)
      }
    }
  })

  it('frames stay inside the photo window', () => {
    const crowd: Memory = { ...demos[0], id: 'party', story: 'A loud happy party with all our friends, we danced and laughed all night!', people: ['A', 'B', 'C', 'D'], song: { title: 'x', artist: 'y', tempo: 'fast', genre: 'pop' } }
    for (const m of [...demos, crowd]) {
      for (const f of cardModel(m).frames) {
        expect(f.x).toBeGreaterThanOrEqual(0)
        expect(f.y).toBeGreaterThanOrEqual(0)
        expect(f.x + f.w).toBeLessThanOrEqual(110) // collage frames may overhang a little, by design
        expect(f.y + f.h).toBeLessThanOrEqual(110)
      }
    }
    expect(cardModel(crowd).technique).toBe('collage')
    expect(cardModel(crowd).frames).toHaveLength(3)
  })

  it('formats the date line in the fixed style', () => {
    expect(dateLine('2024-10-12', '17:40')).toBe('SAT · 12 OCT 2024 · 17:40')
    expect(dateLine('2026-01-01')).toBe('THU · 1 JAN 2026')
  })
})
