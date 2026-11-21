import { describe, expect, it } from 'vitest'
import { buildDemo } from '../demo/seed'
import { atmosphere, folderTitle } from './atmosphere'
import { MAX_LINES, narrationScript, pauseAfter, pickVoice, type VoiceLike } from './narration'

const demos = buildDemo(new Date('2026-11-21T12:00:00')).memories

describe('narration script', () => {
  it('reads the folder name, then the story verbatim, with the day’s voice plan', () => {
    for (const m of demos) {
      const plan = atmosphere(m).voice
      const s = narrationScript(folderTitle(m), m.story, plan)
      expect(s.lines[0]).toEqual({ text: folderTitle(m), kind: 'title' })
      for (const l of s.lines.slice(1)) expect(m.story).toContain(l.text)
      expect(s.lines.length).toBeLessThanOrEqual(MAX_LINES + 1)
      expect(s.plan).toBe(plan)
      expect(s.lang).toBe('en-US')
    }
  })

  it('reads a Russian story with a Russian voice', () => {
    const plan = atmosphere({ story: 'Шёл дождь. Мы сидели на кухне и молчали.', date: '2024-11-02', people: [], moments: [] }).voice
    expect(narrationScript('Осенний день', 'Шёл дождь. Мы сидели на кухне и молчали.', plan).lang).toBe('ru-RU')
  })

  it('a tense day is read faster and tighter than a quiet night', () => {
    const tense = atmosphere({ story: 'Deadline tonight, the exam is tomorrow, I am panicking and rushing, no time!', date: '2024-05-10', people: [], moments: [], song: { title: 'x', artist: 'y', tempo: 'fast', genre: 'techno' } }).voice
    const quiet = atmosphere({ story: 'A quiet night. Soft lamp light, rain on the window, I was calm and warm.', date: '2024-11-10', time: '23:30', people: [], moments: [], song: { title: 'x', artist: 'y', tempo: 'slow', mode: 'minor' } }).voice
    expect(tense.rate).toBeGreaterThan(quiet.rate)
    expect(tense.pauseMs).toBeLessThan(quiet.pauseMs)
    expect(quiet.low).toBe(true)
    expect(pauseAfter({ text: 't', kind: 'title' }, quiet)).toBeGreaterThan(pauseAfter({ text: 's', kind: 'story' }, quiet))
  })
})

describe('voice picker', () => {
  const v = (name: string, lang: string, localService = true): VoiceLike => ({ name, lang, localService })
  const voices = [v('Samantha', 'en-US'), v('Daniel', 'en-GB'), v('Google US English', 'en-US', false), v('Milena', 'ru-RU'), v('Yuri', 'ru-RU')]

  it('matches the language, prefers the exact locale and local voices', () => {
    expect(pickVoice(voices, 'en-US', false)?.name).toBe('Samantha')
    expect(pickVoice(voices, 'ru-RU', false)?.name).toBe('Milena')
  })

  it('honours a request for a lower voice when one is installed', () => {
    expect(pickVoice(voices, 'ru-RU', true)?.name).toBe('Yuri')
    expect(pickVoice(voices, 'en-US', true)?.name).toBe('Daniel')
  })

  it('never picks a novelty voice, also under localised names (as on a Russian Mac)', () => {
    const mac = [v('Альберт', 'en-US'), v('Пузырьки', 'en-US'), v('Зарвокс', 'en-US'), v('Саманта', 'en-US'), v('Дэниэл', 'en-GB'), v('Eddy (английский (США))', 'en-US')]
    expect(pickVoice(mac, 'en-US', false)?.name).toBe('Саманта')
    expect(pickVoice(mac, 'en-US', true)?.name).toBe('Дэниэл')
    expect(pickVoice([v('Albert', 'en-US'), v('Eddy', 'en-US')], 'en-US', false)?.name).toBe('Eddy')
  })

  it('returns nothing when no voice speaks the language (the browser then chooses)', () => {
    expect(pickVoice(voices, 'ja-JP', false)).toBeUndefined()
  })
})
