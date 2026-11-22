import { useEffect, useMemo, useState } from 'react'
import { eraseEverything, restoreDemos, updateMemory, useStore } from '../lib/store'
import { ago, longDate, monthYear, year } from '../lib/time'
import type { Exposure, Letter, Memory, Stamp } from '../lib/types'
import Photo, { fadeOf } from '../components/Photo'
import { loadStranger, useStranger } from '../lib/stranger/engine'
import { stats as strangerStats } from '../lib/stranger/game'
import { connections } from '../lib/connect'
import { OptionalImg, ScrapPhoto } from '../components/Scrap'
import { dayIndex, dayPhotos } from '../lib/journal'
import { ConfirmButton, PastLabel, StampSet } from '../components/common'
import { randomMemoryHref } from '../components/Palette'
import { toast } from '../lib/toast'

export function useNow(every = 20000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), every)
    return () => window.clearInterval(t)
  }, [every])
  return now
}

export function devState(m: Memory) {
  const total = m.baths.length
  const done = m.baths.filter((b) => m.progress.done[b]).length
  return { total, done, developed: !!m.progress.developedAt, p: m.progress.developedAt ? 1 : done / (total + 0.6) }
}

export function hrefFor(m: Memory) {
  return m.progress.developedAt ? `#/print/${m.id}` : `#/develop/${m.id}`
}

/** Memories: every saved day on the drying line, and what's still open about them. */
export default function Memories() {
  const { memories, exposures } = useStore()
  const developed = memories.filter((m) => m.progress.developedAt).length
  const [q, setQ] = useState('')
  const [show, setShow] = useState<Show>('all')
  const [newest, setNewest] = useState(false)
  const counts = useMemo(() => {
    const c: Record<Show, number> = { all: memories.length, negative: 0, developed: 0, fading: 0 }
    for (const m of memories) c[showOf(m)]++
    c.developed += c.fading
    return c
  }, [memories])
  const shown = useMemo(() => {
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const out = memories.filter((m) => {
      const s = showOf(m)
      if (show === 'negative' && s !== 'negative') return false
      if (show === 'developed' && s === 'negative') return false
      if (show === 'fading' && s !== 'fading') return false
      if (!words.length) return true
      const hay = [m.title, longDate(m.date), m.location, m.people.join(' '), m.mood, m.song?.title, m.song?.artist, m.story].join(' ').toLowerCase()
      return words.every((w) => hay.includes(w))
    })
    return newest ? out.reverse() : out
  }, [memories, q, show, newest])
  const filtering = q.trim() !== '' || show !== 'all'

  return (
    <main className="paper home app-page">
      <header className="page-head">
        <h1 className="page-title">Memories</h1>
        <span className="page-head-actions">
          {memories.length > 1 && (
            <a className="link surprise" href={randomMemoryHref(memories)} title="Open a random memory (r)">
              Surprise me
            </a>
          )}
        </span>
      </header>

      <section className="section first" aria-labelledby="line-h">
        <div className="section-head">
          <h2 id="line-h">The drying line</h2>
          <p className="section-meta">
            {memories.length} {memories.length === 1 ? 'day' : 'days'} · {developed} developed
            {memories.length > 1 && (
              <>
                {' · '}
                <a href="#/feed">Side by side</a>
              </>
            )}
          </p>
        </div>
        {memories.length > 2 && (
          <div className="mem-tools">
            <label className="mem-search">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" />
                <path d="M16 16l4.5 4.5" />
              </svg>
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a day — title, place, person, song…" aria-label="Find a memory" />
            </label>
            <div className="chips" role="group" aria-label="Show">
              {SHOWS.map(([id, label]) => (
                <button key={id} type="button" className={`chip ${show === id ? 'is-on' : ''}`} aria-pressed={show === id} onClick={() => setShow(id)} disabled={id !== 'all' && counts[id] === 0}>
                  {label} <span className="chip-n">{counts[id]}</span>
                </button>
              ))}
              <button type="button" className="chip chip-sort" onClick={() => setNewest((x) => !x)} aria-label={newest ? 'Newest first — switch to oldest first' : 'Oldest first — switch to newest first'}>
                {newest ? '↓ Newest' : '↑ Oldest'}
              </button>
            </div>
          </div>
        )}
        {memories.length === 0 && <OptionalImg src="/demo/ui/empty-memories.jpg" className="ui-art" />}
        {filtering && shown.length === 0 ? (
          <p className="mem-none">
            No day matches. <button type="button" className="link" onClick={() => (setQ(''), setShow('all'))}>Clear the search</button>
          </p>
        ) : (
          <DryingLine memories={shown} grouped={!newest} />
        )}
      </section>

      {exposures.length > 0 && <Exposures memories={memories} exposures={exposures} />}

      <Threads memories={memories} />

    </main>
  )
}

export function ArrivedLetter({ letter, memory }: { letter: Letter; memory?: Memory }) {
  return (
    <section className="arrived" aria-labelledby={`arr-${letter.id}`}>
      <div className="envelope" aria-hidden="true">
        <span className="envelope-flap" />
        <span className="wax wax-lg">A</span>
      </div>
      <div className="arrived-text">
        <p className="kicker">Arrived today</p>
        <h2 id={`arr-${letter.id}`}>A letter from you, written in {monthYear(letter.writtenAt)}.</h2>
        <p className="arrived-meta">
          Sealed {ago(letter.writtenAt)}
          {memory && <> · from “{memory.title}”</>}. It has been waiting for you.
        </p>
        <a className="btn btn-ink" href={`#/arrival/${letter.id}`}>
          Open it
        </a>
      </div>
    </section>
  )
}

type Show = 'all' | 'negative' | 'developed' | 'fading'
const SHOWS: [Show, string][] = [
  ['all', 'All'],
  ['negative', 'Negatives'],
  ['developed', 'Prints'],
  ['fading', 'Fading'],
]
function showOf(m: Memory): Exclude<Show, 'all'> {
  if (!m.progress.developedAt) return 'negative'
  return fadeOf(m) > 0.15 ? 'fading' : 'developed'
}

function DryingLine({ memories, grouped = true }: { memories: Memory[]; grouped?: boolean }) {
  const items = useMemo(() => {
    const out: ({ kind: 'year'; y: number } | { kind: 'm'; m: Memory })[] = []
    let last = 0
    for (const m of memories) {
      const y = year(m.date)
      if (grouped && y !== last) out.push({ kind: 'year', y })
      last = y
      out.push({ kind: 'm', m })
    }
    return out
  }, [memories, grouped])

  return (
    <div className="line-wrap">
      <div className="line" role="list">
        <span className="line-wire" aria-hidden="true" />
        {items.map((it, i) =>
          it.kind === 'year' ? (
            <div key={'y' + it.y} className="line-year" role="presentation">
              {it.y}
            </div>
          ) : (
            <Negative key={it.m.id} m={it.m} i={i} />
          ),
        )}
        <a className="line-new" href="#/new" role="listitem">
          <span className="pin" aria-hidden="true" />
          <span className="line-new-frame">
            <span className="plus" aria-hidden="true">
              +
            </span>
            <span>Expose a new day</span>
          </span>
        </a>
      </div>
    </div>
  )
}

function Negative({ m, i }: { m: Memory; i: number }) {
  const s = devState(m)
  const tilt = ((i * 37) % 7) - 3
  const fade = fadeOf(m)
  const status = s.developed ? (fade > 0.15 ? 'Fading' : 'Developed') : s.done === 0 ? 'Undeveloped' : `${s.total - s.done} ${s.total - s.done === 1 ? 'bath' : 'baths'} left`
  return (
    <a className={`neg theme-${m.theme}`} href={hrefFor(m)} role="listitem" style={{ '--tilt': `${tilt * 0.6}deg` } as React.CSSProperties}>
      <span className="pin" aria-hidden="true" />
      <span className="neg-frame">
        <Photo memory={m} p={s.p} className="neg-photo" alt="" fade={fade} />
        <span className="sprockets" aria-hidden="true" />
      </span>
      <span className="neg-cap">
        <span className="neg-date">{longDate(m.date)}</span>
        <span className="neg-title">{m.title}</span>
        <span className={`neg-status ${s.developed ? 'is-done' : ''}`}>
          {status}
          {m.demo && <span className="demo-tag">fictional demo</span>}
        </span>
      </span>
    </a>
  )
}

export function Threads({ memories }: { memories: Memory[] }) {
  const open = memories
    .filter((m) => !(m.baths.includes('ledger') && !m.progress.developedAt))
    .flatMap((m) => m.threads.filter((t) => !m.ledger[t.id]).map((t) => ({ m, t })))
    .sort((a, b) => a.m.date.localeCompare(b.m.date))
  const [justStamped, setJust] = useState<string | null>(null)
  if (!open.length && !justStamped) return null
  const shown = open.slice(0, 3)
  const stamp = (m: Memory, tid: string, s: Stamp) => {
    setJust(tid)
    window.setTimeout(() => {
      updateMemory(m.id, (x) => ({ ...x, ledger: { ...x.ledger, [tid]: { stamp: s, at: new Date().toISOString() } } }))
      setJust(null)
      toast(`Stamped “${s.replace('-', ' ')}” — filed in ${m.title}.`, {
        label: 'Undo',
        run: () =>
          updateMemory(m.id, (x) => {
            const ledger = { ...x.ledger }
            delete ledger[tid]
            return { ...x, ledger }
          }),
      })
    }, 650)
  }
  return (
    <section className="section" aria-labelledby="threads-h">
      <div className="section-head">
        <h2 id="threads-h">Unfinished threads</h2>
        <p className="section-meta">What you meant to do, or asked and never answered.</p>
      </div>
      <ul className="threads">
        {shown.map(({ m, t }) => (
          <li key={t.id} className={`thread ${justStamped === t.id ? 'is-stamping' : ''}`}>
            <blockquote className="quote">“{t.quote}”</blockquote>
            <div className="thread-foot">
              <PastLabel date={m.date}>
                <a href={hrefFor(m)}>{m.title}</a>
              </PastLabel>
              <StampSet thread={t} compact onStamp={(s) => stamp(m, t.id, s)} />
            </div>
          </li>
        ))}
      </ul>
      {open.length > 3 && <p className="section-meta">And {open.length - 3} more inside their days.</p>}
    </section>
  )
}

export function Colophon() {
  return (
    <footer className="colophon">
      <p>
        <strong>Afterimage</strong> keeps everything on this device, in your browser’s storage. Nothing is uploaded.
        The reader that suggests moments and words works offline and only ever quotes what you wrote; anything written by
        the app is marked <span className="app-mark">◇</span>.
      </p>
      <p>
        The six demo days (the autumn afternoon, the ambition, the night everything was due, the picnic, the first frost and
        grandma’s records) belong to a fictional person. Their photographs are generated for this project; their songs and artists are invented.
      </p>
      <p className="colophon-actions">
        <ConfirmButton confirm="Put the demo days back as they were?" onConfirm={() => restoreDemos().then(() => toast('The demo days are back.'))}>
          Restore demo days
        </ConfirmButton>
        <ConfirmButton
          className="danger"
          confirm="Erase every memory, photo and letter on this device? This cannot be undone."
          onConfirm={() => eraseEverything().then(() => toast('Everything on this device was erased.'))}
        >
          Erase everything
        </ConfirmButton>
      </p>
    </footer>
  )
}

export function Rituals({ memories, exposures, today }: { memories: Memory[]; exposures: Exposure[]; today: string }) {
  const stranger = useStranger()
  useEffect(() => {
    loadStranger()
  }, [])
  const st = strangerStats(stranger.rounds)
  const best = useMemo(() => {
    let top: { a: Memory; b: Memory; n: number } | null = null
    for (let i = 0; i < memories.length; i++)
      for (let j = i + 1; j < memories.length; j++) {
        const a = memories[i]
        const b = memories[j]
        if (exposures.some((e) => (e.a === a.id && e.b === b.id) || (e.a === b.id && e.b === a.id))) continue
        const n = connections(a, b).length
        if (!top || n > top.n) top = { a, b, n }
      }
    return top
  }, [memories, exposures])
  return (
    <section className="today" aria-label="Today">
      <a className="today-card today-strip" href="#/stranger">
        <span className="today-k">The Stranger</span>
        <span className="today-q">Five fragments from your past. One that never happened.</span>
        <span className="today-meta">
          {st.played > 0 ? `${st.played} ${st.played === 1 ? 'round' : 'rounds'} · ${Math.round(st.rate * 100)}% recognised` : 'Find the one who isn’t you.'}
        </span>
        <span className="today-strip-film" aria-hidden="true" style={{ gridTemplateColumns: 'repeat(6, 1fr)' }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <i key={i} style={{ opacity: i === 3 ? 1 : 0.12 + i * 0.11, background: i === 3 ? 'var(--burgundy)' : undefined }} />
          ))}
        </span>
      </a>
      {memories.length >= 2 && (
        <a className="today-card today-double" href={best && best.n > 0 ? `#/double/${best.a.id}/${best.b.id}` : '#/double'}>
          <span className="today-k">The enlarger</span>
          <span className="today-dx" aria-hidden="true">
            {best && (
              <>
                <Photo memory={best.a} p={best.a.progress.developedAt ? 1 : 0.82} alt="" />
                <Photo memory={best.b} p={best.b.progress.developedAt ? 1 : 0.82} alt="" />
              </>
            )}
          </span>
          <span className="today-q today-q-sans">
            {best && best.n > 0 ? (
              <>
                <em>{best.a.title}</em> and <em>{best.b.title}</em> share {best.n === 1 ? 'something' : `${best.n} things`}.
              </>
            ) : (
              'Lay two days over each other and see what they share.'
            )}
          </span>
        </a>
      )}
      <a className="today-card today-music" href={`#/music/${today.slice(0, 7)}`}>
        <span className="today-k">The music box</span>
        <span className="today-q today-q-sans">This month, played by your photographs.</span>
        <span className="today-music-strip" aria-hidden="true">
          {Array.from({ length: 22 }, (_, k) => (
            <i key={k} style={{ top: `${18 + ((k * 37) % 60)}%`, left: `${4 + k * 4.4}%` }} />
          ))}
        </span>
      </a>
    </section>
  )
}

function Exposures({ memories, exposures }: { memories: Memory[]; exposures: Exposure[] }) {
  const list = exposures
    .map((e) => ({ e, a: memories.find((m) => m.id === e.a), b: memories.find((m) => m.id === e.b) }))
    .filter((x): x is { e: Exposure; a: Memory; b: Memory } => !!x.a && !!x.b)
  if (!list.length) return null
  return (
    <section className="section" aria-labelledby="dx-h">
      <div className="section-head">
        <h2 id="dx-h">Double exposures</h2>
        <p className="section-meta">Two days, one print.</p>
      </div>
      <ul className="dx-list">
        {list.map(({ e, a, b }) => (
          <li key={e.id}>
            <a href={`#/double/${a.id}/${b.id}`} className="dx-print">
              <span className="dx-print-img" aria-hidden="true">
                <Photo memory={a} p={a.progress.developedAt ? 1 : 0.82} alt="" />
                <Photo memory={b} p={b.progress.developedAt ? 1 : 0.82} alt="" />
              </span>
              <span className="dx-print-cap">
                {e.caption ? <span className="present">{e.caption}</span> : <span className="dx-print-none">no caption yet</span>}
                <span className="toc-date">
                  {a.title} × {b.title}
                </span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function JournalTeaser() {
  const { memories, shoebox } = useStore()
  const days = useMemo(() => [...dayIndex(memories, shoebox).values()].sort((a, b) => b.date.localeCompare(a.date)), [memories, shoebox])
  const recent = days.filter((d) => dayPhotos(d).length).slice(0, 9)
  return (
    <section className="teaser" aria-labelledby="teaser-h">
      <div className="section-head">
        <h2 id="teaser-h">The journal</h2>
        <p className="section-meta">
          {shoebox.length} photographs · {days.length} days
        </p>
      </div>
      {recent.length ? (
        <a className="teaser-strip" href={`#/journal/${recent[0].date.slice(0, 7)}`}>
          {recent.map((d, i) => {
            const p = dayPhotos(d)[0]
            return (
              <span key={d.date} className="teaser-frame" style={{ '--i': i } as React.CSSProperties}>
                <ScrapPhoto refId={p.ref} negative={p.negative} variant="cell" thumb />
                <span className="teaser-d">{Number(d.date.slice(8))}.{d.date.slice(5, 7)}</span>
              </span>
            )
          })}
          <span className="teaser-open">Open the month →</span>
        </a>
      ) : (
        <a className="btn btn-ink" href="#/connect">
          Connect your photos
        </a>
      )}
    </section>
  )
}
