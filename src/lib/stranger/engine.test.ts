// The whole loop with IndexedDB and the archive replaced by in-memory fakes, and Gemini by a script.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Memory } from '../types'

const tables = vi.hoisted(() => new Map<string, Map<string, unknown>>())
const archive = vi.hoisted(() => ({ memories: [] as Memory[], letters: [], shoebox: [], pages: {} }))

vi.mock('../db', () => {
  const t = (s: string) => (tables.get(s) ?? tables.set(s, new Map()).get(s))!
  return {
    db: {
      get: async (s: string, k: string) => structuredClone(t(s).get(k)),
      put: async (s: string, k: string, v: unknown) => void t(s).set(k, structuredClone(v)),
      del: async (s: string, k: string) => void t(s).delete(k),
      all: async (s: string) => [...t(s).values()],
      clear: async (s: string) => t(s).clear(),
      keys: async (s: string) => [...t(s).keys()],
      entries: async (s: string) => [...t(s).entries()],
    },
  }
})
vi.mock('../store', () => ({ getState: () => archive }))

import { setKeyStorage, setKeys, setTransport, type Call, type KVStore } from '../gemini'
import { mem } from './testkit'

const KEY = 'AIzaSyT_tttttttttttttttttttttttttttttttt'
const STYLE = { summary: 'Short, dry sentences.', sentences: 'short', vocabulary: 'plain', expressions: [], languages: [{ code: 'en', share: 1 }], periods: [] }

const STORIES = [
  'We missed the last bus and walked home in the rain, laughing the whole way.',
  'The kettle was still warm when we got back to the flat that night.',
  'I spent the whole afternoon fixing a bike that nobody even rides anymore.',
  'Grandma called to ask if I was eating properly, which I was not.',
  'The library smelled like old radiators and somebody else’s oranges today.',
  'Cooked rice for six people and somehow there was still not enough.',
  'Slept through two alarms and still made the train with a minute left.',
  'The neighbours were drilling at eight again, so I gave up on sleep.',
  'Found a receipt from a café I don’t remember ever going to in my coat.',
  'Watched the same film for the third time and cried at the same scene.',
  'My hands smelled of garlic all evening and I did not mind one bit.',
  'The power went out and we played cards by the light of our phones.',
]

let n = 0
const generated = () =>
  JSON.stringify({
    fragments: Array.from({ length: 10 }, () => {
      n++
      // twelve made-up words per line, never shared between lines, so every line is genuinely new
      const syl = ['ba', 'ko', 'ri', 'mu', 'te', 'lo', 'si', 'na', 'pe', 'du']
      const word = (i: number) => syl[i % 10] + syl[Math.floor(i / 10) % 10] + syl[Math.floor(i / 100) % 10]
      const words = Array.from({ length: 12 }, (_, j) => word(n * 12 + j))
      return { text: words.join(' ') + '.', language: 'en' }
    }),
  })

let calls: Call[] = []
function memStore(): KVStore {
  const m = new Map<string, string>()
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) }
}

async function fresh() {
  vi.resetModules()
  const engine = await import('./engine')
  const gemini = await import('../gemini')
  gemini.setKeyStorage(kv)
  gemini.setTransport(async (c) => {
    calls.push(c)
    return c.prompt.includes('STYLE PROFILE') ? generated() : JSON.stringify(STYLE)
  })
  await engine.loadStranger()
  return engine
}

let kv: KVStore
beforeEach(() => {
  tables.clear()
  calls = []
  n = 0
  kv = memStore()
  archive.memories = STORIES.map((s, i) => mem('m' + i, `2022-0${(i % 9) + 1}-1${i % 9}`, s, { people: i === 3 ? ['Grandma'] : [] }))
  setKeyStorage(kv)
  setTransport(null)
})

describe('the Stranger engine', () => {
  it('explains what is missing before anything is sent', async () => {
    const e = await fresh()
    const r = await e.startRound()
    expect(r).toEqual({ ok: false, blockers: ['no-consent', 'no-profile'] })
    expect(calls).toHaveLength(0)
  })

  it('reports an archive that is too small', async () => {
    archive.memories = archive.memories.slice(0, 3)
    const e = await fresh()
    expect(e.blockers()).toContain('short')
    const r = await e.startRound()
    expect(r.ok).toBe(false)
  })

  it('needs consent before the profile is built', async () => {
    const e = await fresh()
    setKeys([KEY])
    expect(await e.buildProfile()).toBe(false)
    expect(calls).toHaveLength(0)
    expect(e.strangerState().lastError?.message).toMatch(/agreement to the terms/i)
  })

  it('builds the profile once, then plays round after round from the queue', async () => {
    let e = await fresh()
    setKeys([KEY])
    await e.setPrefs({ consentAt: 1 })
    expect(await e.buildProfile()).toBe(true)
    expect(calls.filter((c) => !c.prompt.includes('STYLE PROFILE'))).toHaveLength(1)
    // names are masked before they leave the device
    expect(calls[0].prompt).not.toContain('Grandma')
    expect(calls[0].prompt).toContain('[name]')

    // the profile survives a reload and isn't rebuilt
    e = await fresh()
    expect(e.strangerState().profile?.style.summary).toBe(STYLE.summary)

    const seen: string[][] = []
    const strangers = new Set<string>()
    for (let i = 0; i < 6; i++) {
      const r = await e.startRound()
      if (!r.ok) throw new Error(JSON.stringify(r))
      expect(r.round.cards).toHaveLength(6)
      const s = r.round.cards.filter((c) => c.kind === 'stranger')
      expect(s).toHaveLength(1)
      strangers.add(s[0].text)
      seen.push(r.round.cards.filter((c) => c.kind === 'real').map((c) => c.fragment!.id))
      // play it out: accuse the impostor
      await e.accuseCard(r.round.id, s[0].id)
    }
    // one profile request in total; lines came in batches, not one per round
    const profileCalls = calls.filter((c) => !c.prompt.includes('STYLE PROFILE'))
    const lineCalls = calls.filter((c) => c.prompt.includes('STYLE PROFILE'))
    expect(profileCalls).toHaveLength(1)
    expect(lineCalls.length).toBeLessThanOrEqual(2)
    expect(strangers.size).toBe(6)
    // consecutive rounds don't share real passages (12 passages → 1 round of rest)
    for (let i = 1; i < seen.length; i++) for (const id of seen[i]) expect(seen[i - 1]).not.toContain(id)
    const st = (await import('./game')).stats(e.strangerState().rounds)
    expect(st).toMatchObject({ played: 6, found: 6, rate: 1 })
  })

  it('refreshes the profile with only the new writing', async () => {
    const e = await fresh()
    setKeys([KEY])
    await e.setPrefs({ consentAt: 1 })
    await e.buildProfile()
    calls = []
    expect(await e.refreshProfile()).toBe(true)
    expect(calls).toHaveLength(0) // nothing new, nothing sent
    archive.memories = [...archive.memories, mem('new', '2025-01-01', 'Painted the kitchen door green and regretted it within the hour.')]
    expect(await e.refreshProfile()).toBe(true)
    expect(calls).toHaveLength(1)
    expect(calls[0].prompt).toContain('EXISTING PROFILE')
    expect(calls[0].prompt).toContain('Painted the kitchen door green')
    expect(calls[0].prompt).not.toContain('We missed the last bus')
  })

  it('does not invent a replacement when Gemini fails', async () => {
    const e = await fresh()
    setKeys([KEY])
    await e.setPrefs({ consentAt: 1 })
    await e.buildProfile()
    const g = await import('../gemini')
    g.setTransport(async () => {
      throw Object.assign(new Error('quota'), { status: 429 })
    })
    const r = await e.startRound()
    expect(r.ok).toBe(false)
    expect(e.unused()).toHaveLength(0)
    expect('error' in r && r.error).toMatch(/quota/i)
  })

  it('keeps API keys out of IndexedDB entirely', async () => {
    const e = await fresh()
    setKeys([KEY])
    await e.setPrefs({ consentAt: 1 })
    await e.buildProfile()
    await e.startRound()
    const dump = JSON.stringify([...tables.entries()].map(([k, v]) => [k, [...v.entries()]]))
    expect(dump).not.toContain(KEY)
    expect(dump).toContain('stranger:profile')
  })
})
