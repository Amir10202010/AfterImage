export type Tempo = 'slow' | 'mid' | 'fast'
export type Theme = 'autumn' | 'paper' | 'night'
export type Cover = 'leaves' | 'dust' | 'static'
export type BathId = 'surface' | 'sequence' | 'recall' | 'ledger' | 'meeting'
export type Stamp = 'kept' | 'changed' | 'let-go' | 'trying'

export interface Song {
  title: string
  artist: string
  url?: string
  /** id of a user-uploaded audio blob */
  audioId?: string
  tempo: Tempo
}

/** A moment of the day. `text` is always a verbatim span of the story or the user's own edit. */
export interface Moment {
  id: string
  time?: string
  text: string
}

/** A sentence from the story (verbatim) with one of its words to recover. */
export interface RecallItem {
  id: string
  sentence: string
  word: string
}

/** An intention or question the user wrote, quoted verbatim. */
export interface Thread {
  id: string
  quote: string
  kind: 'intention' | 'question'
}

export interface LedgerEntry {
  stamp: Stamp
  note?: string
  at: string
}

export interface MarginNote {
  id: string
  text: string
  at: string
}

export interface Memory {
  id: string
  demo?: boolean
  title: string
  date: string // YYYY-MM-DD
  time?: string
  location?: string
  people: string[]
  weather?: string
  mood?: string
  story: string
  photoIds: string[]
  /** built-in illustration key for demo memories */
  art?: string
  song?: Song
  details: string[]
  moments: Moment[]
  recall: RecallItem[]
  threads: Thread[]
  theme: Theme
  cover: Cover
  baths: BathId[]
  createdAt: string
  progress: {
    done: Partial<Record<BathId, boolean>>
    developedAt?: string
  }
  ledger: Record<string, LedgerEntry>
  margin: MarginNote[]
  /** last time the print was looked at; prints fade when left alone */
  visitedAt?: string
}

export interface Letter {
  id: string
  demo?: boolean
  memoryId?: string
  parentId?: string
  /** 'future' = sealed forward; 'past' = written to a past self, pinned to a memory */
  to: 'future' | 'past'
  body: string
  writtenAt: string
  /** if set, cannot be opened before this instant */
  sealedUntil?: string
  openedAt?: string
}

/** Two days laid over each other. The caption is present-you's words. */
export interface Exposure {
  id: string
  a: string
  b: string
  caption?: string
  createdAt: string
}

/** One day's Test Strip result. */
export interface StripResult {
  date: string
  memoryId: string
  sentence: string
  guesses: number[] // month offsets from the answer, signed
  solved: boolean
  done: boolean
}

/* ---------- the journal ---------- */
export type ShoeSource = 'gallery' | 'instagram-post' | 'instagram-story' | 'demo'

/** A photograph imported from the camera roll or an Instagram export. Kept on this device only. */
export interface ShoeboxItem {
  id: string
  /** downscaled image (~1600px) */
  blobId: string
  /** small thumbnail (~420px) for the calendar */
  thumbId: string
  date: string // YYYY-MM-DD, local
  takenAt: string // ISO
  source: ShoeSource
  /** the user's own caption, verbatim (from Instagram) */
  caption?: string
  lat?: number
  lon?: number
  name: string
  /** used to avoid importing the same photo twice */
  key: string
  w: number
  h: number
  demo?: boolean
}

export type PageItemKind = 'photo' | 'note' | 'sticker' | 'ticket' | 'tape' | 'label'

export interface PageItem {
  id: string
  kind: PageItemKind
  /** 0 = left page, 1 = right page */
  page: 0 | 1
  /** photo: blob id, or "art:<key>" for demo illustrations, or "mem:<memoryId>:<index>" */
  ref?: string
  text?: string
  variant?: string
  /** position in % of its page */
  x: number
  y: number
  /** width in % of its page */
  w: number
  r: number
  z: number
}

/** A day's notebook spread. */
export interface Page {
  date: string
  items: PageItem[]
  updatedAt: string
}
