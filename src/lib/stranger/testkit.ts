// Test helpers shared by the Stranger's test files.
import type { Memory } from '../types'

export function mem(id: string, date: string, story: string, extra: Partial<Memory> = {}): Memory {
  return {
    id,
    title: 'Day ' + id,
    date,
    people: [],
    story,
    photoIds: [],
    details: [],
    moments: [],
    recall: [],
    threads: [],
    theme: 'paper',
    cover: 'dust',
    baths: [],
    createdAt: date,
    progress: { done: {} },
    ledger: {},
    margin: [],
    ...extra,
  }
}
