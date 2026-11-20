// Reads the date a photo was taken (and where, if present) straight from the JPEG's EXIF.
// Runs entirely on the device — only the first 256 KB of each file is read.

export interface ExifInfo {
  taken?: Date
  lat?: number
  lon?: number
}

export async function readExif(file: Blob): Promise<ExifInfo> {
  try {
    const buf = await file.slice(0, 256 * 1024).arrayBuffer()
    return parseJpeg(new DataView(buf))
  } catch {
    return {}
  }
}

export function parseJpeg(v: DataView): ExifInfo {
  if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return {}
  let off = 2
  while (off + 10 < v.byteLength) {
    const marker = v.getUint16(off)
    if ((marker & 0xff00) !== 0xff00) break
    const len = v.getUint16(off + 2)
    if (marker === 0xffe1 && v.getUint32(off + 4) === 0x45786966) return parseTiff(v, off + 10)
    if (marker === 0xffda) break // start of scan: no more metadata
    off += 2 + len
  }
  return {}
}

function parseTiff(v: DataView, start: number): ExifInfo {
  const little = v.getUint16(start) === 0x4949
  const u16 = (o: number) => v.getUint16(start + o, little)
  const u32 = (o: number) => v.getUint32(start + o, little)
  type Tag = { type: number; count: number; at: number }
  const ifd = (o: number) => {
    const tags = new Map<number, Tag>()
    if (start + o + 2 > v.byteLength) return tags
    const n = u16(o)
    for (let i = 0; i < n; i++) {
      const e = o + 2 + i * 12
      if (start + e + 12 > v.byteLength) break
      tags.set(u16(e), { type: u16(e + 2), count: u32(e + 4), at: e + 8 })
    }
    return tags
  }
  const ascii = (t?: Tag) => {
    if (!t) return undefined
    const o = t.count > 4 ? u32(t.at) : t.at
    let s = ''
    for (let i = 0; i < t.count - 1 && start + o + i < v.byteLength; i++) s += String.fromCharCode(v.getUint8(start + o + i))
    return s
  }
  const rationals = (t?: Tag) => {
    if (!t) return undefined
    const o = u32(t.at)
    const out: number[] = []
    for (let i = 0; i < t.count; i++) {
      const den = u32(o + i * 8 + 4)
      out.push(den ? u32(o + i * 8) / den : 0)
    }
    return out
  }

  const ifd0 = ifd(u32(4))
  const exifPtr = ifd0.get(0x8769)
  const exif = exifPtr ? ifd(u32(exifPtr.at)) : new Map<number, Tag>()
  const raw = ascii(exif.get(0x9003)) ?? ascii(exif.get(0x9004)) ?? ascii(ifd0.get(0x0132))
  const out: ExifInfo = {}
  const m = raw?.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/)
  if (m) {
    const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])
    if (!isNaN(d.getTime()) && d.getFullYear() > 1980) out.taken = d
  }

  const gpsPtr = ifd0.get(0x8825)
  if (gpsPtr) {
    const g = ifd(u32(gpsPtr.at))
    const lat = rationals(g.get(2))
    const lon = rationals(g.get(4))
    if (lat && lon && lat.length === 3 && lon.length === 3) {
      const dec = (r: number[]) => r[0] + r[1] / 60 + r[2] / 3600
      const latRef = ascii(g.get(1))
      const lonRef = ascii(g.get(3))
      const la = dec(lat) * (latRef === 'S' ? -1 : 1)
      const lo = dec(lon) * (lonRef === 'W' ? -1 : 1)
      if (la || lo) Object.assign(out, { lat: +la.toFixed(5), lon: +lo.toFixed(5) })
    }
  }
  return out
}
