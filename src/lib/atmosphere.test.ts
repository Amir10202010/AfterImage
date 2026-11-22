import { describe, expect, it } from 'vitest'
import { atmosphere, folderName, inputFor, TECHNIQUES } from './atmosphere'
import { buildDemo } from '../demo/seed'

const today = new Date('2026-11-22T12:00:00')
const { memories } = buildDemo(today)
const byId = (id: string) => memories.find((m) => m.id === id)!

describe('atmosphere', () => {
  it('gives each demo day the technique its words, song and age call for', () => {
    const t = (id: string) => atmosphere(inputFor(byId(id), undefined, today)).technique
    expect(t('demo-autumn')).toBe('monet')
    expect(t('demo-ambition')).toBe('film')
    expect(t('demo-night')).toBe('kandinsky')
    expect(t('demo-concert')).toBe('collage')
    expect(t('demo-goodbye')).toBe('ma')
  })

  it('is deterministic: the same day always gives the same page', () => {
    const a = atmosphere(inputFor(byId('demo-night'), undefined, today))
    const b = atmosphere(inputFor(byId('demo-night'), undefined, today))
    expect(a).toEqual(b)
  })

  it('lets the song set the rhythm: a faster song means shorter holds', () => {
    const m = byId('demo-autumn')
    const slow = atmosphere({ ...inputFor(m, undefined, today), song: { ...m.song!, bpm: 60 } })
    const fast = atmosphere({ ...inputFor(m, undefined, today), song: { ...m.song!, bpm: 120 } })
    expect(fast.rhythm.hold).toBeLessThan(slow.rhythm.hold)
    expect(slow.rhythm.bpm).toBe(60)
  })

  it('reads who was there: company adds pace and is named in the reasons', () => {
    const m = byId('demo-goodbye')
    const alone = atmosphere({ ...inputFor(m, undefined, today), people: [] })
    const crowd = atmosphere({ ...inputFor(m, undefined, today), people: ['Mira', 'Tom', 'Jonas', 'Lena'] })
    expect(crowd.axes.energy).toBeGreaterThan(alone.axes.energy)
    expect(crowd.reasons.join(' ')).toContain('Mira, Tom, Jonas and Lena')
  })

  it('turns old days into film, whatever they felt like', () => {
    const m = byId('demo-autumn')
    expect(atmosphere(inputFor(m, undefined, new Date('2033-01-01'))).technique).toBe('film')
  })

  it('a minor key mutes and a major key brightens the same day', () => {
    const m = byId('demo-autumn')
    const minor = atmosphere({ ...inputFor(m, undefined, today), song: { ...m.song!, mode: 'minor' } })
    const major = atmosphere({ ...inputFor(m, undefined, today), song: { ...m.song!, mode: 'major' } })
    expect(minor.axes.valence).toBeLessThan(major.axes.valence)
  })

  it('takes the colours of the photographs', () => {
    const m = byId('demo-autumn')
    const blue = atmosphere(inputFor(m, [{ h: 210, s: 0.6, l: 0.5, weight: 0.8, hex: '#3377cc' }], today))
    const red = atmosphere(inputFor(m, [{ h: 10, s: 0.6, l: 0.5, weight: 0.8, hex: '#cc4433' }], today))
    expect(blue.palette.accent).not.toBe(red.palette.accent)
    expect(red.axes.warmth).toBeGreaterThan(blue.axes.warmth)
  })

  it('explains itself in plain words and never describes the person', () => {
    for (const m of memories) {
      const a = atmosphere(inputFor(m, undefined, today))
      expect(a.reasons.length).toBeGreaterThanOrEqual(3)
      expect(a.reasons[0].toLowerCase()).toContain(TECHNIQUES[a.technique].name.split(',')[0].toLowerCase())
      for (const r of a.reasons) expect(r).not.toMatch(/depress|anxiety|disorder|diagnos|you are|you feel/i)
    }
  })

  it('reads Russian entries with a Russian voice', () => {
    const a = atmosphere({ story: 'Тихий вечер, пили чай и разговаривали.', date: '2025-10-01', time: '19:00', photoCount: 1 })
    expect(a.voice.lang).toBe('ru')
    expect(a.technique).toBe('monet')
  })
})

describe('folderName', () => {
  const words = (s: string) => s.split(/\s+/).length

  it('names the demo days in one tone', () => {
    const names = memories.map((m) => folderName(m))
    expect(names).toEqual(['Autumn afternoon in Linden Park', 'Spring night of big plans', 'Night before the deadline', 'Autumn evening at the concert', 'Autumn evening after a goodbye'])
    // the demo titles are the names the system gave them
    expect(memories.map((m) => m.title)).toEqual(names)
  })

  it('always uses three to seven words', () => {
    const cases = [
      { story: 'ok', date: '2025-01-05' },
      { story: 'We had tea in the kitchen.', date: '2025-07-01', time: '08:10' },
      { story: 'Exam tomorrow.', date: '2025-05-20', time: '23:00' },
      { story: 'Went to the sea.', date: '2025-08-03', location: 'Our little rented house by the water, near the old pier, past the lighthouse' },
      { story: 'Гуляли в парке, пили какао.', date: '2025-10-11', time: '18:30' },
      { story: 'Сдача проекта завтра, сижу всю ночь.', date: '2025-11-20', time: '02:00' },
      { story: 'Просто день.', date: '2025-03-03' },
    ]
    for (const c of cases) {
      const n = folderName(c)
      expect(words(n), n).toBeGreaterThanOrEqual(3)
      expect(words(n), n).toBeLessThanOrEqual(7)
    }
  })

  it('speaks Russian to Russian entries, with the adjective agreeing', () => {
    expect(folderName({ story: 'Гуляли в парке, пили какао.', date: '2025-10-11', time: '18:30' })).toBe('Осенний вечер в парке')
    expect(folderName({ story: 'Сдача проекта завтра, сижу всю ночь.', date: '2025-11-20', time: '02:00' })).toBe('Ночь перед дедлайном')
    expect(folderName({ story: 'Тихое утро.', date: '2025-01-10', time: '08:00' })).toBe('Обычное зимнее утро')
  })
})
