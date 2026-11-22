// Swaps the drawn demo scenes for real photographs, if they've been added to public/demo/.
// Missing files are simply skipped, so the app works the same with or without them.
import { db } from '../lib/db'
import { dropBlob, getState, putBlob, removeFromShoebox, replaceShoebox, saveMemory, savePage } from '../lib/store'
import { develop } from '../lib/importers'
import type { ShoeboxItem } from '../lib/types'
import roll from './roll.json'

/**
 * Bump when the photographs in public/demo change, so devices that stored older copies refresh them.
 * v2: the demo photographs were re-matched to their captions, and seven roll days without a photo were withdrawn.
 */
const PHOTOS_VERSION = 2
/** A demo memory loaded every frame of its art set in v1; a different count means someone edited its photos. */
const V1_FRAMES = 4

async function image(path: string): Promise<Blob | null> {
  try {
    const r = await fetch('/' + path.replace(/^\//, ''), { cache: 'no-cache' })
    // dev servers answer unknown paths with the app's HTML — only real images count
    if (!r.ok || !(r.headers.get('content-type') ?? '').startsWith('image/')) return null
    return await r.blob()
  } catch {
    return null
  }
}

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  const queue = [...items]
  await Promise.all(Array.from({ length: n }, async () => {
    while (queue.length) await fn(queue.shift()!)
  }))
}

const ONCE = 'afterimage.demoAssetsChecked'

export async function upgradeDemoAssets() {
  try {
    if (sessionStorage.getItem(ONCE)) return
    sessionStorage.setItem(ONCE, '1')
  } catch {
    /* no session storage: just run */
  }
  const st = getState()
  const version = (await db.get<number>('meta', 'demoPhotos').catch(() => undefined)) ?? 1
  const refresh = version < PHOTOS_VERSION
  let failed = 0

  // 1 · the three demo memories: main photograph + extra frames for the contact strip
  const memories = st.memories.filter((x) => x.demo && x.art && (x.photoIds.length === 0 || (refresh && x.photoIds.length === V1_FRAMES)))
  for (const m of memories) {
    const names = [m.art!, `${m.art}-2`, `${m.art}-3`, `${m.art}-4`]
    const blobs = await Promise.all(names.map((n) => image(`demo/memories/${n}.jpg`)))
    if (!blobs[0]) {
      failed++
      continue
    }
    const ids: string[] = []
    for (const b of blobs) if (b) ids.push(await putBlob((await develop(b)).full))
    const fresh = getState().memories.find((x) => x.id === m.id)
    if (!fresh) continue
    await saveMemory({ ...fresh, photoIds: ids })
    for (const old of fresh.photoIds) if (!ids.includes(old)) await dropBlob(old)
  }

  // 2 · the demo camera roll
  const files = new Set((roll as { file: string }[]).map((r) => r.file))
  // days whose photograph was withdrawn leave the roll rather than keep a picture of something else
  if (refresh) await removeFromShoebox((x) => !!x.demo && !files.has(x.name))
  const due = getState().shoebox.filter((x) => x.demo && files.has(x.name) && (refresh || x.blobId.startsWith('demo-b-')))
  const swapped: ShoeboxItem[] = []
  const renamed = new Map<string, string>()
  await pool(due, 4, async (it) => {
    const b = await image(it.name)
    if (!b) {
      failed++
      return
    }
    try {
      const img = await develop(b)
      const [blobId, thumbId] = await Promise.all([putBlob(img.full), putBlob(img.thumb)])
      renamed.set(it.blobId, blobId)
      swapped.push({ ...it, blobId, thumbId, w: img.w, h: img.h })
      await dropBlob(it.blobId)
      if (it.thumbId !== it.blobId) await dropBlob(it.thumbId)
    } catch {
      failed++ // unreadable file — keep what's there
    }
  })
  if (swapped.length) {
    await replaceShoebox(swapped)
    // notebook pages that already used the old picture now point to the new one
    for (const p of Object.values(getState().pages)) {
      if (!p.items.some((i) => i.ref && renamed.has(i.ref))) continue
      await savePage({ ...p, items: p.items.map((i) => (i.ref && renamed.has(i.ref) ? { ...i, ref: renamed.get(i.ref) } : i)) })
    }
  }
  // remember the refresh only once it went through, so an offline start tries again next time
  if (refresh && !failed) await db.put('meta', 'demoPhotos', PHOTOS_VERSION)
}

/** After "Restore demo days", look again in this session. */
export function recheckDemoAssets() {
  try {
    sessionStorage.removeItem(ONCE)
  } catch {
    /* fine */
  }
  return upgradeDemoAssets()
}
