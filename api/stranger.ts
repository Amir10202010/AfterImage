// POST /api/stranger — one structured JSON request to Gemini for The Stranger.
//
// The game used to call Gemini from the browser with keys each player pasted in. Now the keys are the
// project's own, in server env vars (GEMINI_API_KEYS, the same keys as /api/imagine), so players never
// see or handle a key. The browser sends the system text, the prompt (built from the player's own
// writing, after they agreed to the terms on entering the app) and a JSON schema; this function adds a
// key, rotates through the keys on quota or auth errors, and returns Gemini's raw JSON text.
// Nothing is stored or logged here except error codes.

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const DEFAULT_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.6-flash']
const MAX_PROMPT = 60_000 // a profile build sends batches of ~14k characters; this leaves room
const MAX_SYSTEM = 8_000
const PER_MINUTE = 20

type Input = { system?: unknown; prompt?: unknown; schema?: unknown; temperature?: unknown; model?: unknown }

const env = (k: string) => (process.env[k] ?? '').trim()
const list = (k: string) => env(k).split(',').map((s) => s.trim()).filter(Boolean)

/** Round-robin across keys: each request starts on the next key and falls through on quota or auth errors. */
let turn = Math.floor(Math.random() * 1000)
export function rotation<T>(keys: T[], start = turn++): T[] {
  if (!keys.length) return []
  const s = ((start % keys.length) + keys.length) % keys.length
  return [...keys.slice(s), ...keys.slice(0, s)]
}

const RETRYABLE = new Set([401, 403, 429, 500, 502, 503, 504])

const hits = new Map<string, number[]>()
function limited(ip: string) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60000)
  recent.push(now)
  hits.set(ip, recent)
  if (hits.size > 5000) hits.clear()
  return recent.length > PER_MINUTE
}

const json = (status: number, body: object) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

function sameSite(origin: string | null, host: string | null) {
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

export async function POST(req: Request): Promise<Response> {
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host')
  if (!sameSite(req.headers.get('origin'), host)) return json(403, { error: 'forbidden', kind: 'server' })
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'local'
  if (limited(ip)) return json(429, { error: 'Too many requests at once. Wait a minute.', kind: 'rate-limit' })

  let input: Input
  try {
    input = (await req.json()) as Input
  } catch {
    return json(400, { error: 'bad request', kind: 'malformed' })
  }
  const system = typeof input.system === 'string' ? input.system.slice(0, MAX_SYSTEM) : ''
  const prompt = typeof input.prompt === 'string' ? input.prompt : ''
  if (!prompt.trim() || prompt.length > MAX_PROMPT) return json(400, { error: 'bad request', kind: 'malformed' })
  const schema = input.schema && typeof input.schema === 'object' ? input.schema : undefined
  const temperature = typeof input.temperature === 'number' ? Math.min(2, Math.max(0, input.temperature)) : 0.9

  const keys = list('GEMINI_API_KEYS')
  if (!keys.length) return json(503, { error: 'The Stranger is not set up on this server.', kind: 'no-keys' })
  // the browser may name a model, but only one this server allows
  const allowed = list('GEMINI_STRANGER_MODEL').length ? list('GEMINI_STRANGER_MODEL') : DEFAULT_MODELS
  const asked = typeof input.model === 'string' && allowed.includes(input.model) ? input.model : allowed[0]
  const models = [asked, ...allowed.filter((m) => m !== asked)]

  let last = 504
  for (const model of models) {
    let modelMissing = false
    for (const key of rotation(keys)) {
      const r = await fetch(`${GEMINI_URL}/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { temperature, responseMimeType: 'application/json', ...(schema ? { responseJsonSchema: schema } : {}) },
        }),
        signal: AbortSignal.timeout(45000),
      }).catch(() => null)
      if (!r) {
        last = 504
        continue
      }
      if (r.ok) {
        const j = (await r.json()) as { promptFeedback?: { blockReason?: string }; candidates?: { content?: { parts?: { text?: string }[] } }[] }
        if (j.promptFeedback?.blockReason) return json(422, { error: 'blocked', kind: 'blocked' })
        const text = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
        if (!text.trim()) return json(502, { error: 'empty', kind: 'empty' })
        return json(200, { text, model })
      }
      console.warn(`[stranger] gemini ${model} -> ${r.status}`)
      last = r.status
      if (r.status === 404) {
        modelMissing = true
        break
      }
      if (r.status === 400) {
        // Gemini answers a bad key with 400 API_KEY_INVALID: try the next key; any other 400 is the request itself
        const detail = await r.text().catch(() => '')
        if (/API_KEY_INVALID|api key not valid/i.test(detail)) continue
        return json(400, { error: 'bad request', kind: 'malformed' })
      }
      if (!RETRYABLE.has(r.status)) break
    }
    if (!modelMissing && last !== 404) break
  }
  const kind = last === 429 ? 'rate-limit' : last === 404 ? 'model' : last === 504 ? 'timeout' : 'server'
  return json(last === 429 ? 429 : 502, { error: 'Gemini could not answer right now. Try again in a moment.', kind })
}
