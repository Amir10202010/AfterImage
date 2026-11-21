// The Stranger — five passages you wrote, one Gemini wrote in your voice. Find the one who isn't you.
import { memo, useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import '../stranger.css'
import { useBlobUrl, useStore } from '../lib/store'
import { accuseCard, blockers, currentRound, loadStranger, realCount, setPrefs, startRound, useStranger, type Blocker } from '../lib/stranger/engine'
import { ATTEMPTS, REAL_PER_ROUND, attemptsLeft, glyphs, present, stats, summarize, type Card, type Round } from '../lib/stranger/game'
import { shortfall } from '../lib/stranger/fragments'
import type { Memory, ShoeboxItem } from '../lib/types'
import { longDate } from '../lib/time'
import Photo from '../components/Photo'
import { AppVoice } from '../components/common'
import { ConsentPanel, KeysPanel, LastError, ProfilePanel } from '../components/StrangerAI'
import { hrefFor } from './Home'

const HOLD_MS = 800
const LOADING = ['Searching the archive…', 'Collecting fragments…', 'Creating the Stranger…', 'Developing the negatives…']
const calm = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

type Phase = { k: 'intro' } | { k: 'loading'; step: number } | { k: 'round'; id: string } | { k: 'error'; message: string }

export default function Stranger() {
  const s = useStranger()
  const [phase, setPhase] = useState<Phase>({ k: 'intro' })

  useEffect(() => {
    loadStranger()
  }, [])

  const play = useCallback(async () => {
    setPhase({ k: 'loading', step: 0 })
    const t0 = Date.now()
    let step = 0
    const tick = window.setInterval(() => setPhase((p) => (p.k === 'loading' ? { k: 'loading', step: Math.min(LOADING.length - 1, ++step) } : p)), 420)
    const res = await startRound()
    // a short, atmospheric beat — never longer than it needs to be
    const wait = Math.max(0, (calm() ? 300 : 1500) - (Date.now() - t0))
    await new Promise((r) => setTimeout(r, wait))
    window.clearInterval(tick)
    if (res.ok) setPhase({ k: 'round', id: res.round.id })
    else if ('error' in res) setPhase({ k: 'error', message: res.error })
    else setPhase({ k: 'intro' })
    window.scrollTo({ top: 0 })
  }, [])

  if (!s.loaded) return <main className="stranger" aria-busy="true" />

  // an unfinished round comes back after a reload or a detour to a memory
  const roundId = phase.k === 'round' ? phase.id : phase.k === 'intro' ? currentRound()?.id : undefined
  const round = roundId ? s.rounds.find((r) => r.id === roundId) : undefined

  return (
    <main className={`stranger ${round && round.status === 'won' ? 'is-found' : ''}`}>
      <header className="st-bar">
        <a className="back back-dark" href="#/today">
          <span aria-hidden="true">←</span> Today
        </a>
        <span className="st-bar-k">The Stranger</span>
        <a className="st-bar-link" href="#/settings?stranger=1">
          AI settings
        </a>
      </header>
      {phase.k === 'loading' && <Developing step={phase.step} />}
      {phase.k === 'intro' && !round && <Entry onPlay={play} />}
      {phase.k === 'error' && <Failure message={phase.message} onRetry={play} onBack={() => setPhase({ k: 'intro' })} />}
      {round && <Board round={round} onAgain={play} onPin={() => phase.k !== 'round' && setPhase({ k: 'round', id: round.id })} />}
      {phase.k === 'round' && !round && <Entry onPlay={play} />}
    </main>
  )
}

/* ---------- entry ---------- */

function Entry({ onPlay }: { onPlay: () => void }) {
  const s = useStranger()
  useStore() // re-render when the archive changes
  const b = blockers()
  const st = stats(s.rounds)
  const ready = !b.includes('short') && (!b.length || s.queue.some((l) => !l.usedAt))
  return (
    <section className="st-entry">
      <div className="st-sheet-deco" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <i key={i} style={{ animationDelay: `${i * 90}ms` }} />
        ))}
      </div>
      <p className="st-kicker">A game you can play as long as you like</p>
      <h1 className="st-title">Find the one who isn’t you.</h1>
      <p className="st-sub">Five fragments from your past. One that never happened.</p>
      {ready && (
        <>
          <button type="button" className="st-play" onClick={onPlay}>
            Play Stranger
          </button>
          <p className="st-fine">Six frames, three accusations. Hold a frame to accuse it. Another round is always one press away.</p>
        </>
      )}
      {st.played > 0 && (
        <dl className="st-stats" aria-label="Your record">
          <div>
            <dt>Rounds</dt>
            <dd>{st.played}</dd>
          </div>
          <div>
            <dt>Found</dt>
            <dd>{st.found}</dd>
          </div>
          <div>
            <dt>Avg. accusations</dt>
            <dd>{st.avgAttempts.toFixed(1)}</dd>
          </div>
          <div>
            <dt>Recognition</dt>
            <dd>{Math.round(st.rate * 100)}%</dd>
          </div>
        </dl>
      )}
      {!ready && <Setup blockers={b} />}
    </section>
  )
}

function Setup({ blockers: b }: { blockers: Blocker[] }) {
  const s = useStranger()
  const realOnly = realCount(false)
  const withDemo = realCount(true)
  const steps: { id: Blocker; done: boolean; title: string }[] = [
    { id: 'short', done: !b.includes('short'), title: 'Enough of your own writing' },
    { id: 'no-keys', done: !b.includes('no-keys'), title: 'Your Gemini API key' },
    { id: 'no-consent', done: !b.includes('no-consent'), title: 'Your consent' },
    { id: 'no-profile', done: !b.includes('no-profile'), title: 'Your writing profile' },
  ]
  const next = steps.find((x) => !x.done)?.id
  return (
    <div className="st-setup">
      <ol className="st-steps">
        {steps.map((x, i) => (
          <li key={x.id} className={x.done ? 'is-done' : x.id === next ? 'is-next' : ''}>
            <span className="st-step-n">{x.done ? '✓' : i + 1}</span> {x.title}
          </li>
        ))}
      </ol>
      <LastError />
      {next === 'short' && (
        <div className="st-panel">
          <p className="st-p">{shortfall(realOnly)}</p>
          <div className="st-acts">
            <a className="btn btn-light btn-sm" href="#/new">
              Save a day
            </a>
            <a className="btn btn-ghost btn-sm" href="#/letters?write=future">
              Write a letter
            </a>
            <a className="btn btn-ghost btn-sm" href="#/connect">
              Bring in Instagram captions
            </a>
          </div>
          {!s.prefs.includeDemo && withDemo >= REAL_PER_ROUND && (
            <p className="st-fine">
              Just looking around?{' '}
              <button type="button" className="link" onClick={() => setPrefs({ includeDemo: true })}>
                Practise on the demo archive
              </button>{' '}
              — it belongs to a fictional person, and every reveal says so.
            </p>
          )}
        </div>
      )}
      {next === 'no-keys' && (
        <div className="st-panel st-panel-paper">
          <KeysPanel />
        </div>
      )}
      {next === 'no-consent' && (
        <div className="st-panel st-panel-paper">
          <ConsentPanel />
        </div>
      )}
      {next === 'no-profile' && (
        <div className="st-panel st-panel-paper">
          <ProfilePanel />
        </div>
      )}
      {s.prefs.includeDemo && (
        <p className="st-fine">
          Playing with the demo archive included.{' '}
          <button type="button" className="link" onClick={() => setPrefs({ includeDemo: false })}>
            Use only my own writing
          </button>
        </p>
      )}
    </div>
  )
}

function Developing({ step }: { step: number }) {
  return (
    <section className="st-developing" aria-live="polite">
      <div className="st-tray" aria-hidden="true">
        {Array.from({ length: 6 }, (_, i) => (
          <i key={i} style={{ animationDelay: `${i * 120}ms` }} />
        ))}
      </div>
      <p className="st-dev-line">{LOADING[step]}</p>
    </section>
  )
}

function Failure({ message, onRetry, onBack }: { message: string; onRetry: () => void; onBack: () => void }) {
  return (
    <section className="st-entry">
      <p className="st-kicker">The Stranger didn’t arrive</p>
      <p className="st-sub">{message}</p>
      <p className="st-fine">No round was started and nothing was made up to fill the gap.</p>
      <div className="st-acts st-acts-center">
        <button type="button" className="btn btn-light" onClick={onRetry}>
          Try again
        </button>
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          Back
        </button>
      </div>
    </section>
  )
}

/* ---------- the contact sheet ---------- */

function Board({ round, onAgain, onPin }: { round: Round; onAgain: () => void; onPin: () => void }) {
  const [inspect, setInspect] = useState<Set<string>>(new Set())
  const done = round.status !== 'playing'
  const left = attemptsLeft(round)
  const sum = summarize(round)
  // a resumed round is pinned on its first accusation, so its result stays on screen when it ends
  const accuse = useCallback(
    (cardId: string) => {
      onPin()
      void accuseCard(round.id, cardId)
    },
    [round.id, onPin],
  )

  return (
    <section className="st-round" aria-label="Six frames">
      <div className="st-status" aria-live="polite">
        {!done ? (
          <>
            <span className="st-tries" aria-label={`${left} of ${ATTEMPTS} accusations left`}>
              {Array.from({ length: ATTEMPTS }, (_, i) => (
                <i key={i} className={i < left ? 'is-left' : ''} />
              ))}
            </span>
            <span>
              {left} {left === 1 ? 'accusation' : 'accusations'} left · hold a frame to accuse it
            </span>
          </>
        ) : (
          <span>{sum.found ? `Found on accusation ${sum.attempts}.` : 'Three accusations, three of your own memories.'}</span>
        )}
      </div>
      {round.demo && <p className="st-demo-note">Demo archive — these passages belong to a fictional person.</p>}

      <ol className={`st-sheet ${done ? 'is-done' : ''}`}>
        {round.cards.map((c, i) => {
          const accused = round.accused.includes(c.id)
          const revealed = accused || (done && (c.kind === 'stranger' || inspect.has(c.id)))
          return (
            <Frame
              key={c.id}
              card={c}
              n={i + 1}
              revealed={revealed}
              wrong={accused && c.kind === 'real'}
              playing={!done}
              onAccuse={accuse}
              onInspect={done && !revealed ? () => setInspect((x) => new Set(x).add(c.id)) : undefined}
            />
          )
        })}
      </ol>

      {done && <Results round={round} onAgain={onAgain} onInspectAll={() => setInspect(new Set(round.cards.map((c) => c.id)))} />}
    </section>
  )
}

const Frame = memo(function Frame({
  card,
  n,
  revealed,
  wrong,
  playing,
  onAccuse,
  onInspect,
}: {
  card: Card
  n: number
  revealed: boolean
  wrong: boolean
  playing: boolean
  onAccuse: (id: string) => void
  onInspect?: () => void
}) {
  const [holding, setHolding] = useState(false)
  const timer = useRef<number | null>(null)
  const text = useMemo(() => present(card.text), [card.text])
  const canAccuse = playing && !revealed

  const cancel = () => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = null
    setHolding(false)
  }
  const start = () => {
    if (!canAccuse || timer.current) return
    setHolding(true)
    timer.current = window.setTimeout(() => {
      timer.current = null
      setHolding(false)
      navigator.vibrate?.(30)
      onAccuse(card.id)
    }, HOLD_MS)
  }
  useEffect(() => cancel, [])

  const onKeyDown = (e: KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
      e.preventDefault()
      if (onInspect) onInspect()
      else start()
    }
  }
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') cancel()
  }
  const down = (e: PointerEvent) => {
    if (e.button !== 0) return
    ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    start()
  }

  const state = !revealed ? 'is-neg' : card.kind === 'stranger' ? 'is-stranger' : 'is-real'
  const label = !revealed
    ? canAccuse
      ? `Frame ${n}: ${text}. Hold to accuse.`
      : `Frame ${n}: ${text}. Press to see where it came from.`
    : card.kind === 'stranger'
      ? `Frame ${n}: not yours — written by Gemini.`
      : `Frame ${n}: you wrote this.`

  return (
    <li className={`st-frame ${state} ${holding ? 'is-holding' : ''} ${wrong ? 'is-wrong' : ''}`} style={{ animationDelay: `${(n - 1) * 70}ms` }}>
      <div
        className="st-frame-in"
        role={canAccuse || onInspect ? 'button' : undefined}
        tabIndex={canAccuse || onInspect ? 0 : undefined}
        aria-label={label}
        onPointerDown={canAccuse ? down : undefined}
        onPointerUp={cancel}
        onPointerCancel={cancel}
        onPointerLeave={cancel}
        onClick={onInspect}
        onKeyDown={canAccuse || onInspect ? onKeyDown : undefined}
        onKeyUp={canAccuse ? onKeyUp : undefined}
        onContextMenu={(e) => canAccuse && e.preventDefault()}
      >
        <span className="st-edge st-edge-top" aria-hidden="true">
          <b>{n}</b>
          <span>AFTERIMAGE 400</span>
          <b>{n}A</b>
        </span>
        <p className="st-text">{text}</p>
        {revealed && card.kind === 'stranger' && <StrangerReveal />}
        {revealed && card.kind === 'real' && card.fragment && <Source card={card} />}
        {canAccuse && <span className="st-hold" aria-hidden="true" />}
        <span className="st-edge st-edge-bottom" aria-hidden="true">
          <span>▸ {n}</span>
          <span>{revealed ? (card.kind === 'stranger' ? 'NOT YOURS' : 'DEVELOPED') : 'NEGATIVE'}</span>
        </span>
      </div>
    </li>
  )
})

function StrangerReveal() {
  return (
    <div className="st-reveal st-reveal-ai">
      <span className="st-stamp">Not yours</span>
      <p>This was never in your archive.</p>
      <p className="st-reveal-fine">Gemini created it from your writing style. Nobody wrote it, and it never happened.</p>
    </div>
  )
}

const SOURCE: Record<string, string> = {
  story: 'From the story of',
  detail: 'A detail you kept about',
  letter: 'From a letter you wrote',
  caption: 'Your caption under a photo',
  note: 'A note you wrote',
}

/** Where a real passage came from — only what's actually stored. Nothing is filled in. */
function Source({ card }: { card: Card }) {
  const f = card.fragment!
  const { memories, shoebox, letters } = useStore()
  const m = f.memoryId ? memories.find((x) => x.id === f.memoryId) : undefined
  const shot = f.shoeboxId ? shoebox.find((x) => x.id === f.shoeboxId) : undefined
  const letter = f.letterId ? letters.find((x) => x.id === f.letterId) : undefined
  const href = m ? hrefFor(m) : f.pageDate ? `#/page/${f.pageDate}` : letter ? '#/letters' : undefined
  const where = f.source === 'letter' ? (letter?.to === 'past' ? 'From a letter you wrote to your past self' : SOURCE.letter) : f.source === 'note' && f.memoryId ? 'A margin note you wrote on' : SOURCE[f.source]
  return (
    <div className="st-reveal st-reveal-real">
      <p className="st-wrote">{f.demo ? 'The demo person wrote this.' : 'You actually wrote this.'}</p>
      {f.date && <p className="st-date">{longDate(f.date)}</p>}
      <p className="st-where">
        {where}
        {m && (f.source === 'story' || f.source === 'detail' || f.source === 'note') && <> “{m.title}”</>}
        {f.demo && <span className="st-demo-tag"> · demo archive</span>}
      </p>
      {m && (m.photoIds.length > 0 || m.art) && <MemoryThumb m={m} />}
      {shot && <ShotThumb s={shot} />}
      {href && (
        <a className="st-open" href={href}>
          {m ? (m.progress.developedAt ? 'Open that day' : 'Develop that day') : letter ? 'Open your letters' : 'Open that page'} →
        </a>
      )}
    </div>
  )
}

function MemoryThumb({ m }: { m: Memory }) {
  return (
    <div className="st-thumb">
      <Photo memory={m} p={1} alt={`Photograph from “${m.title}”`} />
    </div>
  )
}

function ShotThumb({ s }: { s: ShoeboxItem }) {
  const url = useBlobUrl(s.thumbId)
  return url ? (
    <div className="st-thumb">
      <img src={url} alt="The photo this caption belongs to" loading="lazy" />
    </div>
  ) : null
}

/* ---------- results ---------- */

function Results({ round, onAgain, onInspectAll }: { round: Round; onAgain: () => void; onInspectAll: () => void }) {
  const sum = summarize(round)
  const { rounds } = useStranger()
  const st = stats(rounds)
  const playBtn = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    playBtn.current?.focus({ preventScroll: true })
  }, [])
  const line =
    sum.found && sum.attempts === 1
      ? 'First accusation. You knew your own voice at once.'
      : sum.found
        ? `You found it — but first you accused ${sum.mistaken.length === 1 ? 'one of your own memories' : `${sum.mistaken.length} of your own memories`}.`
        : 'The Stranger got past you. Your own sentences looked less like you than its did.'
  return (
    <section className={`st-results ${sum.found ? 'is-won' : 'is-lost'}`} aria-label="Result">
      <p className="st-kicker">{sum.found ? 'The Stranger, found' : 'The Stranger got away'}</p>
      <AppVoice className="dark">{line}</AppVoice>
      <div className="st-res-grid">
        <div>
          <h3 className="st-res-h">The one Gemini wrote</h3>
          <blockquote className="st-res-ai">{present(sum.stranger.text)}</blockquote>
        </div>
        {sum.mistaken.length > 0 && (
          <div>
            <h3 className="st-res-h">Your own memories you didn’t recognise</h3>
            <ul className="st-res-list">
              {sum.mistaken.map((c) => (
                <li key={c.id}>
                  <span>“{present(c.text)}”</span>
                  {c.fragment?.date && <small>{longDate(c.fragment.date)}</small>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <p className="st-res-score">
        <span className="st-glyphs" aria-label={sum.found ? `Found in ${sum.attempts}` : 'Not found'}>
          {glyphs(round)}
        </span>
        {sum.found ? `${sum.attempts}/${ATTEMPTS}` : `x/${ATTEMPTS}`} · {st.played} {st.played === 1 ? 'round' : 'rounds'} · {Math.round(st.rate * 100)}% recognised
      </p>
      <div className="st-acts">
        <button ref={playBtn} type="button" className="st-play st-play-sm" onClick={onAgain}>
          Play again
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onInspectAll}>
          Show every source
        </button>
        <a className="btn btn-ghost btn-sm" href="#/journal">
          Back to the journal
        </a>
      </div>
    </section>
  )
}
