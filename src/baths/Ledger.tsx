import { roman } from '../lib/time'
import { useEffect, useState } from 'react'
import type { BathProps } from '../views/Darkroom'
import { updateMemory } from '../lib/store'
import type { Stamp } from '../lib/types'
import { AppVoice, PastLabel, StampMark, StampSet, InfoTip } from '../components/common'
import { ago } from '../lib/time'
import { sound } from '../lib/sound'

export default function Ledger({ m, tray, onPartial, onDone }: BathProps) {
  const [notes, setNotes] = useState<Record<string, string>>(() => Object.fromEntries(m.threads.map((t) => [t.id, m.ledger[t.id]?.note ?? ''])))
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const settled = m.threads.filter((t) => m.ledger[t.id] || skipped.has(t.id)).length

  useEffect(() => onPartial(settled / m.threads.length), [settled, m.threads.length, onPartial])

  const stamp = (tid: string, s: Stamp) => {
    sound.chime(s !== 'let-go')
    updateMemory(m.id, (x) => ({ ...x, ledger: { ...x.ledger, [tid]: { stamp: s, note: notes[tid] || undefined, at: new Date().toISOString() } } }))
  }
  const saveNote = (tid: string) => {
    if (!m.ledger[tid]) return
    updateMemory(m.id, (x) => ({ ...x, ledger: { ...x.ledger, [tid]: { ...x.ledger[tid], note: notes[tid] || undefined } } }))
  }

  return (
    <div className="bath bath-ledger">
      <div className="bath-visual">{tray(undefined, 'sm')}</div>
      <section className="bath-panel bath-panel-wide">
        <p className="bath-kicker">Bath {roman(m.baths.indexOf('ledger') + 1)} · Ledger</p>
        <h2 className="bath-title">
          You made some promises {ago(m.date)}.{' '}
          <InfoTip dark>Here they are, exactly as you wrote them. Stamp each one with how it turned out. Add a line if you want — that part is written by you, now.</InfoTip>
        </h2>

        <ul className="ledger">
          {m.threads.map((t) => {
            const e = m.ledger[t.id]
            return (
              <li key={t.id} className={`ledger-item ${e ? 'is-stamped' : ''} ${skipped.has(t.id) ? 'is-skipped' : ''}`}>
                <div className="ledger-card">
                  <blockquote className="quote">“{t.quote}”</blockquote>
                  <PastLabel date={m.date} />
                  {e && <StampMark stamp={e.stamp} kind={t.kind} />}
                </div>
                <StampSet thread={t} value={e?.stamp} onStamp={(s) => stamp(t.id, s)} />
                {e && (
                  <label className="ledger-note">
                    <span className="sr-only">What actually happened</span>
                    <input
                      value={notes[t.id]}
                      placeholder={t.kind === 'question' ? 'The answer, as you know it now…' : 'What actually happened…'}
                      onChange={(ev) => setNotes({ ...notes, [t.id]: ev.target.value })}
                      onBlur={() => saveNote(t.id)}
                    />
                  </label>
                )}
                {!e && !skipped.has(t.id) && (
                  <button type="button" className="link link-dark" onClick={() => setSkipped(new Set([...skipped, t.id]))}>
                    Not ready to say
                  </button>
                )}
              </li>
            )
          })}
        </ul>
        {settled === m.threads.length && (
          <div className="row">
            <AppVoice className="dark">
              {Object.values(m.ledger).filter((x) => x.stamp === 'changed').length > 0
                ? 'Some things didn’t happen — they turned into something else. That’s usually how it goes.'
                : 'The ledger is closed for now. You can reopen it from the print any time.'}
            </AppVoice>
            <button type="button" className="btn btn-light" onClick={onDone}>
              Into the next bath
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
