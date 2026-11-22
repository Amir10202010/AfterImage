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
  keys: (store: StoreName) => tx<IDBValidKey[]>(store, 'readonly', (s) => s.getAllKeys()),
  /**
   * Replaces the whole contents of several stores in ONE transaction: either all of it lands or, on any
   * error, the transaction aborts and the stores keep exactly what they had.
   */
  replaceAll: (data: Partial<Record<StoreName, [string, unknown][]>>) =>
    open().then(
      (db) =>
        new Promise<void>((resolve, reject) => {
          const names = Object.keys(data) as StoreName[]
          const t = db.transaction(names, 'readwrite')
          t.oncomplete = () => resolve()
          t.onerror = () => reject(t.error)
          t.onabort = () => reject(t.error ?? new Error('The restore was cancelled.'))
          try {
            for (const n of names) {
              const s = t.objectStore(n)
              s.clear()
              for (const [k, v] of data[n] ?? []) s.put(v, k)
            }
          } catch (e) {
            // a value the database can't store: undo everything queued so far
            t.abort()
            reject(e)
          }
        }),
    ),
  /** every [key, value] pair in a store, in key order */
  entries: async <T>(store: StoreName): Promise<[string, T][]> => {
    const [keys, values] = await Promise.all([
      tx<IDBValidKey[]>(store, 'readonly', (s) => s.getAllKeys()),
      tx<T[]>(store, 'readonly', (s) => s.getAll()),
    ])
    return keys.map((k, i) => [String(k), values[i]])
  },
}
