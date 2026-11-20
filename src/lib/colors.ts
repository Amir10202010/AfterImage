// Reads the main colours of a photograph, on the device. Used to turn photos into notes.

export interface Swatch {
  h: number // 0–360
  s: number // 0–1
  l: number // 0–1
  weight: number // share of the picture
  hex: string
}

const cache = new Map<string, Promise<Swatch[]>>()

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  h *= 60
  return { h, s, l }
}

/** Groups pixels into 12 hue families (plus greys) and returns the strongest three. */
export function swatchesFromPixels(data: Uint8ClampedArray): Swatch[] {
  const bins = Array.from({ length: 13 }, () => ({ w: 0, r: 0, g: 0, b: 0, l: 0, s: 0 }))
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue
    const { h, s, l } = rgbToHsl(data[i], data[i + 1], data[i + 2])
    const k = s < 0.14 || l < 0.08 || l > 0.94 ? 12 : Math.floor(h / 30) % 12
    // colourful pixels speak louder than grey ones
    const w = k === 12 ? 0.35 : 0.5 + s
    const bin = bins[k]
    bin.w += w
    bin.r += data[i] * w
    bin.g += data[i + 1] * w
    bin.b += data[i + 2] * w
    bin.l += l * w
    bin.s += s * w
  }
  const total = bins.reduce((n, b) => n + b.w, 0) || 1
  return bins
    .map((b, k) => ({ b, k }))
    .filter(({ b }) => b.w > 0)
    .sort((x, y) => y.b.w - x.b.w)
    .slice(0, 3)
    .map(({ b, k }) => {
      const r = Math.round(b.r / b.w)
      const g = Math.round(b.g / b.w)
      const bl = Math.round(b.b / b.w)
      return {
        h: k === 12 ? -1 : rgbToHsl(r, g, bl).h,
        s: b.s / b.w,
        l: b.l / b.w,
        weight: b.w / total,
        hex: '#' + [r, g, bl].map((x) => x.toString(16).padStart(2, '0')).join(''),
      }
    })
}

export function swatches(url: string): Promise<Swatch[]> {
  if (cache.has(url)) return cache.get(url)!
  const p = new Promise<Swatch[]>((resolve) => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      try {
        const c = document.createElement('canvas')
        c.width = 28
        c.height = 28
        const ctx = c.getContext('2d', { willReadFrequently: true })!
        ctx.drawImage(img, 0, 0, 28, 28)
        resolve(swatchesFromPixels(ctx.getImageData(0, 0, 28, 28).data))
      } catch {
        resolve([])
      }
    }
    img.onerror = () => resolve([])
    img.src = url
  })
  cache.set(url, p)
  return p
}
