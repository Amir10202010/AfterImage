// Swaps the drawn demo scenes for real photographs, if they've been added to public/demo/.
// Missing files are simply skipped, so the app works the same with or without them.
import { dropBlob, getState, putBlob, replaceShoebox, saveMemory, savePage } from '../lib/store'
import { develop } from '../lib/importers'
import type { ShoeboxItem } from '../lib/types'

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

/**
 * Demo days whose photographs are frames from the demo camera roll rather than demo/memories/.
 * Picked by what is actually in each file (the file names are dates, not contents).
 */
const DEMO_PHOTOS: Record<string, string[]> = {
  // picnic blanket with a paperback · a paper bag of plums · friends' hands sharing food
  picnic: ['2025-10-04-2130', '2025-10-02-1940', '2019-03-01-1600'].map((n) => `demo/roll/${n}.jpg`),
  // frost on a windshield · power poles fading into fog · dried hydrangeas in a jar
  frost: ['2025-11-11-1720', '2025-11-07-0830', '2025-11-13-1705'].map((n) => `demo/roll/${n}.jpg`),
  // a record player · a handwritten letter by a candle · a blanket and reading glasses
  records: ['2025-09-06-1330', '2025-09-07-1600', '2025-10-17-1855'].map((n) => `demo/roll/${n}.jpg`),
}

function photoPaths(art: string) {
  return DEMO_PHOTOS[art] ?? [art, `${art}-2`, `${art}-3`, `${art}-4`].map((n) => `demo/memories/${n}.jpg`)
}

export async function upgradeDemoAssets() {
  try {
    if (sessionStorage.getItem(ONCE)) return
    sessionStorage.setItem(ONCE, '1')
  } catch {
    /* no session storage: just run */
  }
  const st = getState()

  // 1 · the demo memories: main photograph + extra frames for the contact strip
  for (const m of st.memories.filter((x) => x.demo && x.art && x.photoIds.length === 0)) {
    const blobs = await Promise.all(photoPaths(m.art!).map((p) => image(p)))
    if (!blobs[0]) continue
    const ids: string[] = []
    for (const b of blobs) if (b) ids.push(await putBlob((await develop(b)).full))
    const fresh = getState().memories.find((x) => x.id === m.id)
    if (fresh) await saveMemory({ ...fresh, photoIds: ids })
  }

  // 2 · the demo camera roll
  const drawn = st.shoebox.filter((x) => x.demo && x.blobId.startsWith('demo-b-'))
  if (!drawn.length) return
  const swapped: ShoeboxItem[] = []
  const renamed = new Map<string, string>()
  await pool(drawn, 4, async (it) => {
    const b = await image(it.name)
    if (!b) return
    try {
      const img = await develop(b)
      const [blobId, thumbId] = await Promise.all([putBlob(img.full), putBlob(img.thumb)])
      renamed.set(it.blobId, blobId)
      swapped.push({ ...it, blobId, thumbId, w: img.w, h: img.h })
      await dropBlob(it.blobId)
    } catch {
      /* unreadable file — keep the drawing */
    }
  })
  if (!swapped.length) return
  await replaceShoebox(swapped)
  // notebook pages that already used a drawing now point to the photo
  for (const p of Object.values(getState().pages)) {
    if (!p.items.some((i) => i.ref && renamed.has(i.ref))) continue
    await savePage({ ...p, items: p.items.map((i) => (i.ref && renamed.has(i.ref) ? { ...i, ref: renamed.get(i.ref) } : i)) })
  }
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
