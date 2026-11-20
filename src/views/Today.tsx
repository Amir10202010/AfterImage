import { useEffect, useRef } from 'react'
import { letterStatus, useStore } from '../lib/store'
import { longDate, monthYear, todayISO, weekday, ago } from '../lib/time'
import type { Memory } from '../lib/types'
import { JournalTeaser, Rituals, devState, useNow } from './Home'

function greeting() {
  const h = new Date().getHours()
  if (h < 5) return 'Still up?'
  if (h < 12) return 'Good morning.'
  if (h < 18) return 'Good afternoon.'
  return 'Good evening.'
}

/** A looping clip that only plays while it's on screen. */
export function Loop({ src, poster, className = '' }: { src: string; poster: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
    // React sets `muted` as a property; browsers want it set before play() for autoplay to be allowed
    v.muted = true
    v.defaultMuted = true
    let seen = false
    const io = new IntersectionObserver(
      ([e]) => {
        seen = e.isIntersecting
        if (seen) v.play().catch(() => {})
        else v.pause()
      },
      { threshold: 0.15 },
    )
    io.observe(v)
    // a tab that was in the background starts its videos when you come back to it
    const vis = () => document.visibilityState === 'visible' && seen && v.play().catch(() => {})
    document.addEventListener('visibilitychange', vis)
    return () => {
      io.disconnect()
      document.removeEventListener('visibilitychange', vis)
    }
  }, [])
  return (
    <video
      ref={ref}
      className={className}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden="true"
      // the poster stays underneath, so a paused or loading clip never shows as a black box
      style={{ backgroundImage: `url(${poster})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    />
  )
}

export default function Today() {
  const { memories, letters, exposures, strips } = useStore()
  const now = useNow()
  const today = todayISO()
  const arrived = letters.filter((l) => letterStatus(l, now) === 'arrived').sort((a, b) => a.writtenAt.localeCompare(b.writtenAt))
  const waiting = [...memories].reverse().find((m) => !devState(m).developed)

  let next: { video: string; kicker: string; title: string; text: string; cta: string; href: string; extra?: { label: string; href: string } }
  if (arrived[0]) {
    const l = arrived[0]
    const m = memories.find((x) => x.id === l.memoryId)
    next = {
      video: 'letter',
      kicker: 'A letter arrived',
      title: `From you, written in ${monthYear(l.writtenAt)}.`,
      text: `Sealed ${ago(l.writtenAt)}${m ? ` on “${m.title}”` : ''}. It has been waiting for today.`,
      cta: 'Open the letter',
      href: `#/arrival/${l.id}`,
    }
  } else if (waiting) {
    const s = devState(waiting)
    next = {
      video: 'hero',
      kicker: s.done ? 'Half developed' : 'Still a negative',
      title: waiting.title,
      text: `${longDate(waiting.date)}. ${s.done ? `${s.total - s.done} more ${s.total - s.done === 1 ? 'step' : 'steps'} and the picture is back.` : 'Develop it by remembering — a few small steps, a few minutes.'}`,
      cta: s.done ? 'Keep developing' : 'Develop it',
      href: `#/develop/${waiting.id}`,
    }
  } else if (memories.length) {
    next = {
      video: 'line',
      kicker: 'All developed',
      title: 'Save today, before it fades.',
      text: 'Everything on your line has been developed. Write down today — future you will develop it.',
      cta: 'Save today',
      href: '#/new',
    }
  } else {
    next = {
      video: 'line',
      kicker: 'Start here',
      title: 'Save your first day.',
      text: 'Write what happened, or bring in your photos — they sort themselves into days.',
      cta: 'Save a day',
      href: '#/new',
      extra: { label: 'Bring in photos', href: '#/connect' },
    }
  }

  return (
    <main className="paper app-page today-page">
      <header className="today-head">
        <p className="kicker">
          {weekday(today)}, {longDate(today)}
        </p>
        <h1 className="page-title">{greeting()}</h1>
      </header>

      <a className="next-card" href={next.href}>
        <Loop src={`/media/${next.video}.mp4`} poster={`/media/${next.video}.jpg`} className="next-video" />
        <span className="next-veil" aria-hidden="true" />
        <span className="next-body">
          <span className="next-kicker">{next.kicker}</span>
          <span className="next-title">{next.title}</span>
          <span className="next-text">{next.text}</span>
          <span className="next-cta">{next.cta} →</span>
        </span>
      </a>
      {next.extra && (
        <a className="link next-extra" href={next.extra.href}>
          or {next.extra.label.toLowerCase()}
        </a>
      )}

      {arrived.length > 1 && <p className="section-meta more-letters">+ {arrived.length - 1} more letters waiting in Letters</p>}

      {memories.length > 0 && (
        <section className="section" aria-labelledby="rituals-h">
          <div className="section-head">
            <h2 id="rituals-h">Small rituals</h2>
            <p className="section-meta">A minute each</p>
          </div>
          <Rituals memories={memories} exposures={exposures} strip={strips[today]} today={today} />
        </section>
      )}

      <JournalTeaser />
      <MemoryHint memories={memories} />
    </main>
  )
}

/** A gentle reminder of a day from this week in another year — only if there is one. */
function MemoryHint({ memories }: { memories: Memory[] }) {
  const t = new Date()
  const match = memories.find((m) => {
    const d = new Date(m.date + 'T12:00')
    return d.getFullYear() !== t.getFullYear() && Math.abs(d.getMonth() * 31 + d.getDate() - (t.getMonth() * 31 + t.getDate())) <= 4
  })
  if (!match) return null
  return (
    <a className="on-this-day" href={`#/print/${match.id}`}>
      <span className="kicker">This week, {t.getFullYear() - new Date(match.date).getFullYear()} years ago</span>
      <span className="on-this-day-title">{match.title}</span>
    </a>
  )
}
