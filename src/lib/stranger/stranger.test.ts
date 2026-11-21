import { describe, expect, it } from 'vitest'
import type { Letter, ShoeboxItem } from '../types'
import { mem } from './testkit'
import { extractFragments, passages, shortfall, type RealFragment } from './fragments'
import { ATTEMPTS, accuse, assemble, attemptsLeft, cooldownFor, emptyHistory, glyphs, mulberry, pickStranger, present, remember, selectReal, stats, summarize, type StrangerLine } from './game'
import { checker, detectLang, maskNames, measure, parseLines, parseStyle } from './style'


const frag = (i: number, date = '2023-03-0' + ((i % 9) + 1), refId = 'm' + i): RealFragment => ({
  id: 'f' + i,
  text: `This is passage number ${i} and it has enough words to count.`,
  source: 'story',
  refId,
  memoryId: refId,
  date,
  demo: false,
})

const line = (id: string, text: string): StrangerLine => ({ id, text, createdAt: 1, batch: 'b' })

describe('fragment extraction', () => {
  it('splits long stories into self-contained passages, verbatim', () => {
    const story = 'We missed the last bus home again. and then walked the whole way in the rain, laughing. The kettle was still warm when we got in. Ok fine.'
    const ps = passages(story)
    expect(ps).toEqual(['We missed the last bus home again. and then walked the whole way in the rain, laughing.', 'The kettle was still warm when we got in. Ok fine.'])
    for (const p of ps) expect(story.replace(/\s+/g, ' ')).toContain(p)
  })

  it('skips fragments too short, links, and tag lists', () => {
    expect(passages('Fine. Ok then.')).toEqual([])
    expect(passages('look at this https://example.com it is a link to a thing')).toEqual([])
    expect(passages('#sunset #autumn #love #nofilter #city #walk')).toEqual([])
  })

  it('reads stories, details, letters and captions, without duplicates', () => {
    const now = Date.parse('2026-01-01')
    const letters: Letter[] = [
      { id: 'l1', to: 'future', body: 'I hope you still make soup on Sundays when it gets cold outside.', writtenAt: '2024-02-02T10:00:00Z' },
      { id: 'l2', to: 'future', body: 'This one is sealed and must stay sealed until its day comes.', writtenAt: '2024-02-02T10:00:00Z', sealedUntil: '2030-01-01T00:00:00Z' },
    ]
    const shoebox = [{ id: 's1', blobId: 'b', thumbId: 't', date: '2024-05-05', takenAt: '', source: 'instagram-post', caption: 'the sea was too cold but we went in anyway, obviously', name: '', key: 'k', w: 1, h: 1 }] as ShoeboxItem[]
    const memories = [
      mem('a', '2023-01-01', 'I burned the toast twice this morning and nobody noticed at all. I burned the toast twice this morning and nobody noticed at all.', { details: ['the blue mug with the chipped handle on the shelf'] }),
      mem('d', '2023-01-01', 'This belongs to the demo person and should stay out of the game.', { demo: true }),
    ]
    const fs = extractFragments({ memories, letters, shoebox, pages: {} }, { now })
    expect(fs.map((f) => f.source).sort()).toEqual(['caption', 'detail', 'letter', 'story'])
    expect(fs.find((f) => f.text.includes('sealed'))).toBeUndefined()
    expect(fs.find((f) => f.source === 'caption')?.date).toBe('2024-05-05')
    expect(extractFragments({ memories, letters, shoebox, pages: {} }, { now, includeDemo: true }).some((f) => f.demo)).toBe(true)
    // ids are stable
    expect(extractFragments({ memories, letters, shoebox, pages: {} }, { now }).map((f) => f.id)).toEqual(fs.map((f) => f.id))
  })

  it('explains what is missing when the archive is too small', () => {
    expect(shortfall(2)).toMatch(/needs at least 5.*found 2/i)
    expect(shortfall(9)).toBeNull()
  })
})

describe('selection', () => {
  it('never repeats a passage within a round', () => {
    const pool = Array.from({ length: 12 }, (_, i) => frag(i))
    for (let s = 1; s < 200; s++) {
      const pick = selectReal(pool, emptyHistory(), mulberry(s))!
      expect(new Set(pick.map((p) => p.id)).size).toBe(5)
    }
  })

  it('refuses when there are fewer than five passages', () => {
    expect(selectReal([frag(1), frag(2), frag(3), frag(4)], emptyHistory(), mulberry(1))).toBeNull()
  })

  it('rests recently shown passages, and rotates through a big archive', () => {
    const pool = Array.from({ length: 60 }, (_, i) => frag(i))
    const cool = cooldownFor(pool.length)
    expect(cool).toBeGreaterThanOrEqual(5)
    let h = emptyHistory()
    const rounds: string[][] = []
    const rng = mulberry(7)
    for (let r = 0; r < 30; r++) {
      const ids = selectReal(pool, h, rng)!.map((p) => p.id)
      rounds.push(ids)
      h = remember(h, ids)
    }
    for (let r = 1; r < rounds.length; r++)
      for (let back = 1; back <= cool && r - back >= 0; back++) for (const id of rounds[r]) expect(rounds[r - back]).not.toContain(id)
    // most of the archive comes up, not the same ten sentences
    expect(new Set(rounds.flat()).size).toBeGreaterThan(50)
  })

  it('still plays on a tiny archive, bringing back the longest-rested first', () => {
    const pool = Array.from({ length: 6 }, (_, i) => frag(i))
    let h = emptyHistory()
    const a = selectReal(pool, h, mulberry(3))!
    h = remember(h, a.map((x) => x.id))
    const b = selectReal(pool, h, mulberry(4))!
    expect(b).toHaveLength(5)
    const missing = pool.find((p) => !a.some((x) => x.id === p.id))!
    expect(b.map((x) => x.id)).toContain(missing.id)
  })

  it('prefers distinct records', () => {
    const pool = [...Array.from({ length: 6 }, (_, i) => frag(i, '2022-01-01', 'same')), ...Array.from({ length: 6 }, (_, i) => frag(i + 10, '2022-01-01', 'r' + i))]
    const refs = selectReal(pool, emptyHistory(), mulberry(9))!.map((p) => p.refId)
    expect(refs.filter((r) => r === 'same').length).toBeLessThanOrEqual(1)
  })

  it('picks an impostor close to the real passages in length', () => {
    const reals = Array.from({ length: 5 }, (_, i) => frag(i)) // 12 words each
    const lines = [line('long', 'word '.repeat(40)), line('mid', 'one two three four five six seven eight nine ten eleven twelve'), line('short', 'tiny line here')]
    expect(pickStranger(lines, reals, () => 0)!.id).toBe('mid')
    expect(pickStranger([{ ...lines[0], usedAt: 5 }], reals, () => 0)).toBeNull()
  })
})

describe('a round', () => {
  const reals = Array.from({ length: 5 }, (_, i) => frag(i))
  const s = line('x', 'An invented line in the same voice that never happened.')
  const fresh = () => assemble(reals, s, mulberry(11), 'r1', 100)
  const strangerCard = (r = fresh()) => r.cards.find((c) => c.kind === 'stranger')!
  const realCards = (r = fresh()) => r.cards.filter((c) => c.kind === 'real')

  it('has six shuffled cards, exactly one impostor, and ids that give nothing away', () => {
    const r = fresh()
    expect(r.cards).toHaveLength(6)
    expect(r.cards.filter((c) => c.kind === 'stranger')).toHaveLength(1)
    expect(r.cards.every((c) => /^r1-\d$/.test(c.id))).toBe(true)
    const positions = new Set(Array.from({ length: 40 }, (_, i) => assemble(reals, s, mulberry(i + 1), 'r', 0).cards.findIndex((c) => c.kind === 'stranger')))
    expect(positions.size).toBeGreaterThan(3)
  })

  it('ends at once when the Stranger is found', () => {
    const r = accuse(fresh(), strangerCard().id, 200)
    expect(r.status).toBe('won')
    expect(summarize(r)).toMatchObject({ found: true, attempts: 1, mistaken: [] })
    expect(glyphs(r)).toBe('◆')
  })

  it('costs an accusation for a real memory and lets you go again', () => {
    const r0 = fresh()
    const wrong = realCards(r0)[0]
    const r1 = accuse(r0, wrong.id)
    expect(r1.status).toBe('playing')
    expect(attemptsLeft(r1)).toBe(ATTEMPTS - 1)
    expect(accuse(r1, wrong.id)).toBe(r1) // the same card twice does nothing
    const r2 = accuse(r1, strangerCard(r0).id)
    expect(summarize(r2)).toMatchObject({ found: true, attempts: 2 })
    expect(summarize(r2).mistaken.map((c) => c.id)).toEqual([wrong.id])
  })

  it('ends after three wrong accusations and reveals the Stranger', () => {
    let r = fresh()
    for (const c of realCards(r).slice(0, 3)) r = accuse(r, c.id)
    expect(r.status).toBe('lost')
    expect(accuse(r, strangerCard(r).id)).toBe(r)
    const sum = summarize(r)
    expect(sum).toMatchObject({ found: false, attempts: 3, done: true })
    expect(sum.stranger.kind).toBe('stranger')
    expect(sum.mistaken).toHaveLength(3)
  })

  it('adds up the record', () => {
    const won = accuse(fresh(), strangerCard().id)
    let lost = fresh()
    for (const c of realCards(lost).slice(0, 3)) lost = accuse(lost, c.id)
    const st = stats([won, lost, fresh()])
    expect(st).toEqual({ played: 2, found: 1, avgAttempts: 2, rate: 0.5 })
  })

  it('presents every card with the same typography, keeping the stored text', () => {
    expect(present('  “hello there...”  ')).toBe('Hello there…')
    expect(present('i went -- twice')).toBe('I went — twice')
  })
})

describe('style', () => {
  it('detects English, Russian, Kazakh and mixed writing', () => {
    expect(detectLang('we went to the market again')).toBe('en')
    expect(detectLang('мы опять пошли на рынок')).toBe('ru')
    expect(detectLang('біз тағы базарға бардық')).toBe('kk')
    expect(detectLang('короче мы опять опоздали, classic us')).toBe('mixed')
  })

  it('measures length and language mix locally', () => {
    const fs = [frag(1), { ...frag(2), text: 'мы опять опоздали на последний автобус домой сегодня вечером' }]
    const m = measure(fs)
    expect(m.passages).toBe(2)
    expect(m.languages.en).toBe(0.5)
    expect(m.languages.ru).toBe(0.5)
    expect(m.median).toBeGreaterThan(5)
  })

  it('masks names before anything is sent', () => {
    expect(maskNames('Anna and I met Bob at Dostyk.', ['Anna', 'Bob', 'Dostyk'])).toBe('[name] and I met [name] at [name].')
  })

  it('accepts a complete profile and rejects a thin one', () => {
    expect(() => parseStyle({ summary: 'x' })).toThrow()
    const p = parseStyle({ summary: 'short, wry', sentences: 'short', vocabulary: 'plain', expressions: ['короче'], languages: [{ code: 'ru', share: 0.7 }], periods: [] })
    expect(p.expressions).toEqual(['короче'])
  })

  it('needs a fragments array from Gemini', () => {
    expect(() => parseLines({})).toThrow()
    expect(parseLines({ fragments: [{ text: ' a line ', language: 'en' }, { text: '' }] })).toEqual([{ text: 'a line', language: 'en' }])
  })
})

describe('the gate for generated lines', () => {
  const real = [
    { ...frag(1), text: 'We missed the last bus and walked home in the rain, laughing the whole way.' },
    { ...frag(2), text: 'The kettle was still warm when we got back to the flat that night.' },
    { ...frag(3), text: 'Anna made pelmeni and we watched the snow fall over the yard.' },
  ]
  const gate = () => checker({ real, existing: ['I forgot my umbrella on the tram again and just accepted it.'], names: ['Anna', 'Almaty'], local: measure(real) })

  it('lets a plausible new line through', () => {
    expect(gate().check('Fell asleep on the sofa with the lights on and woke up at four, confused.')).toBeNull()
  })
  it('rejects copies and near copies of the archive', () => {
    expect(gate().check('We missed the last bus and walked home in the rain, laughing the whole way.')).toBe('copy')
    expect(gate().check('We missed the last bus and walked home in the rain, laughing a lot.')).toBe('near-copy')
  })
  it('rejects repeats of earlier generated lines', () => {
    const g = gate()
    expect(g.check('I forgot my umbrella on the tram again and just accepted it fully.')).toBe('repeat')
    g.accept('Bought too many lemons for no reason at all, again, at the shop.')
    expect(g.check('Bought too many lemons for no reason at all, again, at the shop.')).toBe('repeat')
  })
  it('rejects AI clichés, names, places, dates and odd lengths', () => {
    expect(gate().check('The evening felt like a tapestry of small, quiet moments together.')).toBe('cliche')
    expect(gate().check('Called Anna after work and we talked for an hour about nothing.')).toBe('archive-name')
    expect(gate().check('The whole day in Almaty felt slow and warm and kind of empty.')).toBe('archive-name')
    expect(gate().check('It was the 12.03.2021 and the trains were late again for everyone.')).toBe('date-or-handle')
    expect(gate().check('Too short.')).toBe('length')
    expect(gate().check('Met Gregory and Philippa outside the theatre before the rain started.')).toBe('proper-nouns')
  })
  it('rejects a language the archive never uses', () => {
    expect(gate().check('мы опять опоздали на последний автобус и шли домой пешком')).toBe('language')
  })
})
