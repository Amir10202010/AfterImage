// Finds what two days share — only from what the user actually recorded.
// Every "word" connection carries the two verbatim sentences it was found in.
import { norm, recallable, sentences } from './extract'
import type { Memory } from './types'

export type Connection =
  | { kind: 'word'; label: string; word: string; a: string; b: string }
  | { kind: 'person' | 'place' | 'song' | 'time'; label: string }

/** A light stemmer: laughing / laughed / laugh → laugh. */
export function stem(w: string) {
  const x = norm(w)
  if (x.length > 6 && x.endsWith('ing')) return x.slice(0, -3)
  if (x.length > 5 && x.endsWith('ed')) return x.slice(0, -2)
  if (x.length > 5 && x.endsWith('es')) return x.slice(0, -2)
  if (x.length > 4 && x.endsWith('s') && !x.endsWith('ss')) return x.slice(0, -1)
  return x
}

const WEAK = new Set(['started', 'start', 'stopped', 'stop', 'went', 'came', 'called', 'asked', 'said', 'told', 'looked', 'felt', 'tried', 'kept', 'used', 'finished', 'opened'])

function vocabulary(story: string) {
  const map = new Map<string, { word: string; sentence: string }>()
  for (const s of sentences(story)) {
    for (const m of s.matchAll(/\p{L}[\p{L}'’]*/gu)) {
      const w = m[0]
      if (/['’]/.test(w) || !recallable(w) || WEAK.has(norm(w))) continue
      const k = stem(w)
      if (!map.has(k)) map.set(k, { word: w, sentence: s })
    }
  }
  return map
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const SEASON = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter']

function d(iso: string) {
  const [y, m, day] = iso.split('-').map(Number)
  return new Date(y, m - 1, day)
}

export function daysApart(a: Memory, b: Memory) {
  return Math.round(Math.abs(d(a.date).getTime() - d(b.date).getTime()) / 86400000)
}

export function connections(a: Memory, b: Memory, maxWords = 4): Connection[] {
  const out: Connection[] = []

  // people — from the fields and from names written in both stories
  const peopleA = new Set(a.people.map(norm))
  const peopleB = new Set(b.people.map(norm))
  const sharedPeople = a.people.filter((p) => peopleB.has(norm(p)) || norm(b.story).includes(norm(p)))
  for (const p of b.people) if (!peopleA.has(norm(p)) && norm(a.story).includes(norm(p)) && !sharedPeople.includes(p)) sharedPeople.push(p)
  for (const p of sharedPeople) out.push({ kind: 'person', label: `${p} is in both days.` })

  if (a.location && b.location && norm(a.location) === norm(b.location)) out.push({ kind: 'place', label: `Both happened at ${a.location}.` })
  else if (a.location && norm(b.story).includes(norm(a.location))) out.push({ kind: 'place', label: `${a.location} comes up in both.` })
  else if (b.location && norm(a.story).includes(norm(b.location))) out.push({ kind: 'place', label: `${b.location} comes up in both.` })

  if (a.song && b.song) {
    if (norm(a.song.title) === norm(b.song.title)) out.push({ kind: 'song', label: `The same song played on both days: ${a.song.title}.` })
    else if (norm(a.song.artist) === norm(b.song.artist)) out.push({ kind: 'song', label: `Both days had ${a.song.artist} playing.` })
    else if (a.song.tempo === b.song.tempo) out.push({ kind: 'song', label: `Both days moved at the same tempo — ${a.song.tempo === 'fast' ? 'fast' : a.song.tempo === 'slow' ? 'slow and warm' : 'steady'}.` })
  }

  // shared words, rarest first
  const va = vocabulary(a.story)
  const vb = vocabulary(b.story)
  const names = new Set([...sharedPeople.map(norm)])
  const shared = [...va.keys()].filter((k) => vb.has(k) && !names.has(k))
  shared.sort((x, y) => y.length - x.length)
  for (const k of shared.slice(0, maxWords)) {
    const ea = va.get(k)!
    const eb = vb.get(k)!
    out.push({ kind: 'word', label: `You used the word “${ea.word.toLowerCase()}” on both days.`, word: k, a: ea.sentence, b: eb.sentence })
  }

  // calendar coincidences
  const da = d(a.date)
  const db = d(b.date)
  if (da.getMonth() === db.getMonth() && da.getFullYear() !== db.getFullYear()) out.push({ kind: 'time', label: `Both in ${MONTHS[da.getMonth()]}, ${Math.abs(da.getFullYear() - db.getFullYear())} ${Math.abs(da.getFullYear() - db.getFullYear()) === 1 ? 'year' : 'years'} apart.` })
  else if (SEASON[da.getMonth()] === SEASON[db.getMonth()]) out.push({ kind: 'time', label: `Both in ${SEASON[da.getMonth()]}.` })
  if (da.getDay() === db.getDay()) out.push({ kind: 'time', label: `Both were ${da.toLocaleDateString('en-GB', { weekday: 'long' })}s.` })
  const late = (t?: string) => !!t && (Number(t.slice(0, 2)) >= 21 || Number(t.slice(0, 2)) < 5)
  if (late(a.time) && late(b.time)) out.push({ kind: 'time', label: 'Both are night stories.' })
  if (a.mood && b.mood && norm(a.mood).split(/\W+/).some((w) => w.length > 3 && norm(b.mood!).includes(w))) out.push({ kind: 'time', label: `Both days felt ${a.mood.toLowerCase()}.` })

  return out
}
