// The real half of The Stranger: verbatim passages the user wrote, with where they came from.
// Nothing here composes text — every fragment is an exact span of something in the archive.
import type { Letter, Memory, Page, ShoeboxItem } from '../types'
import { hash, norm, sentences } from '../extract'

export type FragmentSource = 'story' | 'detail' | 'letter' | 'caption' | 'note'

export interface RealFragment {
  /** stable across sessions: derived from where it came from and what it says */
  id: string
  text: string
  source: FragmentSource
  /** the record it was taken from */
  refId: string
  date?: string
  memoryId?: string
  letterId?: string
  shoeboxId?: string
  /** a journal page date, for notes and captions */
  pageDate?: string
  demo: boolean
}

export const MIN_WORDS = 6
export const MAX_WORDS = 48
export const MAX_CHARS = 300

export const wordCount = (s: string) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length

/** Text compared for duplicates: case, accents, punctuation and spacing ignored. */
export const key = (s: string) =>
  norm(s)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()

/** Sentences that only make sense attached to the one before them. */
const DEPENDENT = /^(and|but|so|or|then|which|because|also|too|though|anyway|и|а|но|или|потом|тоже|ещё|еще|және|бірақ|сосын)\b/i

/** Lines that aren't prose: lists of tags, links, handles, bare numbers. */
function prose(s: string) {
  if (/https?:\/\/|www\./i.test(s)) return false
  if ((s.match(/[#@]\S+/g) ?? []).length >= 2) return false
  const letters = s.replace(/[^\p{L}]/gu, '').length
  return letters >= s.replace(/\s/g, '').length * 0.6
}

/**
 * Splits a long text into self-contained passages of one to three sentences.
 * A sentence that leans on the previous one (starts lowercase or with "and/but/so…")
 * stays glued to it; very short sentences are joined to a neighbour.
 */
export function passages(text: string): string[] {
  const ss = sentences(text)
  const out: string[] = []
  let cur = ''
  const flush = () => {
    if (cur) out.push(cur)
    cur = ''
  }
  for (const s of ss) {
    const leans = cur && (/^\p{Ll}/u.test(s) || DEPENDENT.test(s))
    const short = cur && (wordCount(cur) < MIN_WORDS || wordCount(s) < 3)
    if (cur && (leans || short) && wordCount(cur + ' ' + s) <= MAX_WORDS) {
      cur = cur + ' ' + s
      continue
    }
    flush()
    cur = s
  }
  flush()
  return out.map((p) => p.replace(/\s+/g, ' ').trim()).filter((p) => fits(p))
}

export function fits(p: string) {
  const n = wordCount(p)
  return n >= MIN_WORDS && n <= MAX_WORDS && p.length <= MAX_CHARS && prose(p) && !DEPENDENT.test(p)
}

function frag(f: Omit<RealFragment, 'id'>): RealFragment {
  return { ...f, id: `f${hash(f.source + ':' + f.refId + ':' + key(f.text)).toString(36)}` }
}

export interface Archive {
  memories: Memory[]
  letters: Letter[]
  shoebox: ShoeboxItem[]
  pages: Record<string, Page>
}

/**
 * Every usable fragment in the archive, deduplicated by text.
 * Sealed letters are skipped — they can't be read before their date, not even by a game.
 */
export function extractFragments(a: Archive, opts: { includeDemo?: boolean; now?: number } = {}): RealFragment[] {
  const out: RealFragment[] = []
  const seen = new Set<string>()
  const push = (f: Omit<RealFragment, 'id'>) => {
    if (!opts.includeDemo && f.demo) return
    const k = key(f.text)
    if (!k || seen.has(k)) return
    seen.add(k)
    out.push(frag(f))
  }

  for (const m of a.memories) {
    const demo = !!m.demo
    for (const p of passages(m.story)) push({ text: p, source: 'story', refId: m.id, memoryId: m.id, date: m.date, demo })
    for (const d of m.details) if (fits(d.trim())) push({ text: d.trim(), source: 'detail', refId: m.id, memoryId: m.id, date: m.date, demo })
    for (const n of m.margin ?? []) for (const p of passages(n.text)) push({ text: p, source: 'note', refId: m.id, memoryId: m.id, date: n.at.slice(0, 10), demo })
  }

  for (const l of a.letters) {
    if (l.sealedUntil && new Date(l.sealedUntil).getTime() > (opts.now ?? Date.now())) continue
    const date = l.writtenAt.slice(0, 10)
    for (const p of passages(l.body)) push({ text: p, source: 'letter', refId: l.id, letterId: l.id, memoryId: l.memoryId, date, demo: !!l.demo })
  }

  for (const s of a.shoebox) {
    if (!s.caption) continue
    for (const p of passages(s.caption)) push({ text: p, source: 'caption', refId: s.id, shoeboxId: s.id, date: s.date, pageDate: s.date, demo: !!s.demo })
  }

  for (const pg of Object.values(a.pages))
    for (const it of pg.items) {
      if ((it.kind !== 'note' && it.kind !== 'label') || !it.text) continue
      const demo = pg.items.some((i) => i.ref?.startsWith('demo-'))
      for (const p of passages(it.text)) push({ text: p, source: 'note', refId: `${pg.date}:${it.id}`, pageDate: pg.date, date: pg.date, demo })
    }

  return out
}

/** What the user would need to add for a game, in plain words. */
export function shortfall(count: number, need = 5) {
  if (count >= need) return null
  const missing = need - count
  return `The Stranger needs at least ${need} passages you wrote — sentences of ${MIN_WORDS} words or more. It found ${count}. Save ${missing === 1 ? 'one more day' : 'a few more days'} with a story of a few sentences, write a letter, or bring in Instagram posts with captions.`
}
