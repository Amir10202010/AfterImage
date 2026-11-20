import { useEffect, useMemo, useState } from 'react'
import { letterStatus, saveLetter, threadFor, uid, useStore } from '../lib/store'
import type { Letter, Memory } from '../lib/types'
import { ago, longDate, monthYear, until } from '../lib/time'
import { promptsFor } from '../lib/prompts'
import { AppVoice, SealPicker, sealToDate, type SealChoice, InfoTip } from './common'
import { sound } from '../lib/sound'

function paragraphs(body: string) {
  return body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
}

/** A letter written by some version of the user, revealed paragraph by paragraph. */
export function LetterReader({ letter, onRead, intro = true }: { letter: Letter; onRead: () => void; intro?: boolean }) {
  const ps = paragraphs(letter.body)
  const [shown, setShown] = useState(0)
  const done = shown >= ps.length
  useEffect(() => {
    if (done) onRead()
  }, [done, onRead])
  const next = () => {
    if (!done) {
      setShown((s) => s + 1)
      sound.chime(true)
    }
  }
  return (
    <div className="reader" onClick={next} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), next())}>
      {intro && (
        <div className="reader-intro">
          <AppVoice className="dark">Hey. It’s me — you, from {monthYear(letter.writtenAt)}.</AppVoice>
          <AppVoice className="dark">
            I wrote you something {ago(letter.writtenAt)}. {letter.sealedUntil ? 'I sealed it so you couldn’t peek.' : 'I left it inside this day.'}
          </AppVoice>
        </div>
      )}
      <article className="letter letter-dark" aria-live="polite">
        <header className="letter-head">
          <span>✎ Written by you</span>
          <span>{longDate(letter.writtenAt)}</span>
        </header>
        {ps.slice(0, shown).map((p, i) => (
          <p key={i} className="letter-p">
            {p}
          </p>
        ))}
        {!done && (
          <button type="button" className="reader-next" onClick={(e) => (e.stopPropagation(), next())} autoFocus>
            {shown === 0 ? 'Unfold the letter' : 'Keep reading'}
            <span className="reader-count">
              {shown}/{ps.length}
            </span>
          </button>
        )}
      </article>
    </div>
  )
}

function ReadLetter({ l, open: initial = false }: { l: Letter; open?: boolean }) {
  const [open, setOpen] = useState(initial)
  return (
    <article className={`letter letter-dark letter-past ${open ? 'is-open' : ''}`}>
      <button type="button" className="letter-head letter-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span>
          ✎ {l.to === 'past' ? 'You, writing back to this day' : 'You'} · {longDate(l.writtenAt)}
        </span>
        <span>{open ? 'fold ↑' : `${l.openedAt ? `read ${longDate(l.openedAt)} · ` : ''}unfold ↓`}</span>
      </button>
      {open && paragraphs(l.body).map((p, i) => <p key={i} className="letter-p">{p}</p>)}
    </article>
  )
}

export function SealedLetter({ l }: { l: Letter }) {
  return (
    <div className="sealed">
      <span className="wax" aria-hidden="true">
        A
      </span>
      <div>
        <p className="sealed-title">A sealed letter, written {longDate(l.writtenAt)}.</p>
        <p className="sealed-meta">It opens {until(l.sealedUntil!)} — on {longDate(l.sealedUntil!)}. Whoever sealed it asked you to wait.</p>
      </div>
    </div>
  )
}

/** Composer for answering a past self, or writing forward. */
export function ReplyComposer({
  memory,
  parent,
  seedText,
  onSent,
  onSkip,
  title = 'Write back',
}: {
  memory?: Memory
  parent?: Letter
  seedText: string
  onSent: (l: Letter) => void
  onSkip?: () => void
  title?: string
}) {
  const [body, setBody] = useState('')
  const [dir, setDir] = useState<'future' | 'past'>('future')
  const [seal, setSeal] = useState<SealChoice>('year')
  const [date, setDate] = useState('')
  const [prompt, setPrompt] = useState<string | null>(null)
  const prompts = useMemo(() => promptsFor(seedText, 3), [seedText])
  const can = body.trim().length > 0 && (dir === 'past' || seal !== 'date' || !!date)

  const send = async () => {
    if (!can) return
    const l: Letter = {
      id: uid('l_'),
      memoryId: memory?.id,
      parentId: parent?.id,
      to: dir,
      body: body.trim(),
      writtenAt: new Date().toISOString(),
      sealedUntil: dir === 'future' ? sealToDate(seal, date) : undefined,
      openedAt: dir === 'past' ? new Date().toISOString() : undefined,
    }
    await saveLetter(l)
    sound.chime(true)
    onSent(l)
  }

  return (
    <section className="composer">
      <h3 className="composer-title">
        {title}{' '}
        <InfoTip dark>
          {dir === 'past'
            ? 'This stays pinned to the day, in your words, dated today. You’ll find it when you open the print.'
            : 'Once sealed, it can’t be read early — not even by you. It will be waiting on the front page when it arrives.'}
        </InfoTip>
      </h3>
      <div className="composer-dir" role="radiogroup" aria-label="Who is this for?">
        <button type="button" role="radio" aria-checked={dir === 'future'} className={`chip ${dir === 'future' ? 'is-on' : ''}`} onClick={() => setDir('future')}>
          Seal it for a future you
        </button>
        {memory && (
          <button type="button" role="radio" aria-checked={dir === 'past'} className={`chip ${dir === 'past' ? 'is-on' : ''}`} onClick={() => setDir('past')}>
            Leave it here, for them
          </button>
        )}
      </div>
      <div className="composer-prompts">
        {prompts.map((p) => (
          <button key={p} type="button" className={`prompt ${prompt === p ? 'is-on' : ''}`} onClick={() => setPrompt(prompt === p ? null : p)}>
            <span className="app-mark" aria-hidden="true">
              ◇
            </span>{' '}
            {p}
          </button>
        ))}
      </div>
      {prompt && <AppVoice className="dark composer-prompt-shown">{prompt}</AppVoice>}
      <label className="sr-only" htmlFor="reply">
        Your letter
      </label>
      <textarea
        id="reply"
        className="composer-text"
        rows={7}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={dir === 'past' ? 'Dear me, back then…' : parent ? 'Hey. I read your letter…' : 'Dear future me…'}
      />

      {dir === 'future' && <SealPicker value={seal} date={date} onChange={(c, d) => (setSeal(c), setDate(d))} dark />}
      <div className="row">
        <button type="button" className="btn btn-light" disabled={!can} onClick={send}>
          {dir === 'future' ? 'Seal it' : 'Pin it to this day'}
        </button>
        {onSkip && (
          <button type="button" className="link link-dark" onClick={onSkip}>
            Not today
          </button>
        )}
      </div>
    </section>
  )
}

/** Marks a letter opened. */
export async function markOpened(l: Letter) {
  if (l.openedAt) return
  await saveLetter({ ...l, openedAt: new Date().toISOString() })
}

export function useThread(memoryId?: string) {
  const { letters } = useStore()
  return memoryId ? threadFor(memoryId, letters) : []
}

export { ReadLetter }

export function statusOf(l: Letter) {
  return letterStatus(l)
}
