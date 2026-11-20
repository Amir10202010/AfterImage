// A single brush stroke of ink that draws itself down the page as you scroll.
// It loops by each heading, slips under each photograph, and wherever the pen arrives,
// that block opens. The path is measured from the real layout, so it fits any screen.
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'

type P = { x: number; y: number }

/** Smooth curve through points (Catmull–Rom, written as cubic Béziers). */
function smooth(pts: P[]) {
  if (pts.length < 2) return ''
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    d += ` C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }
  return d
}

/** A small hand-drawn loop around a point, entered from above. */
function loop(c: P, r: number, clockwise: boolean): P[] {
  const out: P[] = []
  const dir = clockwise ? 1 : -1
  for (let k = 0; k <= 7; k++) {
    const a = -Math.PI / 2 + dir * (k / 7) * Math.PI * 2.1
    out.push({ x: c.x + Math.cos(a) * r * (1 + 0.08 * Math.sin(k)), y: c.y + Math.sin(a) * r * 0.82 + k * 2.2 })
  }
  return out
}

interface Stop {
  el: HTMLElement
  at: number // length along the path where this block opens
}

export default function InkLine({ zone }: { zone: RefObject<HTMLElement | null> }) {
  const [geo, setGeo] = useState<{ d: string; w: number; h: number; pools: P[] } | null>(null)
  const core = useRef<SVGPathElement>(null)
  const maskPath = useRef<SVGPathElement>(null)
  const head = useRef<SVGGElement>(null)
  const poolRefs = useRef<(SVGCircleElement | null)[]>([])
  const state = useRef({ len: 0, drawn: 0, target: 0, stops: [] as Stop[], samples: [] as { l: number; y: number }[], poolAt: [] as number[] })
  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  /* ---------- 1 · measure the blocks and lay the path through them ---------- */
  // a passive effect: by now the parent's ref is attached and the layout is real
  useEffect(() => {
    const z = zone.current
    if (!z) return
    const build = () => {
      const zr = z.getBoundingClientRect()
      const w = zr.width
      const h = z.scrollHeight
      const rel = (r: DOMRect) => ({ l: r.left - zr.left, t: r.top - zr.top, r: r.right - zr.left, b: r.bottom - zr.top, cx: r.left - zr.left + r.width / 2, cy: r.top - zr.top + r.height / 2 })
      const narrow = w < 760
      const clampX = (x: number) => Math.max(14, Math.min(w - 14, x))
      const pts: P[] = []
      const pools: P[] = []

      const manifesto = z.querySelector<HTMLElement>('[data-ink="intro"]')
      if (manifesto) {
        const m = rel(manifesto.getBoundingClientRect())
        pts.push({ x: w * 0.5, y: m.t + 10 }, { x: w * 0.5 + 6, y: m.t + 60 })
        pts.push({ x: w * (narrow ? 0.9 : 0.78), y: m.b - 70 })
      }
      z.querySelectorAll<HTMLElement>('[data-ink="block"]').forEach((sec, i) => {
        const frame = sec.querySelector<HTMLElement>('.l-frame')
        const kicker = sec.querySelector<HTMLElement>('.l-kicker')
        if (!frame || !kicker) return
        const f = rel(frame.getBoundingClientRect())
        const k = rel(kicker.getBoundingClientRect())
        const s = rel(sec.getBoundingClientRect())
        const textLeft = k.l < f.l
        if (narrow) {
          // phones: the photo sits above the text, so the ink keeps to the margins and never crosses a line of text
          const side = i % 2 ? w - 6 : 6
          pts.push({ x: w - side, y: s.t + 10 })
          pts.push({ x: f.cx, y: f.cy })
          pts.push({ x: side, y: f.b + 4 })
          // the loop sits in the gap between the photo and the heading, clear of the letters
          const lc = { x: side === 6 ? 12 : w - 12, y: (f.b + k.t) / 2 - 2 }
          pts.push(...loop(lc, 7, side !== 6))
          pools.push(lc)
          pts.push({ x: side, y: s.b - 20 })
          return
        }
        // swing in through the gap above the block
        pts.push({ x: clampX(narrow ? (i % 2 ? w * 0.12 : w * 0.88) : textLeft ? k.r + 90 : f.r + 60), y: s.t + 24 })
        // a loop right beside the heading
        // text on the left has no margin to spare, so the loop sits just after the kicker
        const lc = { x: clampX(narrow ? w - 28 : textLeft ? k.r + 34 : k.l - 34), y: k.cy - 4 }
        pts.push(...loop(lc, narrow ? 14 : 22, !textLeft))
        pools.push(lc)
        // then under the photograph, corner to corner
        pts.push({ x: clampX(textLeft ? f.l + 30 : f.r - 30), y: f.t + 30 })
        pts.push({ x: f.cx + (textLeft ? 40 : -40), y: f.cy })
        pts.push({ x: clampX(textLeft ? f.r - 20 : f.l + 20), y: f.b + 26 })
      })
      // run off into the next section
      pts.push({ x: w * 0.5, y: h - 30 }, { x: w * 0.5 - 4, y: h + 4 })
      setGeo({ d: smooth(pts), w, h, pools })
    }
    build()
    const ro = new ResizeObserver(() => build())
    ro.observe(z)
    return () => ro.disconnect()
  }, [zone])

  /* ---------- 2 · after layout: length, lookup table, and where each block opens ---------- */
  useLayoutEffect(() => {
    const p = core.current
    const z = zone.current
    if (!geo || !p || !z) return
    const len = p.getTotalLength()
    const samples: { l: number; y: number }[] = []
    let maxY = -Infinity
    for (let i = 0; i <= 600; i++) {
      const l = (i / 600) * len
      maxY = Math.max(maxY, p.getPointAtLength(l).y)
      samples.push({ l, y: maxY })
    }
    const lengthAtY = (y: number) => samples.find((s) => s.y >= y)?.l ?? len
    const zTop = z.getBoundingClientRect().top + window.scrollY
    const stops: Stop[] = []
    z.querySelectorAll<HTMLElement>('[data-ink]').forEach((el) => {
      const kick = el.querySelector<HTMLElement>('.l-kicker, p') ?? el
      const y = kick.getBoundingClientRect().top + window.scrollY - zTop
      stops.push({ el, at: lengthAtY(y - 30) })
    })
    const poolAt = geo.pools.map((c) => lengthAtY(c.y))
    Object.assign(state.current, { len, samples, stops, poolAt })
    if (maskPath.current) maskPath.current.style.strokeDasharray = `${len} ${len + 10}`
    if (reduce) {
      state.current.drawn = len
      stops.forEach((s) => s.el.classList.add('is-in'))
    }
    paint()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo])

  function paint() {
    const st = state.current
    const m = maskPath.current
    if (!m || !st.len) return
    m.style.strokeDashoffset = String(st.len - st.drawn)
    const p = core.current?.getPointAtLength(Math.max(0.1, st.drawn))
    if (p && head.current) {
      head.current.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`)
      head.current.style.opacity = st.drawn > 4 && st.drawn < st.len - 4 ? '1' : '0'
    }
    for (const s of st.stops) if (st.drawn >= s.at) s.el.classList.add('is-in')
    st.poolAt.forEach((at, i) => poolRefs.current[i]?.classList.toggle('is-wet', st.drawn >= at))
  }

  /* ---------- 3 · follow the scroll, with a little ease so the ink flows ---------- */
  useEffect(() => {
    if (reduce) return
    const z = zone.current
    if (!z) return
    let raf = 0
    const aim = () => {
      const st = state.current
      if (!st.samples.length) return
      const zTop = z.getBoundingClientRect().top
      const y = window.innerHeight * 0.62 - zTop
      st.target = st.samples.find((s) => s.y >= y)?.l ?? st.len
      // a hidden tab gets no animation frames — draw straight to the target
      if (document.hidden) {
        st.drawn = st.target
        paint()
        return
      }
      if (!raf) raf = requestAnimationFrame(tick)
    }
    const tick = () => {
      const st = state.current
      const diff = st.target - st.drawn
      // ink runs forward quickly and dries slowly on the way back
      st.drawn += diff * (diff > 0 ? 0.14 : 0.08)
      if (Math.abs(diff) < 0.5) st.drawn = st.target
      paint()
      raf = Math.abs(st.target - st.drawn) > 0.5 ? requestAnimationFrame(tick) : 0
    }
    aim()
    window.addEventListener('scroll', aim, { passive: true })
    window.addEventListener('resize', aim)
    return () => {
      window.removeEventListener('scroll', aim)
      window.removeEventListener('resize', aim)
      cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo])

  if (!geo) return null
  const narrow = geo.w < 760
  const k = narrow ? 0.7 : 1
  return (
    <svg className="ink" width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w} ${geo.h}`} aria-hidden="true">
      <defs>
        <mask id="ink-reveal" maskUnits="userSpaceOnUse" x="0" y="0" width={geo.w} height={geo.h}>
          <path ref={maskPath} d={geo.d} fill="none" stroke="#fff" strokeWidth={30} strokeLinecap="round" strokeLinejoin="round" />
        </mask>
        <radialGradient id="ink-drop" cx="40%" cy="35%" r="65%">
          <stop offset="0" stopColor="#b4503f" />
          <stop offset=".6" stopColor="#7a2e2e" />
          <stop offset="1" stopColor="#4f1a1a" />
        </radialGradient>
      </defs>

      {/* the brush: a solid core and a few dry bristles around it */}
      <g mask="url(#ink-reveal)" fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d={geo.d} stroke="#c9a487" strokeOpacity=".28" strokeWidth={14 * k} />
        <path ref={core} d={geo.d} stroke="#7a2e2e" strokeWidth={5 * k} />
        <path d={geo.d} stroke="#5a1f1f" strokeWidth={2.2 * k} transform="translate(1.6 -1.2)" strokeDasharray="90 7 30 4 160 9" strokeOpacity=".9" />
        <path d={geo.d} stroke="#a0463a" strokeWidth={1.4 * k} transform="translate(-2.4 1.8)" strokeDasharray="40 12 120 6 18 9" strokeOpacity=".75" />
        <path d={geo.d} stroke="#b4664a" strokeWidth={1 * k} transform="translate(3.2 2.4)" strokeDasharray="12 18 60 10 8 26" strokeOpacity=".6" />
        <path d={geo.d} stroke="#3b1414" strokeWidth={0.8 * k} transform="translate(-3.6 -2.2)" strokeDasharray="6 22 28 14" strokeOpacity=".5" />
      </g>

      {/* small pools of ink where the brush paused at each heading */}
      {geo.pools.map((c, i) => (
        <circle key={i} ref={(el) => void (poolRefs.current[i] = el)} className="ink-pool" cx={c.x} cy={c.y} r={(narrow ? 3.4 : 5) * 1} fill="#7a2e2e" />
      ))}

      {/* the nib: a wet drop of ink leading the line */}
      <g ref={head} className="ink-head" style={{ opacity: 0 }}>
        <circle r={16 * k} fill="#b4664a" opacity=".16" />
        <circle r={7.5 * k} fill="url(#ink-drop)" />
        <circle r={2.2 * k} cx={-2.2 * k} cy={-2.6 * k} fill="#f3d9c4" opacity=".7" />
      </g>
    </svg>
  )
}
