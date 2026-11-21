import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { deleteExposure, saveExposure, uid, useStore } from '../lib/store'
import type { Memory } from '../lib/types'
import { connections, daysApart, type Connection } from '../lib/connect'
import { longDate } from '../lib/time'
import { splitAround } from '../lib/extract'
import { norm } from '../lib/extract'
import { stem } from '../lib/connect'
import Photo from '../components/Photo'
import { AppVoice, Back, ConfirmButton, PastLabel, InfoTip } from '../components/common'
import { sound } from '../lib/sound'
import { go } from '../App'

export default function Double({ a, b }: { a?: string; b?: string }) {
  const { memories } = useStore()
  const ma = memories.find((m) => m.id === a)
  const mb = memories.find((m) => m.id === b)
  if (!ma || !mb || ma.id === mb.id) return <Picker memories={memories} />
  return <Enlarger key={ma.id + mb.id} a={ma} b={mb} />
}

/* ---------- choosing two days ---------- */
function Picker({ memories }: { memories: Memory[] }) {
  const [sel, setSel] = useState<string[]>([])
  const pairs = useMemo(() => {
    const out: { a: Memory; b: Memory; n: number }[] = []
    for (let i = 0; i < memories.length; i++)
      for (let j = i + 1; j < memories.length; j++) out.push({ a: memories[i], b: memories[j], n: connections(memories[i], memories[j]).length })
    return out.filter((p) => p.n > 0).sort((x, y) => y.n - x.n).slice(0, 3)
  }, [memories])

  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 2 ? [s[1], id] : [...s, id]))

  return (
    <main className="darkroom theme-paper double">
      <header className="dr-head">
        <Back href="#/today" dark>
          Today
        </Back>
        <div className="dr-title">
          <span className="dr-date">The enlarger</span>
          <span className="dr-name">Double exposure</span>
        </div>
        <span />
      </header>
      <section className="dx-intro">
        <h1 className="bath-title">
          Pick two days.{' '}
          <InfoTip dark>
            In the enlarger you’ll slide one over the other until they line up — and whatever the two days share comes through: a person, a place, a
            word you used on both. Only things you actually wrote.
          </InfoTip>
        </h1>
      </section>
      {memories.length < 2 ? (
        <AppVoice className="dark">You need at least two days on the line for this. Expose another one first.</AppVoice>
      ) : (
        <>
          <ul className="dx-pick">
            {memories.map((m) => {
              const k = sel.indexOf(m.id)
              return (
                <li key={m.id}>
                  <button type="button" className={`dx-card ${k >= 0 ? 'is-on' : ''}`} aria-pressed={k >= 0} onClick={() => toggle(m.id)}>
                    <Photo memory={m} p={m.progress.developedAt ? 1 : 0.15} alt="" />
                    {k >= 0 && <span className="dx-badge">{k === 0 ? 'A' : 'B'}</span>}
                    <span className="dx-card-date">{longDate(m.date)}</span>
                    <span className="dx-card-title">{m.title}</span>
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="row dx-go">
            <button type="button" className="btn btn-light" disabled={sel.length < 2} onClick={() => go(`/double/${sel[0]}/${sel[1]}`)}>
              {sel.length < 2 ? `Choose ${2 - sel.length} more` : 'Into the enlarger'}
            </button>
          </div>
          {pairs.length > 0 && (
            <div className="dx-pairs">
              <AppVoice className="dark">Pairs that seem to share something:</AppVoice>
              <ul>
                {pairs.map((p) => (
                  <li key={p.a.id + p.b.id}>
                    <a href={`#/double/${p.a.id}/${p.b.id}`}>
                      {p.a.title} <span aria-hidden="true">×</span> {p.b.title}
                    </a>
                    <span className="dx-pair-n">
                      {p.n} {p.n === 1 ? 'thread' : 'threads'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </main>
  )
}

/* ---------- the enlarger ---------- */
function Enlarger({ a, b }: { a: Memory; b: Memory }) {
  const { exposures } = useStore()
  const saved = exposures.find((e) => (e.a === a.id && e.b === b.id) || (e.a === b.id && e.b === a.id))
  const [pos, setPos] = useState(() => (saved ? { x: 0, y: 0 } : { x: 52, y: 34 }))
  const [registered, setRegistered] = useState(!!saved)
  const [caption, setCaption] = useState(saved?.caption ?? '')
  const [savedFlash, setSavedFlash] = useState(false)
  const stage = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const all = useMemo(() => connections(a, b), [a, b])
  const apart = daysApart(a, b)

  const overlap = registered ? 1 : Math.max(0, (1 - Math.abs(pos.x) / 100) * (1 - Math.abs(pos.y) / 100))
  const shown = registered ? all.length : Math.floor(all.length * Math.max(0, (overlap - 0.35) / 0.55))
  const prevShown = useRef(shown)
  useEffect(() => {
    if (shown > prevShown.current) sound.chime(true)
    prevShown.current = shown
  }, [shown])

  useEffect(() => {
    if (!registered && overlap > 0.93) {
      setRegistered(true)
      setPos({ x: 0, y: 0 })
    }
  }, [overlap, registered])

  const move = (x: number, y: number) => {
    if (registered) return
    setPos({ x: Math.max(-90, Math.min(90, x)), y: Math.max(-90, Math.min(90, y)) })
  }

  const save = async () => {
    await saveExposure({ id: saved?.id ?? uid('x_'), a: a.id, b: b.id, caption: caption.trim() || undefined, createdAt: saved?.createdAt ?? new Date().toISOString() })
    setSavedFlash(true)
    window.setTimeout(() => setSavedFlash(false), 2400)
  }

  return (
    <main className={`darkroom theme-${a.theme} double`}>
      <header className="dr-head">
        <Back href="#/double" dark>
          Other days
        </Back>
        <div className="dr-title">
          <span className="dr-date">Double exposure · {apart.toLocaleString()} days apart</span>
          <span className="dr-name">
            {a.title} × {b.title}
          </span>
        </div>
        <a className="link link-dark" href="#/today">
          Today
        </a>
      </header>

      <div className="dx-layout">
        <div className="dx-left">
          <div
            ref={stage}
            className={`dx-stage ${registered ? 'is-registered' : ''}`}
            style={{ '--ov': overlap } as CSSProperties}
          >
            <div className="dx-base">
              <Photo memory={a} p={a.progress.developedAt ? 1 : 0.82} alt={`Photograph from ${a.title}`} />
            </div>
            <div
              className="dx-top"
              role="slider"
              tabIndex={0}
              aria-label={`Slide “${b.title}” over “${a.title}”. Use arrow keys.`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(overlap * 100)}
              style={{ transform: `translate(${pos.x}%, ${pos.y}%)` }}
              onPointerDown={(e) => {
                if (registered) return
                e.currentTarget.setPointerCapture(e.pointerId)
                drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }
              }}
              onPointerMove={(e) => {
                const d = drag.current
                const r = stage.current?.getBoundingClientRect()
                if (!d || !r) return
                move(d.px + ((e.clientX - d.x) / r.width) * 100, d.py + ((e.clientY - d.y) / r.height) * 100)
              }}
              onPointerUp={() => (drag.current = null)}
              onPointerCancel={() => (drag.current = null)}
              onKeyDown={(e) => {
                const step = e.shiftKey ? 12 : 5
                const k: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }
                if (k[e.key]) {
                  e.preventDefault()
                  move(pos.x + k[e.key][0], pos.y + k[e.key][1])
                }
              }}
            >
              <Photo memory={b} p={b.progress.developedAt ? 1 : 0.82} alt={`Photograph from ${b.title}`} />
            </div>
          </div>
          <div className="dx-meter" aria-hidden="true">
            <span style={{ width: `${overlap * 100}%` }} />
          </div>
          <p className="dx-status">
            {registered ? 'In register.' : overlap < 0.35 ? 'Drag the top frame onto the other one.' : `Coming into register — ${Math.round(overlap * 100)}%`}
          </p>
          <div className="dx-legend">
            <span>
              <b>A</b> {longDate(a.date)} — {a.title}
            </span>
            <span>
              <b>B</b> {longDate(b.date)} — {b.title}
            </span>
          </div>
        </div>

        <section className="dx-right" aria-live="polite">
          <p className="bath-kicker">What comes through</p>
          {all.length === 0 && registered && (
            <AppVoice className="dark">
              Nothing in what you recorded connects these two days — no shared names, places or words. Maybe that is the connection.
              You could write it below.
            </AppVoice>
          )}
          {all.length > 0 && shown === 0 && <AppVoice className="dark">Nothing yet. Keep bringing them together.</AppVoice>}
          <ol className="dx-threads">
            {all.slice(0, shown).map((c, i) => (
              <Thread key={i} c={c} a={a} b={b} />
            ))}
          </ol>
          {!registered && shown < all.length && shown > 0 && (
            <p className="dx-more">
              {all.length - shown} more {all.length - shown === 1 ? 'thread' : 'threads'} still in the dark.
            </p>
          )}

          {registered && (
            <div className="composer dx-caption">
              <h3 className="composer-title">
                What connects them? <InfoTip dark>In your words, today. The two days stay exactly as they were; this goes underneath, like a caption on a print.</InfoTip>
              </h3>
              <textarea className="composer-text" rows={3} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Both times I thought I was alone in it…" />
              <div className="row">
                <button type="button" className="btn btn-light" onClick={save}>
                  {saved ? 'Update the print' : 'Keep this double exposure'}
                </button>
                {savedFlash && <span className="app-voice dark">Hung on the line, next to the others.</span>}
                {saved && (
                  <ConfirmButton className="link-dark danger" confirm="Take this double exposure down?" onConfirm={() => deleteExposure(saved.id).then(() => go('/double'))}>
                    Take it down
                  </ConfirmButton>
                )}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}

function Highlight({ sentence, word }: { sentence: string; word: string }) {
  // find the token whose stem matches
  const tok = sentence.match(/\p{L}+/gu)?.find((w) => stem(w) === word || norm(w) === word)
  const parts = tok ? splitAround(sentence, tok) : null
  if (!parts) return <>{sentence}</>
  return (
    <>
      {parts[0]}
      <mark>{parts[1]}</mark>
      {parts[2]}
    </>
  )
}

function Thread({ c, a, b }: { c: Connection; a: Memory; b: Memory }) {
  return (
    <li className={`dx-thread dx-${c.kind}`}>
      <AppVoice className="dark">{c.label}</AppVoice>
      {c.kind === 'word' && (
        <div className="dx-quotes">
          <figure>
            <blockquote>“<Highlight sentence={c.a} word={c.word} />”</blockquote>
            <PastLabel date={a.date}>A</PastLabel>
          </figure>
          <figure>
            <blockquote>“<Highlight sentence={c.b} word={c.word} />”</blockquote>
            <PastLabel date={b.date}>B</PastLabel>
          </figure>
        </div>
      )}
    </li>
  )
}
