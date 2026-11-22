// A full backup of this device's Afterimage, as one JSON file the user keeps themselves.
// Nothing is uploaded: the file is built in the browser and handed straight to the download bar.
import { db, type StoreName } from './db'

const STORES: StoreName[] = ['memories', 'letters', 'shoebox', 'pages', 'meta']

interface BackupFile {
  app: 'afterimage'
  version: 1
  exportedAt: string
  stores: Record<string, [string, unknown][]>
  blobs: [string, string, string][] // id, mime type, base64
}

async function toBase64(b: Blob): Promise<string> {
  const bytes = new Uint8Array(await b.arrayBuffer())
  let bin = ''
  // in chunks: String.fromCharCode can't take a whole photograph's bytes as arguments at once
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return btoa(bin)
}

function fromBase64(data: string, type: string) {
  const bin = atob(data)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type })
}

export async function exportBackup(onProgress?: (done: number, total: number) => void): Promise<Blob> {
  const stores: BackupFile['stores'] = {}
  for (const s of STORES) stores[s] = await db.entries(s)
  const blobEntries = await db.entries<Blob>('blobs')
  // the file is assembled from many small parts: one giant string would hit the browser's string limit
  // on a large library long before the device runs out of memory
  const head: Omit<BackupFile, 'blobs'> = { app: 'afterimage', version: 1, exportedAt: new Date().toISOString(), stores }
  const parts: string[] = [JSON.stringify(head).slice(0, -1), ',"blobs":[']
  let i = 0
  for (const [id, b] of blobEntries) {
    if (b instanceof Blob) parts.push((parts.length > 2 ? ',' : '') + JSON.stringify([id, b.type, await toBase64(b)]))
    onProgress?.(++i, blobEntries.length)
  }
  parts.push(']}')
  return new Blob(parts, { type: 'application/json' })
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.append(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 4000)
}

const isPairs = (x: unknown) => Array.isArray(x) && x.every((e) => Array.isArray(e) && e.length === 2 && typeof e[0] === 'string')
const isBlobs = (x: unknown) => Array.isArray(x) && x.every((e) => Array.isArray(e) && e.length === 3 && e.every((v) => typeof v === 'string'))

function isBackup(d: unknown): d is BackupFile {
  const f = d as BackupFile | null
  return (
    !!f &&
    f.app === 'afterimage' &&
    f.version === 1 &&
    typeof f.stores === 'object' &&
    f.stores !== null &&
    Object.values(f.stores).every(isPairs) &&
    (f.blobs === undefined || isBlobs(f.blobs))
  )
}

/**
 * Replaces everything on this device with the backup. The file is read and checked in full first, then
 * written in one transaction, so a damaged or unreadable backup never costs the data already here.
 */
export async function importBackup(file: File) {
  let data: unknown
  try {
    data = JSON.parse(await file.text())
  } catch {
    throw new Error('That file isn’t a backup. It couldn’t be read, and nothing here was changed.')
  }
  if (!isBackup(data)) throw new Error('That file isn’t an Afterimage backup. Nothing here was changed.')
  let blobs: [string, Blob][]
  try {
    blobs = (data.blobs ?? []).map(([id, type, b64]) => [id, fromBase64(b64, type)])
  } catch {
    throw new Error('This backup is damaged: a photo inside it can’t be read. Nothing here was changed.')
  }
  const stores: Partial<Record<StoreName, [string, unknown][]>> = { blobs }
  for (const s of STORES) stores[s] = data.stores[s] ?? []
  try {
    await db.replaceAll(stores)
  } catch {
    throw new Error('The backup couldn’t be restored, so nothing here was changed. If the device is nearly full, free some space and try again.')
  }
  return { memories: data.stores.memories?.length ?? 0, photos: data.stores.shoebox?.length ?? 0, letters: data.stores.letters?.length ?? 0 }
}

export async function storageInfo() {
  const est = await navigator.storage?.estimate?.().catch(() => undefined)
  const persisted = await navigator.storage?.persisted?.().catch(() => false)
  return { used: est?.usage ?? 0, quota: est?.quota ?? 0, persisted: !!persisted }
}

export function bytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${(n / 1024 ** 3).toFixed(2)} GB`
}
