// The Stranger's memory on this device: the writing profile, the queue of impostor lines,
// which real passages have been shown, and every round played. All in IndexedDB (`meta` store),
// so it rides along in backups — API keys never do (they live in localStorage, see gemini.ts).
import { useSyncExternalStore } from 'react'
import { db } from '../db'
import { getState as archiveState } from '../store'
import { agreed } from '../agreement'
import { GEMINI_MODELS, GeminiError, generateJson, onRequestLogged, restoreLog, type GeminiErrorKind, type RequestLog } from '../gemini'
import { extractFragments, shortfall, type RealFragment } from './fragments'
import { REAL_PER_ROUND, accuse, assemble, emptyHistory, pickStranger, remember, selectReal, type History, type Round, type StrangerLine } from './game'
import { PROFILE_VERSION, analysisRequest, batches, checker, lineId, linesRequest, measure, mergeRequest, parseLines, parseStyle, spread, staleness, type StyleDescription, type WritingProfile } from './style'

export const BATCH = 10
export const LOW_WATER = 4
const MAX_UNUSED = 30
const KEEP_USED = 150
const KEEP_ROUNDS = 120
const SAMPLE_BUDGET = 16_000
const FULL_BATCH = 14_000
const FULL_MAX_BATCHES = 8

export interface Prefs {
  /** when the user agreed to send selected writing to Gemini; absent = no consent */
  consentAt?: number
  /** play on the fictional demo archive (clearly labelled) */
  includeDemo: boolean
}

export interface StrangerState {
  loaded: boolean
  prefs: Prefs
  profile?: WritingProfile
  queue: StrangerLine[]
  history: History
  rounds: Round[]
  busy: null | 'profile' | 'lines'
  progress?: string
  lastError?: { kind: GeminiErrorKind | 'other'; message: string; at: number }
  log: RequestLog[]
  /** bumps whenever keys change, so views re-read them */
  keysVersion: number
}

const K = {
  prefs: 'stranger:prefs',
  profile: 'stranger:profile',
  queue: 'stranger:queue',
  history: 'stranger:history',
  rounds: 'stranger:rounds',
  log: 'stranger:log',
} as const

let state: StrangerState = { loaded: false, prefs: { includeDemo: false }, queue: [], history: emptyHistory(), rounds: [], busy: null, log: [], keysVersion: 0 }
const subs = new Set<() => void>()
function set(next: Partial<StrangerState>) {
  state = { ...state, ...next }
  subs.forEach((f) => f())
}

export function useStranger() {
  return useSyncExternalStore(
    (f) => {
      subs.add(f)
      return () => subs.delete(f)
    },
    () => state,
  )
}
export const strangerState = () => state
if (typeof window !== 'undefined')
  window.addEventListener('afterimage:erased', () => set({ prefs: { includeDemo: false }, profile: undefined, queue: [], history: emptyHistory(), rounds: [], log: [] }))
export function keysChanged() {
  set({ keysVersion: state.keysVersion + 1 })
}

let loading: Promise<void> | null = null
export function loadStranger() {
  loading ??= (async () => {
    const [prefs, profile, queue, history, rounds, log] = await Promise.all([
      db.get<Prefs>('meta', K.prefs),
      db.get<WritingProfile>('meta', K.profile),
      db.get<StrangerLine[]>('meta', K.queue),
      db.get<History>('meta', K.history),
      db.get<Round[]>('meta', K.rounds),
      db.get<RequestLog[]>('meta', K.log),
    ])
    restoreLog(log)
    onRequestLogged((l) => {
      set({ log: l })
      void db.put('meta', K.log, l)
    })
    set({
      loaded: true,
      prefs: { includeDemo: false, ...prefs },
      profile: profile?.version === PROFILE_VERSION ? profile : undefined,
      queue: Array.isArray(queue) ? queue : [],
      history: history?.seen ? history : emptyHistory(),
      rounds: Array.isArray(rounds) ? rounds : [],
      log: log ?? [],
    })
  })()
  return loading
}

async function save<T>(k: keyof typeof K, v: T) {
  await db.put('meta', K[k], v)
}

export async function setPrefs(p: Partial<Prefs>) {
  const prefs = { ...state.prefs, ...p }
  if (p.consentAt === undefined && 'consentAt' in p) delete prefs.consentAt
  set({ prefs })
  await save('prefs', prefs)
}

/* ---------- the archive, as the game sees it ---------- */

export function fragments(includeDemo = state.prefs.includeDemo): RealFragment[] {
  const a = archiveState()
  return extractFragments({ memories: a.memories, letters: a.letters, shoebox: a.shoebox, pages: a.pages }, { includeDemo })
}

/** Names of people and places the archive knows — masked before sending, banned in generated lines. */
export function archiveNames(): string[] {
  const a = archiveState()
  const out = new Set<string>()
  for (const m of a.memories) {
    for (const p of m.people) for (const part of [p, ...p.split(/\s+/)]) if (part.length >= 2) out.add(part)
    if (m.location) for (const part of [m.location, ...m.location.split(/[,\s]+/)]) if (part.length >= 3) out.add(part)
  }
  return [...out]
}

export function realCount(includeDemo = state.prefs.includeDemo) {
  return fragments(includeDemo).length
}

/* ---------- readiness ---------- */

export type Blocker = 'no-consent' | 'no-profile' | 'short'

export function blockers(): Blocker[] {
  const b: Blocker[] = []
  if (realCount() < REAL_PER_ROUND) b.push('short')
  // keys are the project's, on the server; consent is the agreement accepted on entering the app
  if (!consented()) b.push('no-consent')
  if (!state.profile) b.push('no-profile')
  return b
}

function fail(e: unknown) {
  const ge = e instanceof GeminiError ? e : null
  set({ lastError: { kind: ge?.kind ?? 'other', message: ge?.message ?? (e instanceof Error ? e.message : String(e)), at: Date.now() } })
}

function consented() {
  return agreed() || !!state.prefs.consentAt
}

function assertCanSend() {
  if (!consented()) throw new Error('Sending your writing to Gemini needs your agreement to the terms first.')
}

/* ---------- the writing profile ---------- */

export async function buildProfile(opts: { full?: boolean } = {}): Promise<boolean> {
  if (state.busy) return false
  try {
    assertCanSend()
    const frags = fragments()
    if (frags.length < REAL_PER_ROUND) throw new Error(shortfall(frags.length) ?? 'Not enough writing yet.')
    set({ busy: 'profile', progress: 'Reading your archive…', lastError: undefined })
    const local = measure(frags)
    const names = archiveNames()
    let style: StyleDescription
    let analyzed: RealFragment[]
    if (opts.full) {
      const parts = batches(frags, FULL_BATCH, FULL_MAX_BATCHES)
      const results: StyleDescription[] = []
      for (let i = 0; i < parts.length; i++) {
        set({ progress: `Reading batch ${i + 1} of ${parts.length}…` })
        results.push(await generateJson({ purpose: 'profile', ...analysisRequest(parts[i], local, names), temperature: 0.3, validate: parseStyle }))
      }
      if (results.length > 1) {
        set({ progress: 'Putting the pieces together…' })
        style = await generateJson({ purpose: 'profile-merge', ...mergeRequest(results, local), temperature: 0.3, validate: parseStyle })
      } else style = results[0]
      analyzed = parts.flat()
    } else {
      analyzed = spread(frags, SAMPLE_BUDGET, Math.random)
      set({ progress: `Studying ${analyzed.length} passages…` })
      style = await generateJson({ purpose: 'profile', ...analysisRequest(analyzed, local, names), temperature: 0.3, validate: parseStyle })
    }
    const now = Date.now()
    const profile: WritingProfile = { version: PROFILE_VERSION, createdAt: state.profile?.createdAt ?? now, updatedAt: now, mode: opts.full ? 'full' : 'sample', model: GEMINI_MODELS[0], analyzed: analyzed.map((f) => f.id), local, style }
    await save('profile', profile)
    set({ profile })
    return true
  } catch (e) {
    fail(e)
    return false
  } finally {
    set({ busy: null, progress: undefined })
  }
}

/** Folds new writing into the profile without re-reading everything. */
export async function refreshProfile(): Promise<boolean> {
  const p = state.profile
  if (!p) return buildProfile()
  if (state.busy) return false
  try {
    assertCanSend()
    const frags = fragments()
    const local = measure(frags)
    const done = new Set(p.analyzed)
    const fresh = frags.filter((f) => !done.has(f.id))
    let style = p.style
    let analyzed = p.analyzed
    if (fresh.length) {
      set({ busy: 'profile', progress: `Reading ${fresh.length} new passages…`, lastError: undefined })
      const sample = spread(fresh, SAMPLE_BUDGET * 0.75, Math.random)
      style = await generateJson({ purpose: 'profile-refresh', ...analysisRequest(sample, local, archiveNames(), p.style), temperature: 0.3, validate: parseStyle })
      analyzed = [...new Set([...p.analyzed, ...sample.map((f) => f.id)])]
    }
    const profile: WritingProfile = { ...p, updatedAt: Date.now(), local, style, analyzed }
    await save('profile', profile)
    set({ profile })
    return true
  } catch (e) {
    fail(e)
    return false
  } finally {
    set({ busy: null, progress: undefined })
  }
}

export function profileStaleness() {
  return state.profile ? staleness(state.profile, fragments()) : null
}

export async function clearProfile() {
  await db.del('meta', K.profile)
  set({ profile: undefined })
}

/* ---------- the queue of impostors ---------- */

export const unused = (q = state.queue) => q.filter((l) => !l.usedAt)

let filling: Promise<number> | null = null

/**
 * Asks Gemini for a batch of lines and keeps the ones that pass every check.
 * At most two requests per call; never invents a fallback line if Gemini fails.
 */
export function replenish(force = false): Promise<number> {
  if (filling) return filling
  if (!force && unused().length >= LOW_WATER) return Promise.resolve(0)
  filling = (async () => {
    const profile = state.profile
    try {
      assertCanSend()
      if (!profile) throw new Error('Build your writing profile first.')
      set({ busy: state.busy ?? 'lines', lastError: undefined })
      const frags = fragments()
      const names = archiveNames()
      const gate = checker({ real: frags, existing: state.queue.map((l) => l.text), names, local: profile.local })
      const fresh: StrangerLine[] = []
      for (let attempt = 0; attempt < 2 && fresh.length < 3; attempt++) {
        const batch = `b${Date.now().toString(36)}${attempt}`
        const examples = spread(frags, 3200, Math.random).slice(0, 14)
        const avoid = [...state.queue.slice(-30).map((l) => l.text), ...fresh.map((l) => l.text)]
        const raw = await generateJson({ purpose: 'lines', ...linesRequest({ profile, examples, names, avoid, n: BATCH, rng: Math.random }), temperature: 1, validate: parseLines })
        for (const r of raw) {
          if (gate.check(r.text)) continue
          gate.accept(r.text)
          fresh.push({ id: lineId(r.text, batch), text: r.text.trim(), language: r.language || undefined, createdAt: Date.now(), batch })
        }
      }
      if (!fresh.length) throw new GeminiError('empty')
      const used = state.queue.filter((l) => l.usedAt).slice(-KEEP_USED)
      const open = [...unused(), ...fresh].slice(-MAX_UNUSED)
      const queue = [...used, ...open]
      await save('queue', queue)
      set({ queue })
      return fresh.length
    } catch (e) {
      fail(e)
      return 0
    } finally {
      filling = null
      set({ busy: state.busy === 'lines' ? null : state.busy })
    }
  })()
  return filling
}

export async function clearQueue() {
  await db.del('meta', K.queue)
  set({ queue: [] })
}

/* ---------- rounds ---------- */

export const currentRound = () => state.rounds.find((r) => r.status === 'playing')

export type StartResult = { ok: true; round: Round } | { ok: false; blockers: Blocker[] } | { ok: false; error: string }

/** Starts a round. Waits on Gemini only when the queue is completely empty. */
export async function startRound(): Promise<StartResult> {
  const b = blockers()
  // with lines already in the queue, a missing key doesn't stop play
  const hard = b.filter((x) => x === 'short' || ((x === 'no-consent' || x === 'no-profile') && !unused().length))
  if (hard.length) return { ok: false, blockers: hard }
  if (!unused().length) {
    await replenish(true)
    if (!unused().length) return { ok: false, error: state.lastError?.message ?? 'Gemini didn’t return a usable line. Try again.' }
  }
  const pool = fragments()
  const reals = selectReal(pool, state.history, Math.random)
  if (!reals) return { ok: false, blockers: ['short'] }
  const line = pickStranger(state.queue, reals, Math.random)!
  const now = Date.now()
  const round = assemble(reals, line, Math.random, `r${now.toString(36)}${Math.random().toString(36).slice(2, 7)}`, now)
  const queue = state.queue.map((l) => (l.id === line.id ? { ...l, usedAt: now } : l))
  const history = remember(state.history, reals.map((r) => r.id))
  // an unfinished round left behind counts as abandoned, not as played
  const rounds = [...state.rounds.filter((r) => r.status !== 'playing'), round].slice(-KEEP_ROUNDS)
  set({ queue, history, rounds })
  await Promise.all([save('queue', queue), save('history', history), save('rounds', rounds)])
  if (unused(queue).length < LOW_WATER && consented() && state.profile) void replenish()
  return { ok: true, round }
}

export async function accuseCard(roundId: string, cardId: string) {
  const r = state.rounds.find((x) => x.id === roundId)
  if (!r) return
  const next = accuse(r, cardId)
  if (next === r) return next
  const rounds = state.rounds.map((x) => (x.id === roundId ? next : x))
  set({ rounds })
  await save('rounds', rounds)
  return next
}

export async function clearRounds() {
  await Promise.all([db.del('meta', K.rounds), db.del('meta', K.history)])
  set({ rounds: [], history: emptyHistory() })
}
