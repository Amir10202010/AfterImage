// A small ZIP reader built on the browser's own DecompressionStream.
// It reads the central directory and inflates only the files that are asked for,
// so a multi-gigabyte Instagram export never has to be loaded into memory at once.

export interface ZipEntry {
  name: string
  size: number
  read: () => Promise<Blob>
}

const SIG_EOCD = 0x06054b50
const SIG_EOCD64 = 0x06064b50
const SIG_LOC64 = 0x07064b50
const SIG_CEN = 0x02014b50

function big(v: DataView, o: number) {
  return Number(v.getBigUint64(o, true))
}

export async function readZip(file: Blob): Promise<ZipEntry[]> {
  const tailLen = Math.min(file.size, 66_000)
  const tail = new DataView(await file.slice(file.size - tailLen).arrayBuffer())
  let eocd = -1
  for (let i = tail.byteLength - 22; i >= 0; i--)
    if (tail.getUint32(i, true) === SIG_EOCD) {
      eocd = i
      break
    }
  if (eocd < 0) throw new Error('This file is not a ZIP archive.')

  let count = tail.getUint16(eocd + 10, true)
  let cdSize = tail.getUint32(eocd + 12, true)
  let cdOff = tail.getUint32(eocd + 16, true)

  // ZIP64 (exports over 4 GB, or with more than 65k files)
  if (cdOff === 0xffffffff || count === 0xffff) {
    const loc = eocd - 20
    if (loc >= 0 && tail.getUint32(loc, true) === SIG_LOC64) {
      const e64Off = big(tail, loc + 8)
      const e64 = new DataView(await file.slice(e64Off, e64Off + 56).arrayBuffer())
      if (e64.getUint32(0, true) === SIG_EOCD64) {
        count = big(e64, 32)
        cdSize = big(e64, 40)
        cdOff = big(e64, 48)
      }
    }
  }

  const cd = new DataView(await file.slice(cdOff, cdOff + cdSize).arrayBuffer())
  const dec = new TextDecoder()
  const out: ZipEntry[] = []
  let p = 0
  for (let i = 0; i < count && p + 46 <= cd.byteLength; i++) {
    if (cd.getUint32(p, true) !== SIG_CEN) break
    const method = cd.getUint16(p + 10, true)
    let comp = cd.getUint32(p + 20, true)
    let size = cd.getUint32(p + 24, true)
    const nameLen = cd.getUint16(p + 28, true)
    const extraLen = cd.getUint16(p + 30, true)
    const commentLen = cd.getUint16(p + 32, true)
    let local = cd.getUint32(p + 42, true)
    const name = dec.decode(new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nameLen))
    // zip64 extra field
    let e = p + 46 + nameLen
    const end = e + extraLen
    while (e + 4 <= end) {
      const id = cd.getUint16(e, true)
      const len = cd.getUint16(e + 2, true)
      if (id === 0x0001) {
        let q = e + 4
        if (size === 0xffffffff) (size = big(cd, q)), (q += 8)
        if (comp === 0xffffffff) (comp = big(cd, q)), (q += 8)
        if (local === 0xffffffff) local = big(cd, q)
      }
      e += 4 + len
    }
    p += 46 + nameLen + extraLen + commentLen
    if (name.endsWith('/')) continue
    const lo = local
    const c = comp
    out.push({
      name,
      size,
      read: async () => {
        const h = new DataView(await file.slice(lo, lo + 30).arrayBuffer())
        const start = lo + 30 + h.getUint16(26, true) + h.getUint16(28, true)
        const raw = file.slice(start, start + c)
        if (method === 0) return raw
        if (method !== 8) throw new Error(`Unsupported compression in ${name}`)
        return new Response(raw.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob()
      },
    })
  }
  return out
}

/* ------------------------------------------------------------------ */
/* writing: a small "stored" ZIP (no compression: photos are JPEGs     */
/* already), enough to hand someone a day as one file                  */
/* ------------------------------------------------------------------ */

export interface ZipFile {
  /** path inside the archive, with forward slashes */
  name: string
  data: Blob | string
}

let crcTable: Uint32Array | undefined
function crc32(bytes: Uint8Array) {
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c >>> 0
    }
  }
  let c = 0xffffffff
  for (let i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

/** DOS date/time for the headers. */
function dosTime(d: Date) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)
  const date = ((Math.max(1980, d.getFullYear()) - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  return { time, date }
}

/** Packs the files into one ZIP. Names are UTF-8 (flag bit 11), so Cyrillic folder names survive. */
export async function writeZip(files: ZipFile[], at = new Date()): Promise<Blob> {
  const enc = new TextEncoder()
  const { time, date } = dosTime(at)
  const parts: BlobPart[] = []
  const central: Uint8Array<ArrayBuffer>[] = []
  let offset = 0
  for (const f of files) {
    const data = new Uint8Array(typeof f.data === 'string' ? enc.encode(f.data) : await f.data.arrayBuffer())
    const name = new Uint8Array(enc.encode(f.name))
    const crc = crc32(data)

    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true) // version needed
    local.setUint16(6, 0x0800, true) // UTF-8 names
    local.setUint16(8, 0, true) // stored
    local.setUint16(10, time, true)
    local.setUint16(12, date, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, data.length, true)
    local.setUint32(22, data.length, true)
    local.setUint16(26, name.length, true)
    local.setUint16(28, 0, true)
    parts.push(local.buffer, name, data)

    const cen = new DataView(new ArrayBuffer(46))
    cen.setUint32(0, SIG_CEN, true)
    cen.setUint16(4, 20, true) // made by
    cen.setUint16(6, 20, true) // needed
    cen.setUint16(8, 0x0800, true)
    cen.setUint16(10, 0, true)
    cen.setUint16(12, time, true)
    cen.setUint16(14, date, true)
    cen.setUint32(16, crc, true)
    cen.setUint32(20, data.length, true)
    cen.setUint32(24, data.length, true)
    cen.setUint16(28, name.length, true)
    cen.setUint32(42, offset, true)
    const entry = new Uint8Array(46 + name.length)
    entry.set(new Uint8Array(cen.buffer), 0)
    entry.set(name, 46)
    central.push(entry)
    offset += 30 + name.length + data.length
  }
  const cdSize = central.reduce((n, c) => n + c.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, SIG_EOCD, true)
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, cdSize, true)
  end.setUint32(16, offset, true)
  return new Blob([...parts, ...central, end.buffer], { type: 'application/zip' })
}
