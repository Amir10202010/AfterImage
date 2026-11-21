// The narration: the day read aloud by the device's own speech synthesiser.
//
// What is read is always the user's own words — the folder name, then the story sentence by
// sentence, verbatim. How it is read (rate, pitch, pauses, a lower voice) comes from the
// voice plan in atmosphere.ts, so a tense day is read clipped and a quiet night hushed.
// No network, no keys: the Web Speech API, with the browser's installed voices.
import type { VoicePlan } from './atmosphere'
import { langOf } from './atmosphere'
import { sentences } from './extract'

export interface NarrationLine {
  text: string
  kind: 'title' | 'story'
}

export interface Narration {
  /** BCP 47 language for the voice: 'ru-RU' or 'en-US' */
  lang: string
  lines: NarrationLine[]
  plan: VoicePlan
}

/** Keep a narration to about a minute: enough for the video, short enough to listen to. */
export const MAX_LINES = 12

export function narrationScript(title: string, story: string, plan: VoicePlan): Narration {
  const lang = langOf(story) === 'ru' ? 'ru-RU' : 'en-US'
  const body = sentences(story).slice(0, MAX_LINES)
  return {
    lang,
    lines: [{ text: title, kind: 'title' }, ...body.map((text) => ({ text, kind: 'story' as const }))],
    plan,
  }
}

/** Minimal shape of SpeechSynthesisVoice, so the picker can be tested without a browser. */
export interface VoiceLike {
  name: string
  lang: string
  localService: boolean
  default?: boolean
}

// Voice names are localised by the system (on a Russian Mac "Samantha" is «Саманта»),
// so each list carries both spellings. (\b only knows ASCII, hence the written-out edges.)
const word = (src: string) => new RegExp(`(?<!\\p{L})(?:${src})(?!\\p{L})`, 'iu')
/** natural, well-known voices */
const GOOD = word('samantha|саманта|daniel|дэниэл|karen|карен|moira|мойра|tessa|тесса|rishi|риши|alex|алекс|aaron|nicky|arthur|milena|милена|yuri|юрий|katya|катя|google|microsoft|siri|enhanced|premium|улучшенн')
/** novelty voices: comic or musical, never right for someone's day */
const NOVELTY = word('albert|альберт|bahh|бах|bells|колокольчик|boing|прыг-скок|bubbles|пузырьки|cellos|виолончель|wobble|воббл|zarvox|зарвокс|trinoids|триноид|organ|орган|bad news|плохие новости|good news|хорошие новости|superstar|суперзвезда|whisper|шепот|шёпот|jester|шутник|junior|джуниор|fred|фред|ralph|ральф|kathy|кэти')
/** voices known to sit lower; only used to honour plan.low */
const LOWER = word('daniel|дэниэл|alex|алекс|aaron|arthur|yuri|юрий|maxim|максим|pavel|павел|dmitry|дмитрий|guy|male')

/**
 * Picks a voice for the language: an exact locale match first, then the same language; local
 * voices before network ones; a lower voice if the plan asks for one. Deterministic: ties go
 * by name, so the same device always reads a day in the same voice.
 */
export function pickVoice<V extends VoiceLike>(voices: V[], lang: string, low: boolean): V | undefined {
  const base = lang.slice(0, 2).toLowerCase()
  const same = voices.filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith(base))
  if (!same.length) return undefined
  const score = (v: V) =>
    (NOVELTY.test(v.name) ? -20 : 0) +
    (GOOD.test(v.name) ? 3 : 0) +
    (v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase() ? 4 : 0) +
    (v.localService ? 2 : 0) +
    (low && LOWER.test(v.name) ? 5 : 0) +
    (v.default ? 0.5 : 0)
  // ties by name in a fixed collation, so the choice doesn't depend on the system language
  return [...same].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name, 'en'))[0]
}

/** Pause after a line: the plan's pause, and a longer breath after the folder name. */
export function pauseAfter(line: NarrationLine, plan: VoicePlan) {
  return line.kind === 'title' ? Math.round(plan.pauseMs * 1.8) : plan.pauseMs
}
