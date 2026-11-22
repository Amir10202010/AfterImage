import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { isoDate, longDate } from '../lib/time'
import type { Stamp, Thread } from '../lib/types'
import { QUESTION_STAMPS, STAMPS } from '../lib/prompts'

/** Words written by a past version of the user. Always verbatim. */
export function PastLabel({ date, children }: { date: string; children?: ReactNode }) {
  return (
    <span className="voice voice-past">
      <span className="voice-mark" aria-hidden="true">✎</span> {children ?? 'You wrote this'} · {longDate(date)}
    </span>
  )
}

/** Afterimage's own voice: framing lines, prompts. Never the user's words. */
export function AppVoice({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <p className={`app-voice ${className}`}>
      <span className="app-mark" title="Written by Afterimage, not by you" aria-label="Afterimage says">◇</span> {children}
    </p>
  )
}

export function Back({ href, children, dark = false }: { href: string; children: ReactNode; dark?: boolean }) {
  return (
    <a className={`back ${dark ? 'back-dark' : ''}`} href={href}>
      <span aria-hidden="true">←</span> {children}
    </a>
  )
}

/* ---------- seal picker ---------- */
export type SealChoice = 'develop' | 'year' | 'five' | 'date' | 'minute'
export function sealToDate(choice: SealChoice, date: string): string | undefined {
  const now = Date.now()
  switch (choice) {
    case 'develop':
      return undefined
    case 'minute':
      return new Date(now + 60_000).toISOString()
    case 'year':
      return new Date(now + 365.25 * 86400000).toISOString()
    case 'five':
      return new Date(now + 5 * 365.25 * 86400000).toISOString()
    case 'date':
      return date ? new Date(date + 'T09:00').toISOString() : undefined
  }
}

export function SealPicker({
  value,
  date,
  onChange,
  allowDevelop = false,
  dark = false,
}: {
  value: SealChoice
  date: string
  onChange: (c: SealChoice, d: string) => void
  allowDevelop?: boolean
  dark?: boolean
}) {
  const opts: [SealChoice, string][] = [
    ...(allowDevelop ? ([['develop', 'When I next develop this day']] as [SealChoice, string][]) : []),
    ['year', 'A year from now'],
    ['five', 'Five years from now'],
    ['date', 'On a date I choose'],
    ['minute', 'In one minute — to try it'],
  ]
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const min = isoDate(tomorrow)
  // each picker is its own radio group, even when two are on screen at once
  const name = useId()
  return (
    <fieldset className={`seal-picker ${dark ? 'is-dark' : ''}`}>
      <legend>Seal it until</legend>
      <div className="seal-options">
        {opts.map(([k, label]) => (
          <label key={k} className={`chip ${value === k ? 'is-on' : ''}`}>
            <input type="radio" name={name} value={k} checked={value === k} onChange={() => onChange(k, date)} />
            {label}
          </label>
        ))}
      </div>
      {value === 'date' && (
        <label className="seal-date">
          <span>Open on</span>
          <input type="date" min={min} value={date} onChange={(e) => onChange('date', e.target.value)} required />
        </label>
      )}
    </fieldset>
  )
}

/* ---------- ledger stamp ---------- */
export function StampSet({
  thread,
  value,
  onStamp,
  compact = false,
}: {
  thread: Thread
  value?: Stamp
  onStamp: (s: Stamp) => void
  compact?: boolean
}) {
  const set = thread.kind === 'question' ? QUESTION_STAMPS : STAMPS
  return (
    <div className={`stamps ${compact ? 'stamps-compact' : ''}`} role="radiogroup" aria-label="How did it turn out?">
      {(Object.keys(set) as Stamp[]).map((k) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          className={`stamp-btn stamp-${k} ${value === k ? 'is-on' : ''}`}
          title={set[k].hint}
          onClick={() => onStamp(k)}
        >
          {set[k].label}
        </button>
      ))}
    </div>
  )
}

export function StampMark({ stamp, kind }: { stamp: Stamp; kind: Thread['kind'] }) {
  const set = kind === 'question' ? QUESTION_STAMPS : STAMPS
  return <span className={`stamp-mark stamp-${stamp}`}>{set[stamp].label}</span>
}

/* ---------- confirm button (two-step, for destructive actions) ---------- */
export function ConfirmButton({ children, confirm, onConfirm, className = '' }: { children: ReactNode; confirm: string; onConfirm: () => void; className?: string }) {
  const [armed, setArmed] = useState(false)
  return armed ? (
    <span className="confirm">
      <span>{confirm}</span>
      <button type="button" className="link danger" onClick={onConfirm}>
        Yes
      </button>
      <button type="button" className="link" onClick={() => setArmed(false)}>
        Keep it
      </button>
    </span>
  ) : (
    <button type="button" className={`link ${className}`} onClick={() => setArmed(true)}>
      {children}
    </button>
  )
}

/* ---------- info tip: explanations live behind a small ⓘ, not on the page ---------- */
export function InfoTip({ children, label = 'How this works', dark = false }: { children: ReactNode; label?: string; dark?: boolean }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number; width: number; up: boolean } | null>(null)
  const wrap = useRef<HTMLSpanElement>(null)
  const btn = useRef<HTMLButtonElement>(null)

  // fixed to the screen and clamped to its edges, so it never spills off a phone
  useLayoutEffect(() => {
    if (!open || !btn.current) return
    const r = btn.current.getBoundingClientRect()
    const width = Math.min(320, window.innerWidth - 24)
    const left = Math.max(12, Math.min(window.innerWidth - width - 12, r.left + r.width / 2 - width / 2))
    const up = r.bottom > window.innerHeight * 0.66
    setPos({ left, top: up ? r.top - 10 : r.bottom + 10, width, up })
  }, [open])

  useEffect(() => {
    if (!open) return
    const out = (e: Event) => !wrap.current?.contains(e.target as Node) && !(e.target as Element).closest?.('.tip-pop') && setOpen(false)
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    const close = () => setOpen(false)
    document.addEventListener('pointerdown', out)
    document.addEventListener('keydown', esc)
    window.addEventListener('scroll', close, { passive: true, capture: true })
    return () => {
      document.removeEventListener('pointerdown', out)
      document.removeEventListener('keydown', esc)
      window.removeEventListener('scroll', close, { capture: true })
    }
  }, [open])

  return (
    <span className={`tip ${dark ? 'tip-dark' : ''} ${open ? 'is-open' : ''}`} ref={wrap} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button ref={btn} type="button" className="tip-i" aria-label={label} aria-expanded={open} onClick={() => setOpen(true)} onBlur={() => setOpen(false)}>
        i
      </button>
      {open &&
        pos &&
        // rendered at the top of the page: animated parents would otherwise move a fixed bubble
        createPortal(
          <span className={`tip-pop ${dark ? 'tip-pop-dark' : ''} ${pos.up ? 'is-up' : ''}`} role="tooltip" style={{ left: pos.left, top: pos.top, width: pos.width }}>
            {children}
          </span>,
          document.body,
        )}
    </span>
  )
}
