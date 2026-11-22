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

/** A word (or kicker) that leans away from the drop as it passes, like text floating on the same water. */
interface Word {
  el: HTMLElement
  x: number // centre, in zone coordinates (measured with no push applied)
  y: number
  dx: number // current push
  dy: number
  r: number // current tilt
}

const TAIL = 6
const ORBIT = 3
const lerp = (a: number, b: number, k: number) => a + (b - a) * k

export default function InkLine({ zone }: { zone: RefObject<HTMLElement | null> }) {
  const [geo, setGeo] = useState<{ d: string; w: number; h: number; pools: P[] } | null>(null)
  const core = useRef<SVGPathElement>(null)
  const maskPath = useRef<SVGPathElement>(null)
  const head = useRef<SVGEllipseElement>(null)
  const shine = useRef<SVGCircleElement>(null)
  const drops = useRef<(SVGCircleElement | null)[]>([])
  const poolRefs = useRef<(SVGGElement | null)[]>([])
  const narrowRef = useRef(false)
  const orbiters = useRef<(SVGCircleElement | null)[]>([])
  const ring = useRef<SVGEllipseElement>(null)
  const state = useRef({
    len: 0,
    drawn: 0,
    target: 0,
    stops: [] as Stop[],
    samples: [] as { l: number; y: number }[],
    poolAt: [] as number[],
    // the liquid: a chain of droplets that trails the nib and runs back into it when the scroll rests
    tail: Array.from({ length: TAIL }, () => ({ x: 0, y: 0, vx: 0, vy: 0 })),
    hx: 0,
    hy: 0,
    px: 0,
    py: 0,
    wob: 0,
    spin: 0,
    words: [] as Word[],
    seeded: false,
  })
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
      // layout boxes, not screen boxes: the reveal animations move photos and words around, the path must not follow
      const box = (el: HTMLElement) => {
        let l = 0
        let t = 0
        let n: HTMLElement | null = el
        while (n && n !== z) {
          l += n.offsetLeft
          t += n.offsetTop
          n = n.offsetParent as HTMLElement | null
        }
        const w_ = el.offsetWidth
        const h_ = el.offsetHeight
        return { l, t, r: l + w_, b: t + h_, cx: l + w_ / 2, cy: t + h_ / 2 }
      }
      // the same switch as the stylesheet's (max-width: 860px), where the photo moves above the text
      const narrow = window.matchMedia('(max-width: 860px)').matches
      const clampX = (x: number) => Math.max(14, Math.min(w - 14, x))
      const pts: P[] = []
      const pools: P[] = []

      const manifesto = z.querySelector<HTMLElement>('[data-ink="intro"]')
      if (manifesto) {
        // the stroke starts under the manifesto's words, never through them
        const m = box(manifesto)
        const text = manifesto.querySelector<HTMLElement>('p')
        // the manifesto stands on the dark and the paper comes up beneath it: the ink starts once there is paper
        const below = Math.max(text ? box(text).b + 28 : m.t + 10, m.t + (m.b - m.t) * 0.66)
        pts.push({ x: w * 0.5, y: below }, { x: w * 0.5 + 6, y: below + 40 })
        pts.push({ x: w * (narrow ? 0.9 : 0.78), y: Math.max(below + 90, m.b - 50) })
      }
      const blocks = [...z.querySelectorAll<HTMLElement>('[data-ink="block"]')]
      blocks.forEach((sec, i) => {
        const frame = sec.querySelector<HTMLElement>('.l-frame')
        const kicker = sec.querySelector<HTMLElement>('.l-kicker')
        if (!frame || !kicker) return
        const f = box(frame)
        const k = box(kicker)
        const s = box(sec)
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
        // wide screens: the ink never goes under a photograph or over a word. It runs down the gutter between
        // the photo and the text, curls once beside the heading, then sweeps around the bottom of the photo
        // and out toward the margin before swinging back into the next gutter.
        const copy = sec.querySelector<HTMLElement>('.l-copy')
        const c = copy ? box(copy) : k
        const gx = textLeft ? (c.r + f.l) / 2 : (f.r + c.l) / 2
        const gap = Math.abs(textLeft ? f.l - c.r : c.l - f.r)
        const r = Math.max(12, Math.min(24, gap / 2 - 10))
        const outer = textLeft ? f.r : f.l // the photo's outside edge
        const out = textLeft ? 1 : -1 // direction from the gutter toward that edge
        pts.push({ x: gx, y: s.t + 6 })
        pts.push({ x: gx + out * 6, y: Math.min(f.t, c.t) + 20 })
        // a loop in the gutter, level with the heading
        const h2 = sec.querySelector<HTMLElement>('h2')
        const hy = h2 ? box(h2).cy : k.cy
        const lc = { x: gx, y: hy }
        pts.push(...loop(lc, r, textLeft))
        pools.push(lc)
        // down the gutter, then round the photo's bottom corner and along under it
        pts.push({ x: gx - out * 4, y: f.b - 20 })
        pts.push({ x: gx + out * 18, y: f.b + 26 })
        pts.push({ x: f.cx, y: f.b + 40 })
        pts.push({ x: clampX(outer + out * 26), y: f.b + 18 })
        // a wide swing across the open space before the next block; after the last one, straight on down
        if (i < blocks.length - 1) {
          pts.push({ x: clampX(outer + out * 46), y: (f.b + s.b) / 2 + 30 })
          pts.push({ x: f.cx + out * 20, y: s.b - 6 })
        }
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
    // measure the text the drop swims past, at rest
    const zr = z.getBoundingClientRect()
    const words: Word[] = []
    z.querySelectorAll<HTMLElement>('.w, .pw, .l-kicker').forEach((el) => {
      el.style.translate = ''
      el.style.rotate = ''
      const r = el.getBoundingClientRect()
      words.push({ el, x: r.left - zr.left + r.width / 2, y: r.top - zr.top + r.height / 2, dx: 0, dy: 0, r: 0 })
    })
    Object.assign(state.current, { len, samples, stops, poolAt, words })
    if (maskPath.current) maskPath.current.style.strokeDasharray = `${len} ${len + 10}`
    if (reduce) {
      state.current.drawn = len
      stops.forEach((s) => s.el.classList.add('is-in'))
    }
    paint()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo])

  /** Draws the stroke up to `drawn`; opens the blocks it has reached and closes them again if it runs back. */
  function paint() {
    const st = state.current
    const m = maskPath.current
    if (!m || !st.len) return
    m.style.strokeDashoffset = String(st.len - st.drawn)
    const p = core.current?.getPointAtLength(Math.max(0.1, st.drawn))
    if (p) {
      st.hx = p.x
      st.hy = p.y
      if (!st.seeded) {
        st.tail.forEach((d) => Object.assign(d, { x: p.x, y: p.y }))
        st.px = p.x
        st.py = p.y
        st.seeded = true
      }
    }
    // a block opens once the ink reaches it and stays open: what you have read doesn't vanish on the way back up
    for (const s of st.stops) if (st.drawn >= s.at) s.el.classList.add('is-in')
    st.poolAt.forEach((at, i) => poolRefs.current[i]?.classList.toggle('is-wet', st.drawn >= at))
  }

  /**
   * One step of the liquid: the nib stretches along its motion, the droplets behind it are springs that
   * lag on the way and run back together into one drop when the scroll stops, and hang a little under
   * gravity. The text near it leans away and floats back. Returns true while anything is still moving.
   */
  function flow(time: number) {
    const st = state.current
    const g = head.current
    if (!g || !st.len) return false
    const visible = st.drawn > 4 && st.drawn < st.len - 4
    g.ownerSVGElement?.classList.toggle('is-live', visible)
    const k = narrowRef.current ? 0.7 : 1

    // nib velocity, smoothed
    const mx = st.hx - st.px
    const my = st.hy - st.py
    st.px = st.hx
    st.py = st.hy
    const sp = Math.hypot(mx, my)
    st.wob = lerp(st.wob, Math.min(sp, 40), 0.2)
    const ang = (Math.atan2(my, mx) * 180) / Math.PI
    const stretch = 1 + Math.min(st.wob * 0.05, 0.9)
    const breathe = 1 + Math.sin(time / 520) * 0.05
    g.setAttribute('cx', st.hx.toFixed(1))
    g.setAttribute('cy', st.hy.toFixed(1))
    g.setAttribute('rx', (8 * k * stretch * breathe).toFixed(2))
    g.setAttribute('ry', ((8 * k * breathe) / Math.sqrt(stretch)).toFixed(2))
    if (sp > 0.3) g.setAttribute('transform', `rotate(${ang.toFixed(1)} ${st.hx.toFixed(1)} ${st.hy.toFixed(1)})`)
    else g.setAttribute('transform', '')
    shine.current?.setAttribute('cx', (st.hx - 2.4 * k).toFixed(1))
    shine.current?.setAttribute('cy', (st.hy - 2.8 * k).toFixed(1))

    // satellites: three droplets orbit the nib on a tilted ring, spun faster and flung wider by the scroll
    st.spin += 0.022 + st.wob * 0.014
    const orbitR = (17 + st.wob * 0.7) * k
    for (let j = 0; j < ORBIT; j++) {
      const a = st.spin * (j % 2 ? -1 : 1) * (1 + j * 0.18) + (j * Math.PI * 2) / ORBIT
      const depth = Math.sin(a) // < 0: behind the drop
      const c = orbiters.current[j]
      if (!c) continue
      c.setAttribute('cx', (st.hx + Math.cos(a) * orbitR).toFixed(1))
      c.setAttribute('cy', (st.hy + depth * orbitR * 0.42 - j * 1.5 * k).toFixed(1))
      c.setAttribute('r', ((1.6 + 1.1 * (depth + 1) * 0.5) * k).toFixed(2))
      c.style.opacity = (0.35 + 0.65 * (depth + 1) * 0.5).toFixed(2)
    }
    const rg = ring.current
    if (rg) {
      rg.setAttribute('cx', st.hx.toFixed(1))
      rg.setAttribute('cy', st.hy.toFixed(1))
      rg.setAttribute('rx', orbitR.toFixed(1))
      rg.setAttribute('ry', (orbitR * 0.42).toFixed(1))
      rg.style.strokeDashoffset = String((-st.spin * 40).toFixed(1))
    }

    // the droplet chain: each one is pulled toward the one ahead of it
    let moving = st.wob > 0.05
    let ax = st.hx
    let ay = st.hy
    st.tail.forEach((d, i) => {
      const still = 1 - Math.min(1, st.wob / 5)
      const sag = (i + 1) * 1.7 * still // a hanging drip when the scroll rests
      const sway = Math.sin(time / 380 + i) * 0.7 * still
      d.vx = (d.vx + (ax + sway - d.x) * 0.26) * 0.62
      d.vy = (d.vy + (ay + sag - d.y) * 0.26) * 0.62
      d.x += d.vx
      d.y += d.vy
      if (Math.abs(d.vx) + Math.abs(d.vy) > 0.05) moving = true
      const c = drops.current[i]
      if (c) {
        c.setAttribute('cx', d.x.toFixed(1))
        c.setAttribute('cy', d.y.toFixed(1))
      }
      ax = d.x
      ay = d.y
    })

    // the text leans away from the drop and floats back
    const R = narrowRef.current ? 90 : 160
    const zTop = zone.current?.getBoundingClientRect().top ?? 0
    const vh = window.innerHeight
    for (const w of st.words) {
      const sy = w.y + zTop
      let tx = 0
      let ty = 0
      let tr = 0
      if (visible && sy > -120 && sy < vh + 120) {
        const ex = w.x - st.hx
        const ey = w.y - st.hy
        const d = Math.hypot(ex, ey)
        if (d < R) {
          // only a moving drop parts the words: at rest every word settles back where it belongs
          const f = (1 - d / R) ** 2 * Math.min(1, st.wob / 6)
          const push = (narrowRef.current ? 10 : 20) * f
          tx = (ex / (d || 1)) * push
          ty = (ey / (d || 1)) * push
          tr = (ex > 0 ? 1 : -1) * 4 * f
        }
      }
      if (!tx && !ty && !w.dx && !w.dy) continue
      w.dx = lerp(w.dx, tx, 0.1)
      w.dy = lerp(w.dy, ty, 0.1)
      w.r = lerp(w.r, tr, 0.1)
      if (!tx && !ty && Math.abs(w.dx) < 0.05 && Math.abs(w.dy) < 0.05) {
        w.dx = w.dy = w.r = 0
        w.el.style.translate = ''
        w.el.style.rotate = ''
        continue
      }
      moving = true
      // the individual translate/rotate properties stack on top of the CSS reveal transforms
      w.el.style.translate = `${w.dx.toFixed(2)}px ${w.dy.toFixed(2)}px`
      w.el.style.rotate = `${w.r.toFixed(2)}deg`
    }
    return moving
  }

  /* ---------- 3 · follow the scroll; the liquid keeps moving while the zone is on screen ---------- */
  useEffect(() => {
    if (reduce) return
    const z = zone.current
    if (!z) return
    let raf = 0
    let inView = true
    const aim = () => {
      const st = state.current
      if (!st.samples.length) return
      const zTop = z.getBoundingClientRect().top
      // the nib runs well ahead of the reader, so a block is open before it reaches the middle of the screen
      const y = window.innerHeight * 0.82 - zTop
      st.target = st.samples.find((s) => s.y >= y)?.l ?? st.len
      // a hidden tab gets no animation frames — draw straight to the target
      if (document.hidden) {
        st.drawn = st.target
        paint()
        return
      }
      if (!raf) raf = requestAnimationFrame(tick)
    }
    const tick = (time: number) => {
      const st = state.current
      const diff = st.target - st.drawn
      // ink runs forward quickly and dries slowly on the way back
      st.drawn += diff * (diff > 0 ? 0.12 : 0.08)
      if (Math.abs(diff) < 0.5) st.drawn = st.target
      paint()
      const moving = flow(time)
      // the drop keeps breathing while you can see it; off screen everything sleeps
      raf = inView || moving || Math.abs(st.target - st.drawn) > 0.5 ? requestAnimationFrame(tick) : 0
    }
    const io = new IntersectionObserver(([e]) => {
      inView = e.isIntersecting
      if (inView) aim()
    })
    io.observe(z)
    aim()
    window.addEventListener('scroll', aim, { passive: true })
    window.addEventListener('resize', aim)
    return () => {
      io.disconnect()
      window.removeEventListener('scroll', aim)
      window.removeEventListener('resize', aim)
      cancelAnimationFrame(raf)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geo])

  if (!geo) return null
  const narrow = typeof window !== 'undefined' && window.matchMedia('(max-width: 860px)').matches
  narrowRef.current = narrow
  const k = narrow ? 0.7 : 1
  return (
    <svg className="ink" width={geo.w} height={geo.h} viewBox={`0 0 ${geo.w} ${geo.h}`} aria-hidden="true">
      <defs>
        <mask id="ink-reveal" maskUnits="userSpaceOnUse" x="0" y="0" width={geo.w} height={geo.h}>
          <path ref={maskPath} d={geo.d} fill="none" stroke="#fff" strokeWidth={30} strokeLinecap="round" strokeLinejoin="round" />
        </mask>
        {/* metaballs: blurred shapes thresholded back to hard edges, so close drops merge like real liquid */}
        <filter id="ink-goo" x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation={narrow ? 3 : 4.2} result="b" />
          <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -11" result="g" />
          <feComposite in="SourceGraphic" in2="g" operator="atop" />
        </filter>
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

      {/* little splashes where the brush paused at each heading: a pool and the spatter around it */}
      {geo.pools.map((c, i) => (
        <g key={i} ref={(el) => void (poolRefs.current[i] = el)} className="ink-pool">
          <g filter="url(#ink-goo)">
          <circle cx={c.x} cy={c.y} r={narrow ? 4 : 6} fill="#7a2e2e" />
          {[0, 1, 2, 3].map((j) => {
            const a = i * 1.7 + j * 1.9
            const d = (narrow ? 9 : 14) + ((i + j) % 3) * 4
            return (
              <circle
                key={j}
                className="ink-spat"
                style={{ '--j': j } as React.CSSProperties}
                cx={c.x + Math.cos(a) * d}
                cy={c.y + Math.sin(a) * d * 0.8}
                r={(narrow ? 1.6 : 2.4) - j * 0.25}
                fill="#7a2e2e"
              />
            )
          })}
          </g>
          <circle className="ink-ripple" cx={c.x} cy={c.y} r={narrow ? 16 : 24} fill="none" stroke="#7a2e2e" strokeWidth={1} />
          <circle className="ink-ripple is-late" cx={c.x} cy={c.y} r={narrow ? 16 : 24} fill="none" stroke="#7a2e2e" strokeWidth={0.8} />
        </g>
      ))}

      {/* the nib: a living drop. Its tail stretches when you scroll and runs back into it when you stop,
          and a tilted ring of droplets spins around it */}
      <g className="ink-live">
        <ellipse ref={ring} className="ink-ring" fill="none" stroke="#7a2e2e" strokeWidth={0.9} strokeDasharray="2 7 14 6" />
        <g filter="url(#ink-goo)">
          {Array.from({ length: TAIL }, (_, i) => (
            <circle key={i} ref={(el) => void (drops.current[i] = el)} r={(6.6 - i * 0.85) * k} fill="#7a2e2e" />
          ))}
          <ellipse ref={head} rx={8 * k} ry={8 * k} fill="url(#ink-drop)" />
        </g>
        <circle ref={shine} r={2.2 * k} fill="#f3d9c4" opacity=".75" />
        {Array.from({ length: ORBIT }, (_, j) => (
          <circle key={j} ref={(el) => void (orbiters.current[j] = el)} r={2 * k} fill="url(#ink-drop)" />
        ))}
      </g>
    </svg>
  )
}
