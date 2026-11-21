// The day card: one recognisable format for every memory.
//
// This module turns a day into everything the card needs to draw itself — the constant frame
// (date, folder name, quoted line, song tag) and the variable layer (CSS variables and the
// technique's marks). It is pure, so the card is the same on every device and can be tested.
import type { CSSProperties } from 'react'
import type { Memory } from './types'
import type { Swatch } from './colors'
import { atmosphere, folderTitle, pickCaption, type Atmosphere, type TechniqueId } from './atmosphere'
import { extractRecall, hash } from './extract'

/** A mark the technique adds to the card, in card units: x 0…100, y 0…125 (the 4:5 frame). */
export type Mark =
  | { kind: 'circle'; x: number; y: number; r: number; fill?: string; stroke?: string; width?: number; pulse?: boolean }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: string; width: number }
  | { kind: 'rect'; x: number; y: number; w: number; h: number; fill: string; rotate?: number; opacity?: number }
  | { kind: 'lamp'; x: number; y: number; r: number; fill: string; delay: number }
  | { kind: 'dab'; x: number; y: number; r: number; fill: string }

/** How one photo frame sits inside the photo window, in % of the window. */
export interface Frame {
  x: number
  y: number
  w: number
  h: number
  rotate: number
  /** which photo it shows, before the slideshow advances */
  photo: number
  /** object-position, so repeated photos in a collage show different parts */
  focus: string
}

export interface CardModel {
  atm: Atmosphere
  technique: TechniqueId
  /** the 3–7 word folder name */
  title: string
  /** one sentence quoted verbatim from the story */
  caption?: string
  /** a word from the story, for the collage label */
  keyword?: string
  /** "SAT · 12 OCT 2024 · 17:40" */
  dateLine: string
  /** the record tag: "the song — artist", then "96 bpm (measured) · minor" */
  song?: { name: string; meta: string }
  photos: number
  frames: Frame[]
  marks: Mark[]
  style: CSSProperties
}

const WD = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
const MO = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

export function dateLine(date: string, time?: string) {
  const [y, mo, d] = date.split('-').map(Number)
  const wd = new Date(Date.UTC(y, mo - 1, d)).getUTCDay()
  return [WD[wd], `${d} ${MO[mo - 1]} ${y}`, time].filter(Boolean).join(' · ')
}

/** A small seeded random, so the same day always gets the same marks. */
function seeded(seed: string) {
  let s = hash(seed) || 1
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x6d2b79f5) >>> 0
    s ^= s >>> 13
    return (s >>> 0) / 4294967296
  }
}

export function cardModel(m: Memory, swatches?: Swatch[]): CardModel {
  const atm = atmosphere(m, swatches)
  const id = atm.technique.id
  const p = atm.palette
  const rnd = seeded(m.id + id)
  const photos = Math.max(1, m.photoIds.length)
  const r1 = (n: number) => Math.round(n * 10) / 10

  /* ----- frames inside the photo window ----- */
  const scale = atm.composition.photoScale * 100
  let frames: Frame[]
  switch (atm.composition.layout) {
    case 'scatter': {
      // three overlapping, crooked frames; a single photo is shown three ways (different crops)
      const n = 3
      frames = Array.from({ length: n }, (_, i) => {
        const w = 58 + rnd() * 10
        return {
          x: r1([2, 38, 18][i] + rnd() * 4),
          y: r1([4, 14, 44][i] + rnd() * 4),
          w: r1(w),
          h: r1(w * 0.82),
          rotate: r1((i % 2 ? 1 : -1) * atm.composition.tilt * (0.6 + rnd() * 0.6)),
          photo: i % photos,
          focus: photos > 1 ? '50% 50%' : ['30% 40%', '70% 30%', '50% 75%'][i],
        }
      })
      break
    }
    case 'air': {
      // ma: one small image, off-centre, the rest is margin
      const w = Math.max(42, scale)
      frames = [{ x: r1(100 - w - 6), y: r1(100 - w * 0.95 - 4), w: r1(w), h: r1(w * 0.95), rotate: 0, photo: 0, focus: '50% 50%' }]
      break
    }
    case 'offset': {
      const w = Math.max(60, scale)
      frames = [{ x: r1((100 - w) * (id === 'film' ? 0.35 : 0.5)), y: r1((100 - w) * 0.3), w: r1(w), h: r1(w * (id === 'film' ? 0.92 : 0.9)), rotate: atm.composition.tilt * (rnd() > 0.5 ? 1 : -1), photo: 0, focus: '50% 50%' }]
      break
    }
    default:
      // bleed and grid: the photo fills the window
      frames = [{ x: 0, y: 0, w: 100, h: 100, rotate: 0, photo: 0, focus: '50% 50%' }]
  }

  /* ----- the technique's marks, drawn from the day's own palette ----- */
  const marks: Mark[] = []
  if (id === 'kandinsky') {
    // a big circle, a ring, two crossing diagonals and a few short bars: tension as geometry
    marks.push({ kind: 'circle', x: r1(70 + rnd() * 18), y: r1(14 + rnd() * 10), r: r1(9 + atm.signals.tension * 6), fill: p.accent, pulse: atm.motion.pulse || atm.rhythm.bpm >= 110 })
    // (everything stays above y = 84, so the folder name and the quoted line are never crossed)
    marks.push({ kind: 'circle', x: r1(12 + rnd() * 10), y: r1(68 + rnd() * 8), r: r1(5 + rnd() * 3), stroke: p.second, width: 1.6 })
    marks.push({ kind: 'line', x1: 4, y1: r1(78 + rnd() * 5), x2: 96, y2: r1(14 + rnd() * 8), stroke: p.ink, width: 0.7 })
    marks.push({ kind: 'line', x1: r1(20 + rnd() * 10), y1: 8, x2: r1(60 + rnd() * 20), y2: 84, stroke: p.shadow, width: 0.5 })
    for (let i = 0; i < 4; i++) marks.push({ kind: 'rect', x: r1(66 + i * 4.2), y: r1(72 - i * 2), w: 2.4, h: r1(5 + rnd() * 5), fill: i % 2 ? p.second : p.ink, rotate: -28 })
  } else if (id === 'impression') {
    // soft dabs of the two main colours, like light caught on the surface
    // (kept inside the photo window: x 13–87, y 13–83 in card units)
    for (let i = 0; i < 7; i++) marks.push({ kind: 'dab', x: r1(22 + rnd() * 56), y: r1(22 + rnd() * 52), r: r1(4 + rnd() * 6), fill: i % 2 ? p.second : p.accent })
  } else if (id === 'ma') {
    // the seal: the only loud thing on the page
    marks.push({ kind: 'rect', x: 8, y: r1(64 + rnd() * 4), w: 6.5, h: 6.5, fill: p.second })
    marks.push({ kind: 'line', x1: 8, y1: 58, x2: r1(30 + rnd() * 8), y2: 58, stroke: p.shadow, width: 0.25 })
  } else if (id === 'collage') {
    // tape over the corners of the frames
    for (let i = 0; i < 3; i++) marks.push({ kind: 'rect', x: r1(14 + i * 26 + rnd() * 8), y: r1(10 + (i % 2) * 34 + rnd() * 6), w: 12, h: 3.4, fill: '#F3E9C9', rotate: r1(-20 + rnd() * 40), opacity: 0.78 })
  } else if (id === 'nocturne') {
    // a few lamps in one breathing tone
    const n = 3 + Math.floor(rnd() * 3)
    for (let i = 0; i < n; i++) marks.push({ kind: 'lamp', x: r1(10 + rnd() * 80), y: r1(48 + rnd() * 22), r: r1(0.7 + rnd() * 1.2), fill: p.accent, delay: r1(rnd() * atm.motion.breath) })
  }

  const s = m.song
  const mu = atm.signals.music
  const song = s
    ? {
        name: `${s.title} — ${s.artist}`,
        meta: [`${atm.rhythm.bpm} bpm${mu?.source.bpm === 'measured' ? ' (measured)' : ''}`, mu?.mode, mu?.genre, s.year].filter(Boolean).join(' · '),
      }
    : undefined

  const style = {
    '--dc-paper': p.paper,
    '--dc-ink': p.ink,
    '--dc-accent': p.accent,
    '--dc-second': p.second,
    '--dc-shadow': p.shadow,
    '--dc-filter': atm.treatment.filter,
    '--dc-grain': String(atm.grain),
    '--dc-air': String(atm.composition.air),
    '--dc-beat': `${atm.rhythm.beat}s`,
    '--dc-hold': `${atm.rhythm.hold}s`,
    '--dc-breath': `${atm.motion.breath}s`,
    '--dc-drift': String(atm.motion.drift),
    '--dc-ease': atm.rhythm.easing,
  } as CSSProperties

  return {
    atm,
    technique: id,
    title: folderTitle(m),
    caption: pickCaption(m.story),
    keyword: extractRecall(m.story, 1)[0]?.word,
    dateLine: dateLine(m.date, m.time),
    song,
    photos,
    frames,
    marks,
    style,
  }
}
