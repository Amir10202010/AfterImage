import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { updateMemory, useBlobUrl, useStore } from '../lib/store'
import type { BathId, Memory } from '../lib/types'
import { longDate, roman } from '../lib/time'
import { accentFor } from '../lib/prompts'
import { BPM, setSoundPreferred, sound, soundPreferred } from '../lib/sound'
import Photo from '../components/Photo'
import { Back } from '../components/common'
import Surface from '../baths/Surface'
import Sequence from '../baths/Sequence'
import Recall from '../baths/Recall'
import Ledger from '../baths/Ledger'
import Meeting from '../baths/Meeting'

export const BATH_NAMES: Record<BathId, string> = {
  surface: 'Surface',
  sequence: 'Sequence',
  recall: 'Recall',
  ledger: 'Ledger',
  meeting: 'Meeting',
}

export interface BathProps {
  m: Memory
  tray: (overlay?: ReactNode, size?: 'lg' | 'sm') => ReactNode
  onPartial: (f: number) => void
  onDone: () => void
}

export function memoryStyle(m: Memory): CSSProperties {
  const bpm = m.song?.bpm ?? BPM[m.song?.tempo ?? 'slow']
  return { '--accent': accentFor(m), '--beat': `${60 / bpm}s`, '--rock': `${(60 / bpm) * 8}s` } as CSSProperties
}

export default function Darkroom({ id }: { id: string }) {
  const { memories } = useStore()
  const m = memories.find((x) => x.id === id)
  if (!m)
    return (
      <main className="darkroom theme-paper">
        <div className="dr-missing">
          <p>This negative isn’t on the line any more.</p>
          <Back href="#/memories" dark>
            Back to Memories
          </Back>
        </div>
      </main>
    )
  return <Room m={m} />
}

function Room({ m }: { m: Memory }) {
  const firstOpen = m.baths.findIndex((b) => !m.progress.done[b])
  const [idx, setIdx] = useState(firstOpen === -1 ? m.baths.length : firstOpen)
  const [partial, setPartial] = useState(0)
  const [fixing, setFixing] = useState(false)
  const total = m.baths.length
  const current = m.baths[idx]
  const finished = idx >= total
  const p = finished ? 1 : (idx + partial) / (total + 0.6)

  const onPartial = useCallback((f: number) => setPartial(Math.max(0, Math.min(1, f))), [])

  const onDone = useCallback(async () => {
    const bath = m.baths[idx]
    await updateMemory(m.id, (x) => ({ ...x, progress: { ...x.progress, done: { ...x.progress.done, [bath]: true } } }))
    sound.chime(true)
    setPartial(0)
    if (idx + 1 >= total) {
      setFixing(true)
      await updateMemory(m.id, (x) => ({ ...x, progress: { ...x.progress, developedAt: x.progress.developedAt ?? new Date().toISOString() }, visitedAt: new Date().toISOString() }))
    }
    setIdx(idx + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [idx, m.baths, m.id, total])

  const tray = useCallback(
    (overlay?: ReactNode, size: 'lg' | 'sm' = 'lg') => (
      <div className={`tray tray-${size}`}>
        <div className="tray-liquid">
          <Photo memory={m} p={p} className="tray-photo" />
          {overlay}
        </div>
      </div>
    ),
    [m, p],
  )

  // When everything is already developed, this room shows the "fixed" moment.
  useEffect(() => {
    if (finished && !fixing) setFixing(true)
  }, [finished, fixing])

  return (
    <main className={`darkroom theme-${m.theme}`} style={memoryStyle(m)}>
      <header className="dr-head">
        <Back href="#/memories" dark>
          Memories
        </Back>
        <div className="dr-title">
          <span className="dr-date">{longDate(m.date)}</span>
          <span className="dr-name">{m.title}</span>
        </div>
        <SoundToggle m={m} />
      </header>

      <ol className="dr-baths" aria-label="Development baths">
        {m.baths.map((b, i) => (
          <li key={b} className={i === idx ? 'is-now' : i < idx ? 'is-done' : ''} aria-current={i === idx ? 'step' : undefined}>
            <span className="dr-bath-n">{roman(i + 1)}</span>
            <span className="dr-bath-name">{BATH_NAMES[b]}</span>
          </li>
        ))}
      </ol>

      <div className="dr-stage" key={current ?? 'fixed'}>
        {current === 'surface' && <Surface m={m} tray={tray} onPartial={onPartial} onDone={onDone} />}
        {current === 'sequence' && <Sequence m={m} tray={tray} onPartial={onPartial} onDone={onDone} />}
        {current === 'recall' && <Recall m={m} tray={tray} onPartial={onPartial} onDone={onDone} />}
        {current === 'ledger' && <Ledger m={m} tray={tray} onPartial={onPartial} onDone={onDone} />}
        {current === 'meeting' && <Meeting m={m} tray={tray} onPartial={onPartial} onDone={onDone} />}
        {finished && <Fixed m={m} />}
      </div>
    </main>
  )
}

function Fixed({ m }: { m: Memory }) {
  const reset = () =>
    updateMemory(m.id, (x) => ({ ...x, progress: { done: {}, developedAt: x.progress.developedAt } })).then(() => window.location.reload())
  return (
    <section className="fixed">
      <div className="fixed-print">
        <Photo memory={m} p={1} className="fixed-photo" />
      </div>
      <div className="fixed-text">
        <p className="kicker">Fixed</p>
        <h2>The print is dry.</h2>
        <p>
          You brought “{m.title}” back out of the dark. It hangs on the line as a print now — with everything you found, and
          everything you said to each other.
        </p>
        <div className="row">
          <a className="btn btn-light" href={`#/print/${m.id}`}>
            See the print
          </a>
          <button type="button" className="link link-dark" onClick={reset}>
            Develop it again
          </button>
        </div>
      </div>
    </section>
  )
}

export function SoundToggle({ m }: { m: Memory }) {
  const [on, setOn] = useState(false)
  const audioUrl = useBlobUrl(m.song?.audioId)
  const audio = useRef<HTMLAudioElement>(null)
  const wanted = useRef(soundPreferred())

  const start = useCallback(() => {
    if (audioUrl && audio.current) {
      audio.current.volume = 0.6
      audio.current.play().catch(() => setOn(false))
    } else sound.start({ tempo: m.song?.tempo ?? 'slow', bpm: m.song?.bpm, seed: m.song ? m.song.title + m.song.artist : m.id })
    setOn(true)
  }, [audioUrl, m.id, m.song])

  const stop = useCallback(() => {
    audio.current?.pause()
    sound.stop()
    setOn(false)
  }, [])

  // Browsers need a gesture before sound: begin on the first touch in the darkroom if wanted.
  useEffect(() => {
    if (!wanted.current) return
    const off = () => {
      window.removeEventListener('pointerdown', first)
      window.removeEventListener('keydown', first)
    }
    const first = (e: Event) => {
      off()
      if ((e.target as Element | null)?.closest?.('.sound-btn')) return
      if (wanted.current) start()
    }
    window.addEventListener('pointerdown', first)
    window.addEventListener('keydown', first)
    return off
  }, [start])

  useEffect(() => () => stop(), [stop])

  const label = m.song ? `${m.song.title} — ${m.song.artist}` : 'darkroom'
  return (
    <div className="sound">
      {audioUrl && <audio ref={audio} src={audioUrl} loop preload="auto" />}
      <button
        type="button"
        className={`sound-btn ${on ? 'is-on' : ''}`}
        aria-pressed={on}
        onClick={(e) => {
          e.stopPropagation()
          wanted.current = !on
          setSoundPreferred(!on)
          if (on) stop()
          else start()
        }}
        title={audioUrl ? 'Plays the audio file you added' : 'A soundscape generated from your song’s tempo and title'}
      >
        <span className="sound-bars" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="sound-label">
          {on ? 'Listening' : 'Listen'}
          <span className="sound-song">{label}</span>
        </span>
      </button>
    </div>
  )
}
