import { roman } from '../lib/time'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { BathProps } from '../views/Darkroom'
import { hash } from '../lib/extract'
import { sound } from '../lib/sound'
import { AppVoice, PastLabel, InfoTip } from '../components/common'

function shuffled(ids: string[], seed: number) {
  const a = [...ids]
  let s = seed || 1
  const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646
  for (let tries = 0; tries < 20; tries++) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(r() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    // never start solved, and leave at most one in place
    if (a.filter((x, i) => x === ids[i]).length <= 1) break
  }
  return a
}

type Hint = 'earlier' | 'later'

export default function Sequence({ m, tray, onPartial, onDone }: BathProps) {
  const correct = useMemo(() => m.moments.map((x) => x.id), [m.moments])
  const [order, setOrder] = useState(() => shuffled(correct, hash(m.id + 'seq')))
  const [fixed, setFixed] = useState<Set<string>>(new Set())
  const [hints, setHints] = useState<Record<string, Hint>>({})
  const [attempts, setAttempts] = useState(0)
  const [drag, setDrag] = useState<string | null>(null)
  const [announce, setAnnounce] = useState('')
  const listRef = useRef<HTMLOListElement>(null)
  const byId = useMemo(() => Object.fromEntries(m.moments.map((x) => [x.id, x])), [m.moments])
  const solved = fixed.size === correct.length

  useEffect(() => onPartial(fixed.size / correct.length), [fixed.size, correct.length, onPartial])

  const move = (id: string, to: number) => {
    setOrder((o) => {
      const from = o.indexOf(id)
      if (from === to || to < 0 || to >= o.length || fixed.has(o[to]) || fixed.has(id)) return o
      const n = [...o]
      n.splice(from, 1)
      n.splice(to, 0, id)
      // keep fixed items where they are
      const result = [...n]
      for (const f of fixed) {
        const want = o.indexOf(f)
        const at = result.indexOf(f)
        if (at !== want) {
          result.splice(at, 1)
          result.splice(want, 0, f)
        }
      }
      return result
    })
    setHints((h) => {
      const n = { ...h }
      delete n[id]
      return n
    })
  }

  const check = () => {
    const nf = new Set(fixed)
    const nh: Record<string, Hint> = {}
    order.forEach((id, i) => {
      if (correct[i] === id) nf.add(id)
      else nh[id] = correct.indexOf(id) < i ? 'earlier' : 'later'
    })
    const gained = nf.size - fixed.size
    setFixed(nf)
    setHints(nh)
    setAttempts((a) => a + 1)
    if (gained > 0) sound.chime(true)
    setAnnounce(nf.size === correct.length ? 'Everything is in its place.' : `${gained} more in place. ${correct.length - nf.size} still drifting.`)
  }

  const revealOne = () => {
    const i = order.findIndex((id, k) => correct[k] !== id)
    if (i < 0) return
    const want = correct[i]
    setOrder((o) => {
      const n = [...o]
      const j = n.indexOf(want)
      ;[n[i], n[j]] = [n[j], n[i]]
      return n
    })
    setFixed((f) => new Set([...f, want]))
    setHints({})
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return
    const el = document.elementFromPoint(e.clientX, e.clientY)?.closest('[data-mid]') as HTMLElement | null
    if (!el) return
    const target = el.dataset.mid!
    if (target !== drag) move(drag, order.indexOf(target))
  }

  return (
    <div className="bath bath-sequence">
      <div className="bath-visual">{tray(undefined, 'sm')}</div>
      <section className="bath-panel bath-panel-wide">
        <p className="bath-kicker">Bath {roman(m.baths.indexOf('sequence') + 1)} · Sequence</p>
        <h2 className="bath-title">
          Put the day back in order.{' '}
          <InfoTip dark>
            These moments are in your own words, but the order has slipped. Drag a strip by its edge — or use the arrows — then hold it to the light.
            Anything in the right place stays fixed.
          </InfoTip>
        </h2>
        <PastLabel date={m.date}>From your story</PastLabel>
        <ol
          ref={listRef}
          className={`strips ${drag ? 'is-dragging' : ''}`}
          onPointerMove={onPointerMove}
          onPointerUp={() => setDrag(null)}
          onPointerCancel={() => setDrag(null)}
          onPointerLeave={() => setDrag(null)}
        >
          {order.map((id, i) => {
            const mo = byId[id]
            const isFixed = fixed.has(id)
            return (
              <li
                key={id}
                data-mid={id}
                className={`strip ${isFixed ? 'is-fixed' : ''} ${drag === id ? 'is-lifted' : ''} ${hints[id] ? 'hint-' + hints[id] : ''}`}
              >
                <span
                  className="strip-handle"
                  onPointerDown={(e) => {
                    if (isFixed) return
                    e.preventDefault()
                    ;(e.currentTarget.closest('ol') as HTMLElement).setPointerCapture?.(e.pointerId)
                    setDrag(id)
                  }}
                  aria-hidden="true"
                >
                  <i />
                  <i />
                  <i />
                </span>
                <span className="strip-time">{isFixed ? (mo.time ?? `#${i + 1}`) : '—:—'}</span>
                <span className="strip-text">{mo.text}</span>
                {hints[id] && (
                  <span className="strip-hint" aria-label={`belongs ${hints[id]}`}>
                    {hints[id] === 'earlier' ? '↑ earlier' : '↓ later'}
                  </span>
                )}
                {!isFixed && (
                  <span className="strip-keys">
                    <button type="button" aria-label={`Move “${mo.text.slice(0, 30)}” earlier`} onClick={() => move(id, i - 1)} disabled={i === 0}>
                      ↑
                    </button>
                    <button type="button" aria-label={`Move “${mo.text.slice(0, 30)}” later`} onClick={() => move(id, i + 1)} disabled={i === order.length - 1}>
                      ↓
                    </button>
                  </span>
                )}
              </li>
            )
          })}
        </ol>
        <p className="sr-only" aria-live="polite">
          {announce}
        </p>
        <div className="row">
          {!solved ? (
            <>
              <button type="button" className="btn btn-light" onClick={check}>
                Hold it to the light
              </button>
              {attempts >= 2 && (
                <button type="button" className="link link-dark" onClick={revealOne}>
                  Remind me of one
                </button>
              )}
            </>
          ) : (
            <>
              <AppVoice className="dark">
                {attempts <= 1 ? 'First try. You remembered this day better than you thought.' : `That took ${attempts} looks. Memory is like that.`}
              </AppVoice>
              <button type="button" className="btn btn-light" onClick={onDone}>
                Into the next bath
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
