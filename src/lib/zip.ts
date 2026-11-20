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
