import { afterEach, describe, expect, it, vi } from 'vitest'
import { POST } from './stranger.ts'

const req = (body: object, headers: Record<string, string> = { origin: 'http://app.test' }) =>
  new Request('http://app.test/api/stranger', { method: 'POST', headers: { host: 'app.test', 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })

const body = { system: 's', prompt: 'write like me', schema: { type: 'object' }, temperature: 0.7, model: 'gemini-3.5-flash-lite' }

describe('POST /api/stranger', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('rejects other sites and scripts with no Origin', async () => {
    expect((await POST(req(body, { origin: 'https://evil.example' }))).status).toBe(403)
    expect((await POST(req(body, {}))).status).toBe(403)
  })

  it('says plainly when the server has no keys', async () => {
    vi.stubEnv('GEMINI_API_KEYS', '')
    const r = await POST(req(body))
    expect(r.status).toBe(503)
    expect(((await r.json()) as { kind: string }).kind).toBe('no-keys')
  })

  it('uses the project keys (in a header, never in the URL), falls through on 429 and returns the text', async () => {
    vi.stubEnv('GEMINI_API_KEYS', 'k1,k2')
    const seen: { url: string; key: string | null }[] = []
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      const key = new Headers(init.headers).get('x-goog-api-key')
      seen.push({ url, key })
      if (seen.length === 1) return new Response('{}', { status: 429 })
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"lines":[]}' }] } }] }), { status: 200 })
    })
    const r = await POST(req(body))
    expect(r.status).toBe(200)
    expect(await r.json()).toMatchObject({ text: '{"lines":[]}', model: 'gemini-3.5-flash-lite' })
    expect(seen).toHaveLength(2)
    expect(new Set(seen.map((s) => s.key))).toEqual(new Set(['k1', 'k2']))
    for (const s of seen) expect(s.url).not.toMatch(/k1|k2|key=/)
  })

  it('only uses models this server allows', async () => {
    vi.stubEnv('GEMINI_API_KEYS', 'k1')
    let url = ''
    vi.stubGlobal('fetch', async (u: string) => {
      url = u
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{}' }] } }] }), { status: 200 })
    })
    await POST(req({ ...body, model: 'some-expensive-model' }))
    expect(url).toContain('gemini-3.5-flash-lite')
  })
})

describe('POST /api/stranger with a bad key', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })
  it('moves on to the next key when Gemini says the key is not valid', async () => {
    vi.stubEnv('GEMINI_API_KEYS', 'bad,good')
    let n = 0
    vi.stubGlobal('fetch', async () => {
      n++
      if (n === 1) return new Response(JSON.stringify({ error: { status: 'INVALID_ARGUMENT', details: [{ reason: 'API_KEY_INVALID' }] } }), { status: 400 })
      return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"ok":true}' }] } }] }), { status: 200 })
    })
    const r = await POST(req(body))
    expect(r.status).toBe(200)
    expect(n).toBe(2)
  })
})
