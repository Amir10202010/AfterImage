import { useState } from 'react'
import { deleteLetter, letterStatus, saveLetter, useStore } from '../lib/store'
import type { Letter, Memory } from '../lib/types'
import { longDate, until } from '../lib/time'
import { AppVoice, Back, ConfirmButton } from '../components/common'
import { ReadLetter, ReplyComposer, SealedLetter } from '../components/Conversation'
import { OptionalImg } from '../components/Scrap'
import { hrefFor, useNow } from './Home'

const EDIT_WINDOW = 24 * 3600000

export default function Letters({ write }: { write?: string }) {
  const { letters, memories } = useStore()
  const now = useNow()
  const [mode, setMode] = useState<'none' | 'future' | 'past'>(write === 'future' || write === 'past' ? write : 'none')
  const [pastId, setPastId] = useState('')
  const [flash, setFlash] = useState('')

  const groups = new Map<string, Letter[]>()
  for (const l of [...letters].sort((a, b) => a.writtenAt.localeCompare(b.writtenAt))) {
    const k = l.memoryId ?? 'loose'
    groups.set(k, [...(groups.get(k) ?? []), l])
  }
  const counts = {
    sealed: letters.filter((l) => letterStatus(l, now) === 'sealed').length,
    arrived: letters.filter((l) => letterStatus(l, now) === 'arrived').length,
  }
  const pastMemory = memories.find((m) => m.id === pastId)

  return (
    <main className="paper letters-page">
      <header className="print-bar">
        <Back href="#/today">Today</Back>
      </header>
      <header className="letters-head">
        <p className="kicker">Correspondence</p>
        <h1 className="print-title">Letters between the people you’ve been.</h1>
        <p className="section-meta">
          {letters.length} letters · {counts.sealed} in the post · {counts.arrived} arrived, unopened
        </p>
      </header>

      <section className="write-actions">
        <button type="button" className={`btn ${mode === 'future' ? 'btn-ink' : 'btn-ghost-ink'}`} onClick={() => setMode(mode === 'future' ? 'none' : 'future')}>
          Write to a future you
        </button>
        <button type="button" className={`btn ${mode === 'past' ? 'btn-ink' : 'btn-ghost-ink'}`} onClick={() => setMode(mode === 'past' ? 'none' : 'past')}>
          Write to a past you
        </button>
      </section>
      {flash && <AppVoice className="flash">{flash}</AppVoice>}

      {mode !== 'none' && (
        <section className="dark-slab write-slab">
          {mode === 'past' && (
            <label className="field field-dark">
              <span>Which day are you writing back to?</span>
              <select value={pastId} onChange={(e) => setPastId(e.target.value)}>
                <option value="">choose a day…</option>
                {memories.map((m) => (
                  <option key={m.id} value={m.id}>
                    {longDate(m.date)} — {m.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          {(mode === 'future' || pastMemory) && (
            <ReplyComposer
              key={mode + pastId}
              memory={mode === 'past' ? pastMemory : undefined}
              seedText={'letters' + mode + pastId}
              title={mode === 'future' ? 'Dear future me' : `To you, on ${longDate(pastMemory!.date)}`}
              onSent={(l) => {
                setMode('none')
                setFlash(l.sealedUntil ? `Sealed. It opens ${until(l.sealedUntil)}.` : 'Pinned to that day. It’ll be waiting in its print.')
              }}
              onSkip={() => setMode('none')}
            />
          )}
        </section>
      )}

      {letters.length === 0 && (
        <div className="empty-block">
          <OptionalImg src="/demo/ui/empty-letters.jpg" className="ui-art" />
          <AppVoice>No letters yet. The first one is always the strangest to write.</AppVoice>
        </div>
      )}

      {[...groups.entries()].map(([k, ls]) => {
        const m = memories.find((x) => x.id === k)
        return <Group key={k} memory={m} letters={ls} now={now} />
      })}
    </main>
  )
}

function Group({ memory, letters, now }: { memory?: Memory; letters: Letter[]; now: number }) {
  return (
    <section className="letter-group">
      <header className="letter-group-head">
        {memory ? (
          <>
            <span className="toc-date">{longDate(memory.date)}</span>
            <a href={hrefFor(memory)} className="letter-group-title">
              {memory.title}
            </a>
          </>
        ) : (
          <span className="letter-group-title">Letters not tied to a day</span>
        )}
      </header>
      <div className="dark-slab">
        {letters.map((l) => (
          <LetterRow key={l.id} l={l} now={now} memory={memory} />
        ))}
      </div>
    </section>
  )
}

function LetterRow({ l, now, memory }: { l: Letter; now: number; memory?: Memory }) {
  const s = letterStatus(l, now)
  const editable = now - new Date(l.writtenAt).getTime() < EDIT_WINDOW
  const [editing, setEditing] = useState(false)
  const [body, setBody] = useState(l.body)

  if (editing)
    return (
      <div className="letter-edit">
        <textarea className="composer-text" rows={6} value={body} onChange={(e) => setBody(e.target.value)} aria-label="Edit letter" />
        <div className="row">
          <button
            type="button"
            className="btn btn-light btn-sm"
            disabled={!body.trim()}
            onClick={async () => {
              await saveLetter({ ...l, body: body.trim() })
              setEditing(false)
            }}
          >
            Save
          </button>
          <button type="button" className="link link-dark" onClick={() => setEditing(false)}>
            Cancel
          </button>
          <ConfirmButton className="link-dark danger" confirm="Delete this letter?" onConfirm={() => deleteLetter(l.id)}>
            Delete
          </ConfirmButton>
        </div>
      </div>
    )

  return (
    <div className="letter-row">
      {s === 'sealed' && <SealedLetter l={l} />}
      {s === 'open' && <ReadLetter l={l} />}
      {s === 'arrived' && (
        <div className="unopened">
          <span className="wax" aria-hidden="true">
            A
          </span>
          <span>Arrived — written {longDate(l.writtenAt)}.</span>
          <a className="btn btn-light btn-sm" href={`#/arrival/${l.id}`}>
            Open it
          </a>
        </div>
      )}
      {s === 'unread' && (
        <div className="unopened">
          <span className="wax" aria-hidden="true">
            A
          </span>
          <span>Left inside the day, {longDate(l.writtenAt)}. It opens when you develop it.</span>
          {memory && (
            <a className="btn btn-light btn-sm" href={hrefFor(memory)}>
              {memory.progress.developedAt ? 'Read it on the print' : 'Develop the day'}
            </a>
          )}
        </div>
      )}
      {editable && (
        <button type="button" className="link link-dark letter-edit-btn" onClick={() => setEditing(true)}>
          You can still change this until {new Date(new Date(l.writtenAt).getTime() + EDIT_WINDOW).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} tomorrow
        </button>
      )}
    </div>
  )
}
