// The Stranger's rules: which five real passages come up, where the impostor sits,
// what an accusation does, and how a round is scored. Pure functions — no storage, no network.
import type { RealFragment } from './fragments'
import { wordCount } from './fragments'

export const ATTEMPTS = 3
export const REAL_PER_ROUND = 5
const DAY = 86400000

export type Rng = () => number

/** A seeded generator, for tests and reproducible shuffles. */
export function mulberry(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/* ---------- rotation of real passages ---------- */

export interface SeenEntry {
  n: number
  /** round number this passage last appeared in */
  last: number
}
export interface History {
  round: number
  seen: Record<string, SeenEntry>
}
export const emptyHistory = (): History => ({ round: 0, seen: {} })

/**
 * How many rounds a passage rests after it's been shown. Grows with the archive:
 * 5–9 passages → no rest (it can't), 30 → 5 rounds, 65+ → 12 rounds.
 */
export function cooldownFor(pool: number) {
  return Math.max(0, Math.min(12, Math.floor(pool / 5) - 1))
}

function weight(f: RealFragment, h: History, now: number) {
  const s = h.seen[f.id]
  const age = f.date ? Math.max(0, (now - new Date(f.date + 'T12:00').getTime()) / DAY) : 180
  let w = 1 / Math.pow(1 + (s?.n ?? 0), 1.3) // less seen → more likely
  w *= 1 + Math.log1p(age / 90) // older → more likely
  if (age < 30) w *= 0.35 // the last month is too fresh to be a challenge (the Test Strip's rule)
  return w
}

function sample<T>(items: T[], weights: number[], rng: Rng): number {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = rng() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return i
  }
  return items.length - 1
}

/**
 * Five distinct passages for a round. Rested passages are skipped; if the archive is small
 * the ones that rested longest come back first. Two passages from the same record are avoided
 * while there's any alternative.
 */
export function selectReal(pool: RealFragment[], h: History, rng: Rng, now = Date.now(), n = REAL_PER_ROUND): RealFragment[] | null {
  const unique = [...new Map(pool.map((f) => [f.id, f])).values()]
  if (unique.length < n) return null
  const cool = cooldownFor(unique.length)
  const resting = (f: RealFragment) => {
    const s = h.seen[f.id]
    return !!s && h.round - s.last <= cool
  }
  let open = unique.filter((f) => !resting(f))
  const chosen: RealFragment[] = []
  const refs = new Set<string>()
  while (chosen.length < n && open.length) {
    const ws = open.map((f) => weight(f, h, now) * (refs.has(f.refId) ? 0.08 : 1))
    const i = sample(open, ws, rng)
    chosen.push(open[i])
    refs.add(open[i].refId)
    open = open.filter((_, k) => k !== i)
  }
  if (chosen.length < n) {
    const ids = new Set(chosen.map((c) => c.id))
    const back = unique.filter((f) => !ids.has(f.id)).sort((a, b) => (h.seen[a.id]?.last ?? -1) - (h.seen[b.id]?.last ?? -1))
    chosen.push(...back.slice(0, n - chosen.length))
  }
  return chosen
}

/** Marks a round's passages as seen. */
export function remember(h: History, ids: string[]): History {
  const round = h.round + 1
  const seen = { ...h.seen }
  for (const id of ids) seen[id] = { n: (seen[id]?.n ?? 0) + 1, last: round }
  return { round, seen }
}

/* ---------- the impostor ---------- */

export interface StrangerLine {
  id: string
  text: string
  language?: string
  createdAt: number
  batch: string
  usedAt?: number
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? s[Math.floor(s.length / 2)] : 0
}

/**
 * Picks the unused line whose length sits closest to the five real ones, so the impostor
 * is never reliably the longest or the shortest. Ties go to chance.
 */
export function pickStranger(lines: StrangerLine[], reals: RealFragment[], rng: Rng): StrangerLine | null {
  const unused = lines.filter((l) => !l.usedAt)
  if (!unused.length) return null
  const target = median(reals.map((r) => wordCount(r.text)))
  const ranked = [...unused].sort((a, b) => Math.abs(wordCount(a.text) - target) - Math.abs(wordCount(b.text) - target))
  const close = ranked.slice(0, Math.min(3, ranked.length))
  return close[Math.floor(rng() * close.length)]
}

/* ---------- a round ---------- */

export interface Card {
  id: string
  text: string
  kind: 'real' | 'stranger'
  /** for real cards: an immutable snapshot of where the passage came from */
  fragment?: RealFragment
  strangerId?: string
  language?: string
}

export type RoundStatus = 'playing' | 'won' | 'lost'

export interface Round {
  id: string
  startedAt: number
  completedAt?: number
  cards: Card[]
  /** card ids, in the order they were accused */
  accused: string[]
  status: RoundStatus
  /** played on the fictional demo archive */
  demo: boolean
}

export function shuffle<T>(xs: T[], rng: Rng): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function assemble(reals: RealFragment[], stranger: StrangerLine, rng: Rng, id: string, now = Date.now()): Round {
  const cards: Card[] = [
    ...reals.map((f, i) => ({ id: `${id}-${i}`, text: f.text, kind: 'real' as const, fragment: { ...f } })),
    { id: `${id}-s`, text: stranger.text, kind: 'stranger' as const, strangerId: stranger.id, language: stranger.language },
  ]
  // card ids must not give the impostor away (e.g. a "-s" suffix in the DOM)
  const shuffled = shuffle(cards, rng)
  const ids = shuffle(shuffled.map((_, i) => i), rng)
  return {
    id,
    startedAt: now,
    cards: shuffled.map((c, i) => ({ ...c, id: `${id}-${ids[i]}` })),
    accused: [],
    status: 'playing',
    demo: reals.some((r) => r.demo),
  }
}

/** One accusation. The Stranger ends the round at once; a third wrong guess ends it too. */
export function accuse(r: Round, cardId: string, now = Date.now()): Round {
  if (r.status !== 'playing' || r.accused.includes(cardId)) return r
  const card = r.cards.find((c) => c.id === cardId)
  if (!card) return r
  const accused = [...r.accused, cardId]
  if (card.kind === 'stranger') return { ...r, accused, status: 'won', completedAt: now }
  if (accused.length >= ATTEMPTS) return { ...r, accused, status: 'lost', completedAt: now }
  return { ...r, accused }
}

export const attemptsLeft = (r: Round) => (r.status === 'playing' ? ATTEMPTS - r.accused.length : 0)

export function summarize(r: Round) {
  const stranger = r.cards.find((c) => c.kind === 'stranger')!
  const mistaken = r.accused.map((id) => r.cards.find((c) => c.id === id)!).filter((c) => c.kind === 'real')
  return { found: r.status === 'won', attempts: r.accused.length, mistaken, stranger, done: r.status !== 'playing' }
}

/** A result line without any of the user's words: ▣ for each real accusation, ◆ for the find. */
export function glyphs(r: Round) {
  const marks = r.accused.map((id) => (r.cards.find((c) => c.id === id)?.kind === 'stranger' ? '◆' : '▣'))
  return marks.join('') + (r.status === 'lost' ? '·' : '')
}

export interface Stats {
  played: number
  found: number
  avgAttempts: number
  rate: number
}

export function stats(rounds: Round[]): Stats {
  const done = rounds.filter((r) => r.status !== 'playing')
  const found = done.filter((r) => r.status === 'won').length
  const tries = done.reduce((a, r) => a + r.accused.length, 0)
  return { played: done.length, found, avgAttempts: done.length ? tries / done.length : 0, rate: done.length ? found / done.length : 0 }
}

/** The same typography for every card, so punctuation habits of the renderer give nothing away. Stored text stays as written. */
export function present(text: string) {
  const t = text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\.{3,}/g, '…')
    .replace(/\s--\s/g, ' — ')
  const u = /^["“«].*["”»]$/.test(t) && !/["“”«»]/.test(t.slice(1, -1)) ? t.slice(1, -1) : t
  return u.charAt(0).toLocaleUpperCase() + u.slice(1)
}
