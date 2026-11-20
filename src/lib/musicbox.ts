// A month of photographs, punched into a music-box strip.
// Every photo becomes a chord: its colours choose the notes. Nothing is random —
// the same month always plays the same tune, until you punch your own holes.
import type { Swatch } from './colors'

/** 15 teeth, like a real paper-strip music box: a major pentatonic over three octaves. */
export const ROWS = 15
const SCALE = [0, 2, 4, 7, 9]
export const BASE_MIDI = 60 // C4

export function rowToMidi(row: number) {
  return BASE_MIDI + Math.floor(row / 5) * 12 + SCALE[row % 5]
}

const NAMES = ['C', 'D', 'E', 'G', 'A']
export function rowName(row: number) {
  return NAMES[row % 5] + (4 + Math.floor(row / 5))
}

/** Warm colours sit low, cool colours high; light colours climb an octave. Greys hum in the middle. */
export function swatchToRow(s: Swatch) {
  const octave = s.l < 0.36 ? 0 : s.l < 0.66 ? 1 : 2
  if (s.h < 0) return octave * 5 + 2
  const degree = Math.min(4, Math.floor(((s.h + 15) % 360) / 72))
  return octave * 5 + degree
}

export interface DayInput {
  day: number // 1..31
  swatches: Swatch[][] // per photo
  memory: boolean
}

/** Each day gets two steps on the strip: the chord, then a little echo. */
export const STEPS_PER_DAY = 2

export function tuneFromMonth(days: DayInput[]): string[] {
  const holes = new Set<string>()
  for (const d of days) {
    const col = (d.day - 1) * STEPS_PER_DAY
    const first = d.swatches[0] ?? []
    // the first photo's colours make the chord
    for (const s of first.slice(0, 3)) if (s.weight > 0.12) holes.add(`${col}:${swatchToRow(s)}`)
    // other photos that day: an echo, one note each, on the off-step
    for (const ph of d.swatches.slice(1, 3)) if (ph[0]) holes.add(`${col + 1}:${swatchToRow(ph[0])}`)
    // a day you kept as a memory rings the lowest tooth
    if (d.memory) holes.add(`${col}:0`)
  }
  return [...holes]
}

export function parseHole(h: string) {
  const [c, r] = h.split(':').map(Number)
  return { col: c, row: r }
}
