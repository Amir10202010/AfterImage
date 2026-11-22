import { describe, expect, it } from 'vitest'
import { liveBlobIds } from './store'
import type { Memory, Page, ShoeboxItem } from './types'

describe('live blobs', () => {
  it('counts a day’s photos and song, the shoebox (full and thumb) and notebook page refs', () => {
    const memories = [{ photoIds: ['p1', 'p2'], song: { title: 's', artist: 'a', tempo: 'slow', audioId: 'a1' } }] as unknown as Memory[]
    const shoebox = [{ blobId: 'b1', thumbId: 't1' }] as unknown as ShoeboxItem[]
    const pages = { '2025-10-12': { items: [{ ref: 'r1' }, { ref: 'art:autumn' }, {}] } } as unknown as Record<string, Page>
    expect([...liveBlobIds({ memories, shoebox, pages })].sort()).toEqual(['a1', 'art:autumn', 'b1', 'p1', 'p2', 'r1', 't1'])
  })
})
