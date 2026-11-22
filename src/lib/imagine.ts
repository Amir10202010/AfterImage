// Draws a picture from the user's own words via /api/imagine, then crops it on this device.
// The finished JPEG only ever lives in this browser's IndexedDB (saved with the memory).

export type Drawn = { blob: Blob; prompt: string }

/**
 * Which part of a w×h image to keep: always drop at least `minBottom` of the height
 * (where a provider watermark sits), then trim to the exact `ratio` (width / height).
 */
export function cropBox(w: number, h: number, ratio = 3 / 2, minBottom = 0.06) {
  const usable = Math.max(1, Math.round(h * (1 - minBottom)))
  if (w / usable > ratio) {
    const cw = Math.round(usable * ratio)
    return { x: Math.floor((w - cw) / 2), y: 0, w: cw, h: usable }
  }
  return { x: 0, y: 0, w, h: Math.min(usable, Math.round(w / ratio)) }
}

async function crop(src: Blob, ratio: number): Promise<Blob> {
  const bmp = await createImageBitmap(src)
  try {
    const b = cropBox(bmp.width, bmp.height, ratio)
    const c = document.createElement('canvas')
    c.width = b.w
    c.height = b.h
    c.getContext('2d')!.drawImage(bmp, b.x, b.y, b.w, b.h, 0, 0, b.w, b.h)
    return await new Promise<Blob>((res, rej) => c.toBlob((x) => (x ? res(x) : rej(new Error('encode failed'))), 'image/jpeg', 0.9))
  } finally {
    bmp.close()
  }
}

export type DrawInput = { story: string; title?: string; place?: string; time?: string; weather?: string; mood?: string; date?: string }

export async function drawFromWords(input: DrawInput, signal?: AbortSignal): Promise<Drawn> {
  const r = await fetch('/api/imagine', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
    signal,
  })
  if (!r.ok || !(r.headers.get('content-type') ?? '').startsWith('image/')) {
    const msg = await r
      .json()
      .then((j: { error?: string }) => j.error)
      .catch(() => undefined)
    throw new Error(msg ?? (r.status === 404 ? 'Picture drawing is not available here.' : 'The picture could not be drawn right now.'))
  }
  const prompt = decodeURIComponent(r.headers.get('x-imagine-prompt') ?? '')
  return { blob: await crop(await r.blob(), 3 / 2), prompt }
}

const PREF = 'afterimage.drawFromWords'
/** Off until the writer turns it on: drawing sends the story to Gemini and Pollinations. */
export function drawPref(): boolean {
  try {
    return localStorage.getItem(PREF) === 'on'
  } catch {
    return false
  }
}
export function setDrawPref(on: boolean) {
  try {
    localStorage.setItem(PREF, on ? 'on' : 'off')
  } catch {
    /* fine */
  }
}
