import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { blobUrl, saveTune, useStore } from '../lib/store'
import { dayIndex, dayPhotos, dayWords, type PhotoRef } from '../lib/journal'
import { swatches, type Swatch } from '../lib/colors'
import { ROWS, STEPS_PER_DAY, parseHole, rowName, rowToMidi, swatchToRow, tuneFromMonth, type DayInput } from '../lib/musicbox'
import { artUrl, photogramUrl } from '../demo/art'
import { hash } from '../lib/extract'
import { accentFor } from '../lib/prompts'
import { sound } from '../lib/sound'
import { todayISO } from '../lib/time'
import { Back, ConfirmButton, InfoTip } from '../components/common'
import { ScrapPhoto } from '../components/Scrap'
import type { Memory, ShoeboxItem } from '../lib/types'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const CW = 26 // px per step
const RH = 15 // px per tooth
const PLAY_X = 96

/** Pointer capture keeps a drag going outside the element; it must never block the gesture. */
function capture(e: React.PointerEvent) {
  try {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  } catch {
    /* not capturable — fine */
  }
}

async function urlFor(p: PhotoRef, memories: Memory[], shoebox: ShoeboxItem[]) {
  if (p.ref.startsWith('art:')) return artUrl(p.ref.slice(4))
  if (p.ref.startsWith('gram:')) {
    const m = memories.find((x) => x.id === p.ref.slice(5))
    return m ? photogramUrl(hash(m.id), accentFor(m), [m.title, ...m.details]) : undefined
  }
  const thumb = shoebox.find((s) => s.blobId === p.ref)?.thumbId ?? p.ref
  return blobUrl(thumb)
}

export default function MusicBox({ ym }: { ym?: string }) {
  const { memories, shoebox, tunes } = useStore()
  const days = useMemo(() => dayIndex(memories, shoebox), [memories, shoebox])
  const months = useMemo(() => [...new Set([...days.keys()].map((d) => d.slice(0, 7)))].sort(), [days])
  const month = ym && /^\d{4}-\d{2}$/.test(ym) ? ym : (months.filter((m) => m <= todayISO().slice(0, 7)).pop() ?? todayISO().slice(0, 7))
  const [y, m] = month.split('-').map(Number)
  const nDays = new Date(y, m, 0).getDate()
  const cols = nDays * STEPS_PER_DAY

  const monthDays = useMemo(() => [...days.values()].filter((d) => d.date.startsWith(month)).sort((a, b) => a.date.localeCompare(b.date)), [days, month])

  // read every photo's colours (on the device)
  const [palette, setPalette] = useState<Record<string, Swatch[][]> | null>(null)
  useEffect(() => {
    let live = true
    setPalette(null)
    ;(async () => {
      const entries = await Promise.all(
        monthDays.map(async (d) => {
          const refs = dayPhotos(d).slice(0, 3)
          const sw = await Promise.all(
            refs.map(async (r) => {
              const url = await urlFor(r, memories, shoebox)
              return url ? swatches(url) : []
            }),
          )
          return [d.date, sw] as const
        }),
      )
      if (live) setPalette(Object.fromEntries(entries))
    })()
    return () => {
      live = false
    }
  }, [month, monthDays.length])

  const written = useMemo(() => {
    if (!palette) return []
    const input: DayInput[] = monthDays.map((d) => ({ day: Number(d.date.slice(8)), swatches: palette[d.date] ?? [], memory: d.memories.length > 0 }))
    return tuneFromMonth(input)
  }, [palette, monthDays])

  const holes = useMemo(() => new Set(tunes[month] ?? written), [tunes, month, written])
  const byCol = useMemo(() => {
    const map = new Map<number, number[]>()
    for (const h of holes) {
      const { col, row } = parseHole(h)
      map.set(col, [...(map.get(col) ?? []), row])
    }
    return map
  }, [holes])

  /* ---------- playback ---------- */
  const [pos, setPos] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(3.2)
  const [lit, setLit] = useState<Record<number, number>>({})
  const posRef = useRef(0)
  const lastCol = useRef(-1)

  const strike = useCallback(
    (col: number) => {
      const rows = byCol.get(col)
      if (!rows) return
      const now = Date.now()
      rows.forEach((r, i) => window.setTimeout(() => sound.box(rowToMidi(r)), i * 9))
      setLit((l) => ({ ...l, ...Object.fromEntries(rows.map((r) => [r, now])) }))
    },
    [byCol],
  )

  /** Moves the strip. A tooth sounds when a hole crosses the comb moving forward, like the real thing. */
  const advance = useCallback(
    (to: number) => {
      const t = Math.max(0, Math.min(cols, to))
      if (t > posRef.current) {
        const upto = Math.min(cols - 1, Math.floor(t))
        // a very fast scrub only rings the last few columns, not a cacophony
        const from = Math.max(lastCol.current + 1, upto - 5)
        for (let c = from; c <= upto; c++) strike(c)
        lastCol.current = Math.max(lastCol.current, upto)
      } else if (t < posRef.current) lastCol.current = Math.ceil(t) - 1
      posRef.current = t
      setPos(t)
      return t
    },
    [cols, strike],
  )

  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const tick = (t: number) => {
      const dt = (t - last) / 1000
      last = t
      const p = advance(posRef.current + dt * speed)
      if (p >= cols) {
        setPlaying(false)
        return
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, speed, advance, cols])

  const play = () => {
    if (posRef.current >= cols - 0.01) {
      posRef.current = 0
      lastCol.current = -1
      setPos(0)
    }
    sound.box(rowToMidi(7), 0.001) // wakes the audio on iOS within the tap
    setPlaying((p) => !p)
  }

  /* ---------- the crank ---------- */
  const crank = useRef<HTMLDivElement>(null)
  const crankDrag = useRef<number | null>(null)
  const angleOf = (e: React.PointerEvent) => {
    const r = crank.current!.getBoundingClientRect()
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI
  }

  /* ---------- scrubbing & punching on the strip ---------- */
  const stripDrag = useRef<{ x: number; p: number; moved: boolean } | null>(null)
  const stripEl = useRef<HTMLDivElement>(null)
  const toggle = (col: number, row: number) => {
    const key = `${col}:${row}`
    const next = new Set(holes)
    if (next.has(key)) next.delete(key)
    else {
      next.add(key)
      sound.box(rowToMidi(row))
    }
    saveTune(month, [...next])
  }

  const day = Math.min(nDays, Math.floor(pos / STEPS_PER_DAY) + 1)
  const date = `${month}-${String(day).padStart(2, '0')}`
  const today = days.get(date)
  const photo = today ? dayPhotos(today)[0] : undefined
  const words = today ? dayWords(today)[0] : undefined
  const daySw = palette?.[date]?.[0] ?? []
  const idx = months.indexOf(month)
  const edited = !!tunes[month]
  const noteCount = holes.size

  return (
    <main
      className="musicbox-page"
      tabIndex={-1}
      onKeyDown={(e) => {
        if ((e.target as HTMLElement).tagName === 'INPUT') return
        if (e.key === ' ') {
          e.preventDefault()
          play()
        } else if (e.key === 'ArrowRight') advance(Math.floor(posRef.current) + 1)
        else if (e.key === 'ArrowLeft') advance(Math.floor(posRef.current) - 1)
      }}
    >
      <header className="dr-head">
        <Back href={`#/journal/${month}`} dark>
          The journal
        </Back>
        <div className="dr-title">
          <span className="dr-date">The music box</span>
          <span className="dr-name">
            {MONTHS[m - 1]} {y}, played by your photographs
          </span>
        </div>
        <nav className="mb-months" aria-label="Months">
          {idx > 0 && <a href={`#/music/${months[idx - 1]}`}>←</a>}
          {idx >= 0 && idx < months.length - 1 && <a href={`#/music/${months[idx + 1]}`}>→</a>}
        </nav>
      </header>

      <section className="mb-projector" aria-live="polite">
        <div className="mb-photo">
          {photo ? <ScrapPhoto key={photo.ref} refId={photo.ref} negative={photo.negative} variant="polaroid" caption={words ?? `${day} ${MONTHS[m - 1].toLowerCase()}`} /> : <div className="mb-empty">{day}</div>}
        </div>
        <div className="mb-notes">
          <p className="mb-day">
            {day} {MONTHS[m - 1]}
          </p>
          {daySw.length > 0 ? (
            <ul className="mb-swatches">
              {daySw.filter((s) => s.weight > 0.12).map((s, i) => (
                <li key={i}>
                  <span className="mb-chip" style={{ background: s.hex }} />
                  <span>became</span>
                  <b>{rowName(swatchToRow(s))}</b>
                </li>
              ))}
              {today?.memories.length ? (
                <li>
                  <span className="mb-chip mb-chip-mem" />
                  <span>a memory you kept rings</span>
                  <b>{rowName(0)}</b>
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="mb-rest">{today ? '…' : 'No photo — a rest.'}</p>
          )}
        </div>
      </section>

      <section className="mb-box" aria-label="The music box">
        <div className="mb-velvet">
          <div
            className="mb-window"
            ref={stripEl}
            onPointerDown={(e) => {
              capture(e)
              stripDrag.current = { x: e.clientX, p: posRef.current, moved: false }
              setPlaying(false)
            }}
            onPointerMove={(e) => {
              const d = stripDrag.current
              if (!d) return
              const dx = d.x - e.clientX
              if (Math.abs(dx) > 4) d.moved = true
              if (d.moved) advance(d.p + dx / CW)
            }}
            onPointerUp={(e) => {
              const d = stripDrag.current
              stripDrag.current = null
              if (!d || d.moved) return
              const r = stripEl.current!.getBoundingClientRect()
              const col = Math.floor((e.clientX - r.left - PLAY_X) / CW + posRef.current)
              const row = ROWS - 1 - Math.floor((e.clientY - r.top - 22) / RH)
              if (col >= 0 && col < cols && row >= 0 && row < ROWS) toggle(col, row)
            }}
          >
            <div className="mb-strip" style={{ width: cols * CW + 60, transform: `translateX(${PLAY_X - pos * CW}px)` } as CSSProperties}>
              {Array.from({ length: nDays }, (_, i) => {
                const d = days.get(`${month}-${String(i + 1).padStart(2, '0')}`)
                const p = d ? dayPhotos(d)[0] : undefined
                return (
                  <div key={i} className={`mb-daycol ${d ? 'has' : ''}`} style={{ left: i * STEPS_PER_DAY * CW, width: STEPS_PER_DAY * CW }}>
                    <span className="mb-daynum">{i + 1}</span>
                    {p && (
                      <span className="mb-thumb">
                        <ScrapPhoto refId={p.ref} negative={p.negative} variant="cell" thumb />
                      </span>
                    )}
                  </div>
                )
              })}
              {[...holes].map((h) => {
                const { col, row } = parseHole(h)
                return <span key={h} className={`mb-hole ${col < Math.floor(pos) ? 'is-past' : ''}`} style={{ left: col * CW + CW / 2 - 6, top: 22 + (ROWS - 1 - row) * RH + 2 }} />
              })}
            </div>
            <div className="mb-comb" aria-hidden="true">
              {Array.from({ length: ROWS }, (_, i) => {
                const row = ROWS - 1 - i
                return <span key={row} className={`mb-tooth ${Date.now() - (lit[row] ?? 0) < 220 ? 'is-lit' : ''}`} style={{ top: 22 + i * RH + 4 }} />
              })}
            </div>
            <span className="mb-line" aria-hidden="true" />
          </div>

          <div
            className="mb-crank"
            ref={crank}
            role="slider"
            tabIndex={0}
            aria-label="Crank. Turn it to play the month. Arrow keys step."
            aria-valuemin={0}
            aria-valuemax={cols}
            aria-valuenow={Math.round(pos)}
            onPointerDown={(e) => {
              capture(e)
              crankDrag.current = angleOf(e)
              setPlaying(false)
              sound.box(rowToMidi(7), 0.001)
            }}
            onPointerMove={(e) => {
              if (crankDrag.current === null) return
              const a = angleOf(e)
              let d = a - crankDrag.current
              if (d > 180) d -= 360
              if (d < -180) d += 360
              crankDrag.current = a
              advance(posRef.current + d / 90) // a full turn = 4 steps
            }}
            onPointerUp={() => (crankDrag.current = null)}
            onPointerCancel={() => (crankDrag.current = null)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') (e.preventDefault(), advance(Math.floor(posRef.current) + 1))
              if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') (e.preventDefault(), advance(Math.floor(posRef.current) - 1))
            }}
          >
            <span className="mb-crank-arm" style={{ transform: `rotate(${pos * 90}deg)` }}>
              <span className="mb-crank-knob" />
            </span>
            <span className="mb-crank-hub" />
          </div>
        </div>

        <div className="mb-controls">
          <button type="button" className="btn btn-light" onClick={play} disabled={!palette}>
            {!palette ? 'Reading colours…' : playing ? 'Pause' : pos >= cols - 0.01 ? 'Play again' : pos > 0 ? 'Keep playing' : 'Play the month'}
          </button>
          <label className="mb-speed">
            <span>Tempo</span>
            <input type="range" min={1.5} max={7} step={0.1} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
          </label>
          <InfoTip dark label="How the music box works">
            Every photo is punched into the strip as a chord: its main colours choose the teeth — warm colours low, cool colours high, light colours an
            octave up. A day you saved as a memory rings the lowest tooth. Turn the crank, drag the paper, or press Space. Tap the strip to punch a hole of
            your own.
          </InfoTip>
          <span className="mb-count">
            {noteCount} holes · {monthDays.length} days
          </span>
          {edited && (
            <ConfirmButton className="link-dark" confirm="Go back to the tune your photos wrote?" onConfirm={() => saveTune(month, null)}>
              Back to what the photos wrote
            </ConfirmButton>
          )}
        </div>

      </section>
    </main>
  )
}
