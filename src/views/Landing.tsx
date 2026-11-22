import { useEffect, useRef, useState } from 'react'
import { Fragment } from 'react'
import { Loop } from './Today'
import InkLine from '../components/InkLine'
import MusicMini from '../components/MusicMini'
import ScrollFilm from '../components/ScrollFilm'
import { glideTo, useLandingFx } from '../components/landingFx'

const ENTERED = 'afterimage.entered'
export function hasEntered() {
  try {
    return localStorage.getItem(ENTERED) === '1'
  } catch {
    return false
  }
}

/** Reveals sections as they scroll in. */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal')
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-in')
            io.unobserve(e.target)
          }
        }),
      { threshold: 0.18 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

/** Splits a line into words that rise one after another when their block opens. */
function Words({ text, start = 0 }: { text: string; start?: number }) {
  return (
    <>
      {text.split(' ').map((w, i) => (
        <Fragment key={i}>
          <span className="w">
            <span className="wi" style={{ '--i': start + i } as React.CSSProperties}>
              {w}
            </span>
          </span>{' '}
        </Fragment>
      ))}
    </>
  )
}

/** A paragraph split into words, so each one can lean away from the ink drop as it passes. */
function Flow({ text }: { text: string }) {
  return (
    <>
      {text.split(' ').map((w, i) => (
        <Fragment key={i}>
          <span className="pw" style={{ '--k': i } as React.CSSProperties}>
            {w}
          </span>{' '}
        </Fragment>
      ))}
    </>
  )
}

/** Plays once — when the ink opens its block — and rests on the last frame. */
function PlayOnce({ src, poster }: { src: string; poster: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    const block = v?.closest('[data-ink]')
    if (!v || !block) return
    v.muted = true
    const go = () => window.setTimeout(() => v.play().catch(() => {}), 700)
    if (block.classList.contains('is-in')) return void go()
    const mo = new MutationObserver(() => {
      if (block.classList.contains('is-in')) {
        mo.disconnect()
        go()
      }
    })
    mo.observe(block, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])
  return <video ref={ref} className="l-frame-video" src={src} poster={poster} muted playsInline preload="auto" aria-hidden="true" style={{ backgroundImage: `url(${poster})`, backgroundSize: 'cover' }} />
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x))
/** Smoothstep: eases a 0..1 ramp so fades start and end without a visible edge. */
const ease = (x: number) => {
  const t = clamp01(x)
  return t * t * (3 - 2 * t)
}

/**
 * The last two sections share one background that turns from ink into a light leak as you scroll.
 * Everything here is tied to the scroll and eased: the paper above melts into the bowl, the clips
 * cross-fade instead of switching, each line of text dissolves on its way out, and the light
 * settles into the footer at the very end.
 */
function Morph({ children }: { children: React.ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null)
  const bg = useRef<HTMLDivElement>(null)
  const ink = useRef<HTMLVideoElement>(null)
  const leak = useRef<HTMLVideoElement>(null)
  const bridge = useRef<HTMLVideoElement>(null)
  const pVeil = useRef<HTMLSpanElement>(null)
  const fVeil = useRef<HTMLSpanElement>(null)
  const hasBridge = useRef(false)

  useEffect(() => {
    let raf = 0
    // the bridge clip is scrubbed toward its target time a little each frame, so fast scrolls don't stutter
    let shown = 0
    const play = (v: HTMLVideoElement | null, on: boolean) => {
      if (!v) return
      v.muted = true
      if (on && v.paused) v.play().catch(() => {})
      else if (!on && !v.paused) v.pause()
    }
    const frame = () => {
      raf = 0
      const el = wrap.current
      if (!el) return
      const vh = window.innerHeight
      const r = el.getBoundingClientRect()
      // 0 while the bowl is still below the fold, 1 once it fills the screen
      const enter = clamp01((vh - r.top) / vh)
      const travel = r.height - vh
      const t = clamp01(-r.top / Math.max(1, travel))
      // the bridge plays over the first part of the way; once the last section is arriving, the living
      // light loop (cut from the bridge's own tail) takes over, so the final screen never sits on a frozen frame
      const p = ease((t - 0.06) / 0.6)

      const b = bridge.current
      const bridged = hasBridge.current && !!b?.duration
      const inkO = bridged ? 1 - ease(p / 0.1) : 1 - p
      const leakO = bridged ? ease((p - 0.8) / 0.2) : p
      const bridgeO = bridged ? Math.min(1 - inkO, 1 - leakO) : 0
      if (ink.current) ink.current.style.opacity = String(inkO)
      if (leak.current) leak.current.style.opacity = String(leakO)
      if (b) b.style.opacity = String(bridgeO)
      play(ink.current, inkO > 0.01 && enter > 0)
      // the light loop starts on the bridge's tail, so it picks up exactly where the bridge is
      if (leak.current && leakO > 0.01 && leak.current.paused) leak.current.currentTime = 0
      play(leak.current, leakO > 0.01)
      if (pVeil.current) pVeil.current.style.opacity = String(1 - p)
      if (fVeil.current) fVeil.current.style.opacity = String(p)
      // the bowl rises out of the paper: soft and slightly enlarged at first, sharp once it's in
      bg.current?.style.setProperty('--enter', enter.toFixed(3))

      // each section's text breathes in toward the centre of the screen and out again past it
      const secs = [...el.querySelectorAll<HTMLElement>(':scope > section')]
      secs.forEach((sec) => {
        const sr = sec.getBoundingClientRect()
        const c = (sr.top + sr.height / 2 - vh / 2) / vh // 0 = centred, ±1 = a screen away
        const last = sec === secs[secs.length - 1]
        // the last section never fades out: it is where the page comes to rest
        const away = last && c < 0 ? 0 : Math.abs(c)
        const o = 1 - ease((away - 0.32) / 0.4)
        sec.style.setProperty('--o', o.toFixed(3))
        sec.style.setProperty('--y', `${(last && c < 0 ? 0 : c * 70).toFixed(1)}px`)
        sec.style.setProperty('--b', `${((1 - o) * 6).toFixed(2)}px`)
      })

      if (bridged && b) {
        const want = Math.min(b.duration - 0.04, p * b.duration)
        shown += (want - shown) * 0.35
        if (Math.abs(want - shown) < 0.01) shown = want
        if (Math.abs(b.currentTime - shown) > 0.015) b.currentTime = shown
        if (shown !== want) raf = requestAnimationFrame(frame)
      }
    }
    const on = () => {
      if (!raf) raf = requestAnimationFrame(frame)
    }
    frame()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
      cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div className="l-morph" ref={wrap}>
      <div className="l-morph-bg" ref={bg} aria-hidden="true">
        <video ref={ink} className="l-bg-video" src="/media/ink.mp4" poster="/media/ink.jpg" muted loop playsInline preload="metadata" />
        <video ref={leak} className="l-bg-video" src="/media/leak.mp4" poster="/media/leak.jpg" muted loop playsInline preload="metadata" style={{ opacity: 0 }} />
        <video
          ref={bridge}
          className="l-bg-video"
          src="/media/ink-to-leak.mp4"
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={() => {
            hasBridge.current = true
            window.dispatchEvent(new Event('scroll'))
          }}
          onError={() => (hasBridge.current = false)}
          style={{ opacity: 0 }}
        />
        <span ref={pVeil} className="l-privacy-veil" />
        <span ref={fVeil} className="l-final-veil" style={{ opacity: 0 }} />
      </div>
      {/* the paper above melts into the bowl instead of meeting it on a hard edge */}
      <span className="l-morph-melt" aria-hidden="true" />
      {children}
      {/* and the light settles into the footer */}
      <span className="l-morph-settle" aria-hidden="true" />
    </div>
  )
}

/** Safety net: if the ink never reaches a block (very fast jumps, old browsers), open it anyway. */
function useInkFallback() {
  useEffect(() => {
    const els = document.querySelectorAll('[data-ink]')
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && window.setTimeout(() => e.target.classList.add('is-in'), 900)),
      { threshold: 0.3 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

const CHAPTERS = [
  {
    n: '01',
    video: 'notebook',
    k: 'The journal',
    title: 'Your camera roll, as a scrapbook.',
    text: 'Connect your gallery or your Instagram export. Every photo finds its day, every day becomes a notebook page — instax frames, ticket stubs, washi tape, your own captions in handwriting.',
  },
  {
    n: '02',
    video: 'line',
    k: 'The darkroom',
    title: 'Every day hangs as a negative.',
    text: 'To see it again, you develop it — by remembering. Brush away the leaves, put the moments back in order, recover the word you forgot. The picture comes back as you do.',
  },
  {
    n: '03',
    video: 'letter',
    k: 'Letters',
    title: 'Letters that can’t be opened early.',
    text: 'Write to the person you’ll be. Seal it for a year. When it arrives, read it — then answer, and seal your answer for whoever comes next. A conversation across years.',
  },
  {
    n: '04',
    video: 'double',
    k: 'The enlarger',
    title: 'Find what connects your days.',
    text: 'Lay one day over another. As they line up, what they share comes through: a person, a place, the same word you used three years apart.',
  },
]

export default function Landing() {
  useReveal()
  useInkFallback()
  const zone = useRef<HTMLDivElement>(null)
  const page = useRef<HTMLElement>(null)
  useLandingFx(page)
  const [entering, setEntering] = useState(false)
  const [solid, setSolid] = useState(false)
  useEffect(() => {
    // the bar turns solid as soon as the page moves, so the headline never slides under bare text
    const on = () => setSolid(window.scrollY > 24)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  const shutter = useRef<HTMLVideoElement>(null)

  const enter = () => {
    try {
      localStorage.setItem(ENTERED, '1')
    } catch {
      /* fine */
    }
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      window.location.hash = '/today'
      return
    }
    setEntering(true)
    window.setTimeout(() => shutter.current?.play().catch(() => {}), 20)
    window.setTimeout(() => (window.location.hash = '/today'), 1500)
  }

  return (
    <main className="landing" ref={page}>
      <header className={`l-nav ${solid ? 'is-solid' : ''}`}>
        <span className="l-nav-progress" aria-hidden="true" />
        <a className="brand brand-light" href="#/welcome">
          <img className="brand-mark" src="/favicon.svg" alt="" aria-hidden="true" />
          Afterimage
        </a>
        <button type="button" className="l-nav-cta" onClick={enter} data-magnetic>
          <span>Open the darkroom</span>
        </button>
      </header>

      <section className="l-hero">
        <Loop src="/media/hero.mp4" poster="/media/hero.jpg" className="l-hero-video" />
        <span className="l-hero-veil" aria-hidden="true" />
        <div className="l-hero-text">
          <p className="l-kicker l-hero-kicker">A darkroom for the person you were</p>
          <h1>
            <Words text="Your past is someone" start={2} />
            <br />
            <Words text="you can" start={6} />
            <em>
              <Words text="meet again." start={8} />
            </em>
          </h1>
          <p className="l-sub">Afterimage turns your photos and words into negatives — and you develop them by remembering.</p>
          <div className="l-ctas">
            <button type="button" className="l-btn" onClick={enter} data-magnetic>
              <span>Open the darkroom</span>
            </button>
            <a className="l-link" href="#how" onClick={(e) => (e.preventDefault(), glideTo(document.getElementById('how')))}>
              How it works ↓
            </a>
          </div>
        </div>
      </section>

      <ScrollFilm />

      <div className="l-ink-zone" ref={zone}>
        <InkLine zone={zone} />

        <section className="l-manifesto" id="how" data-ink="intro">
          <p>
            <Words text="We take thousands of photographs." />
            <br />
            <em>
              <Words text="We forget who we were when we took them." start={5} />
            </em>
          </p>
        </section>

        {CHAPTERS.map((c, i) => (
          <section key={c.n} className={`l-chapter ${i % 2 ? 'is-flip' : ''}`} data-ink="block">
            <div className="l-frame">
              {c.video === 'notebook' ? (
                <PlayOnce src="/media/page-turn.mp4" poster="/media/page-turn.jpg" />
              ) : (
                <Loop src={`/media/${c.video}.mp4`} poster={`/media/${c.video}.jpg`} className="l-frame-video" />
              )}
              <span className="l-frame-n">{c.n}</span>
            </div>
            <div className="l-copy">
              <p className="l-kicker dark">{c.k}</p>
              <h2>
                <Words text={c.title} start={2} />
              </h2>
              <p>
                <Flow text={c.text} />
              </p>
            </div>
          </section>
        ))}

        <section className="l-chapter l-music is-flip" data-ink="block">
          <div className="l-frame l-frame-music" aria-hidden="true">
            <MusicMini />
            <span className="l-frame-n">05</span>
          </div>
          <div className="l-copy">
            <p className="l-kicker dark">The music box</p>
            <h2>
              <Words text="Hear your month." start={2} />
            </h2>
            <p>
              <Flow text="Every photo’s colours are punched into a paper strip — warm low, cool high. Turn the crank and October plays back as a melody that’s only yours." />
            </p>
          </div>
        </section>
      </div>

      <Morph>
        <section className="l-privacy">
          <div className="l-privacy-text" data-reveal>
            <h2>
              <Words text="Your days stay on your device." />
            </h2>
            <p className="l-privacy-lede">
              Photographs, words and sealed letters live in this browser, not on a server. No account, no tracking.
              <em> The two AI extras stay off until you turn them on.</em>
            </p>
          </div>
        </section>

        <section className="l-final">
          <div className="l-final-text" data-reveal>
            <img className="l-logo" src="/logo.svg" alt="Afterimage" />
            <h2>
              <Words text="Someone has been" start={2} />
              <br />
              <em>
                <Words text="waiting for you." start={5} />
              </em>
            </h2>
            <button type="button" className="l-btn l-btn-dark" onClick={enter} data-magnetic>
              <span>Open the darkroom</span>
            </button>
            <p className="l-fine dark">Five fictional demo days are inside, so you can try everything first.</p>
          </div>
        </section>
      </Morph>

      <footer className="l-foot" data-reveal>
        <span className="l-foot-rule" aria-hidden="true" />
        <a className="l-foot-brand" href="#/welcome" onClick={(e) => (e.preventDefault(), window.scrollTo({ top: 0, behavior: 'smooth' }))} aria-label="Afterimage — back to the top">
          <img src="/favicon.svg" alt="" aria-hidden="true" />
          <span className="l-foot-mark" aria-hidden="true">
            {'Afterimage'.split('').map((ch, i) => (
              <b key={i} style={{ '--i': i } as React.CSSProperties}>
                {ch}
              </b>
            ))}
          </span>
        </a>
        <p className="l-foot-line">A darkroom for the person you were</p>
        <nav className="l-foot-links" aria-label="Legal">
          <a href="#/privacy">Privacy</a>
          <a href="#/terms">Terms</a>
        </nav>
      </footer>

      {entering && (
        <div className="l-shutter" aria-hidden="true">
          <video ref={shutter} src="/media/shutter.mp4" muted playsInline preload="auto" />
        </div>
      )}
    </main>
  )
}
