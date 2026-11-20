// Bringing photographs in — from the camera roll, or from the user's own Instagram data export.
// Everything is decoded, resized and stored on this device. Nothing is uploaded anywhere.
import { addToShoebox, putBlob, shoeboxKeys, uid } from './store'
import type { ShoeSource, ShoeboxItem } from './types'
import { readExif } from './exif'
import { readZip } from './zip'

export interface Progress {
  done: number
  total: number
  added: number
  skipped: number
  note?: string
}

export interface ImportResult {
  added: number
  duplicates: number
  unreadable: number
  videos: number
  days: number
  from?: string
  to?: string
}

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|heic|heif|avif)$/i

function localDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function toJpeg(bmp: ImageBitmap, max: number, quality: number) {
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const w = Math.max(1, Math.round(bmp.width * k))
  const h = Math.max(1, Math.round(bmp.height * k))
  const useOffscreen = typeof OffscreenCanvas !== 'undefined'
  if (useOffscreen) {
    const c = new OffscreenCanvas(w, h)
    c.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
    return c.convertToBlob({ type: 'image/jpeg', quality })
  }
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  c.getContext('2d')!.drawImage(bmp, 0, 0, w, h)
  return new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('encode failed'))), 'image/jpeg', quality))
}

/** Decodes an image and makes two sizes: a print and a thumbnail. */
export async function develop(blob: Blob) {
  const bmp = await createImageBitmap(blob)
  try {
    const [full, thumb] = await Promise.all([toJpeg(bmp, 1600, 0.86), toJpeg(bmp, 420, 0.8)])
    return { full, thumb, w: bmp.width, h: bmp.height }
  } finally {
    bmp.close()
  }
}

type Candidate = { key: string; name: string; get: () => Promise<Blob>; takenAt?: Date; caption?: string; source: ShoeSource; fileDate?: number }

async function ingest(cands: Candidate[], onProgress: (p: Progress) => void, videos = 0): Promise<ImportResult> {
  const known = shoeboxKeys()
  const fresh = cands.filter((c) => !known.has(c.key))
  const res: ImportResult = { added: 0, duplicates: cands.length - fresh.length, unreadable: 0, videos, days: 0 }
  const days = new Set<string>()
  let batch: ShoeboxItem[] = []
  let done = 0
  const flush = async () => {
    if (batch.length) await addToShoebox(batch)
    batch = []
  }
  for (const c of fresh) {
    try {
      const blob = await c.get()
      let taken = c.takenAt
      let lat: number | undefined
      let lon: number | undefined
      if (!taken || c.source === 'gallery') {
        const ex = await readExif(blob)
        taken = ex.taken ?? taken
        lat = ex.lat
        lon = ex.lon
      }
      if (!taken) taken = new Date(c.fileDate ?? Date.now())
      const img = await develop(blob)
      const [blobId, thumbId] = await Promise.all([putBlob(img.full), putBlob(img.thumb)])
      const date = localDate(taken)
      days.add(date)
      batch.push({ id: uid('s_'), blobId, thumbId, date, takenAt: taken.toISOString(), source: c.source, caption: c.caption, lat, lon, name: c.name, key: c.key, w: img.w, h: img.h })
      res.added++
      if (!res.from || date < res.from) res.from = date
      if (!res.to || date > res.to) res.to = date
    } catch {
      res.unreadable++
    }
    done++
    if (batch.length >= 12) await flush()
    onProgress({ done, total: fresh.length, added: res.added, skipped: res.unreadable + res.duplicates })
  }
  await flush()
  res.days = days.size
  return res
}

/* ---------- camera roll ---------- */
export async function importGallery(files: File[], onProgress: (p: Progress) => void) {
  const imgs = files.filter((f) => f.type.startsWith('image/') || IMAGE_EXT.test(f.name))
  const videos = files.filter((f) => f.type.startsWith('video/')).length
  const cands: Candidate[] = imgs.map((f) => ({
    key: `g:${f.name}:${f.size}`,
    name: f.name,
    get: async () => f,
    source: 'gallery',
    fileDate: f.lastModified,
  }))
  return ingest(cands, onProgress, videos)
}

/* ---------- Instagram data export (JSON format) ---------- */

/** Instagram's export writes UTF-8 text as Latin-1 escapes ("Ã©" for "é"). Undo that. */
export function fixText(s?: string) {
  if (!s) return undefined
  try {
    const bytes = Uint8Array.from([...s].map((c) => c.charCodeAt(0) & 0xff))
    if ([...s].some((c) => c.charCodeAt(0) > 0xff)) return s
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return s
  }
}

type IgMedia = { uri?: string; creation_timestamp?: number; title?: string }
type IgPost = { media?: IgMedia[]; title?: string; creation_timestamp?: number }

/** Pulls every photo out of the export's JSON files, whatever folder layout the export used. */
export function parseInstagramJson(path: string, json: unknown): { uri: string; ts?: number; caption?: string; source: ShoeSource }[] {
  const out: { uri: string; ts?: number; caption?: string; source: ShoeSource }[] = []
  const isStory = /stories/i.test(path)
  const push = (m: IgMedia, post?: IgPost) => {
    if (!m?.uri) return
    out.push({
      uri: m.uri,
      ts: m.creation_timestamp ?? post?.creation_timestamp,
      caption: fixText(post?.title || m.title) || undefined,
      source: isStory ? 'instagram-story' : 'instagram-post',
    })
  }
  const walkPosts = (arr: unknown) => {
    if (!Array.isArray(arr)) return
    for (const p of arr as IgPost[]) {
      if (Array.isArray(p.media)) p.media.forEach((m) => push(m, p))
      else push(p as IgMedia)
    }
  }
  if (Array.isArray(json)) walkPosts(json)
  else if (json && typeof json === 'object') {
    for (const v of Object.values(json as Record<string, unknown>)) walkPosts(v)
  }
  return out
}

const JSON_WANTED = /(^|\/)(posts_\d+|stories|archived_posts|reels)\.json$/i

export async function importInstagram(input: File | File[], onProgress: (p: Progress) => void): Promise<ImportResult> {
  // Build a path → reader map from either a ZIP or an unzipped folder.
  const files = new Map<string, () => Promise<Blob>>()
  if (Array.isArray(input)) {
    for (const f of input) files.set((f.webkitRelativePath || f.name).replace(/\\/g, '/'), async () => f)
  } else {
    onProgress({ done: 0, total: 0, added: 0, skipped: 0, note: 'Opening the archive…' })
    for (const e of await readZip(input)) files.set(e.name, e.read)
  }
  const paths = [...files.keys()]
  const jsonPaths = paths.filter((p) => JSON_WANTED.test(p))
  if (!jsonPaths.length) {
    if (paths.some((p) => /\.html$/i.test(p)))
      throw new Error('This export is in HTML format. Request the export again and choose the JSON format.')
    throw new Error('No posts or stories were found. Make sure this is the export Instagram sent you (JSON format).')
  }

  const entries: ReturnType<typeof parseInstagramJson> = []
  for (const p of jsonPaths) {
    try {
      const text = await (await files.get(p)!()).text()
      entries.push(...parseInstagramJson(p, JSON.parse(text)))
    } catch {
      /* a malformed file — skip it */
    }
  }

  // Resolve each media uri against the archive (exports sometimes nest everything in a top folder).
  const resolve = (uri: string) => {
    const clean = uri.replace(/^\.?\//, '')
    if (files.has(clean)) return clean
    return paths.find((p) => p.endsWith('/' + clean) || p.endsWith(clean))
  }

  let videos = 0
  const seen = new Set<string>()
  const cands: Candidate[] = []
  for (const e of entries) {
    if (seen.has(e.uri)) continue
    seen.add(e.uri)
    if (/\.(mp4|mov|webm)$/i.test(e.uri)) {
      videos++
      continue
    }
    const path = resolve(e.uri)
    if (!path) continue
    cands.push({
      key: `ig:${e.uri}`,
      name: e.uri.split('/').pop() ?? e.uri,
      get: files.get(path)!,
      takenAt: e.ts ? new Date(e.ts * 1000) : undefined,
      caption: e.caption,
      source: e.source,
    })
  }
  return ingest(cands, onProgress, videos)
}

/** Lets a phone hold its screen awake during a long import, where supported. */
export async function keepAwake(): Promise<() => void> {
  try {
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
    const lock = await nav.wakeLock?.request('screen')
    return () => void lock?.release()
  } catch {
    return () => {}
  }
}
