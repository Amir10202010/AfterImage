import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GeminiError, MAX_ATTEMPTS, addKeys, classify, generateJson, getCursor, getKeys, maskKey, parseKeys, removeKey, replaceKey, scrub, setKeyStorage, setKeys, setTransport, type Call, type KVStore } from './gemini'

const A = 'AIzaSyA_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const B = 'AIzaSyB_bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
const C = 'AIzaSyC_ccccccccccccccccccccccccccccccc'

function store(backing = new Map<string, string>()): KVStore {
  return { getItem: (k) => backing.get(k) ?? null, setItem: (k, v) => void backing.set(k, v), removeItem: (k) => void backing.delete(k) }
}

const ok = { purpose: 'test', system: 's', prompt: 'p', schema: {}, validate: (v: unknown) => v }

let calls: Call[]
function answer(fn: (c: Call) => string | undefined | Promise<string | undefined>) {
  calls = []
  setTransport(async (c) => {
    calls.push(c)
    return fn(c)
  })
}

beforeEach(() => {
  setKeyStorage(store())
  answer(() => '{"ok":true}')
})

describe('keys', () => {
  it('accepts comma, newline and space separated keys, without duplicates', () => {
    expect(parseKeys(`${A}, ${B}\n${C}\n\n${A}`)).toEqual([A, B, C])
    expect(parseKeys('short, nope')).toEqual([])
    expect(addKeys(`${A}\n${B}`)).toBe(2)
    expect(addKeys(B)).toBe(0)
    expect(getKeys()).toEqual([A, B])
  })
  it('removes and replaces keys', () => {
    setKeys([A, B])
    expect(replaceKey(1, C)).toBe(true)
    expect(getKeys()).toEqual([A, C])
    removeKey(0)
    expect(getKeys()).toEqual([C])
  })
  it('masks keys for display', () => {
    expect(maskKey(A)).not.toContain(A.slice(4, -4))
    expect(maskKey(A).startsWith('AIza')).toBe(true)
  })
})

describe('round-robin rotation', () => {
  it('goes 1, 2, 3, 1, 2 … one key per request', async () => {
    setKeys([A, B, C])
    for (let i = 0; i < 5; i++) await generateJson(ok)
    expect(calls.map((c) => c.key)).toEqual([A, B, C, A, B])
  })

  it('remembers its place across a reload', async () => {
    const backing = new Map<string, string>()
    setKeyStorage(store(backing))
    setKeys([A, B, C])
    await generateJson(ok)
    await generateJson(ok)
    // a reload: a fresh copy of the module, the same browser storage
    vi.resetModules()
    const fresh = await import('./gemini')
    fresh.setKeyStorage(store(backing))
    const used: string[] = []
    fresh.setTransport(async (c) => (used.push(c.key), '{"ok":true}'))
    await fresh.generateJson(ok)
    await fresh.generateJson(ok)
    expect(used).toEqual([C, A])
  })

  it('works with a single key', async () => {
    setKeys([A])
    await generateJson(ok)
    await generateJson(ok)
    expect(calls.map((c) => c.key)).toEqual([A, A])
  })
})

describe('failures', () => {
  it('needs a key before anything is sent', async () => {
    await expect(generateJson(ok)).rejects.toMatchObject({ kind: 'no-keys' })
    expect(calls).toHaveLength(0)
  })

  it('falls through an invalid key to the next one', async () => {
    setKeys([A, B, C])
    answer((c) => {
      if (c.key === A) throw Object.assign(new Error('API key not valid. Please pass a valid API key. API_KEY_INVALID'), { status: 400 })
      return '{"ok":true}'
    })
    await expect(generateJson(ok)).resolves.toEqual({ ok: true })
    expect(calls.map((c) => c.key)).toEqual([A, B])
    expect(getCursor()).toBe(2)
  })

  it('reports an invalid key when every key is refused', async () => {
    setKeys([A, B])
    answer(() => {
      throw Object.assign(new Error('permission denied'), { status: 403 })
    })
    await expect(generateJson(ok)).rejects.toMatchObject({ kind: 'invalid-key' })
  })

  it('stops after a bounded number of attempts on 429', async () => {
    setKeys([A, B, C, 'AIzaSyD_ddddddddddddddddddddddddddddddd'])
    answer(() => {
      throw Object.assign(new Error('RESOURCE_EXHAUSTED: quota'), { status: 429 })
    })
    const e = (await generateJson(ok).catch((x: unknown) => x)) as GeminiError
    expect(e).toBeInstanceOf(GeminiError)
    expect(e.kind).toBe('rate-limit')
    expect(calls).toHaveLength(MAX_ATTEMPTS)
  })

  it('does not retry a network failure', async () => {
    setKeys([A, B])
    answer(() => {
      throw new TypeError('Failed to fetch')
    })
    await expect(generateJson(ok)).rejects.toMatchObject({ kind: 'network' })
    expect(calls).toHaveLength(1)
  })

  it('retries malformed JSON, then gives up', async () => {
    setKeys([A, B])
    answer(() => 'Sure! Here are your fragments: {')
    await expect(generateJson(ok)).rejects.toMatchObject({ kind: 'malformed' })
    expect(calls).toHaveLength(2)
  })

  it('recovers when the second answer is valid', async () => {
    setKeys([A, B])
    let n = 0
    answer(() => (n++ ? '{"ok":true}' : '{"broken"'))
    await expect(generateJson(ok)).resolves.toEqual({ ok: true })
  })

  it('treats an empty answer as empty', async () => {
    setKeys([A])
    answer(() => '   ')
    await expect(generateJson(ok)).rejects.toMatchObject({ kind: 'empty' })
  })

  it('rejects JSON the validator refuses', async () => {
    setKeys([A])
    answer(() => '{"fragments": 3}')
    await expect(
      generateJson({
        ...ok,
        validate: (v) => {
          if (!Array.isArray((v as { fragments: unknown }).fragments)) throw new Error('bad')
          return v
        },
      }),
    ).rejects.toMatchObject({ kind: 'malformed' })
  })

  it('never puts a key in an error message', () => {
    setKeys([A])
    const e = classify(Object.assign(new Error(`bad request for key=${A} (${A})`), { status: 400 }))
    expect(e.message).not.toContain(A)
    expect(scrub(`https://x/y?key=${A}&a=1 ${A}`)).not.toContain(A)
  })
})
