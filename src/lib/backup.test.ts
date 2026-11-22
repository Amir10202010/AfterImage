import { describe, expect, it, vi } from 'vitest'

const tables = vi.hoisted(
  () =>
    new Map<string, Map<string, unknown>>([
      ['memories', new Map([['m1', { id: 'm1', story: 'a day' }]])],
      ['meta', new Map<string, unknown>([['stranger:profile', { style: { summary: 'dry' } }], ['stranger:queue', []]])],
    ]),
)
vi.mock('./db', () => ({
  db: { entries: async (s: string) => [...(tables.get(s) ?? new Map()).entries()] },
}))

import { exportBackup } from './backup'
import { getKeys, setKeyStorage, setKeys, type KVStore } from './gemini'

describe('backups', () => {
  it('carry the game but never the Gemini keys', async () => {
    const m = new Map<string, string>()
    const kv: KVStore = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) }
    setKeyStorage(kv)
    const key = 'AIzaSyZ_zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz'
    setKeys([key])
    expect(getKeys()).toEqual([key])
    const text = await (await exportBackup()).text()
    expect(text).toContain('stranger:profile')
    expect(text).not.toContain(key)
    expect(text).not.toContain('afterimage.gemini')
  })
})
