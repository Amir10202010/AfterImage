import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import type { Memory } from '../lib/types'
import { useMemoryImage } from './Photo'
import { swatches, type Swatch } from '../lib/colors'
import { atmosphere, inputFor, TECHNIQUES, type Atmosphere } from '../lib/atmosphere'
import { hash, sentences } from '../lib/extract'
import { sound } from '../lib/sound'
import { useBlobUrl, useStore } from '../lib/store'

/**
 * The page of a day. Every page shares one frame (4:5 paper, the date top left, the page number top
 * right, the folder name and a line from the day at the bottom, photographs mounted as bordered
 * prints); the rules in atmosphere.ts dress it: palette, photo treatment, texture, composition,
 * rhythm, motion and voice.
 */

/** The rules for a memory, with its first photograph's colours once they have been read. */
export function useAtmosphere(m: Memory): Atmosphere {
  const src = useMemoryImage(m, 0)
  const [sw, setSw] = useState<{ src: string; s: Swatch[] }>()
  useEffect(() => {
    let live = true
    if (src) swatches(src).then((s) => live && setSw({ src, s }))
    return () => {
      live = false
    }
  }, [src])
  const read = sw && sw.src === src && sw.s.length ? sw.s : undefined
  return useMemo(() => atmosphere(inputFor(m, read)), [m, read])
}

/** Only links that open a web page are followed. */
export function safeUrl(u?: string) {
  if (!u) return undefined
  try {
    const x = new URL(u)
    return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : undefined
  } catch {
    return undefined
  }
}

const MAX_SHOTS = 8

function usePageNumber(id: string) {
  const { memories } = useStore()
  return useMemo(() => {
    const order = [...memories].sort((a, b) => (a.date + (a.time ?? '')).localeCompare(b.date + (b.time ?? '')))
    return order.findIndex((x) => x.id === id) + 1
  }, [memories, id])
}

function Shot({ m, i, on, alt }: { m: Memory; i: number; on: boolean; alt?: string }) {
  const src = useMemoryImage(m, i)
  if (!src) return null
  return <img className={on ? 'is-on' : ''} src={src} alt={on ? (alt ?? '') : ''} aria-hidden={on ? undefined : true} draggable={false} decoding="async" />
}

function pageDate(m: Memory) {
  const d = new Date(m.date + 'T12:00:00')
  const s = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).replace(',', ' ·')
  return m.time ? `${s} · ${m.time}` : s
}

function filmStamp(date: string) {
  const [y, mo, d] = date.split('-')
  return `’${y.slice(2)} ${Number(mo)} ${Number(d)}`
}

/** Shapes for the geometric page, placed by the memory itself (the same day always gets the same ones). */
function Geometry({ seed }: { seed: number }) {
  const r = (k: number, span: number) => ((hash(String(seed) + k) % 1000) / 1000) * span - span / 2
  return (
    <svg className="df-geo" viewBox="0 0 100 80" preserveAspectRatio="none" aria-hidden="true">
      <line className="df-geo-grid" x1="7" y1="0" x2="7" y2="80" />
      <line className="df-geo-grid" x1="67" y1="0" x2="67" y2="80" />
      <line className="df-geo-grid" x1="0" y1="7" x2="100" y2="7" />
      <circle className="df-geo-sun" cx={78 + r(1, 8)} cy={24 + r(2, 8)} r="15" />
      <circle className="df-geo-dot" cx={88 + r(3, 6)} cy={58 + r(4, 8)} r="3.2" />
      <path className="df-geo-tri" d={`M ${70 + r(5, 6)} 76 L 96 76 L ${84 + r(6, 6)} ${52 + r(7, 6)} Z`} />
      <line className="df-geo-cut" x1="2" y1={70 + r(8, 8)} x2="98" y2={8 + r(9, 6)} />
      <path className="df-geo-arc" d={`M 60 ${74 + r(10, 4)} A 14 14 0 0 1 88 ${74 + r(10, 4)}`} />
    </svg>
  )
}

function CutOuts({ seed }: { seed: number }) {
  const flip = seed % 2 ? 1 : -1
  return (
    <svg className="df-cut" viewBox="0 0 100 80" preserveAspectRatio="none" aria-hidden="true">
      <path className="df-cut-a" d="M78 52c6-9 16-7 17 2 1 7-6 9-4 15 2 5-6 9-11 5-5-3-9 1-12-4-3-6 6-10 10-18z" transform={flip < 0 ? 'translate(100 0) scale(-1 1)' : undefined} />
      <path className="df-cut-b" d="M4 18c3-6 9-5 10 0 1 4-3 6-1 9 2 4-3 7-6 4-2-2-6 0-6-4 0-3 1-6 3-9z" />
      <circle className="df-cut-c" cx={flip > 0 ? 90 : 10} cy="10" r="6" />
    </svg>
  )
}

export default function DayFilm({
  m,
  still = false,
  index,
  onIndex,
  fade = 0,
  atm: given,
}: {
  m: Memory
  /** the rules, when the parent has already worked them out */
  atm?: Atmosphere
  /** a still page for the archive: no sound, no controls */
  still?: boolean
  /** which photograph is shown, when the parent wants to choose (the contact sheet) */
  index?: number
  onIndex?: (i: number) => void
  /** how far the print has faded from being left alone (0 to 0.7) */
  fade?: number
}) {
  const own = useAtmosphere(m)
  const atm = given ?? own
  const no = usePageNumber(m.id)
  const n = Math.min(MAX_SHOTS, Math.max(1, m.photoIds.length))
  const [shown, setShown] = useState(0)
  const cur = (index ?? shown) % n
  const setCur = useCallback((i: number) => (onIndex ? onIndex(i) : setShown(i)), [onIndex])
  const lines = useMemo(() => {
    const ms = m.moments.map((x) => x.text.trim()).filter(Boolean)
    return (ms.length >= 2 ? ms : sentences(m.story)).slice(0, 12)
  }, [m.moments, m.story])
  const spokenLines = useMemo(() => sentences(m.story), [m.story])
  const [line, setLine] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [spoken, setSpoken] = useState<string | null>(null)
  const t = atm.technique
  const seed = hash(m.id)

  // the rhythm: while the day plays, a new photograph every `hold` seconds, a new line every other one
  const curRef = useRef(cur)
  useEffect(() => {
    curRef.current = cur
  }, [cur])
  useEffect(() => {
    if (!playing) return
    let beat = 0
    const id = window.setInterval(() => {
      beat++
      if (n > 1) setCur((curRef.current + 1) % n)
      if (n === 1 || beat % 2 === 0) setLine((l) => (l + 1) % Math.max(1, lines.length))
    }, atm.rhythm.hold * 1000)
    return () => window.clearInterval(id)
  }, [playing, n, lines.length, atm.rhythm.hold, setCur])

  const style = {
    '--df-paper': atm.palette.paper,
    '--df-ink': atm.palette.ink,
    '--df-accent': atm.palette.accent,
    '--df-second': atm.palette.second,
    '--df-wash': atm.palette.wash,
    '--df-grade': atm.grade,
    '--df-hold': `${atm.rhythm.hold}s`,
    '--df-fade': `${atm.rhythm.fade}s`,
    '--df-beat': `${60 / atm.rhythm.bpm}s`,
    '--df-age': String(fade),
  } as CSSProperties

  const caption = spoken ?? lines[line % Math.max(1, lines.length)] ?? ''
  const alt = `Photograph ${cur + 1} of ${n} from “${m.title}”`
  const slots = t === 'collage' ? Math.min(3, n) : 1

  return (
    <figure className={`df is-${t} tex-${atm.texture} ${playing ? 'is-playing' : ''} ${still ? 'is-still' : ''}`} style={style} aria-label={still ? undefined : `The page of “${m.title}”`}>
      <div className="df-page">
        <span className="df-texture" aria-hidden="true" />
        <header className="df-head">
          <span>{pageDate(m)}</span>
          <span>No. {String(no).padStart(2, '0')}</span>
        </header>

        <div className="df-stage">
          {t === 'kandinsky' && <Geometry seed={seed} />}
          {t === 'collage' && <CutOuts seed={seed} />}
          {t === 'ma' && (
            <>
              <span className="df-rule" aria-hidden="true" />
              <span className="df-seal" aria-hidden="true">
                {Number(m.date.slice(8, 10))}
              </span>
            </>
          )}
          {Array.from({ length: slots }, (_, s) => {
            const i = (cur + s) % n
            return (
              <div key={t === 'collage' ? `${s}-${i}` : s} className={`df-print df-p${s}`}>
                <div className="df-shot">
                  {t === 'collage' ? <Shot m={m} i={i} on alt={s === 0 ? alt : undefined} /> : Array.from({ length: n }, (_, k) => <Shot key={k} m={m} i={k} on={k === cur} alt={alt} />)}
                  {t === 'film' && (
                    <>
                      <span className="df-leak" aria-hidden="true" />
                      <span className="df-stamp" aria-hidden="true">
                        {filmStamp(m.date)}
                      </span>
                    </>
                  )}
                </div>
                {t === 'collage' && <span className={`df-tape df-tape-${(seed + s) % 3}`} aria-hidden="true" />}
              </div>
            )
          })}
          {t === 'monet' && <span className="df-dapple" aria-hidden="true" />}
        </div>

        <footer className="df-foot">
          <p className="df-name">{m.title}</p>
          <p className="df-caption">{caption}</p>
          {m.song && (
            <p className="df-song">
              ♪ {m.song.title} · {atm.rhythm.bpm} bpm{m.song.mode ? ` · ${m.song.mode}` : ''}
            </p>
          )}
        </footer>
      </div>
      {!still && <Controls m={m} atm={atm} playing={playing} setPlaying={setPlaying} lines={spokenLines} onSpoken={setSpoken} />}
    </figure>
  )
}

function pickVoice(lang: 'en' | 'ru') {
  const all = window.speechSynthesis?.getVoices() ?? []
  const mine = all.filter((v) => v.lang.toLowerCase().startsWith(lang))
  return mine.find((v) => v.localService) ?? mine[0]
}

/** Play the day: its song (or a soundscape at the song's tempo and key), the photographs in rhythm, and, if wanted, a synthetic voice reading the words. */
function Controls({
  m,
  atm,
  playing,
  setPlaying,
  lines,
  onSpoken,
}: {
  m: Memory
  atm: Atmosphere
  playing: boolean
  setPlaying: (on: boolean) => void
  lines: string[]
  onSpoken: (s: string | null) => void
}) {
  const audioUrl = useBlobUrl(m.song?.audioId)
  const audio = useRef<HTMLAudioElement>(null)
  const canSpeak = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
  const [voice, setVoice] = useState(false)
  const speaking = useRef(0)
  const link = safeUrl(m.song?.url)

  const hush = useCallback(() => {
    speaking.current++
    if (canSpeak) window.speechSynthesis.cancel()
    onSpoken(null)
    sound.duck(false)
    if (audio.current) audio.current.volume = 0.7
  }, [canSpeak, onSpoken])

  const speak = useCallback(() => {
    if (!canSpeak || !lines.length) return
    const run = ++speaking.current
    const synth = window.speechSynthesis
    synth.cancel()
    sound.duck(true)
    if (audio.current) audio.current.volume = 0.25
    let k = 0
    const next = () => {
      if (run !== speaking.current) return
      if (k >= lines.length) {
        onSpoken(null)
        sound.duck(false)
        if (audio.current) audio.current.volume = 0.7
        return
      }
      const u = new SpeechSynthesisUtterance(lines[k])
      u.lang = atm.voice.lang === 'ru' ? 'ru-RU' : 'en-GB'
      const v = pickVoice(atm.voice.lang)
      if (v) u.voice = v
      u.rate = atm.voice.rate
      u.pitch = atm.voice.pitch
      const said = lines[k]
      u.onstart = () => run === speaking.current && onSpoken(said)
      u.onend = () => {
        k++
        window.setTimeout(next, atm.voice.pause)
      }
      u.onerror = () => run === speaking.current && hush()
      synth.speak(u)
    }
    next()
  }, [atm.voice, canSpeak, hush, lines, onSpoken])

  const stop = useCallback(() => {
    audio.current?.pause()
    sound.stop()
    hush()
    setPlaying(false)
  }, [hush, setPlaying])

  const play = () => {
    if (audioUrl && audio.current) {
      audio.current.volume = voice ? 0.25 : 0.7
      audio.current.play().catch(() => sound.start({ tempo: m.song?.tempo ?? 'slow', seed: m.id, bpm: atm.rhythm.bpm, minor: m.song?.mode === 'minor' }))
    } else sound.start({ tempo: m.song?.tempo ?? 'slow', seed: m.song ? m.song.title + m.song.artist : m.id, bpm: atm.rhythm.bpm, minor: m.song?.mode === 'minor' })
    setPlaying(true)
    if (voice) speak()
  }

  // leaving the page stops everything it started
  useEffect(() => () => stop(), [stop])

  return (
    <figcaption className="df-controls">
      {audioUrl && <audio ref={audio} src={audioUrl} loop preload="auto" />}
      <button type="button" className="btn btn-ink df-play" aria-pressed={playing} onClick={() => (playing ? stop() : play())}>
        <span className="df-play-icon" aria-hidden="true">
          {playing ? '❚❚' : '▶'}
        </span>
        {playing ? 'Pause' : 'Play the day'}
      </button>
      {canSpeak && (
        <label className="df-voice">
          <input
            type="checkbox"
            checked={voice}
            onChange={(e) => {
              setVoice(e.target.checked)
              if (!playing) return
              if (e.target.checked) speak()
              else hush()
            }}
          />
          Read it aloud
        </label>
      )}
      {link && (
        <a className="link df-songlink" href={link} target="_blank" rel="noreferrer noopener">
          Open “{m.song!.title}” ↗
        </a>
      )}
      <span className="df-hint">{audioUrl ? 'Plays the recording you attached.' : m.song ? `A soundscape at ${atm.rhythm.bpm} bpm in a ${m.song.mode ?? (m.song.tempo === 'fast' ? 'minor' : 'major')} key, made on this device.` : 'A soundscape made on this device.'}</span>
    </figcaption>
  )
}

const AXES: [keyof Atmosphere['axes'], string, string, string, boolean][] = [
  ['energy', 'Pace', 'slow', 'fast', false],
  ['valence', 'Weight', 'heavy', 'light', true],
  ['warmth', 'Light', 'cold', 'warm', true],
  ['nostalgia', 'Distance', 'now', 'long ago', false],
]

/** The explanation: which technique, what fired it, and the four measures behind it. */
export function DayRules({ atm }: { atm: Atmosphere }) {
  const tq = TECHNIQUES[atm.technique]
  return (
    <section className="df-rules" aria-labelledby="df-rules-h">
      <h2 id="df-rules-h" className="df-rules-h">
        Why the page looks like this
      </h2>
      <p className="df-rules-tech">
        <strong>{tq.name}</strong> <span>after {tq.after}</span>
      </p>
      <p className="df-rules-lead">{atm.reasons[0]}</p>
      <dl className="df-axes">
        {AXES.map(([k, label, lo, hi, signed]) => {
          const v = signed ? (atm.axes[k] + 1) / 2 : atm.axes[k]
          return (
            <div key={k} className="df-axis">
              <dt>{label}</dt>
              <dd>
                <span className="df-meter" role="img" aria-label={`${label}: ${Math.round(v * 100)} out of 100, from ${lo} to ${hi}`}>
                  <i style={{ '--v': v } as CSSProperties} />
                </span>
                <span className="df-ends" aria-hidden="true">
                  <span>{lo}</span>
                  <span>{hi}</span>
                </span>
              </dd>
            </div>
          )
        })}
      </dl>
      <ul className="df-reasons">
        {atm.reasons.slice(1).map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ul>
      <p className="df-rules-note">
        Every page keeps the same frame: 4:5 paper, the date top left, the folder name and a line from the day at the bottom, photographs mounted as prints. The colours, the treatment of the photographs, the texture,
        the composition, the rhythm and the voice come from the day.
      </p>
    </section>
  )
}
