import { useMemo, useState } from 'react'
import { saveStrip, useStore } from '../lib/store'
import type { Memory, StripResult } from '../lib/types'
import { hash, sentences } from '../lib/extract'
import { longDate, todayISO, weekday } from '../lib/time'
import Photo from '../components/Photo'
import { AppVoice, Back } from '../components/common'
import { hrefFor } from './Home'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MAX = 5
const SEASON = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer', 'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter']

const mi = (iso: string) => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7)) - 1
const label = (i: number) => `${MONTHS_LONG[i % 12]} ${Math.floor(i / 12)}`

/** Today's sentence: deterministic for the date, drawn from everything you've written. */
export function pickStrip(memories: Memory[], date: string) {
  // skip days written in the last month — too fresh to be a game — unless that's all there is
  const cutoff = new Date(date + 'T12:00').getTime() - 30 * 86400000
  const older = memories.filter((m) => new Date(m.date + 'T12:00').getTime() < cutoff)
  const pool = (older.length ? older : memories).flatMap((m) => sentences(m.story).filter((s) => s.split(/\s+/).length >= 6 && s.length < 200).map((s) => ({ m, s })))
  if (!pool.length) return null
  return pool[hash('strip' + date) % pool.length]
}

export function closeness(off: number) {
  const a = Math.abs(off)
  if (a <= 1) return { word: a === 0 ? 'That month exactly' : 'Within a month', tone: 4 }
  if (a <= 4) return { word: 'Very warm', tone: 3 }
  if (a <= 12) return { word: 'Warm', tone: 2 }
  if (a <= 30) return { word: 'Cool', tone: 1 }
  return { word: 'Cold', tone: 0 }
}

export function stripGlyphs(r: StripResult) {
  return r.guesses.map((g) => ['□', '▫', '▣', '▦', '■'][closeness(g).tone]).join('')
}

export default function Strip() {
  const { memories, strips } = useStore()
  const today = todayISO()
  const pick = useMemo(() => pickStrip(memories, today), [memories, today])
  const existing = strips[today]
  const answer = pick ? mi(pick.m.date) : 0
  const max = mi(today)
  const earliest = memories.length ? Math.min(...memories.map((m) => mi(m.date))) : max
  const min = Math.min(earliest - 6, max - 24)
  const [guess, setGuess] = useState(() => Math.round((min + max) / 2))
  const [copied, setCopied] = useState(false)

  if (!pick)
    return (
      <main className="paper strip-page">
        <Back href="#/today">Today</Back>
        <p className="empty">The test strip needs something you wrote. Expose a day first.</p>
      </main>
    )

  // a stale result (the day's memory was edited or deleted) starts fresh
  const r: StripResult = existing && existing.memoryId === pick.m.id && existing.sentence === pick.s ? existing : { date: today, memoryId: pick.m.id, sentence: pick.s, guesses: [], solved: false, done: false }
  const m = pick.m
  const misses = r.guesses.filter((g) => Math.abs(g) > 1).length

  const expose = async () => {
    if (r.done) return
    const off = guess - answer
    const solved = Math.abs(off) <= 1
    const guesses = [...r.guesses, off]
    await saveStrip({ ...r, guesses, solved, done: solved || guesses.length >= MAX })
  }

  const clues: { k: string; text: string; verbatim?: boolean }[] = []
  const d = new Date(m.date + 'T12:00')
  if (misses >= 1) clues.push({ k: 'When', text: `It was a ${weekday(m.date)} in ${SEASON[d.getMonth()]}.` })
  if (misses >= 2 && (m.mood || m.weather)) clues.push({ k: 'Around it', text: [m.weather && `Weather: ${m.weather}.`, m.mood && `Mood: ${m.mood}.`].filter(Boolean).join(' ') })
  if (misses >= 3 && m.song) clues.push({ k: 'Playing', text: `${m.song.title} — ${m.song.artist}` })
  if (misses >= 4) {
    const ss = sentences(m.story)
    const k = ss.indexOf(pick.s)
    const other = ss[k + 1] ?? ss[k - 1]
    if (other) clues.push({ k: 'The next thing you wrote', text: other, verbatim: true })
  }

  const share = async () => {
    const text = `Afterimage · test strip · ${longDate(today)}\n${stripGlyphs(r)} ${r.solved ? `${r.guesses.length}/${MAX}` : `x/${MAX}`}`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked — nothing to do */
    }
  }

  const years: number[] = []
  for (let y = Math.ceil(min / 12); y * 12 <= max; y++) years.push(y)
  const pct = (i: number) => Math.max(3.5, Math.min(96.5, ((i - min) / (max - min)) * 100))

  return (
    <main className="paper strip-page">
      <header className="print-bar">
        <Back href="#/today">Today</Back>
        <span className="kicker" style={{ margin: 0 }}>
          Test strip · {longDate(today)}
        </span>
      </header>

      <section className="strip-hero">
        <p className="kicker">Today’s test strip</p>
        <h1 className="step-title">When did you write this?</h1>
        <blockquote className="strip-quote">“{pick.s}”</blockquote>
        <p className="voice">
          <span aria-hidden="true">✎</span>&nbsp;You wrote this · {r.done ? longDate(m.date) : 'date hidden'}
        </p>
      </section>

      <section className="strip-game" aria-label="Timeline of your life">
        <div className="strip-film">
          <div className="strip-bands" aria-hidden="true">
            {r.guesses.map((g, i) => (
              <span key={i} className={`band tone-${closeness(g).tone}`} style={{ left: `${pct(answer + g)}%` }}>
                <i>{i + 1}</i>
              </span>
            ))}
            {r.done && <span className="band band-answer" style={{ left: `${pct(answer)}%` }} />}
          </div>
          <div className="strip-years" aria-hidden="true">
            {years.map((y) => (
              <span key={y} style={{ left: `${pct(y * 12)}%` }}>
                {y}
              </span>
            ))}
          </div>
        </div>
        {!r.done && (
          <>
            <label className="strip-range">
              <span className="sr-only">Your guess</span>
              <input type="range" min={min} max={max} step={1} value={guess} onChange={(e) => setGuess(Number(e.target.value))} aria-valuetext={label(guess)} />
            </label>
            <div className="strip-controls">
              <button type="button" className="btn btn-ghost-ink btn-sm" aria-label="One month earlier" onClick={() => setGuess(Math.max(min, guess - 1))}>
                ←
              </button>
              <output className="strip-guess">
                {MONTHS[guess % 12]} <span>{Math.floor(guess / 12)}</span>
              </output>
              <button type="button" className="btn btn-ghost-ink btn-sm" aria-label="One month later" onClick={() => setGuess(Math.min(max, guess + 1))}>
                →
              </button>
              <button type="button" className="btn btn-ink" onClick={expose}>
                Expose this month
              </button>
            </div>
            <p className="strip-left">
              {MAX - r.guesses.length} {MAX - r.guesses.length === 1 ? 'exposure' : 'exposures'} left
            </p>
          </>
        )}

        {r.guesses.length > 0 && (
          <ol className="strip-log">
            {r.guesses.map((g, i) => {
              const c = closeness(g)
              return (
                <li key={i} className={`tone-${c.tone}`}>
                  <span className="strip-log-n">{i + 1}</span>
                  <span className="strip-log-m">{label(answer + g)}</span>
                  <span className="strip-log-c">{c.word}</span>
                  {Math.abs(g) > 1 && <span className="strip-log-d">{g > 0 ? '← earlier' : 'later →'}</span>}
                </li>
              )
            })}
          </ol>
        )}

        {clues.length > 0 && !r.done && (
          <div className="strip-clues">
            {clues.map((c) => (
              <div key={c.k} className="strip-clue">
                <span className="strip-clue-k">{c.k}</span>
                {c.verbatim ? <blockquote className="quote">“{c.text}”</blockquote> : <AppVoice>{c.text}</AppVoice>}
              </div>
            ))}
          </div>
        )}
      </section>

      {r.done && (
        <section className="strip-reveal">
          <div className="strip-reveal-photo">
            <Photo memory={m} p={m.progress.developedAt ? 1 : 0.4} />
          </div>
          <div className="strip-reveal-text">
            <p className="kicker">{r.solved ? 'Found it' : 'It was here'}</p>
            <h2>{m.title}</h2>
            <p className="print-dateline">
              {weekday(m.date)}, {longDate(m.date)}
            </p>
            <AppVoice>
              {r.solved
                ? r.guesses.length === 1
                  ? 'First exposure. You knew exactly who wrote that.'
                  : `Found in ${r.guesses.length} exposures.`
                : `You were ${Math.abs(r.guesses[r.guesses.length - 1])} months away on your last try. The person who wrote it feels further off than they are.`}
            </AppVoice>
            <div className="row">
              <a className="btn btn-ink" href={hrefFor(m)}>
                {m.progress.developedAt ? 'Open that day' : 'Develop that day'}
              </a>
              <button type="button" className="link" onClick={share}>
                {copied ? 'Copied — without your words' : 'Copy result'}
              </button>
            </div>
            <p className="strip-glyphs" aria-label="Your result">
              {stripGlyphs(r)}
            </p>
            <p className="section-meta">A new sentence comes up tomorrow.</p>
          </div>
        </section>
      )}
    </main>
  )
}
