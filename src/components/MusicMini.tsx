// A small, self-playing copy of the app's music box for the landing page: brass case, a keyboard for the comb,
// a calendar roll with punched holes, a lit playhead and a turning crank. Keys light up as holes cross the
// playhead. Silent, and it only runs while it is on screen.
import { useEffect, useRef } from 'react'

const ROWS = 10
const NAMES = ['C4', 'D4', 'E4', 'G4', 'A4', 'C5', 'D5', 'E5', 'G5', 'A5']
const DAYS = 31
const STEP = 22 // px per half-day
const COLS = DAYS * 2
const WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const FIRST_WEEKDAY = 3 // 1 October 2025 was a Wednesday
const PLAY_X = 64
const SPEED = 30 // px per second

/** A fixed, pretty tune: chords on photo days, a single note on the others, rests now and then. */
const HOLES: { col: number; row: number }[] = (() => {
  const out: { col: number; row: number }[] = []
  let seed = 7
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280)
  for (let c = 0; c < COLS; c++) {
    const r = rnd()
    if (c % 2 === 1 && r < 0.55) continue
    if (r < 0.12) continue
    const base = Math.floor(rnd() * 6)
    out.push({ col: c, row: base })
    if (c % 2 === 0 && rnd() < 0.6) out.push({ col: c, row: Math.min(ROWS - 1, base + 2 + Math.floor(rnd() * 2)) })
    if (c % 4 === 0 && rnd() < 0.35) out.push({ col: c, row: Math.min(ROWS - 1, base + 5) })
  }
  return out
})()
const PHOTO_DAYS = new Set([2, 5, 6, 9, 12, 13, 17, 20, 21, 24, 27, 30])

export default function MusicMini() {
  const root = useRef<HTMLDivElement>(null)
  const roll = useRef<HTMLDivElement>(null)
  const arm = useRef<HTMLSpanElement>(null)
  const keys = useRef<(HTMLSpanElement | null)[]>([])
  const holes = useRef<(HTMLSpanElement | null)[]>([])
  const day = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let raf = 0
    let on = false
    let last = 0
    let x = 0
    const width = COLS * STEP
    const litUntil = new Array(ROWS).fill(0)
    const tick = (t: number) => {
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0
      last = t
      const before = x
      x = (x + dt * SPEED) % width
      const wrapped = x < before
      roll.current?.style.setProperty('transform', `translateX(${(PLAY_X - x).toFixed(1)}px)`)
      if (arm.current) arm.current.style.transform = `rotate(${((x / STEP) * 90).toFixed(1)}deg)`
      if (day.current) day.current.textContent = String(Math.min(DAYS, Math.floor(x / (STEP * 2)) + 1))
      HOLES.forEach((h, i) => {
        const hx = h.col * STEP + STEP / 2
        const crossed = wrapped ? hx > before || hx <= x : hx > before && hx <= x
        if (crossed) litUntil[h.row] = t + 230
        const node = holes.current[i]
        if (node) {
          const past = hx < x
          node.classList.toggle('is-past', past)
          node.classList.toggle('is-ringing', past && x - hx < STEP * 1.4)
        }
      })
      keys.current.forEach((k, r) => k?.classList.toggle('is-lit', t < litUntil[r]))
      raf = on ? requestAnimationFrame(tick) : 0
    }
    if (reduce) {
      x = STEP * 18
      requestAnimationFrame(tick)
      return
    }
    const io = new IntersectionObserver(([e]) => {
      on = e.isIntersecting
      last = 0
      if (on && !raf) raf = requestAnimationFrame(tick)
    })
    io.observe(el)
    return () => {
      io.disconnect()
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="mm" ref={root}>
      <div className="mm-plate">
        <span>№ 10</span>
        <b>October 2025</b>
        <span>
          day <em ref={day}>1</em> of 31
        </span>
      </div>
      <div className="mm-body">
        <div className="mm-window">
          <div className="mm-roll" ref={roll} style={{ width: COLS * STEP }}>
            {Array.from({ length: DAYS }, (_, i) => {
              const wd = (FIRST_WEEKDAY + i) % 7
              const cls = ['mm-day', (wd === 0 || wd === 6) && 'is-weekend', wd === 1 && 'is-monday', PHOTO_DAYS.has(i + 1) && 'has']
              return (
                <div key={i} className={cls.filter(Boolean).join(' ')} style={{ left: i * STEP * 2, width: STEP * 2 }}>
                  <span className="mm-num">
                    <b>{i + 1}</b>
                    <i>{WEEK[wd]}</i>
                  </span>
                  {PHOTO_DAYS.has(i + 1) && <span className="mm-stamp" style={{ '--h': (i * 47) % 360 } as React.CSSProperties} />}
                </div>
              )
            })}
            {HOLES.map((h, i) => (
              <span
                key={i}
                ref={(n) => void (holes.current[i] = n)}
                className="mm-hole"
                style={{ left: h.col * STEP + STEP / 2 - 5, top: `calc(var(--mm-top) + ${ROWS - 1 - h.row} * var(--mm-row) + 2px)` }}
              />
            ))}
          </div>
          <div className="mm-keys">
            {Array.from({ length: ROWS }, (_, i) => {
              const row = ROWS - 1 - i
              return (
                <span
                  key={row}
                  ref={(n) => void (keys.current[row] = n)}
                  className={`mm-key ${row % 5 === 0 ? 'is-c' : ''}`}
                  style={{ top: `calc(var(--mm-top) + ${i} * var(--mm-row))`, width: `${(1 - row / (ROWS * 3)) * 100}%` }}
                >
                  <em>{NAMES[row]}</em>
                </span>
              )
            })}
          </div>
          <span className="mm-line" />
          <span className="mm-glass" />
        </div>
        <div className="mm-crank">
          <span className="mm-arm" ref={arm}>
            <span className="mm-knob" />
          </span>
          <span className="mm-hub" />
        </div>
      </div>
      {['tl', 'tr', 'bl', 'br'].map((c) => (
        <span key={c} className={`mm-screw mm-screw-${c}`} />
      ))}
    </div>
  )
}
