import { roman } from '../lib/time'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { BathProps } from '../views/Darkroom'
import { COVER_COPY } from '../lib/prompts'
import { hash } from '../lib/extract'
import { PastLabel, InfoTip } from '../components/common'
import { sound } from '../lib/sound'
import type { Cover } from '../lib/types'

function rng(seed: number) {
  let s = seed % 2147483647 || 1
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
}

function paintCover(ctx: CanvasRenderingContext2D, w: number, h: number, cover: Cover, seed: number) {
  const r = rng(seed)
  ctx.globalCompositeOperation = 'source-over'
  if (cover === 'leaves') {
    ctx.fillStyle = '#5A3A22'
    ctx.fillRect(0, 0, w, h)
    const cols = ['#C8642F', '#D98B3A', '#A9462A', '#E2A64A', '#8F3A22', '#B8532B', '#6E6E45']
    const n = Math.round((w * h) / 900)
    for (let i = 0; i < n; i++) {
      const x = r() * w
      const y = r() * h
      const s = (14 + r() * 26) * (w / 700)
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(r() * Math.PI * 2)
      ctx.fillStyle = cols[Math.floor(r() * cols.length)]
      ctx.globalAlpha = 0.85 + r() * 0.15
      ctx.beginPath()
      ctx.moveTo(0, -s)
      ctx.bezierCurveTo(s * 0.55, -s * 0.6, s * 0.6, s * 0.2, 0, s)
      ctx.bezierCurveTo(-s * 0.6, s * 0.2, -s * 0.55, -s * 0.6, 0, -s)
      ctx.fill()
      ctx.globalAlpha = 0.35
      ctx.strokeStyle = '#3B2414'
      ctx.lineWidth = Math.max(1, s / 14)
      ctx.beginPath()
      ctx.moveTo(0, -s * 0.9)
      ctx.lineTo(0, s * 0.95)
      ctx.stroke()
      ctx.restore()
    }
    ctx.globalAlpha = 1
  } else if (cover === 'dust') {
    ctx.fillStyle = '#B9AE9C'
    ctx.fillRect(0, 0, w, h)
    for (let i = 0; i < (w * h) / 60; i++) {
      ctx.fillStyle = r() > 0.5 ? 'rgba(90,80,68,.35)' : 'rgba(245,238,226,.4)'
      const s = r() * 3
      ctx.fillRect(r() * w, r() * h, s, s)
    }
    ctx.strokeStyle = 'rgba(70,60,50,.18)'
    for (let i = 0; i < 40; i++) {
      ctx.lineWidth = r() * 2
      ctx.beginPath()
      const x = r() * w
      ctx.moveTo(x, 0)
      ctx.lineTo(x + (r() - 0.5) * 80, h)
      ctx.stroke()
    }
  } else {
    const img = ctx.createImageData(w, h)
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 40 + r() * 170
      img.data[i] = v * 0.86
      img.data[i + 1] = v
      img.data[i + 2] = v * 0.8
      img.data[i + 3] = 255
    }
    ctx.putImageData(img, 0, 0)
    for (let y = 0; y < h; y += 4) {
      ctx.fillStyle = 'rgba(0,0,0,.22)'
      ctx.fillRect(0, y, w, 1.5)
    }
  }
}

export default function Surface({ m, tray, onPartial, onDone }: BathProps) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [found, setFound] = useState<number[]>([])
  const [cleared, setCleared] = useState(0)
  const last = useRef<{ x: number; y: number } | null>(null)
  const strokes = useRef(0)
  const copy = COVER_COPY[m.cover]
  const seed = hash(m.id)

  const spots = useMemo(() => {
    const r = rng(seed + 11)
    const n = m.details.length
    return m.details.map((_, i) => ({
      x: (i % 2 ? 44 : 5) + r() * 8,
      y: 7 + (i * 80) / Math.max(1, n) + r() * 4,
    }))
  }, [m.details, seed])

  // paint the cover
  useEffect(() => {
    const c = canvas.current!
    const rect = c.getBoundingClientRect()
    const scale = Math.min(window.devicePixelRatio || 1, 2) * 0.75
    c.width = Math.max(200, Math.round(rect.width * scale))
    c.height = Math.max(140, Math.round(rect.height * scale))
    paintCover(c.getContext('2d', { willReadFrequently: true })!, c.width, c.height, m.cover, seed)
  }, [m.cover, seed])

  const measure = () => {
    const c = canvas.current!
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    const data = ctx.getImageData(0, 0, c.width, c.height).data
    let clear = 0
    let n = 0
    const step = 12
    for (let y = step / 2; y < c.height; y += step)
      for (let x = step / 2; x < c.width; x += step) {
        n++
        if (data[(Math.floor(y) * c.width + Math.floor(x)) * 4 + 3] < 40) clear++
      }
    const frac = clear / n
    const nowFound: number[] = []
    spots.forEach((s, i) => {
      const cx = (s.x / 100) * c.width
      const cy = (s.y / 100) * c.height
      let ok = 0
      const bw = c.width * 0.2
      const bh = c.height * 0.08
      for (let k = 0; k < 9; k++) {
        const x = Math.floor(cx + (k % 3) * (bw / 2))
        const y = Math.floor(cy + Math.floor(k / 3) * (bh / 2))
        if (x < c.width && y < c.height && data[(y * c.width + x) * 4 + 3] < 40) ok++
      }
      if (ok >= 5) nowFound.push(i)
    })
    setCleared(frac)
    setFound((prev) => {
      const add = nowFound.filter((i) => !prev.includes(i))
      if (add.length) sound.chime(true)
      return add.length ? [...prev, ...add] : prev
    })
  }

  const erase = (x: number, y: number, from?: { x: number; y: number }) => {
    const c = canvas.current!
    const ctx = c.getContext('2d', { willReadFrequently: true })!
    ctx.globalCompositeOperation = 'destination-out'
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.lineWidth = c.width * 0.085
    ctx.beginPath()
    ctx.moveTo(from?.x ?? x, from?.y ?? y)
    ctx.lineTo(x + 0.01, y)
    ctx.stroke()
    if (++strokes.current % 6 === 0) measure()
  }

  const toCanvas = (e: React.PointerEvent) => {
    const c = canvas.current!
    const r = c.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height }
  }

  const sweep = () => {
    const c = canvas.current!
    // sweep towards the next undiscovered detail first, so keyboard users find things too
    const target = spots.findIndex((_, i) => !found.includes(i))
    const r = rng(Date.now())
    const y = target >= 0 ? ((spots[target].y + 3) / 100) * c.height : r() * c.height
    const x0 = target >= 0 ? ((spots[target].x - 4) / 100) * c.width : 0
    const x1 = target >= 0 ? x0 + c.width * 0.36 : c.width
    for (let k = 0; k <= 10; k++) {
      const from = { x: x0 + ((x1 - x0) * (k - 1)) / 10, y: y + Math.sin(k) * 6 }
      erase(x0 + ((x1 - x0) * k) / 10, y + Math.sin(k + 1) * 6, k ? from : undefined)
    }
    measure()
  }

  const allFound = found.length >= m.details.length
  useEffect(() => {
    onPartial(0.5 * Math.min(1, cleared / 0.6) + 0.5 * (found.length / Math.max(1, m.details.length)))
  }, [cleared, found.length, m.details.length, onPartial])

  const overlay = (
    <>
      <div className="surface-spots" aria-hidden="true">
        {m.details.map((d, i) => (
          <span key={i} className={`spot ${found.includes(i) ? 'is-found' : ''}`} style={{ left: spots[i].x + '%', top: spots[i].y + '%' }}>
            {d}
          </span>
        ))}
      </div>
      <canvas
        ref={canvas}
        className={`cover cover-${m.cover}`}
        aria-label={`${copy.verb}. Press space to sweep.`}
        role="img"
        tabIndex={0}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          last.current = toCanvas(e)
          erase(last.current.x, last.current.y)
        }}
        onPointerMove={(e) => {
          if (!last.current) return
          const p = toCanvas(e)
          erase(p.x, p.y, last.current)
          last.current = p
        }}
        onPointerUp={() => {
          last.current = null
          measure()
        }}
        onPointerCancel={() => (last.current = null)}
        onKeyDown={(e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault()
            sweep()
          }
        }}
      />
    </>
  )

  return (
    <div className="bath bath-surface">
      <div className="bath-visual">{tray(overlay, 'lg')}</div>
      <aside className="bath-panel">
        <p className="bath-kicker">Bath {roman(m.baths.indexOf('surface') + 1)} · Surface</p>
        <h2 className="bath-title">
          {copy.verb}. <InfoTip dark>{copy.hint} Somewhere under there are small things you once wrote down.</InfoTip>
        </h2>
        <ul className="found">
          {m.details.map((d, i) => (
            <li key={i} className={found.includes(i) ? 'is-found' : ''}>
              {found.includes(i) ? d : <span className="found-blank">{'·'.repeat(Math.min(18, d.length))}</span>}
            </li>
          ))}
        </ul>
        {found.length > 0 && <PastLabel date={m.date}>Details you kept</PastLabel>}
        <div className="row">
          <button type="button" className="btn btn-ghost" onClick={sweep}>
            Sweep once
          </button>
          {allFound && (
            <button type="button" className="btn btn-light" onClick={onDone}>
              Into the next bath
            </button>
          )}
        </div>
      </aside>
    </div>
  )
}
