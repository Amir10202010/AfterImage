import { afterEach, describe, expect, it, vi } from 'vitest'
import { POST, rotation } from './imagine.ts'

describe('rotation', () => {
  it('starts on the next key each time and keeps every key', () => {
    const keys = ['a', 'b', 'c']
    expect(rotation(keys, 0)).toEqual(['a', 'b', 'c'])
    expect(rotation(keys, 1)).toEqual(['b', 'c', 'a'])
    expect(rotation(keys, 5)).toEqual(['c', 'a', 'b'])
    expect(rotation([], 3)).toEqual([])
  })
})

const req = (body: object, headers: Record<string, string> = {}) =>
  new Request('http://app.test/api/imagine', { method: 'POST', headers: { host: 'app.test', 'content-type': 'application/json', ...headers }, body: JSON.stringify(body) })

describe('POST /api/imagine', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  it('rejects other sites, and scripts that send no Origin', async () => {
    expect((await POST(req({ story: 'x'.repeat(40) }, { origin: 'https://evil.example' }))).status).toBe(403)
    expect((await POST(req({ story: 'x'.repeat(40) }))).status).toBe(403)
  })

  it('falls through to the next Gemini key on 429, sends keys only in headers, returns the image', async () => {
    vi.stubEnv('GEMINI_API_KEYS', 'g1,g2')
    vi.stubEnv('POLLINATIONS_API_KEY', 'sk_test')
    const calls: { url: string; headers: Record<string, string> }[] = []
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      const headers = Object.fromEntries(new Headers(init.headers).entries())
      calls.push({ url, headers })
      if (url.includes('generativelanguage')) {
        if (calls.filter((c) => c.url.includes('generativelanguage')).length === 1) return new Response('{}', { status: 429 })
        return Response.json({ candidates: [{ content: { parts: [{ text: '{"prompt":"a bench under linden trees"}' }] } }] })
      }
      return new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/jpeg' } })
    })
    const r = await POST(req({ story: 'We sat on the bench in the park all afternoon.' }, { origin: 'http://app.test', 'x-forwarded-for': '10.0.0.1' }))
    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toBe('image/jpeg')
    expect(decodeURIComponent(r.headers.get('x-imagine-prompt')!)).toBe('a bench under linden trees')
    const g = calls.filter((c) => c.url.includes('generativelanguage'))
    expect(g.map((c) => c.headers['x-goog-api-key']).sort()).toEqual(['g1', 'g2'])
    const p = calls.find((c) => c.url.includes('pollinations'))!
    expect(p.headers.authorization).toBe('Bearer sk_test')
    for (const c of calls) expect(c.url).not.toMatch(/g1|g2|sk_test/)
  })

  it('says it is not set up when a key is missing', async () => {
    vi.stubEnv('POLLINATIONS_API_KEY', '')
    vi.stubEnv('GEMINI_API_KEYS', 'g1')
    const r = await POST(req({ story: 'A long enough story about the day.' }, { origin: 'http://app.test', 'x-forwarded-for': '10.0.0.2' }))
    expect(r.status).toBe(503)
  })

  it('never sends the diary text to the image service when Gemini fails', async () => {
    vi.stubEnv('GEMINI_API_KEYS', 'g1')
    vi.stubEnv('POLLINATIONS_API_KEY', 'sk_test')
    const urls: string[] = []
    vi.stubGlobal('fetch', async (url: string) => {
      urls.push(url)
      return new Response('{}', { status: 500 })
    })
    const story = 'Mira and I talked about the move until the lamps came on.'
    const r = await POST(req({ story }, { origin: 'http://app.test', 'x-forwarded-for': '10.0.0.3' }))
    expect(r.status).toBe(502)
    expect(urls.some((u) => u.includes('pollinations'))).toBe(false)
    for (const u of urls) expect(decodeURIComponent(u)).not.toContain('Mira')
  })
})
