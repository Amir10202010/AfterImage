import { describe, expect, it } from 'vitest'
import { extractMoments, extractRecall, extractThreads, findTime, score, sentences, splitAround } from './extract'

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
})

describe('title suggestions for a Russian story', () => {
  const story = 'Утром шёл дождь, и мы с Аней пошли в кофейню на углу. Она рассказала, что уезжает учиться в Прагу. Увидимся ли мы ещё?'
  it('are Russian, with no English frame around an inflected word', async () => {
    const { suggestTitles } = await import('./extract')
    const t = suggestTitles(story, 'Набережная', '2026-11-22')
    for (const x of t) expect(x).not.toMatch(/\b(The|day|A|in)\b/)
    expect(t).toContain('Набережная, ноябрь')
    expect(t).toContain('Воскресенье, 22 ноября')
  })
})

describe('threads in a Russian story', () => {
  it('finds promises and questions', async () => {
    const { extractThreads } = await import('./extract')
    const t = extractThreads('Шёл дождь. Я хочу запомнить, как пахло мокрым асфальтом. В следующий раз возьму зонт. Мы долго молчали. Увидимся ли мы ещё?')
    expect(t.map((x) => x.kind)).toEqual(['intention', 'intention', 'question'])
    expect(t[0].quote).toBe('Я хочу запомнить, как пахло мокрым асфальтом.')
  })
})
