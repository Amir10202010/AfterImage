import { roman } from '../lib/time'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { BathProps } from '../views/Darkroom'
import { norm, score, sentences, splitAround, type Mark } from '../lib/extract'
import { sound } from '../lib/sound'
import { AppVoice, PastLabel, InfoTip } from '../components/common'

export default function Recall({ m, tray, onPartial, onDone }: BathProps) {
  const items = useMemo(() => m.recall.filter((r) => splitAround(r.sentence, r.word)), [m.recall])
  const [i, setI] = useState(0)
  const [solvedCount, setSolvedCount] = useState(0)

  useEffect(() => onPartial(solvedCount / Math.max(1, items.length)), [solvedCount, items.length, onPartial])

  if (!items.length)
    return (
      <div className="bath">
        <section className="bath-panel">
          <p>Nothing to recall here.</p>
          <button type="button" className="btn btn-light" onClick={onDone}>
            Continue
          </button>
        </section>
      </div>
    )

  const item = items[i]
  return (
    <div className="bath bath-recall">
      <div className="bath-visual">{tray(undefined, 'sm')}</div>
      <section className="bath-panel bath-panel-wide">
        <p className="bath-kicker">
          Bath {roman(m.baths.indexOf('recall') + 1)} · Recall · {i + 1} of {items.length}
        </p>
        <h2 className="bath-title">
          One word went missing.{' '}
          <InfoTip dark>
          This is a sentence you wrote. Type the word that belongs in the gap. Letters answer back: <span className="key key-hit">ink</span> is
          right, <span className="key key-near">ring</span> is in the word somewhere else, <span className="key key-miss">faint</span> isn’t
          there.
          </InfoTip>
        </h2>
        <Puzzle
          key={item.id}
          m={m}
          sentence={item.sentence}
          word={item.word}
          onSolved={() => setSolvedCount((c) => c + 1)}
          onNext={() => (i + 1 < items.length ? setI(i + 1) : onDone())}
          last={i + 1 >= items.length}
        />
      </section>
    </div>
  )
}

function Puzzle({ m, sentence, word, onSolved, onNext, last }: { m: BathProps['m']; sentence: string; word: string; onSolved: () => void; onNext: () => void; last: boolean }) {
  const [before, , after] = splitAround(sentence, word)!
  const n = [...word].length
  const [guess, setGuess] = useState('')
  const [rows, setRows] = useState<{ g: string; marks: Mark[] }[]>([])
  const [state, setState] = useState<'open' | 'solved' | 'given'>('open')
  const [hintFirst, setHintFirst] = useState(false)
  const [hintContext, setHintContext] = useState(false)
  const [shake, setShake] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const context = useMemo(() => {
    const ss = sentences(m.story)
    const k = ss.findIndex((s) => s.includes(sentence.slice(0, 30)))
    return k > 0 ? ss[k - 1] : k === 0 && ss[1] ? ss[1] : undefined
  }, [m.story, sentence])

  useEffect(() => {
    input.current?.focus({ preventScroll: true })
  }, [])

  const submit = () => {
    if (state !== 'open') return
    if ([...guess].length !== n) {
      setShake(true)
      window.setTimeout(() => setShake(false), 400)
      return
    }
    const marks = score(guess, word)
    setRows((r) => [...r, { g: guess, marks }])
    setGuess('')
    if (norm(guess) === norm(word)) {
      setState('solved')
      sound.chime(true)
      onSolved()
    } else sound.chime(false)
  }

  const giveUp = () => {
    setState('given')
    onSolved()
  }

  const done = state !== 'open'
  const tries = rows.length
  const letters = [...guess.toUpperCase()]

  return (
    <div className={`puzzle ${done ? 'is-done' : ''}`}>
      <blockquote className="recall-sentence">
        {before}
        <span
          className={`gap ${shake ? 'is-shake' : ''} ${done ? 'is-filled' : ''}`}
          onClick={() => input.current?.focus()}
        >
          {!done && <span className="sr-only">{`a missing ${n} letter word`}</span>}
          {done
            ? word
            : Array.from({ length: n }, (_, k) => (
                <span key={k} className={`tile ${k === letters.length ? 'is-caret' : ''}`}>
                  {letters[k] ?? (k === 0 && hintFirst ? <span className="tile-hint">{[...word][0].toUpperCase()}</span> : '')}
                </span>
              ))}
        </span>
        {after}
      </blockquote>
      <PastLabel date={m.date} />

      {!done && (
        <form
          className="recall-form"
          onSubmit={(e) => {
            e.preventDefault()
            submit()
          }}
        >
          <label className="sr-only" htmlFor="recall-input">
            Your guess, {n} letters
          </label>
          <input
            id="recall-input"
            ref={input}
            className="recall-input"
            value={guess}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            maxLength={n}
            onChange={(e) => setGuess(e.target.value.replace(/[^\p{L}]/gu, '').slice(0, n))}
            placeholder={`${n} letters`}
          />
          <button type="submit" className="btn btn-light">
            Try
          </button>
        </form>
      )}

      {rows.length > 0 && (
        <ol className="guesses" aria-label="Your guesses">
          {rows.map((r, k) => (
            <li key={k} className="guess-row" aria-label={`${r.g}: ${r.marks.join(', ')}`}>
              {[...r.g.toUpperCase()].map((ch, j) => (
                <span key={j} className={`tile tile-${r.marks[j]}`} style={{ animationDelay: `${j * 60}ms` }}>
                  {ch}
                </span>
              ))}
            </li>
          ))}
        </ol>
      )}

      {!done && tries >= 2 && (
        <div className="recall-hints">
          {!hintFirst && (
            <button type="button" className="link link-dark" onClick={() => setHintFirst(true)}>
              Show the first letter
            </button>
          )}
          {context && !hintContext && (
            <button type="button" className="link link-dark" onClick={() => setHintContext(true)}>
              Read the sentence next to it
            </button>
          )}
          {tries >= 4 && (
            <button type="button" className="link link-dark" onClick={giveUp}>
              Let it come back to me
            </button>
          )}
        </div>
      )}
      {hintContext && context && !done && <p className="recall-context">“{context}”</p>}

      {done && (
        <div className="row recall-after">
          <AppVoice className="dark">
            {state === 'given'
              ? 'Some words only come back when you read them. That counts too.'
              : tries === 1
                ? 'Straight away. That word was still yours.'
                : `Found it after ${tries} tries.`}
          </AppVoice>
          <button type="button" className="btn btn-light" onClick={onNext} autoFocus>
            {last ? 'Into the next bath' : 'Next sentence'}
          </button>
        </div>
      )}
    </div>
  )
}
