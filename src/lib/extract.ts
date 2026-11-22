// Afterimage's offline "reader". It only ever *selects* verbatim spans of what the
// user wrote; it never composes sentences on their behalf.
import type { BathId, Cover, Moment, RecallItem, Tempo, Theme, Thread } from './types'

const STOP = new Set(
  `about above after again against all also although always among another anyone anything around because been before being below between both bring brought cannot could didn doesn doing don down during each either else enough even ever every everyone everything few first from further going gonna have having here hers herself himself however into itself just know knew last later least less like little made make many maybe might more most much must myself never next nothing nobody now often once only other ours ourselves over own really right same says said should since some something sometimes still such than that their theirs them themselves then there these they thing things think this those though thought through today together tomorrow tonight too under until very want wanted wanting were what whatever when where whether which while whole whom whose will with within without would wouldn yeah year years your yours yourself yourselves the and for you our was are has had his her its who how why can not get got one two three four five six seven eight nine ten okay because everything somebody someone actually literally probably already finally almost again`.split(
    /\s+/,
  ),
)

export function norm(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

export function sentences(story: string): string[] {
  return story
    .replace(/\r/g, '')
    .split(/\n+/)
    .flatMap((para) => para.match(/[^.!?…]+(?:[.!?…]+["'”’)]*|$)/g) ?? [])
    .map((s) => s.trim())
    .filter((s) => s.replace(/[^\p{L}\p{N}]/gu, '').length > 2)
}

/** Finds a time expression in a sentence and returns it in a display form. */
export function findTime(s: string): string | undefined {
  let m = s.match(/\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)(?![a-z])/i)
  if (m) {
    let h = Number(m[1]) % 12
    if (/p/i.test(m[3])) h += 12
    return `${String(h).padStart(2, '0')}:${m[2] ?? '00'}`
  }
  m = s.match(/\b([01]?\d|2[0-3])[:.h]([0-5]\d)\b/)
  if (m) return `${m[1].padStart(2, '0')}:${m[2]}`
  if (/\bmidnight\b/i.test(s)) return '00:00'
  if (/\bnoon|midday\b/i.test(s)) return '12:00'
  const part = s.match(/\b(dawn|sunrise|morning|lunch(?:time)?|afternoon|sunset|evening|night)\b/i)
  if (part) return part[1].toLowerCase()
  return undefined
}

let counter = 0
const id = (p: string) => `${p}${Date.now().toString(36)}${(counter++).toString(36)}`

export function extractMoments(story: string, max = 6): Moment[] {
  const all = sentences(story).filter((s) => !/\?\s*["'”’]?$/.test(s))
  if (all.length < 3) return all.map((text) => ({ id: id('m'), text, time: findTime(text) }))
  const idx = all.map((s, i) => ({ s, i, t: findTime(s) }))
  const timed = idx.filter((x) => x.t)
  let chosen = timed.slice(0, max)
  if (chosen.length < Math.min(max, all.length)) {
    const rest = idx.filter((x) => !x.t)
    const need = Math.min(max, all.length) - chosen.length
    const step = rest.length / need
    for (let k = 0; k < need; k++) chosen.push(rest[Math.floor(k * step)])
  }
  chosen = chosen.sort((a, b) => a.i - b.i)
  return chosen.map((x) => ({ id: id('m'), text: x.s, time: x.t }))
}

function words(s: string) {
  return [...s.matchAll(/\p{L}[\p{L}'’-]*\p{L}|\p{L}/gu)].map((m) => ({ w: m[0], at: m.index ?? 0 }))
}

/** A word is recallable if it's purely alphabetic, long enough, and meaningful. */
export function recallable(w: string) {
  return /^\p{L}+$/u.test(w) && w.length >= 4 && w.length <= 12 && !STOP.has(norm(w))
}

export function extractRecall(story: string, max = 3, avoid: string[] = []): RecallItem[] {
  const ss = sentences(story)
  const freq = new Map<string, number>()
  for (const s of ss) for (const { w } of words(s)) freq.set(norm(w), (freq.get(norm(w)) ?? 0) + 1)
  const cands: { sentence: string; word: string; score: number }[] = []
  for (const s of ss) {
    if (s.length > 180) continue
    let best: { word: string; score: number } | undefined
    for (const { w, at } of words(s)) {
      if (!recallable(w)) continue
      let score = Math.min(w.length, 9)
      if (/^\p{Lu}/u.test(w) && at > 0) score += 4 // a name or place, mid-sentence
      if ((freq.get(norm(w)) ?? 0) === 1) score += 2
      if (/(ing|ly|ed)$/.test(w)) score -= 3
      if (avoid.some((a) => norm(a).includes(norm(w)))) score -= 6
      if (!best || score > best.score) best = { word: w, score }
    }
    if (best) cands.push({ sentence: s, ...best })
  }
  // one game per word: the same word picked from two sentences would ask the same question twice
  const seen = new Set<string>()
  return cands
    .sort((a, b) => b.score - a.score)
    .filter((c) => !seen.has(norm(c.word)) && !!seen.add(norm(c.word)))
    .slice(0, max)
    .sort((a, b) => ss.indexOf(a.sentence) - ss.indexOf(b.sentence))
    .map((c) => ({ id: id('r'), sentence: c.sentence, word: c.word }))
}

/** A word the writer capitalises in the middle of a sentence is a name: keep its capital. */
function isName(word: string, story: string) {
  if (!/^\p{Lu}\p{Ll}/u.test(word)) return false
  const w = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`[\\p{Ll},;:]\\s+${w}\\b`, 'u').test(story)
}

const INTENT =
  /\b(I(?:'|’)?m going to|I am going to|I(?:'|’)?m gonna|I will|I(?:'|’)ll|I want to|I wanna|I promise|I need to|I have to|I plan to|I hope to|I should|we should|we(?:'|’)ll|we will|next time|one day I|someday)\b/i

export function extractThreads(story: string, max = 5): Thread[] {
  const out: Thread[] = []
  for (const s of sentences(story)) {
    if (/\?\s*["'”’]?$/.test(s)) out.push({ id: id('t'), quote: s, kind: 'question' })
    else if (INTENT.test(s)) out.push({ id: id('t'), quote: s, kind: 'intention' })
  }
  return out.slice(0, max)
}

export function suggestTitles(story: string, location?: string, date?: string): string[] {
  const out: string[] = []
  const ss = sentences(story)
  const rec = extractRecall(story, 1)[0]
  if (rec) out.push(`The ${isName(rec.word, story) ? rec.word : rec.word.toLowerCase()} day`)
  if (location) {
    const month = date ? new Date(date + 'T12:00').toLocaleDateString('en-GB', { month: 'long' }) : ''
    out.push(`${location}${month ? ', ' + month : ''}`)
  }
  if (ss[0]) {
    const first = ss[0].replace(/[.!?…]+$/, '').split(/\s+/).slice(0, 6).join(' ')
    out.push(first + (ss[0].split(/\s+/).length > 6 ? '…' : ''))
  }
  const d = date ? new Date(date + 'T12:00') : new Date()
  out.push(`A ${d.toLocaleDateString('en-GB', { weekday: 'long' })} in ${d.toLocaleDateString('en-GB', { month: 'long' })}`)
  return [...new Set(out)].slice(0, 4)
}

export function suggestTheme(opts: { story: string; time?: string; tempo?: Tempo; mood?: string }): Theme {
  const h = opts.time ? Number(opts.time.slice(0, 2)) : NaN
  const s = norm(opts.story + ' ' + (opts.mood ?? ''))
  if (opts.tempo === 'fast' || h >= 21 || h < 5 || /\b(midnight|deadline|night|insomnia|3am|club|neon)\b/.test(s)) return 'night'
  if (/\b(autumn|fall|leaves|park|coffee|sunset|nostalg|warm|cozy|cosy|october|september|november)\b/.test(s)) return 'autumn'
  return 'paper'
}

export function coverFor(theme: Theme): Cover {
  return theme === 'night' ? 'static' : theme === 'autumn' ? 'leaves' : 'dust'
}

/** Wordle-style feedback for a guess of a known word. */
export type Mark = 'hit' | 'near' | 'miss'
export function score(guess: string, answer: string): Mark[] {
  const g = [...norm(guess)]
  const a = [...norm(answer)]
  const res: Mark[] = g.map(() => 'miss')
  const pool = new Map<string, number>()
  a.forEach((ch, i) => {
    if (g[i] === ch) res[i] = 'hit'
    else pool.set(ch, (pool.get(ch) ?? 0) + 1)
  })
  g.forEach((ch, i) => {
    if (res[i] === 'hit') return
    const n = pool.get(ch) ?? 0
    if (n > 0) {
      res[i] = 'near'
      pool.set(ch, n - 1)
    }
  })
  return res
}

/** Splits a sentence around the first whole-word occurrence of `word`. */
export function splitAround(sentence: string, word: string): [string, string, string] | null {
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const m = sentence.match(new RegExp(`(^|[^\\p{L}])(${esc})(?![\\p{L}])`, 'u'))
  if (!m || m.index === undefined) return null
  const start = m.index + m[1].length
  return [sentence.slice(0, start), m[2], sentence.slice(start + m[2].length)]
}

/** Deterministic hash, used to tie a song to a palette and a chord. */
export function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** A memory only runs the baths its material supports. */
export function bathsFor(m: { details: string[]; moments: Moment[]; recall: RecallItem[]; threads: Thread[] }): BathId[] {
  const b: BathId[] = []
  if (m.details.length >= 1) b.push('surface')
  if (m.moments.length >= 3) b.push('sequence')
  if (m.recall.length >= 1) b.push('recall')
  if (m.threads.length >= 1) b.push('ledger')
  b.push('meeting')
  return b
}
