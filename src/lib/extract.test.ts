import { describe, expect, it } from 'vitest'
import { extractMoments, extractRecall, extractThreads, findTime, score, sentences, splitAround, suggestTitles } from './extract'

const story = `Woke up at 7am to snow on the balcony. Dad called at noon and asked if I'm coming home. At 3pm I finished the chapter. I'm going to send it to Anna tomorrow. We ate pelmeni around 8pm. Is it strange that I felt homesick and happy?`

describe('the offline reader', () => {
  it('splits sentences', () => {
    expect(sentences(story)).toHaveLength(6)
  })
  it('finds times', () => {
    expect(findTime('at 7am')).toBe('07:00')
    expect(findTime('around 8:30 pm')).toBe('20:30')
    expect(findTime('23:40 — the database connected')).toBe('23:40')
    expect(findTime('at noon')).toBe('12:00')
    expect(findTime('nothing here')).toBeUndefined()
  })
  it('only ever quotes verbatim', () => {
    for (const m of extractMoments(story)) expect(story).toContain(m.text)
    for (const t of extractThreads(story)) expect(story).toContain(t.quote)
    for (const r of extractRecall(story)) {
      expect(story).toContain(r.sentence)
      expect(splitAround(r.sentence, r.word)).not.toBeNull()
    }
  })
  it('finds intentions and questions', () => {
    const t = extractThreads(story)
    expect(t.map((x) => x.kind)).toEqual(['intention', 'question'])
  })
  it('scores guesses like a contact sheet', () => {
    expect(score('cupssst', 'thermos')).toEqual(['miss', 'miss', 'miss', 'near', 'miss', 'miss', 'near'])
    expect(score('radio', 'radio').every((m) => m === 'hit')).toBe(true)
  })

  it('never asks for the same word twice', () => {
    const repeated = 'We walked along the embankment. The embankment was empty. Then the embankment lights came on.'
    const words = extractRecall(repeated, 3).map((r) => r.word.toLowerCase())
    expect(new Set(words).size).toBe(words.length)
  })
  it('keeps the capital of a name in a suggested title, and lowers ordinary words', () => {
    expect(suggestTitles('Lunch with Mira by the river. Mira laughed at everything.')[0]).toBe('The Mira day')
    expect(suggestTitles('Rain all morning. Everything smelled of wet chestnuts.')[0]).toMatch(/^The [a-z]+ day$/)
  })
})
