// The diary film: one continuous shot (the diary opens, we fall into a photograph of Paris, wander the empty
// city at dusk, and it folds back into the diary) whose time is the scroll. The video stays pinned to the
// screen while the section scrolls past; scrolling up plays it backwards. A line of text belongs to each
// chapter of the film and dissolves in and out with it.
import { useEffect, useRef, useState } from 'react'

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))

/**
 * The shot opens on the same developing tray as the hero above it. The film starts three seconds in, on the
 * closed diary, so the page never shows the same picture twice in a row; film-diary.jpg is that frame.
 */
const START = 3
const ease = (x: number) => {
  const t = clamp01(x)
  return t * t * (3 - 2 * t)
}

/** Each caption lives in a slice of the film, given as fractions of its length. */
const LINES = [
  { from: 0.04, to: 0.22, k: 'Open the diary', t: 'Every page is a day you lived.' },
  { from: 0.28, to: 0.47, k: 'Step into a photograph', t: 'Every photo is a door.' },
  { from: 0.53, to: 0.74, k: 'Paris, one October', t: 'The rain, the lamps, the river — still there.' },
  { from: 0.8, to: 0.97, k: 'Close it gently', t: 'It keeps, until you come back.' },
]

export default function ScrollFilm() {
  // with reduced motion the film is a still: its first frame is enough, the 12 MB video is not fetched
  const [calm] = useState(() => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  const wrap = useRef<HTMLElement>(null)
  const film = useRef<HTMLVideoElement>(null)
  const lines = useRef<(HTMLDivElement | null)[]>([])
  const bar = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = wrap.current
    const v = film.current
    if (!el || !v) return
    v.muted = true
    let raf = 0
    let shown = -1
    const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const frame = () => {
      raf = 0
      const vh = window.innerHeight
      const r = el.getBoundingClientRect()
      // With reduced motion the section is one still screen (see the stylesheet). Mapping the scroll onto it
      // would race through the whole film in a pixel, so it simply holds its first frame and caption.
      if (calm?.matches || r.height < vh * 1.5) {
        el.style.setProperty('--p', '0')
        el.style.setProperty('--in', '1')
        el.style.setProperty('--out', '0')
        return
      }
      const p = clamp01(-r.top / Math.max(1, r.height - vh))
      el.style.setProperty('--p', p.toFixed(4))
      // in: the dark of the hero lifts as the film arrives
      el.style.setProperty('--in', ease((vh - r.top) / vh - 0.6).toFixed(3))
      // out: over the last stretch the film sinks back into the dark it came from, so it meets the dark top
      // of the next section with no seam; the change to paper happens slowly there, never in one step
      el.style.setProperty('--out', ease((p - 0.86) / 0.12).toFixed(3))
      if (bar.current) bar.current.style.transform = `scaleX(${p.toFixed(4)})`

      LINES.forEach((l, i) => {
        const n = lines.current[i]
        if (!n) return
        const span = l.to - l.from
        const a = ease((p - l.from) / (span * 0.25))
        const b = 1 - ease((p - (l.to - span * 0.25)) / (span * 0.25))
        const o = Math.min(a, b)
        n.style.opacity = o.toFixed(3)
        n.style.transform = `translate3d(0, ${((1 - a) * 40 - (1 - b) * 40).toFixed(1)}px, 0)`
        n.style.filter = `blur(${((1 - o) * 8).toFixed(1)}px)`
      })

      if (v.duration) {
        const want = START + p * (v.duration - 0.05 - START)
        if (shown < 0) shown = want
        // the frame glides toward the scroll instead of jumping to it
        shown += (want - shown) * 0.22
        if (Math.abs(want - shown) < 0.004) shown = want
        if (Math.abs(v.currentTime - shown) > 1 / 60 && !v.seeking) v.currentTime = shown
        if (shown !== want || v.seeking) raf = requestAnimationFrame(frame)
      }
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(frame)
    }
    frame()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    calm?.addEventListener?.('change', on)
    v.addEventListener('loadedmetadata', on)
    v.addEventListener('seeked', on)
    return () => {
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
      calm?.removeEventListener?.('change', on)
      v.removeEventListener('loadedmetadata', on)
      v.removeEventListener('seeked', on)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <section className="l-film" ref={wrap} aria-label="The diary">
      <div className="l-film-stage">
        <video ref={film} className="l-film-video" src="/media/paris-scroll.mp4" poster="/media/film-diary.jpg" muted playsInline preload={calm ? 'none' : 'auto'} aria-hidden="true" />
        <span className="l-film-shade" aria-hidden="true" />
        {LINES.map((l, i) => (
          <div key={i} ref={(n) => void (lines.current[i] = n)} className={`l-film-line ${i % 2 ? 'is-right' : ''}`} style={{ opacity: 0 }}>
            <p className="l-kicker">{l.k}</p>
            <h2>{l.t}</h2>
          </div>
        ))}
        <span className="l-film-bar" aria-hidden="true">
          <span ref={bar} />
        </span>
        <span className="l-film-dusk" aria-hidden="true" />
      </div>
    </section>
  )
}
