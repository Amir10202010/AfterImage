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

function toBase64(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = () => reject(r.error)
    r.readAsDataURL(b)
  })
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
  const blobs: BackupFile['blobs'] = []
  let i = 0
  for (const [id, b] of blobEntries) {
    if (b instanceof Blob) blobs.push([id, b.type, await toBase64(b)])
    onProgress?.(++i, blobEntries.length)
  }
  const file: BackupFile = { app: 'afterimage', version: 1, exportedAt: new Date().toISOString(), stores, blobs }
  return new Blob([JSON.stringify(file)], { type: 'application/json' })
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

/** Replaces everything on this device with the backup. Throws if the file isn't an Afterimage backup. */
export async function importBackup(file: File) {
  let data: BackupFile
  try {
    data = JSON.parse(await file.text())
  } catch {
    throw new Error('That file isn’t a backup — it couldn’t be read.')
  }
  if (data?.app !== 'afterimage' || data.version !== 1 || !data.stores) throw new Error('That file isn’t an Afterimage backup.')
  for (const s of [...STORES, 'blobs'] as StoreName[]) await db.clear(s)
  for (const s of STORES) for (const [k, v] of data.stores[s] ?? []) await db.put(s, k, v)
  for (const [id, type, b64] of data.blobs ?? []) await db.put('blobs', id, fromBase64(b64, type))
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
