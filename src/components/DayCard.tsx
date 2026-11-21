import { useEffect, useId, useState, type CSSProperties } from 'react'
import type { Memory } from '../lib/types'
import type { CardModel, Frame, Mark } from '../lib/daycard'
import { useMemoryImage } from './Photo'

function useReducedMotion() {
  const [reduce, setReduce] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const q = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!q) return
    const on = () => setReduce(q.matches)
    q.addEventListener('change', on)
    return () => q.removeEventListener('change', on)
  }, [])
  return reduce
}

/**
 * The memory of one day as a 4:5 card. The frame (date, folder name, quoted line, song, mark,
 * photo window) is the same for every day; colour, treatment, grain, composition, rhythm and the
 * technique's marks come from the day itself.
 */
export default function DayCard({ m, card }: { m: Memory; card: CardModel }) {
  const { atm } = card
  const reduce = useReducedMotion()
  const [step, setStep] = useState(0)
  const cycles = card.photos > 1 || card.frames.length > 1
  const brush = 'dcb' + useId().replace(/[^a-zA-Z0-9]/g, '')

  // the slideshow keeps the song's time: each photo stays `hold` seconds (4, 8 or 12 beats)
  useEffect(() => {
    if (!cycles || reduce) return
    const t = window.setInterval(() => setStep((x) => x + 1), atm.rhythm.hold * 1000)
    return () => window.clearInterval(t)
  }, [cycles, reduce, atm.rhythm.hold])

  const weather = atm.signals.weather
  return (
    <figure
      className="dc"
      data-tech={card.technique}
      data-layout={atm.composition.layout}
      data-surface={atm.surface}
      data-transition={atm.rhythm.transition}
      data-pulse={atm.motion.pulse ? 'true' : undefined}
      style={card.style}
      aria-label={`The memory card for ${card.title}: ${atm.technique.name}`}
    >
      {card.technique === 'impression' && (
        <svg className="dc-defs" aria-hidden="true" width="0" height="0">
          <filter id={brush}>
            <feTurbulence type="fractalNoise" baseFrequency="0.022 0.04" numOctaves="2" seed={7} />
            <feDisplacementMap in="SourceGraphic" scale="9" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </svg>
      )}

      <p className="dc-date">{card.dateLine}</p>

      <div className="dc-window">
        {card.frames.map((f, i) => (
          <FrameView
            key={i}
            m={m}
            card={card}
            frame={f}
            index={(f.photo + step) % card.photos}
            z={card.frames.length > 1 ? ((i - step) % card.frames.length + card.frames.length) % card.frames.length : 0}
            brush={card.technique === 'impression' ? brush : undefined}
          />
        ))}
        {card.technique === 'film' && <span className="dc-leak" aria-hidden="true" />}
        {card.technique === 'collage' && card.keyword && <span className="dc-label">{card.keyword}</span>}
        {weather && weather !== 'clear' && weather !== 'cloud' && <span className="dc-weather" data-weather={weather} aria-hidden="true" />}
      </div>

      <Marks marks={card.marks} />
      <span className="dc-grain" aria-hidden="true" />

      <figcaption className="dc-text">
        <span className="dc-title">{card.title}</span>
        {card.caption && <span className="dc-caption">“{card.caption}”</span>}
      </figcaption>

      <div className="dc-foot">
        <span className="dc-mark" aria-hidden="true">
          ◇ afterimage
        </span>
        {card.song && (
          <span className="dc-song">
            <span className="dc-song-name">♪ {card.song.name}</span>
            <span className="dc-song-meta">{card.song.meta}</span>
          </span>
        )}
      </div>
    </figure>
  )
}

function FrameView({ m, card, frame, index, z, brush }: { m: Memory; card: CardModel; frame: Frame; index: number; z: number; brush?: string }) {
  const style = {
    left: `${frame.x}%`,
    top: `${frame.y}%`,
    width: `${frame.w}%`,
    height: `${frame.h}%`,
    transform: frame.rotate ? `rotate(${frame.rotate}deg)` : undefined,
    zIndex: card.frames.length - z,
  } as CSSProperties
  return (
    <div className="dc-frame" style={style}>
      {Array.from({ length: card.photos }, (_, i) => (
        <Slide key={i} m={m} i={i} on={i === index} focus={frame.focus} brush={brush} />
      ))}
      {card.technique === 'film' && <span className="dc-imprint">{"'" + m.date.slice(2).replace(/-/g, ' ')}</span>}
    </div>
  )
}

function Slide({ m, i, on, focus, brush }: { m: Memory; i: number; on: boolean; focus: string; brush?: string }) {
  const src = useMemoryImage(m, i)
  if (!src) return <span className={`dc-slide dc-empty ${on ? 'is-on' : ''}`} />
  return (
    <img
      className={`dc-slide ${on ? 'is-on' : ''}`}
      src={src}
      alt={on ? `Photograph ${i + 1} from this day` : ''}
      aria-hidden={on ? undefined : true}
      draggable={false}
      style={{ objectPosition: focus, filter: brush ? `url(#${brush}) var(--dc-filter)` : undefined }}
    />
  )
}

function Marks({ marks }: { marks: Mark[] }) {
  if (!marks.length) return null
  return (
    <svg className="dc-marks" viewBox="0 0 100 125" aria-hidden="true">
      <defs>
        <filter id="dc-glow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="1.1" />
        </filter>
        <filter id="dc-soft" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>
      {marks.map((k, i) => {
        switch (k.kind) {
          case 'circle':
            return <circle key={i} className={k.pulse ? 'dc-pulse' : undefined} cx={k.x} cy={k.y} r={k.r} fill={k.fill ?? 'none'} stroke={k.stroke} strokeWidth={k.width} />
          case 'line':
            return <line key={i} x1={k.x1} y1={k.y1} x2={k.x2} y2={k.y2} stroke={k.stroke} strokeWidth={k.width} />
          case 'rect':
            return <rect key={i} x={k.x} y={k.y} width={k.w} height={k.h} fill={k.fill} opacity={k.opacity} transform={k.rotate ? `rotate(${k.rotate} ${k.x + k.w / 2} ${k.y + k.h / 2})` : undefined} />
          case 'dab':
            return <circle key={i} className="dc-dab" cx={k.x} cy={k.y} r={k.r} fill={k.fill} filter="url(#dc-soft)" />
          case 'lamp':
            return (
              <g key={i} className="dc-lamp" style={{ animationDelay: `-${k.delay}s` }}>
                <circle cx={k.x} cy={k.y} r={k.r * 3} fill={k.fill} opacity={0.35} filter="url(#dc-glow)" />
                <circle cx={k.x} cy={k.y} r={k.r} fill={k.fill} />
              </g>
            )
        }
      })}
    </svg>
  )
}
