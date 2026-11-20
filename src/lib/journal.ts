// The journal: every day that has photographs or words, from memories and from the shoebox.
import type { Memory, PageItem, ShoeboxItem } from './types'
import { hash, sentences } from './extract'

export interface Day {
  date: string
  memories: Memory[]
  shots: ShoeboxItem[]
}

export function dayIndex(memories: Memory[], shoebox: ShoeboxItem[]) {
  const map = new Map<string, Day>()
  const get = (d: string) => {
    if (!map.has(d)) map.set(d, { date: d, memories: [], shots: [] })
    return map.get(d)!
  }
  for (const m of memories) get(m.date).memories.push(m)
  for (const s of shoebox) get(s.date).shots.push(s)
  return map
}

/** A photo reference a page can hold. Undeveloped memories stay negatives in the journal. */
export interface PhotoRef {
  ref: string
  negative?: boolean
  memoryId?: string
}

export function dayPhotos(day: Day): PhotoRef[] {
  const out: PhotoRef[] = []
  for (const m of day.memories) {
    const negative = !m.progress.developedAt
    if (m.photoIds.length) m.photoIds.forEach((id) => out.push({ ref: id, negative, memoryId: m.id }))
    else out.push({ ref: m.art ? `art:${m.art}` : `gram:${m.id}`, negative, memoryId: m.id })
  }
  const memPhotos = new Set(out.map((p) => p.ref))
  for (const s of day.shots) if (!memPhotos.has(s.blobId)) out.push({ ref: s.blobId })
  return out
}

/** Words for the page: captions and sentences the user actually wrote that day. */
export function dayWords(day: Day): string[] {
  const out: string[] = []
  for (const s of day.shots) if (s.caption) out.push(s.caption)
  for (const m of day.memories) {
    const ss = sentences(m.story).filter((x) => x.length < 120)
    if (ss[0]) out.push(ss[0])
  }
  return [...new Set(out)]
}

export function monthKey(date: string) {
  return date.slice(0, 7)
}

/* ---------- automatic layout for a notebook spread ---------- */
function rng(seed: number) {
  let s = seed % 2147483647 || 1
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

let n = 0
const id = () => `i${Date.now().toString(36)}${(n++).toString(36)}`

// Photo slots, measured so frames don't collide (a page is 0.72 as wide as it is tall).
const SLOTS: { page: 0 | 1; x: number; y: number; w: number; variant: string }[] = [
  { page: 0, x: 8, y: 6, w: 54, variant: 'instax' },
  { page: 1, x: 38, y: 9, w: 52, variant: 'square' },
  { page: 0, x: 50, y: 53, w: 42, variant: 'instax' },
  { page: 1, x: 7, y: 70, w: 34, variant: 'square' },
]

export function autoLayout(day: Day): PageItem[] {
  const r = rng(hash(day.date))
  const items: PageItem[] = []
  let z = 1
  const rot = (a = 4) => Math.round((r() * 2 - 1) * a * 10) / 10
  const photos = dayPhotos(day).slice(0, SLOTS.length)
  const words = dayWords(day)
  const m = day.memories[0]
  const [y, mo, d] = day.date.split('-')

  photos.forEach((p, i) => {
    const s = SLOTS[i]
    items.push({ id: id(), kind: 'photo', page: s.page, ref: p.ref, variant: s.variant, x: s.x + rot(1.5), y: s.y + rot(1.5), w: s.w, r: rot(4), z: z++ })
    if (r() > 0.4) items.push({ id: id(), kind: 'tape', page: s.page, variant: ['kraft', 'grid', 'flower', 'red'][Math.floor(r() * 4)], x: s.x + s.w * 0.32, y: s.y - 2.2, w: 20, r: rot(12), z: 60 })
  })

  items.push({ id: id(), kind: 'label', page: 1, variant: 'typed', text: `${y} ${mo} ${d}`, x: 44, y: 2.5, w: 50, r: 0, z: z++ })
  const head = stampText(m?.location ?? m?.title ?? '')
  if (head) items.push({ id: id(), kind: 'label', page: 1, variant: 'stamp', text: head, x: 4, y: photos.length > 1 ? 54 : 30, w: 92, r: rot(1.5), z: z++ })

  // your own words: one handwritten line under the first photo, one on a sticky note
  if (words[0]) items.push({ id: id(), kind: 'note', page: 0, variant: 'hand', text: words[0], x: 8, y: photos.length ? 62 : 20, w: photos.length > 2 ? 40 : 76, r: rot(2), z: z++ })
  if (words[1]) items.push({ id: id(), kind: 'note', page: 1, variant: 'sticky', text: words[1], x: 52, y: 70, w: 40, r: rot(4), z: z++ })

  items.push({ id: id(), kind: 'ticket', page: 0, variant: r() > 0.5 ? 'yellow' : 'cream', text: `№ ${String((hash(day.date) % 90000) + 10000)}`, x: 68, y: 8 + rot(3), w: 25, r: rot(8), z: z++ })
  if (m?.song) items.push({ id: id(), kind: 'ticket', page: 1, variant: 'tag', text: m.song.title, x: 4, y: 12, w: 32, r: rot(8), z: z++ })
  const stickers = ['camera', 'flower', 'stamp', 'heart', 'star', 'leaf']
  items.push({ id: id(), kind: 'sticker', page: 0, variant: stickers[Math.floor(r() * stickers.length)], x: 1, y: 1, w: 11, r: rot(15), z: z++ })
  items.push({ id: id(), kind: 'sticker', page: 1, variant: stickers[Math.floor(r() * stickers.length)], x: 44, y: photos.length > 3 ? 88 : 72, w: 12, r: rot(15), z: z++ })
  return items
}

export function newItem(kind: PageItem['kind'], page: 0 | 1, extra: Partial<PageItem> = {}): PageItem {
  const base: Record<PageItem['kind'], Partial<PageItem>> = {
    photo: { w: 48, variant: 'instax' },
    note: { w: 44, variant: 'hand', text: 'write something…' },
    sticker: { w: 14, variant: 'flower' },
    ticket: { w: 24, variant: 'yellow', text: '№ 00001' },
    tape: { w: 20, variant: 'kraft' },
    label: { w: 70, variant: 'stamp', text: 'TITLE' },
  }
  return { id: id(), kind, page, x: 30, y: 35, r: Math.round((Math.random() * 2 - 1) * 40) / 10, z: 100, w: 30, ...base[kind], ...extra }
}

/** A short headline for stamped letters: the part before a comma, cut at whole words. */
export function stampText(s: string, max = 16) {
  let t = s.split(/[,;—–(]/)[0].trim().toUpperCase()
  if (t.length <= max) return t
  let out = ''
  for (const w of t.split(/\s+/)) {
    if ((out + ' ' + w).trim().length > max) break
    out = (out + ' ' + w).trim()
  }
  return out || t.slice(0, max)
}
