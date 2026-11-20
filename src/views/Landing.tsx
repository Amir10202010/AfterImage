import { useEffect, useRef, useState } from 'react'
import { Fragment } from 'react'
import { Loop } from './Today'
import InkLine from '../components/InkLine'

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

/**
 * The last two sections share one background that turns from ink into a light leak as you scroll.
 * With public/media/ink-to-leak.mp4 present, the clip's time follows the scroll; without it, a cross-fade.
 */
function Morph({ children }: { children: React.ReactNode }) {
  const wrap = useRef<HTMLDivElement>(null)
  const ink = useRef<HTMLVideoElement>(null)
  const leak = useRef<HTMLVideoElement>(null)
  const bridge = useRef<HTMLVideoElement>(null)
  const [hasBridge, setHasBridge] = useState(false)
  const [p, setP] = useState(0)

  useEffect(() => {
    let raf = 0
    const on = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const el = wrap.current
        if (!el) return
        const r = el.getBoundingClientRect()
        const travel = r.height - window.innerHeight
        const t = Math.max(0, Math.min(1, -r.top / Math.max(1, travel)))
        // the change happens in the middle of the scroll, with a calm start and end
        setP(Math.max(0, Math.min(1, (t - 0.18) / 0.64)))
      })
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    window.addEventListener('resize', on)
    return () => {
      window.removeEventListener('scroll', on)
      window.removeEventListener('resize', on)
      cancelAnimationFrame(raf)
    }
  }, [])

  // drive the clips: loops at the ends, the bridge in between
  useEffect(() => {
    const b = bridge.current
    if (hasBridge && b && b.duration) {
      b.currentTime = Math.min(b.duration - 0.04, p * b.duration)
    }
    const play = (v: HTMLVideoElement | null, on: boolean) => {
      if (!v) return
      v.muted = true
      if (on) v.play().catch(() => {})
      else v.pause()
    }
    play(ink.current, p < 0.02)
    play(leak.current, p > 0.98)
  }, [p, hasBridge])

  const showBridge = hasBridge && p > 0.01 && p < 0.99
  return (
    <div className="l-morph" ref={wrap}>
      <div className="l-morph-bg" aria-hidden="true">
        <video ref={ink} className="l-bg-video" src="/media/ink.mp4" poster="/media/ink.jpg" muted loop playsInline preload="metadata" style={{ opacity: hasBridge ? (p <= 0.01 ? 1 : 0) : 1 - p }} />
        <video ref={leak} className="l-bg-video" src="/media/leak.mp4" poster="/media/leak.jpg" muted loop playsInline preload="metadata" style={{ opacity: hasBridge ? (p >= 0.99 ? 1 : 0) : p }} />
        <video
          ref={bridge}
          className="l-bg-video"
          src="/media/ink-to-leak.mp4"
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={() => setHasBridge(true)}
          onError={() => setHasBridge(false)}
          style={{ opacity: showBridge ? 1 : 0 }}
        />
        <span className="l-privacy-veil" style={{ opacity: 1 - p }} />
        <span className="l-final-veil" style={{ opacity: p }} />
      </div>
      {children}
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
  const [entering, setEntering] = useState(false)
  const [solid, setSolid] = useState(false)
  useEffect(() => {
    const on = () => setSolid(window.scrollY > window.innerHeight * 0.8)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  const shutter = useRef<HTMLVideoElement>(null)
  const returning = hasEntered()

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
    <main className="landing">
      <header className={`l-nav ${solid ? 'is-solid' : ''}`}>
        <a className="brand brand-light" href="#/welcome">
          <img className="brand-mark" src="/favicon.svg" alt="" aria-hidden="true" />
          Afterimage
        </a>
        <button type="button" className="l-nav-cta" onClick={enter}>
          {returning ? 'Back to the app' : 'Open the app'}
        </button>
      </header>

      <section className="l-hero">
        <Loop src="/media/hero.mp4" poster="/media/hero.jpg" className="l-hero-video" />
        <span className="l-hero-veil" aria-hidden="true" />
        <div className="l-hero-text">
          <p className="l-kicker">A darkroom for the person you were</p>
          <h1>
            Your past is someone
            <br />
            you can <em>meet again.</em>
          </h1>
          <p className="l-sub">Afterimage turns your photos and words into negatives — and you develop them by remembering.</p>
          <div className="l-ctas">
            <button type="button" className="l-btn" onClick={enter}>
              Open the darkroom
            </button>
            <a className="l-link" href="#how" onClick={(e) => (e.preventDefault(), document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' }))}>
              How it works ↓
            </a>
          </div>
          <p className="l-fine">Free · works offline · nothing leaves your phone</p>
        </div>
        <span className="l-scroll" aria-hidden="true" />
      </section>

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
              <p>{c.text}</p>
            </div>
          </section>
        ))}

        <section className="l-chapter l-music is-flip" data-ink="block">
          <div className="l-frame l-frame-music" aria-hidden="true">
            <div className="l-music-comb">
              {Array.from({ length: 11 }, (_, k) => (
                <i key={k} />
              ))}
            </div>
            <div className="l-music-strip">
              {Array.from({ length: 60 }, (_, k) => (
                <b key={k} style={{ left: `${k * 26}px`, top: `${12 + ((k * 53) % 76)}%` }} />
              ))}
            </div>
            <span className="l-frame-n">05</span>
          </div>
          <div className="l-copy">
            <p className="l-kicker dark">The music box</p>
            <h2>
              <Words text="Hear your month." start={2} />
            </h2>
            <p>Every photo’s colours are punched into a paper strip — warm low, cool high. Turn the crank and October plays back as a melody that’s only yours.</p>
          </div>
        </section>
      </div>

      <Morph>
        <section className="l-privacy reveal">
          <div className="l-privacy-text">
            <p className="l-kicker dark">Private by nature</p>
            <h2>Nothing leaves your device.</h2>
            <p className="l-privacy-lede">
              Not your photographs, not your words, not the letters you seal for later. It all stays here, with you
              <em> — even offline.</em>
            </p>
          </div>
        </section>

        <section className="l-final reveal">
          <div className="l-final-text">
            <img className="l-logo" src="/logo.svg" alt="Afterimage" />
            <h2>
              Someone has been
              <br />
              <em>waiting for you.</em>
            </h2>
            <button type="button" className="l-btn l-btn-dark" onClick={enter}>
              Open the darkroom
            </button>
            <p className="l-fine dark">Three fictional demo days are inside, so you can try everything first.</p>
          </div>
        </section>
      </Morph>

      <footer className="l-foot">
        <span>Afterimage</span>
        <span>Made with care · fictional demo content is labelled · videos generated for this project</span>
      </footer>

      {entering && (
        <div className="l-shutter" aria-hidden="true">
          <video ref={shutter} src="/media/shutter.mp4" muted playsInline preload="auto" />
        </div>
      )}
    </main>
  )
}
