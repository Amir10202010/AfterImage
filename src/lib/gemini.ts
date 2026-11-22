// The one place Afterimage talks to Google's Gemini API — Bring Your Own Key.
//
// Keys are typed in by the user, kept in this browser's localStorage (never in IndexedDB,
// so they never end up in a backup file) and used in strict round-robin order:
// request 1 → key 1, request 2 → key 2, … and the position survives a reload.
//
// Everything above this file (style profile, Stranger generation) only calls `generateJson`,
// so a server-side proxy can later replace the transport without touching the game.

/** Models tried in order. Gemini 3.5 Flash-Lite: stable, free tier, built for high-volume JSON work. */
export const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.6-flash'] as const
export const GEMINI_TIMEOUT_MS = 45_000
/** Hard cap on attempts for one logical request, whatever the number of keys. */
export const MAX_ATTEMPTS = 3

const KEYS_KEY = 'afterimage.gemini.keys'
const CURSOR_KEY = 'afterimage.gemini.cursor'

/* ---------- key storage ---------- */

export interface KVStore {
  getItem(k: string): string | null
  setItem(k: string, v: string): void
  removeItem(k: string): void
}

function memoryStore(): KVStore {
  const m = new Map<string, string>()
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) }
}

let kv: KVStore = (() => {
  try {
    if (typeof localStorage !== 'undefined') return localStorage
  } catch {
    /* storage blocked */
  }
  return memoryStore()
})()

/** Tests swap the storage out. */
export function setKeyStorage(s: KVStore) {
  kv = s
}

/** Splits pasted text (commas, new lines, spaces, semicolons) into distinct keys. */
export function parseKeys(input: string): string[] {
  return [...new Set(input.split(/[\s,;]+/).map((s) => s.trim()).filter((s) => s.length >= 20))]
}

export function getKeys(): string[] {
  try {
    const v = JSON.parse(kv.getItem(KEYS_KEY) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.length > 0) : []
  } catch {
    return []
  }
}

export function setKeys(keys: string[]) {
  const clean = [...new Set(keys.map((k) => k.trim()).filter(Boolean))]
  if (clean.length) kv.setItem(KEYS_KEY, JSON.stringify(clean))
  else kv.removeItem(KEYS_KEY)
  notify()
}

export function addKeys(input: string) {
  const fresh = parseKeys(input)
  const have = getKeys()
  setKeys([...have, ...fresh])
  return getKeys().length - have.length
}

export function removeKey(index: number) {
  const keys = getKeys()
  keys.splice(index, 1)
  setKeys(keys)
}

export function replaceKey(index: number, key: string) {
  const keys = getKeys()
  const k = parseKeys(key)[0]
  if (!k || index < 0 || index >= keys.length) return false
  keys[index] = k
  setKeys(keys)
  return true
}

export function maskKey(k: string) {
  if (k.length <= 10) return '••••••'
  return `${k.slice(0, 4)}••••••••${k.slice(-4)}`
}

export function getCursor(): number {
  const n = Number(kv.getItem(CURSOR_KEY))
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0
}

/**
 * The next key in the rotation, advancing the persisted cursor.
 * Every attempt — first try or fallback — moves the cursor by exactly one.
 */
export function nextKey(keys = getKeys()): { key: string; index: number } | null {
  if (!keys.length) return null
  const c = getCursor()
  const index = c % keys.length
  kv.setItem(CURSOR_KEY, String((c + 1) % 1_000_000))
  return { key: keys[index], index }
}

const subs = new Set<() => void>()
function notify() {
  subs.forEach((f) => f())
}
export function onKeysChange(f: () => void) {
  subs.add(f)
  return () => void subs.delete(f)
}

/* ---------- errors ---------- */

export type GeminiErrorKind = 'no-keys' | 'invalid-key' | 'rate-limit' | 'network' | 'timeout' | 'malformed' | 'empty' | 'blocked' | 'model' | 'server' | 'unknown'

const MESSAGES: Record<GeminiErrorKind, string> = {
  'no-keys': 'No Gemini API key yet. Add one in Settings → The Stranger.',
  'invalid-key': 'Gemini refused the API key. Check it in Settings — it may be mistyped, revoked, or missing the Generative Language API.',
  'rate-limit': 'Gemini’s free quota is used up for now. Wait a minute (or until tomorrow for the daily limit) and try again.',
  network: 'Couldn’t reach Gemini. You seem to be offline — the rest of Afterimage still works.',
  timeout: 'Gemini took too long to answer. Try again in a moment.',
  malformed: 'Gemini answered with something that wasn’t usable. Try again.',
  empty: 'Gemini answered with nothing usable. Try again.',
  blocked: 'Gemini declined to answer this one.',
  model: 'The configured Gemini model isn’t available to this key.',
  server: 'Gemini is having trouble right now. Try again shortly.',
  unknown: 'Something went wrong talking to Gemini.',
}

export class GeminiError extends Error {
  kind: GeminiErrorKind
  status?: number
  constructor(kind: GeminiErrorKind, status?: number) {
    super(MESSAGES[kind])
    this.name = 'GeminiError'
    this.kind = kind
    this.status = status
  }
}

/** Removes anything key-shaped, so an error can be shown or logged safely. */
export function scrub(s: string, keys = getKeys()) {
  let out = s.replace(/AIza[0-9A-Za-z_-]{20,}/g, '[key]').replace(/([?&]key=)[^&\s]+/g, '$1[key]')
  for (const k of keys) if (k) out = out.split(k).join('[key]')
  return out
}

/** Maps whatever the SDK or the network threw onto one of our kinds. */
export function classify(e: unknown): GeminiError {
  if (e instanceof GeminiError) return e
  const err = e as { name?: string; status?: number; code?: number; message?: string }
  const status = typeof err?.status === 'number' ? err.status : typeof err?.code === 'number' ? err.code : undefined
  const msg = String(err?.message ?? e)
  if (err?.name === 'AbortError' || /aborted|timed? ?out/i.test(msg)) return new GeminiError('timeout')
  if (status === 400 && /api[_ ]?key|API_KEY_INVALID/i.test(msg)) return new GeminiError('invalid-key', status)
  if (status === 401 || status === 403) return new GeminiError('invalid-key', status)
  if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(msg)) return new GeminiError('rate-limit', status ?? 429)
  if (status === 404) return new GeminiError('model', status)
  if (status && status >= 500) return new GeminiError('server', status)
  if (/failed to fetch|networkerror|network request failed|fetch failed|ENOTFOUND|ECONNREFUSED|load failed/i.test(msg)) return new GeminiError('network')
  if (status === 400) return new GeminiError('unknown', status)
  return new GeminiError('unknown', status)
}

/** Which failures are worth one more attempt on the next key. */
const ROTATE_ON = new Set<GeminiErrorKind>(['invalid-key', 'rate-limit', 'server', 'malformed', 'empty', 'model'])

/* ---------- transport ---------- */

export interface Call {
  key: string
  model: string
  system: string
  prompt: string
  schema: object
  temperature: number
  signal: AbortSignal
}

/** Sends one request and returns the raw text of the answer. */
export type Transport = (c: Call) => Promise<string | undefined>

const sdkTransport: Transport = async (c) => {
  // loaded only when the game actually needs Gemini, so the offline app stays small
  const { GoogleGenAI } = await import('@google/genai')
  const ai = new GoogleGenAI({ apiKey: c.key })
  const res = await ai.models.generateContent({
    model: c.model,
    contents: c.prompt,
    config: {
      systemInstruction: c.system,
      temperature: c.temperature,
      responseMimeType: 'application/json',
      responseJsonSchema: c.schema,
      abortSignal: c.signal,
      httpOptions: { timeout: GEMINI_TIMEOUT_MS },
    },
  })
  const reason = res.promptFeedback?.blockReason
  if (reason) throw new GeminiError('blocked')
  return res.text
}

let transport: Transport = sdkTransport
/** Tests (or a future server proxy) replace how requests are sent. */
export function setTransport(t: Transport | null) {
  transport = t ?? sdkTransport
}

/* ---------- request log (metadata only, never keys or text) ---------- */

export interface RequestLog {
  at: number
  purpose: string
  keyIndex: number
  model: string
  ok: boolean
  kind?: GeminiErrorKind
  ms: number
}

let log: RequestLog[] = []
export function requestLog() {
  return log
}
export function restoreLog(l: RequestLog[] | undefined) {
  if (Array.isArray(l)) log = l.slice(-50)
}
let onLog: ((l: RequestLog[]) => void) | undefined
export function onRequestLogged(f: (l: RequestLog[]) => void) {
  onLog = f
}

/* ---------- the call ---------- */

export interface JsonRequest<T> {
  purpose: string
  system: string
  prompt: string
  schema: object
  temperature?: number
  /** turns parsed JSON into T, or throws */
  validate: (v: unknown) => T
  signal?: AbortSignal
}

/**
 * One logical request, structured JSON out. Bounded: at most MAX_ATTEMPTS sends,
 * each on the next key in the rotation. Network failures and timeouts are not retried.
 */
export async function generateJson<T>(r: JsonRequest<T>): Promise<T> {
  const keys = getKeys()
  if (!keys.length) throw new GeminiError('no-keys')
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new GeminiError('network')
  let modelIdx = 0
  let last: GeminiError = new GeminiError('unknown')
  const attempts = Math.min(MAX_ATTEMPTS, Math.max(keys.length, 2))
  for (let a = 0; a < attempts; a++) {
    const k = nextKey(keys)!
    const model = GEMINI_MODELS[modelIdx] ?? GEMINI_MODELS[0]
    const ctl = new AbortController()
    const stop = () => ctl.abort()
    r.signal?.addEventListener('abort', stop)
    const timer = setTimeout(stop, GEMINI_TIMEOUT_MS)
    const t0 = Date.now()
    try {
      const text = await transport({ key: k.key, model, system: r.system, prompt: r.prompt, schema: r.schema, temperature: r.temperature ?? 0.9, signal: ctl.signal })
      if (!text || !text.trim()) throw new GeminiError('empty')
      let parsed: unknown
      try {
        parsed = JSON.parse(text)
      } catch {
        throw new GeminiError('malformed')
      }
      let out: T
      try {
        out = r.validate(parsed)
      } catch (e) {
        throw e instanceof GeminiError ? e : new GeminiError('malformed')
      }
      record({ at: t0, purpose: r.purpose, keyIndex: k.index, model, ok: true, ms: Date.now() - t0 })
      return out
    } catch (e) {
      last = r.signal?.aborted ? new GeminiError('timeout') : classify(e)
      record({ at: t0, purpose: r.purpose, keyIndex: k.index, model, ok: false, kind: last.kind, ms: Date.now() - t0 })
      if (r.signal?.aborted || !ROTATE_ON.has(last.kind)) break
      if (last.kind === 'model') modelIdx++
    } finally {
      clearTimeout(timer)
      r.signal?.removeEventListener('abort', stop)
    }
  }
  throw last
}

function record(l: RequestLog) {
  log = [...log, l].slice(-50)
  onLog?.(log)
}

/** A tiny request to check a single key works. Uses that key directly (does not move the rotation). */
export async function testKey(key: string): Promise<{ ok: true } | { ok: false; error: GeminiError }> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), 20_000)
  const t0 = Date.now()
  try {
    const text = await transport({
      key,
      model: GEMINI_MODELS[0],
      system: 'Reply with JSON only.',
      prompt: 'Return {"ok": true}.',
      schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] },
      temperature: 0,
      signal: ctl.signal,
    })
    if (!text) throw new GeminiError('empty')
    JSON.parse(text)
    record({ at: t0, purpose: 'test', keyIndex: getKeys().indexOf(key), model: GEMINI_MODELS[0], ok: true, ms: Date.now() - t0 })
    return { ok: true }
  } catch (e) {
    const error = ctl.signal.aborted ? new GeminiError('timeout') : classify(e)
    record({ at: t0, purpose: 'test', keyIndex: getKeys().indexOf(key), model: GEMINI_MODELS[0], ok: false, kind: error.kind, ms: Date.now() - t0 })
    return { ok: false, error }
  } finally {
    clearTimeout(timer)
  }
}
