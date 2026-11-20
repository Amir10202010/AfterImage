import { useRef, useState } from 'react'
import { deleteMemory, letterStatus, touchMemory, uid, updateMemory, useStore } from '../lib/store'
import type { Letter, Memory } from '../lib/types'
import { ago, longDate, weekday } from '../lib/time'
import Photo, { fadeOf } from '../components/Photo'
import { AppVoice, Back, ConfirmButton, PastLabel, StampMark, StampSet } from '../components/common'
import { LetterReader, ReadLetter, ReplyComposer, SealedLetter, markOpened } from '../components/Conversation'
import { SoundToggle, memoryStyle } from './Darkroom'
import { go } from '../App'

export default function Print({ id }: { id: string }) {
  const { memories, letters } = useStore()
  const m = memories.find((x) => x.id === id)
  if (!m)
    return (
      <main className="paper">
        <p className="empty">This print isn’t on the line any more.</p>
        <Back href="#/memories">Memories</Back>
      </main>
    )
  return <PrintPage m={m} letters={letters.filter((l) => l.memoryId === m.id).sort((a, b) => a.writtenAt.localeCompare(b.writtenAt))} />
}

function PrintPage({ m, letters }: { m: Memory; letters: Letter[] }) {
  const [hero, setHero] = useState(0)
  const [writing, setWriting] = useState(false)
  const [note, setNote] = useState('')
  const [readingId, setReadingId] = useState<string | null>(null)
  const developed = !!m.progress.developedAt
  const photos = m.photoIds.length || 1
  const paras = m.story.split(/\n+/).filter(Boolean)
  const last = [...letters].reverse().find((l) => letterStatus(l) !== 'sealed')

  const addNote = async () => {
    if (!note.trim()) return
    await updateMemory(m.id, (x) => ({ ...x, margin: [...x.margin, { id: uid('n_'), text: note.trim(), at: new Date().toISOString() }] }))
    setNote('')
  }

  return (
    <main className={`paper print theme-${m.theme}`} style={memoryStyle(m)}>
      <header className="print-bar">
        <Back href="#/memories">Memories</Back>
        <nav className="print-actions" aria-label="This memory">
          <a className="link" href={`#/develop/${m.id}`}>
            {developed ? 'Develop again' : 'Continue developing'}
          </a>
          <a className="link" href={`#/edit/${m.id}`}>
            Edit
          </a>
          <ConfirmButton
            className="danger"
            confirm="Delete this day, its photos and its letters?"
            onConfirm={async () => {
              await deleteMemory(m.id)
              go("/memories")
            }}
          >
            Delete
          </ConfirmButton>
        </nav>
      </header>

      <section className="print-hero">
        <div className="print-photo-wrap">
          <Photo memory={m} index={hero} p={developed ? 1 : 0.35} className="print-photo" fade={fadeOf(m)} />
          {fadeOf(m) > 0.05 && <Refix m={m} />}
          {!developed && (
            <a className="print-undeveloped" href={`#/develop/${m.id}`}>
              Still a negative — develop it
            </a>
          )}
          {m.photoIds.length > 1 && (
            <div className="contact" role="tablist" aria-label="Photographs">
              {Array.from({ length: photos }, (_, i) => (
                <button key={i} role="tab" aria-selected={hero === i} className={`contact-frame ${hero === i ? 'is-on' : ''}`} onClick={() => setHero(i)}>
                  <Photo memory={m} index={i} p={1} alt={`Photograph ${i + 1}`} />
                  <span>{String(i + 1).padStart(2, '0')}A</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="print-head">
          {m.demo && <p className="demo-tag">Fictional demo memory</p>}
          <p className="print-dateline">
            {weekday(m.date)}, {longDate(m.date)}
            {m.time && <> · {m.time}</>}
          </p>
          <h1 className="print-title">{m.title}</h1>
          <dl className="print-meta">
            {m.location && (
              <>
                <dt>Place</dt>
                <dd>{m.location}</dd>
              </>
            )}
            {m.people.length > 0 && (
              <>
                <dt>With</dt>
                <dd>{m.people.join(', ')}</dd>
              </>
            )}
            {m.weather && (
              <>
                <dt>Weather</dt>
                <dd>{m.weather}</dd>
              </>
            )}
            {m.mood && (
              <>
                <dt>Mood</dt>
                <dd>{m.mood}</dd>
              </>
            )}
          </dl>
          {m.song && (
            <div className="record">
              <span className="record-disc" aria-hidden="true" />
              <div className="record-text">
                <span className="record-k">On the record</span>
                <span className="record-title">{m.song.title}</span>
                <span className="record-artist">{m.song.artist}</span>
                <div className="row">
                  <SoundToggle m={m} />
                  {m.song.url && (
                    <a className="link" href={m.song.url} target="_blank" rel="noreferrer noopener">
                      Open the song ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="print-body">
        <article className="story">
          <PastLabel date={m.date}>Written on the day</PastLabel>
          {paras.map((p, i) => (
            <p key={i} className={i === 0 ? 'story-first' : ''}>
              {p}
            </p>
          ))}
        </article>

        <aside className="margin">
          <h2 className="margin-h">What I remember now</h2>
          {m.margin.length === 0 && <AppVoice>Is there something the story left out? Write it in the margin — it’ll be dated today.</AppVoice>}
          <ul className="margin-notes">
            {m.margin.map((n) => (
              <li key={n.id} className="present">
                <p>{n.text}</p>
                <span className="present-date">— you, {longDate(n.at)}</span>
              </li>
            ))}
          </ul>
          <form
            className="margin-form"
            onSubmit={(e) => {
              e.preventDefault()
              addNote()
            }}
          >
            <label className="sr-only" htmlFor="margin">
              A note in the margin
            </label>
            <textarea id="margin" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="In the margin…" />
            <button type="submit" className="btn btn-ink btn-sm" disabled={!note.trim()}>
              Add note
            </button>
          </form>
        </aside>
      </section>

      {(m.details.length > 0 || m.moments.length > 0) && (
        <section className="print-grid">
          {m.moments.length > 0 && (
            <div>
              <h2 className="print-h">The day, in order</h2>
              <ol className="timeline">
                {m.moments.map((mo, i) => (
                  <li key={mo.id}>
                    <span className="timeline-t">{mo.time ?? String(i + 1).padStart(2, '0')}</span>
                    <span>{mo.text}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {m.details.length > 0 && (
            <div>
              <h2 className="print-h">Small things you kept</h2>
              <ul className="details">
                {m.details.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {m.threads.length > 0 && (
        <section className="print-section">
          <h2 className="print-h">The ledger</h2>
          <ul className="ledger-print">
            {m.threads.map((t) => {
              const e = m.ledger[t.id]
              return (
                <li key={t.id}>
                  <blockquote className="quote">“{t.quote}”</blockquote>
                  <div className="ledger-print-foot">
                    {e ? (
                      <StampMark stamp={e.stamp} kind={t.kind} />
                    ) : (
                      <>
                        <span className="unstamped">How did it turn out?</span>
                        <StampSet
                          thread={t}
                          compact
                          onStamp={(st) => updateMemory(m.id, (x) => ({ ...x, ledger: { ...x.ledger, [t.id]: { stamp: st, at: new Date().toISOString() } } }))}
                        />
                      </>
                    )}
                    {e?.note && (
                      <span className="present">
                        {e.note} <span className="present-date">— {longDate(e.at)}</span>
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section className="print-section correspondence-print">
        <div className="print-h-row">
          <h2 className="print-h">Correspondence</h2>
          {!writing && (
            <button type="button" className="btn btn-ink btn-sm" onClick={() => setWriting(true)}>
              Write to this day
            </button>
          )}
        </div>
        {letters.length === 0 && !writing && <AppVoice>No letters yet. This day is waiting for one.</AppVoice>}
        <div className="dark-slab">
          {letters.map((l) => {
            const s = letterStatus(l)
            if (s === 'sealed') return <SealedLetter key={l.id} l={l} />
            if (s === 'open') return <ReadLetter key={l.id} l={l} />
            return readingId === l.id ? (
              <LetterReader key={l.id} letter={l} intro={false} onRead={() => markOpened(l)} />
            ) : (
              <div key={l.id} className="unopened">
                <span className="wax" aria-hidden="true">
                  A
                </span>
                <span>A letter from {longDate(l.writtenAt)}, not yet read.</span>
                <button type="button" className="btn btn-light btn-sm" onClick={() => setReadingId(l.id)}>
                  Open it
                </button>
              </div>
            )
          })}
          {writing && (
            <ReplyComposer
              memory={m}
              parent={last}
              seedText={m.id + 'print' + letters.length}
              title={last ? 'Answer them' : 'Write to this day'}
              onSent={() => setWriting(false)}
              onSkip={() => setWriting(false)}
            />
          )}
        </div>
      </section>
      <SaveCopy m={m} />
    </main>
  )
}

/** Downloads the original words of this day as a plain text file — a copy that outlives the app. */
function SaveCopy({ m }: { m: Memory }) {
  const { letters } = useStore()
  const download = () => {
    const ls = letters.filter((l) => l.memoryId === m.id && letterStatus(l) !== 'sealed')
    const text = [
      m.title,
      longDate(m.date) + (m.location ? ' — ' + m.location : ''),
      '',
      m.story,
      '',
      ...(m.song ? [`Song: ${m.song.title} — ${m.song.artist}${m.song.url ? ' (' + m.song.url + ')' : ''}`, ''] : []),
      ...ls.flatMap((l) => [`— Letter, written ${longDate(l.writtenAt)} —`, l.body, '']),
      ...m.margin.flatMap((n) => [`Margin note, ${longDate(n.at)}: ${n.text}`]),
    ].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' }))
    a.download = `${m.date} ${m.title.replace(/[^\p{L}\p{N} ]/gu, '')}.txt`
    a.click()
    window.setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }
  return (
    <footer className="print-foot">
      <button type="button" className="link" onClick={download}>
        Save the words of this day as a text file
      </button>
    </footer>
  )
}


/** Prints left alone fade. Holding the button re-fixes one — a small, deliberate act of looking again. */
function Refix({ m }: { m: Memory }) {
  const [holding, setHolding] = useState(false)
  const timer = useRef<number | undefined>(undefined)
  const start = () => {
    setHolding(true)
    timer.current = window.setTimeout(() => {
      setHolding(false)
      touchMemory(m.id)
    }, 1600)
  }
  const stop = () => {
    setHolding(false)
    window.clearTimeout(timer.current)
  }
  return (
    <div className="refix">
      <p>
        This print is fading. You last looked at it {ago((m.visitedAt ?? m.progress.developedAt!).slice(0, 10))}.
      </p>
      <button
        type="button"
        className={`refix-btn ${holding ? 'is-holding' : ''}`}
        onPointerDown={start}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && !e.repeat && (e.preventDefault(), start())}
        onKeyUp={stop}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="refix-fill" aria-hidden="true" />
        <span className="refix-label">Hold to fix it again</span>
      </button>
    </div>
  )
}
