// A first-visit walkthrough: a soft spotlight moves across the navigation, one sentence at a time.
import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { OptionalImg } from './Scrap'

const KEY = 'afterimage.tour'
export function tourDone() {
  try {
    return localStorage.getItem(KEY) === 'done'
  } catch {
    return true
  }
}
function markDone() {
  try {
    localStorage.setItem(KEY, 'done')
  } catch {
    /* private mode — the tour may show again, that's fine */
  }
}
export function replayTour() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event('afterimage:tour'))
}

const STEPS: { target?: string[]; title: string; text: string }[] = [
  {
    title: 'Welcome to your darkroom.',
    text: 'Every day you save becomes a photograph you develop by remembering. Here’s where everything lives — five seconds.',
  },
  { target: ['today'], title: 'Today', text: 'What’s waiting for you: a letter that arrived, a day to develop, a small daily ritual.' },
  { target: ['journal'], title: 'Journal', text: 'All your photos, laid out by day like a scrapbook. Tap any day to open its notebook page.' },
  { target: ['add', 'add-mobile'], title: 'New', text: 'Save a day, bring in your gallery or Instagram, or write to future you. Nothing leaves this device.' },
  { target: ['memories'], title: 'Memories', text: 'Saved days hang here as negatives. Open one and develop it — brush, sort, recall, meet.' },
  { target: ['letters'], title: 'Letters', text: 'Messages between you and the person you’ll be. Sealed ones open on their date.' },
]

function findTarget(ids?: string[]) {
  if (!ids) return null
  for (const id of ids)
    for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${id}"]`)) {
      const r = el.getBoundingClientRect()
      if (r.width > 0 && r.height > 0) return r
    }
  return null
}

export default function Tour({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const step = STEPS[i]
  const last = i === STEPS.length - 1

  const measure = useCallback(() => setRect(findTarget(step.target)), [step])
  useLayoutEffect(measure, [measure])
  useEffect(() => {
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  const finish = useCallback(() => {
    markDone()
    onDone()
  }, [onDone])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') finish()
      // Enter on a focused button already clicks it — don't advance twice
      const onButton = (e.target as HTMLElement)?.tagName === 'BUTTON'
      if (e.key === 'ArrowRight' || (e.key === 'Enter' && !onButton)) (last ? finish() : setI((x) => x + 1))
      if (e.key === 'ArrowLeft') setI((x) => Math.max(0, x - 1))
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [finish, last])

  const pad = 8
  const hole = rect ? { left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null
  // place the card below the target if it's in the top half, above it otherwise
  const below = rect ? rect.top < window.innerHeight / 2 : true
  const cardStyle = rect
    ? {
        left: Math.max(16, Math.min(window.innerWidth - 336, rect.left + rect.width / 2 - 160)),
        ...(below ? { top: rect.bottom + 20 } : { bottom: window.innerHeight - rect.top + 20 }),
      }
    : undefined

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {hole ? <div className="tour-hole" style={hole} /> : <div className="tour-dim" />}
      <div className={`tour-card ${rect ? '' : 'is-center'}`} style={cardStyle} key={i}>
        {i === 0 && <OptionalImg src="/demo/ui/welcome.jpg" className="tour-art" />}
        <p className="tour-step">
          {i + 1} / {STEPS.length}
        </p>
        <h2 id="tour-title">{step.title}</h2>
        <p>{step.text}</p>
        <div className="tour-actions">
          <button type="button" className="link" onClick={finish}>
            Skip
          </button>
          <span className="tour-dots" aria-hidden="true">
            {STEPS.map((_, k) => (
              <i key={k} className={k === i ? 'is-on' : ''} />
            ))}
          </span>
          <button type="button" className="btn btn-ink btn-sm" onClick={() => (last ? finish() : setI(i + 1))} autoFocus>
            {last ? 'Start' : i === 0 ? 'Show me' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
