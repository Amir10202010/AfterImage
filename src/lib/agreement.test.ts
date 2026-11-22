import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('the agreement', () => {
  beforeEach(() => {
    const m = new Map<string, string>()
    vi.stubGlobal('localStorage', { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) })
    vi.resetModules()
  })

  it('is asked once, remembered, and tells whoever is waiting', async () => {
    const a = await import('./agreement')
    expect(a.agreed()).toBe(false)
    let told = 0
    const off = a.onAgree(() => told++)
    a.agree()
    expect(a.agreed()).toBe(true)
    expect(told).toBe(1)
    off()
    vi.resetModules()
    expect((await import('./agreement')).hasAgreed()).toBe(true)
  })

  it('asks again when the terms change', async () => {
    localStorage.setItem('afterimage.agreed', '2020-01-01')
    expect((await import('./agreement')).agreed()).toBe(false)
  })
})
