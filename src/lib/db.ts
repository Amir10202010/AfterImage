// Minimal promise wrapper around IndexedDB. Everything stays on the device.
const DB_NAME = 'afterimage'
const VERSION = 2
export type StoreName = 'memories' | 'letters' | 'blobs' | 'meta' | 'shoebox' | 'pages'

let dbPromise: Promise<IDBDatabase> | null = null

function open(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      for (const s of ['memories', 'letters', 'blobs', 'meta', 'shoebox', 'pages'] as StoreName[]) {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return dbPromise
}

function tx<T>(store: StoreName, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(store, mode)
        const req = fn(t.objectStore(store))
        t.oncomplete = () => resolve(req.result)
        t.onerror = () => reject(t.error)
        t.onabort = () => reject(t.error)
      }),
  )
}

export const db = {
  get: <T>(store: StoreName, key: string) => tx<T | undefined>(store, 'readonly', (s) => s.get(key)),
  put: <T>(store: StoreName, key: string, value: T) => tx(store, 'readwrite', (s) => s.put(value, key)),
  del: (store: StoreName, key: string) => tx(store, 'readwrite', (s) => s.delete(key)),
  all: <T>(store: StoreName) => tx<T[]>(store, 'readonly', (s) => s.getAll()),
  clear: (store: StoreName) => tx(store, 'readwrite', (s) => s.clear()),
}
