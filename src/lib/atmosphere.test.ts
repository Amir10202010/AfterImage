import { describe, expect, it } from 'vitest'
import { buildDemo } from '../demo/seed'
import { atmosphere, folderTitle, musicSignals, normalizeFolderTitle, pickCaption, readSignals, TITLE_MAX, TITLE_MIN, wordCount, type DayInput } from './atmosphere'

const demos = buildDemo(new Date('2026-11-21T12:00:00')).memories

const day = (over: Partial<DayInput> = {}): DayInput => ({
  story: 'We walked by the lake. The water was quiet and the light was soft.',
  date: '2026-07-14',
  people: [],
  moments: [],
  ...over,
})

describe('folder names', () => {
  it('are always 3–7 words for the demo days', () => {
    for (const m of demos) {
      const t = folderTitle(m)
      expect(wordCount(t), t).toBeGreaterThanOrEqual(TITLE_MIN)
      expect(wordCount(t), t).toBeLessThanOrEqual(TITLE_MAX)
    }
  })

  it('normalizes titles that are too short or too long', () => {
    expect(wordCount(normalizeFolderTitle('Rain', '2026-11-02'))).toBe(3) // "Rain in November"
    expect(normalizeFolderTitle('Rain', '2026-11-02')).toBe('Rain in November')
    const long = normalizeFolderTitle('the longest day of the whole year with everyone I love', '2026-06-21')
    expect(wordCount(long)).toBeLessThanOrEqual(TITLE_MAX)
    expect(long).not.toMatch(/\b(of|with|the)$/) // no dangling words
    expect(normalizeFolderTitle('Дождь', '2026-11-02')).toBe('Дождь в ноябре')
  })

  it('writes Russian names for Russian entries, with agreeing adjectives', () => {
    const t = folderTitle(day({ story: 'Гуляли с друзьями по парку, пили какао, было холодно.', date: '2025-10-12', time: '20:00', location: 'Парк Горького' }))
    expect(t).toBe('Осенний вечер, Парк Горького с друзьями')
    const night = folderTitle(day({ story: 'Сидел в офисе до утра, сдача проекта.', date: '2025-11-20', time: '02:00' }))
    expect(night.startsWith('Осенняя ночь')).toBe(true)
  })

  it('never guesses "with friends" from a list of names alone', () => {
    const t = folderTitle(day({ people: ['Ana', 'Ben', 'Cy'], location: 'the pier' }))
    expect(t).not.toMatch(/friends/)
  })
})

describe('music changes the result', () => {
  const song = { title: 'Same Song', artist: 'Same Artist', tempo: 'slow' as const }

  it('a minor key mutes the palette and leaves more air than a major key', () => {
    const minor = atmosphere(day({ song: { ...song, mode: 'minor' } }))
    const major = atmosphere(day({ song: { ...song, mode: 'major' } }))
    expect(minor.palette.accent).not.toBe(major.palette.accent)
    expect(minor.composition.air).toBeGreaterThan(major.composition.air)
    expect(minor.treatment.saturate).toBeLessThan(major.treatment.saturate)
    expect(minor.voice.pitch).toBeLessThan(major.voice.pitch)
  })

  it('tempo sets how long each photo stays', () => {
    const slow = atmosphere(day({ song: { ...song, bpm: 68 } }))
    const fast = atmosphere(day({ song: { ...song, tempo: 'fast', bpm: 128 } }))
    expect(slow.rhythm.hold).toBeGreaterThan(fast.rhythm.hold)
  })

  it('reads genre and era from a description, not from the title', () => {
    expect(musicSignals({ ...song, title: 'Lake House' })?.genre).toBeUndefined()
    const m = musicSignals({ ...song, description: 'sad piano from 1962', year: 1962 })!
    expect(m.genre).toBe('classical')
    expect(m.mode).toBe('minor')
    expect(m.source.mode).toBe('guessed')
    expect(m.era).toBe('vintage')
  })

  it('an old song adds grain', () => {
    const now = atmosphere(day({ song: { ...song, year: 2023 } }))
    const old = atmosphere(day({ song: { ...song, year: 1968 } }))
    expect(old.grain).toBeGreaterThan(now.grain)
  })
})

describe('the visual system', () => {
  it('gives the three demo days three different techniques', () => {
    const ids = demos.map((m) => atmosphere(m).technique.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(atmosphere(demos.find((m) => m.id === 'demo-autumn')!).technique.id).toBe('impression')
    expect(atmosphere(demos.find((m) => m.id === 'demo-night')!).technique.id).toBe('kandinsky')
  })

  it('explains every day', () => {
    for (const m of demos) {
      const a = atmosphere(m)
      expect(a.reasons.length).toBeGreaterThanOrEqual(4)
      expect(a.reasons.some((r) => r.from === 'music')).toBe(true)
      expect(a.treatment.filter).toMatch(/saturate\(/)
      for (const c of a.palette.strip) expect(c).toMatch(/^#[0-9A-F]{6}$/)
    }
  })

  it('starts the palette from the photo, not from a mood colour', () => {
    const green = [{ h: 120, s: 0.6, l: 0.45, weight: 1, hex: '#2E9E2E' }]
    const red = [{ h: 5, s: 0.6, l: 0.45, weight: 1, hex: '#B8382E' }]
    const a = atmosphere(day(), green)
    const b = atmosphere(day(), red)
    expect(a.palette.accent).not.toBe(b.palette.accent)
    expect(a.reasons[0].from).toBe('photo')
  })

  it('reads mood in Russian too', () => {
    const glad = readSignals(day({ story: 'Было так тепло и радостно, мы смеялись весь вечер.' }))
    const heavy = readSignals(day({ story: 'Было грустно и пусто, я устал и мне одиноко.' }))
    expect(glad.valence).toBeGreaterThan(0)
    expect(heavy.valence).toBeLessThan(0)
  })

  it('does not mistake look-alike words for feelings or weather', () => {
    // "funeral" is not fun, "went" is not "we", "clearly" is not a clear sky, "Saturday" is not "sat"
    const s = readSignals(day({ story: 'We went to the funeral on Saturday. It was clearly a huge day for the team.', people: [] }))
    expect(s.valence).toBeLessThanOrEqual(0)
    expect(s.weather).toBeUndefined()
    const typed = readSignals(day({ story: 'The sun was out all morning.', weather: 'Rain by evening' }))
    expect(typed.weather).toBe('rain') // the weather field wins over the story
  })

  it('pressure words pull towards the hard grid', () => {
    const a = atmosphere(day({ story: 'Deadline at 6. Panic, errors everywhere, the office lights buzzing. Submit, submit, submit.', time: '23:30' }))
    expect(a.technique.id).toBe('kandinsky')
    expect(a.composition.layout).toBe('grid')
  })
})

describe('caption', () => {
  it('quotes the most sensory sentence verbatim', () => {
    const story = 'I had a meeting. The light went orange and the wind smelled of smoke. Then I went home.'
    expect(pickCaption(story)).toBe('The light went orange and the wind smelled of smoke.')
    expect(story).toContain(pickCaption(story)!)
  })
})
