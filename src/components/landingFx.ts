// Small motion layer for the landing page. Everything is driven by CSS variables and classes, so the
// styles decide how things look and this file only reports where the reader is:
//   --scroll on .landing  (0..1, the whole page)
//   --hp on .l-hero       (0..1, how far the hero has scrolled away)
//   .is-hidden on .l-nav  (scrolling down past the hero), .is-ready on .landing (after the first paint)
//   [data-reveal] gets .is-in while it is on screen and loses it when it leaves (so it plays again)
//   [data-magnetic] leans toward the pointer; .l-chapter .l-frame tilts in 3D under it
import { useEffect } from 'react'

export function useLandingFx(root: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = root.current
    if (!el) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const fine = window.matchMedia?.('(pointer: fine)').matches
    const cleanups: (() => void)[] = []

    // first paint → the hero enters
    const ready = window.setTimeout(() => el.classList.add('is-ready'), 60)
    cleanups.push(() => window.clearTimeout(ready))

    /* ---------- scroll: progress, hero parallax, nav direction ---------- */
    const nav = el.querySelector<HTMLElement>('.l-nav')
    const hero = el.querySelector<HTMLElement>('.l-hero')
    let lastY = window.scrollY
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const y = window.scrollY
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
        el.style.setProperty('--scroll', (y / max).toFixed(4))
        if (hero) hero.style.setProperty('--hp', Math.min(1, y / Math.max(1, hero.offsetHeight)).toFixed(4))
        if (nav) {
          const down = y > lastY + 4
          const up = y < lastY - 4
          if (down && y > window.innerHeight) nav.classList.add('is-hidden')
          else if (up || y < window.innerHeight) nav.classList.remove('is-hidden')
        }
        lastY = y
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    cleanups.push(() => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      cancelAnimationFrame(raf)
    })

    /* ---------- reveal in both directions ---------- */
    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.target.classList.toggle('is-in', e.isIntersecting)),
      { threshold: 0.25, rootMargin: '0px 0px -8% 0px' },
    )
    el.querySelectorAll('[data-reveal]').forEach((n) => io.observe(n))
    cleanups.push(() => io.disconnect())

    if (reduce || !fine) return () => cleanups.forEach((c) => c())

    /* ---------- magnetic buttons ---------- */
    el.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((b) => {
      const move = (e: PointerEvent) => {
        const r = b.getBoundingClientRect()
        const dx = e.clientX - (r.left + r.width / 2)
        const dy = e.clientY - (r.top + r.height / 2)
        b.style.translate = `${(dx * 0.22).toFixed(1)}px ${(dy * 0.3).toFixed(1)}px`
        b.style.setProperty('--mx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`)
      }
      const leave = () => (b.style.translate = '')
      b.addEventListener('pointermove', move)
      b.addEventListener('pointerleave', leave)
      cleanups.push(() => {
        b.removeEventListener('pointermove', move)
        b.removeEventListener('pointerleave', leave)
      })
    })

    /* ---------- photographs tilt toward the pointer ---------- */
    el.querySelectorAll<HTMLElement>('.l-chapter').forEach((sec) => {
      const f = sec.querySelector<HTMLElement>('.l-frame')
      if (!f) return
      const move = (e: PointerEvent) => {
        const r = f.getBoundingClientRect()
        const x = (e.clientX - r.left) / r.width - 0.5
        const y = (e.clientY - r.top) / r.height - 0.5
        f.style.setProperty('--rx', `${(-y * 7).toFixed(2)}deg`)
        f.style.setProperty('--ry', `${(x * 9).toFixed(2)}deg`)
        f.style.setProperty('--gx', `${((x + 0.5) * 100).toFixed(1)}%`)
        f.style.setProperty('--gy', `${((y + 0.5) * 100).toFixed(1)}%`)
        f.classList.add('is-tilt')
      }
      const leave = () => {
        f.style.setProperty('--rx', '0deg')
        f.style.setProperty('--ry', '0deg')
        f.classList.remove('is-tilt')
      }
      sec.addEventListener('pointermove', move)
      sec.addEventListener('pointerleave', leave)
      cleanups.push(() => {
        sec.removeEventListener('pointermove', move)
        sec.removeEventListener('pointerleave', leave)
      })
    })

    return () => cleanups.forEach((c) => c())
  }, [root])
}

/**
 * A slow, cinematic scroll to an element: it glides through everything on the way (the diary film plays
 * as it passes) instead of jumping. Any wheel, touch or key from the reader takes control back at once.
 */
export function glideTo(target: HTMLElement | null) {
  if (!target) return
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const from = window.scrollY
  const to = target.getBoundingClientRect().top + window.scrollY
  const dist = to - from
  if (reduce || Math.abs(dist) < 4) {
    window.scrollTo(0, to)
    return
  }
  // a little under a screen per second, so the film plays like a film, not a fast-forward
  const duration = Math.max(1200, Math.min(9000, (Math.abs(dist) / (window.innerHeight * 0.75)) * 1000))
  const ease = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2
  let raf = 0
  const t0 = performance.now()
  const stop = () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('wheel', stop)
    window.removeEventListener('touchstart', stop)
    window.removeEventListener('keydown', stop)
  }
  window.addEventListener('wheel', stop, { passive: true })
  window.addEventListener('touchstart', stop, { passive: true })
  window.addEventListener('keydown', stop)
  const step = (now: number) => {
    const t = Math.min(1, (now - t0) / duration)
    window.scrollTo(0, from + dist * ease(t))
    if (t < 1) raf = requestAnimationFrame(step)
    else stop()
  }
  raf = requestAnimationFrame(step)
}
