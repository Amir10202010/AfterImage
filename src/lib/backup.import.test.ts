import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { exportBackup, importBackup } from './backup'

const file = (body: unknown) => new File([typeof body === 'string' ? body : JSON.stringify(body)], 'backup.json', { type: 'application/json' })
const backup = (blobs: [string, string, string][]) => ({
  app: 'afterimage',
  version: 1,
  exportedAt: '2026-01-01T00:00:00.000Z',
  stores: { memories: [['m2', { id: 'm2', title: 'from the backup' }]], letters: [], shoebox: [], pages: [], meta: [['seeded', true]] },
  blobs,
})

describe('restoring a backup', () => {
  beforeEach(async () => {
    await db.replaceAll({ memories: [['m1', { id: 'm1', title: 'already here' }]], blobs: [['b1', new Blob(['x'], { type: 'image/jpeg' })]], letters: [], shoebox: [], pages: [], meta: [] })
  })

  it('replaces everything when the file is sound', async () => {
    const r = await importBackup(file(backup([['b2', 'image/jpeg', btoa('jpeg bytes')]])))
    expect(r.memories).toBe(1)
    expect((await db.all<{ id: string }>('memories')).map((m) => m.id)).toEqual(['m2'])
    expect(await db.keys('blobs')).toEqual(['b2'])
  })

  it('keeps the data already here when a photo inside the file is damaged', async () => {
    await expect(importBackup(file(backup([['b2', 'image/jpeg', '@@ not base64 @@']])))).rejects.toThrow(/damaged.*Nothing here was changed/)
    expect((await db.all<{ id: string }>('memories')).map((m) => m.id)).toEqual(['m1'])
    expect(await db.keys('blobs')).toEqual(['b1'])
  })

  it('refuses files that are not Afterimage backups without touching anything', async () => {
    await expect(importBackup(file('{ not json'))).rejects.toThrow(/isn’t a backup/)
    await expect(importBackup(file({ app: 'other', version: 1, stores: {} }))).rejects.toThrow(/isn’t an Afterimage backup/)
    await expect(importBackup(file({ ...backup([]), stores: { memories: 'oops' } }))).rejects.toThrow(/isn’t an Afterimage backup/)
    expect((await db.all<{ id: string }>('memories')).map((m) => m.id)).toEqual(['m1'])
  })

  it('rolls the whole write back when the database refuses a value', async () => {
    await expect(db.replaceAll({ memories: [['m3', { id: 'm3', bad: () => 1 }]] })).rejects.toBeTruthy()
    expect((await db.all<{ id: string }>('memories')).map((m) => m.id)).toEqual(['m1'])
  })

  it('round-trips through an exported file', async () => {
    const text = await (await exportBackup()).text()
    const parsed = JSON.parse(text)
    expect(parsed.app).toBe('afterimage')
    expect(parsed.blobs.map((b: string[]) => b[0])).toEqual(['b1'])
    await importBackup(file(text))
    expect((await db.all<{ id: string }>('memories')).map((m) => m.id)).toEqual(['m1'])
  })
})
