import { useEffect, useState, useSyncExternalStore } from 'react'
import { db } from './db'
import type { Exposure, Letter, Memory, Page, ShoeboxItem, StripResult } from './types'
import { MORE_DEMO_IDS, buildDemo } from '../demo/seed'

interface State {
  ready: boolean
  memories: Memory[]
  letters: Letter[]
  exposures: Exposure[]
  strips: Record<string, StripResult>
  shoebox: ShoeboxItem[]
  pages: Record<string, Page>
  /** music-box strips you punched by hand, by month */
  tunes: Record<string, string[]>
  error?: string
}

let state: State = { ready: false, memories: [], letters: [], exposures: [], strips: {}, shoebox: [], pages: {}, tunes: {} }
const listeners = new Set<() => void>()

function set(next: Partial<State>) {
  state = { ...state, ...next }
  listeners.forEach((l) => l())
}

export function uid(prefix = '') {
  return prefix + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4)
}

const byDate = (a: Memory, b: Memory) => a.date.localeCompare(b.date)

export async function init() {
  try {
    const seeded = await db.get<boolean>('meta', 'seeded')
    if (!seeded) await seedDemos()
    else if (!(await db.get<boolean>('meta', 'seededMoreDemos'))) await seedMoreDemos()
    if (!(await db.get<boolean>('meta', 'seededRoll'))) await seedDemoRoll()
    const [memories, letters, exposures, strips, shoebox, pages] = await Promise.all([
      db.all<Memory>('memories'),
      db.all<Letter>('letters'),
      db.get<Exposure[]>('meta', 'exposures'),
      db.get<Record<string, StripResult>>('meta', 'strips'),
      db.all<ShoeboxItem>('shoebox'),
      db.all<Page>('pages'),
    ])
    const tunes = (await db.get<Record<string, string[]>>('meta', 'tunes')) ?? {}
    set({
      ready: true,
      memories: memories.sort(byDate),
      letters,
      exposures: exposures ?? [],
      strips: strips ?? {},
      shoebox: shoebox.sort((a, b) => a.takenAt.localeCompare(b.takenAt)),
      pages: Object.fromEntries(pages.map((p) => [p.date, p])),
      tunes,
    })
  } catch (e) {
    set({ ready: true, error: 'Your browser blocked local storage, so nothing can be saved here. ' + String(e) })
  }
}

async function seedDemos() {
  const { memories, letters } = buildDemo(new Date())
  for (const m of memories) await db.put('memories', m.id, m)
  for (const l of letters) await db.put('letters', l.id, l)
  await db.put('meta', 'seeded', true)
  await db.put('meta', 'seededMoreDemos', true)
}

/** Diaries started before the three later demo days existed get them once (never again if deleted). */
async function seedMoreDemos() {
  const fresh = buildDemo(new Date()).memories.filter((m) => (MORE_DEMO_IDS as readonly string[]).includes(m.id))
  for (const m of fresh) if (!(await db.get<Memory>('memories', m.id))) await db.put('memories', m.id, m)
  await db.put('meta', 'seededMoreDemos', true)
}

/** The fictional demo person's camera roll, for the journal. */
async function seedDemoRoll() {
  const { demoRoll } = await import('../demo/shoebox')
  for (const r of demoRoll()) {
    const id = 'demo-s-' + r.key.split(':')[1]
    const blobId = 'demo-b-' + r.key.split(':')[1]
    await db.put('blobs', blobId, new Blob([r.svg], { type: 'image/svg+xml' }))
    const item: ShoeboxItem = { id, blobId, thumbId: blobId, date: r.date, takenAt: r.takenAt, source: 'demo', caption: r.caption, name: r.name, key: r.key, w: 800, h: 1000, demo: true }
    await db.put('shoebox', id, item)
  }
  await db.put('meta', 'seededRoll', true)
}

/** Every blob something still points to: a day's photos and song file, the shoebox, notebook pages. */
export function liveBlobIds(st: Pick<State, 'memories' | 'shoebox' | 'pages'>): Set<string> {
  const live = new Set<string>()
  for (const m of st.memories) {
    for (const id of m.photoIds) live.add(id)
    if (m.song?.audioId) live.add(m.song.audioId)
  }
  for (const it of st.shoebox) {
    live.add(it.blobId)
    live.add(it.thumbId)
  }
  for (const p of Object.values(st.pages)) for (const i of p.items) if (i.ref) live.add(i.ref)
  return live
}

/** Deletes blobs nothing points to any more (left behind by earlier demo restores). */
async function pruneOrphanBlobs() {
  const live = liveBlobIds(state)
  for (const k of await db.keys('blobs')) if (!live.has(String(k))) await db.del('blobs', String(k))
}

export async function restoreDemos() {
  for (const m of state.memories.filter((m) => m.demo)) await db.del('memories', m.id)
  for (const l of state.letters.filter((l) => l.demo)) await db.del('letters', l.id)
  for (const s of state.shoebox.filter((s) => s.demo)) await db.del('shoebox', s.id)
  for (const d of Object.keys(state.pages)) if (state.pages[d].items.some((i) => i.ref?.startsWith('demo-'))) await db.del('pages', d)
  await seedDemos()
  await seedDemoRoll()
  const [memories, letters, shoebox, pages] = await Promise.all([db.all<Memory>('memories'), db.all<Letter>('letters'), db.all<ShoeboxItem>('shoebox'), db.all<Page>('pages')])
  set({ memories: memories.sort(byDate), letters, shoebox: shoebox.sort((a, b) => a.takenAt.localeCompare(b.takenAt)), pages: Object.fromEntries(pages.map((p) => [p.date, p])) })
  // real photos in public/demo/ replace the drawings again — once the fresh state is in place
  await (await import('../demo/upgrade')).recheckDemoAssets()
  // the old demo photos are not pointed to by anything now: drop them, or every restore adds ~20 MB
  await pruneOrphanBlobs()
  const live = liveBlobIds(state)
  urlCache.forEach((u, id) => {
    if (!live.has(id)) {
      URL.revokeObjectURL(u)
      urlCache.delete(id)
    }
  })
}

export async function eraseEverything() {
  await Promise.all([db.clear('memories'), db.clear('letters'), db.clear('blobs'), db.clear('shoebox'), db.clear('pages')])
  await db.put('meta', 'seeded', true)
  await db.put('meta', 'seededRoll', true)
  await db.put('meta', 'exposures', [])
  await db.put('meta', 'strips', {})
  // The Stranger keeps snapshots of passages in its round history — they go too (API keys are not memories and stay)
  for (const k of ['stranger:profile', 'stranger:queue', 'stranger:history', 'stranger:rounds']) await db.del('meta', k)
  window.dispatchEvent(new Event('afterimage:erased'))
  set({ exposures: [], strips: {}, shoebox: [], pages: {}, tunes: {} })
  urlCache.forEach((u) => URL.revokeObjectURL(u))
  urlCache.clear()
  set({ memories: [], letters: [] })
}

export async function saveMemory(m: Memory) {
  await db.put('memories', m.id, m)
  const others = state.memories.filter((x) => x.id !== m.id)
  set({ memories: [...others, m].sort(byDate) })
}

export async function updateMemory(id: string, fn: (m: Memory) => Memory) {
  const m = state.memories.find((x) => x.id === id)
  if (!m) return
  await saveMemory(fn(structuredClone(m)))
}

export async function deleteMemory(id: string) {
  const m = state.memories.find((x) => x.id === id)
  if (!m) return
  await db.del('memories', id)
  // photos that came from the shoebox stay — they belong to the journal too
  const shared = new Set(state.shoebox.map((x) => x.blobId))
  for (const p of m.photoIds) if (!shared.has(p)) await db.del('blobs', p)
  if (m.song?.audioId) await db.del('blobs', m.song.audioId)
  const letters = state.letters.filter((l) => l.memoryId === id)
  for (const l of letters) await db.del('letters', l.id)
  const exposures = state.exposures.filter((e) => e.a !== id && e.b !== id)
  await db.put('meta', 'exposures', exposures)
  set({
    memories: state.memories.filter((x) => x.id !== id),
    letters: state.letters.filter((l) => l.memoryId !== id),
    exposures,
  })
}

export async function saveExposure(e: Exposure) {
  const exposures = [...state.exposures.filter((x) => x.id !== e.id), e]
  await db.put('meta', 'exposures', exposures)
  set({ exposures })
}

export async function deleteExposure(id: string) {
  const exposures = state.exposures.filter((x) => x.id !== id)
  await db.put('meta', 'exposures', exposures)
  set({ exposures })
}

export async function saveStrip(r: StripResult) {
  const strips = { ...state.strips, [r.date]: r }
  await db.put('meta', 'strips', strips)
  set({ strips })
}

/** Marks a print as looked at, which stops it fading. */
export async function touchMemory(id: string) {
  const m = state.memories.find((x) => x.id === id)
  if (!m) return
  await saveMemory({ ...m, visitedAt: new Date().toISOString() })
}

export async function saveLetter(l: Letter) {
  await db.put('letters', l.id, l)
  set({ letters: [...state.letters.filter((x) => x.id !== l.id), l] })
}

export async function deleteLetter(id: string) {
  await db.del('letters', id)
  set({ letters: state.letters.filter((x) => x.id !== id) })
}

export async function putBlob(blob: Blob): Promise<string> {
  const id = uid('b_')
  await db.put('blobs', id, blob)
  return id
}

/** The photographs of a day as stored on the device, in order (missing blobs are skipped). */
export async function memoryPhotos(m: Pick<Memory, 'photoIds'>): Promise<Blob[]> {
  const out: Blob[] = []
  for (const id of m.photoIds) {
    const b = await db.get<Blob>('blobs', id)
    if (b) out.push(b)
  }
  return out
}

const urlCache = new Map<string, string>()
export async function blobUrl(id: string): Promise<string | undefined> {
  if (urlCache.has(id)) return urlCache.get(id)
  const b = await db.get<Blob>('blobs', id)
  if (!b) return undefined
  const u = URL.createObjectURL(b)
  urlCache.set(id, u)
  return u
}

export function useBlobUrl(id?: string) {
  const [url, setUrl] = useState<string | undefined>(id ? urlCache.get(id) : undefined)
  useEffect(() => {
    let live = true
    if (!id) {
      setUrl(undefined)
      return
    }
    blobUrl(id).then((u) => live && setUrl(u))
    return () => {
      live = false
    }
  }, [id])
  return url
}

export function useStore() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

export function getState() {
  return state
}

/* ---------- letter status ---------- */
export type LetterStatus = 'sealed' | 'arrived' | 'open' | 'unread'
export function letterStatus(l: Letter, now = Date.now()): LetterStatus {
  if (l.sealedUntil && new Date(l.sealedUntil).getTime() > now) return 'sealed'
  if (l.openedAt) return 'open'
  if (l.sealedUntil) return 'arrived'
  return 'unread'
}

export function threadFor(memoryId: string, letters: Letter[]) {
  return letters
    .filter((l) => l.memoryId === memoryId)
    .sort((a, b) => a.writtenAt.localeCompare(b.writtenAt))
}

/* ---------- shoebox (imported photos) & journal pages ---------- */
export async function addToShoebox(items: ShoeboxItem[]) {
  for (const it of items) await db.put('shoebox', it.id, it)
  const shoebox = [...state.shoebox, ...items].sort((a, b) => a.takenAt.localeCompare(b.takenAt))
  set({ shoebox })
}

export function shoeboxKeys() {
  return new Set(state.shoebox.map((x) => x.key))
}

export async function removeFromShoebox(filter: (x: ShoeboxItem) => boolean) {
  const used = new Set(state.memories.flatMap((m) => m.photoIds))
  const gone = state.shoebox.filter(filter)
  for (const it of gone) {
    await db.del('shoebox', it.id)
    if (!used.has(it.blobId)) await db.del('blobs', it.blobId)
    await db.del('blobs', it.thumbId)
  }
  const ids = new Set(gone.map((x) => x.id))
  set({ shoebox: state.shoebox.filter((x) => !ids.has(x.id)) })
  return gone.length
}

export async function savePage(p: Page) {
  await db.put('pages', p.date, p)
  set({ pages: { ...state.pages, [p.date]: p } })
}

export async function deletePage(date: string) {
  await db.del('pages', date)
  const pages = { ...state.pages }
  delete pages[date]
  set({ pages })
}

/** Saves a hand-punched strip for a month; null goes back to the tune the photos wrote. */
export async function saveTune(ym: string, holes: string[] | null) {
  const tunes = { ...state.tunes }
  if (holes) tunes[ym] = holes
  else delete tunes[ym]
  await db.put('meta', 'tunes', tunes)
  set({ tunes })
}

/** Replaces shoebox items in place (used when demo drawings are swapped for real photos). */
export async function replaceShoebox(items: ShoeboxItem[]) {
  for (const it of items) await db.put('shoebox', it.id, it)
  const byId = new Map(items.map((i) => [i.id, i]))
  set({ shoebox: state.shoebox.map((x) => byId.get(x.id) ?? x) })
}

export async function dropBlob(id: string) {
  await db.del('blobs', id)
}
