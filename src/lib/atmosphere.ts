// The diary's visual system: one set of rules that turns a day (its words, its photographs and its
// song) into a page, and says why.
//
// Constant on every page, so the diary reads as one person's: the 4:5 page and its grid, the two
// typefaces, the date in the top-left, the folder name and the caption at the bottom, photographs
// mounted as bordered prints.
// Variable with the day: palette, photo treatment, texture, composition, rhythm, motion and voice.
//
// Everything is computed on the device from what the person entered, and the same day always gives
// the same page. The words describe how a page looks, never how a person is.
import type { Swatch } from './colors'
import type { Memory, Song, Tempo } from './types'

export type Technique = 'monet' | 'kandinsky' | 'film' | 'collage' | 'ma'

export interface Atmosphere {
  technique: Technique
  /** a plain description of the page, e.g. "slow, light and warm" */
  mood: string
  axes: { energy: number; valence: number; warmth: number; nostalgia: number }
  palette: { paper: string; ink: string; accent: string; second: string; wash: string }
  /** CSS filter applied to the day's photographs */
  grade: string
  texture: 'linen' | 'smooth' | 'grain' | 'kraft' | 'washi'
  /** bpm drives the beat; hold is how long each photograph stays; fade is the length of a transition */
  rhythm: { bpm: number; beats: number; hold: number; fade: number }
  voice: { lang: 'en' | 'ru'; rate: number; pitch: number; pause: number }
  /** the rules that fired, in plain words, most important first */
  reasons: string[]
}

/** What each technique is, when it is used, and why it carries that feeling (shown in the app). */
export const TECHNIQUES: Record<Technique, { name: string; after: string; when: string; how: string; why: string }> = {
  monet: {
    name: 'Impressionist light',
    after: 'Claude Monet',
    when: 'calm, tender, slow days',
    how: 'soft-edged photographs, dappled light drifting across the page, a warm grade and long dissolves',
    why: 'nothing on the page has a hard edge, so the eye rests the way it did that day',
  },
  kandinsky: {
    name: 'Geometric composition',
    after: 'Wassily Kandinsky',
    when: 'tense, driven, sleepless days',
    how: 'a cold high-contrast grade, circles and lines cutting across a rigid grid, hard cuts on the beat',
    why: 'the day had edges and a pulse, and so does the page',
  },
  film: {
    name: 'Faded film print',
    after: '35 mm snapshots',
    when: 'days from long ago, and songs from another decade',
    how: 'heavy grain, lifted blacks, a light leak and an orange date stamp',
    why: 'it looks the way old photographs feel: faded, warm, slightly out of reach',
  },
  collage: {
    name: 'Cut-paper collage',
    after: 'Henri Matisse’s cut-outs',
    when: 'bright, loud, crowded days',
    how: 'several photographs taped down at angles, cut-paper shapes, saturated colour and quick cuts',
    why: 'a full day overlaps itself, so the page is as busy as the day was',
  },
  ma: {
    name: 'Ma (negative space)',
    after: 'Japanese minimalist graphics',
    when: 'quiet, solitary, heavy days',
    how: 'one small photograph in a field of paper, a thin rule, a red seal and the slowest fades',
    why: 'emptiness gives the feeling room instead of filling it in',
  },
}

const clamp = (x: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, x))
const TEMPO_BPM: Record<Tempo, number> = { slow: 72, mid: 96, fast: 124 }

// Small bilingual word lists (English and Russian stems). They only steer the look of a page.
const LEX = {
  calm: ['quiet', 'calm', 'slow', 'soft', 'peace', 'cozy', 'cosy', 'tea', 'cocoa', 'walk', 'talk', 'lazy', 'breeze', 'read', 'nap', 'still', 'gentle', 'blanket', 'perfect', 'тих', 'спокой', 'мягк', 'уют', 'чай', 'какао', 'гуля', 'разговар', 'плед', 'читал', 'мирн', 'нежн'],
  joy: ['laugh', 'happy', 'joy', 'party', 'danc', 'birthday', 'celebrat', 'sing', 'sang', 'cheer', 'hug', 'fun', 'smil', 'together', 'best', 'смея', 'смех', 'счаст', 'праздн', 'танц', 'рожден', 'радост', 'весел', 'улыб', 'обним', 'вместе', 'лучш'],
  tense: ['deadline', 'rush', 'stress', 'panic', 'broke', 'bug', 'error', 'exam', 'urgent', 'office', 'tired', 'wired', 'caffeine', 'cold brew', 'submit', 'gave up', 'give up', 'overtime', 'angry', 'couldn', 'can’t sleep', "can't sleep", 'дедлайн', 'сдач', 'сроч', 'стресс', 'паник', 'офис', 'устал', 'экзамен', 'ошибк', 'баг', 'нерв', 'не успева', 'злюсь', 'злил'],
  sad: ['miss ', 'missed ', 'alone', 'lonely', 'sad', 'cry', 'cried', 'gone', 'goodbye', 'empty', 'tears', 'sorry', 'heavy', 'скуча', 'одинок', 'груст', 'плак', 'пуст', 'прощ', 'потерял', 'слез', 'тяжел'],
  nostalgic: ['nostalg', 'remember', 'used to', 'childhood', 'years ago', 'back then', 'first time', 'grandm', 'grandp', 'ностальг', 'помн', 'детств', 'раньше', 'когда-то', 'вспомина', 'бабушк', 'дедушк'],
  motion: ['ran ', 'sprint', 'rush', 'shout', 'yell', 'scream', 'crowd', 'concert', 'loud', 'jump', 'race', 'festival', 'stage', 'drum', 'бежал', 'бег', 'крич', 'шумн', 'концерт', 'толп', 'быстр', 'прыга', 'фестивал', 'сцен'],
  warm: ['sun', 'warm', 'orange', 'golden', 'fire', 'candle', 'cocoa', 'summer', 'autumn', 'leaves', 'солн', 'тепл', 'оранж', 'золот', 'огон', 'свеч', 'лето', 'осен', 'листь'],
  cold: ['cold', 'snow', 'ice', 'frost', 'winter', 'fog', 'rain', 'sleet', 'grey', 'gray', 'холод', 'снег', 'лёд', 'мороз', 'зим', 'туман', 'дожд', 'серо'],
}
type Lex = keyof typeof LEX

const escape = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const lexRe = Object.fromEntries((Object.keys(LEX) as Lex[]).map((k) => [k, new RegExp(`(?<![\\p{L}])(${LEX[k].map(escape).join('|')})`, 'giu')])) as Record<Lex, RegExp>

const count = (text: string, k: Lex) => (text.match(lexRe[k]) ?? []).length

/** The words that fired a list, as written (whole words; phrases kept whole). */
function found(text: string, k: Lex, n = 2) {
  const seen: string[] = []
  for (const m of text.matchAll(lexRe[k])) {
    const stem = m[0].trim()
    const w = stem.includes(' ') ? stem : (text.slice(m.index).match(/^[\p{L}’'-]+/u)?.[0] ?? stem)
    if (!seen.includes(w)) seen.push(w)
    if (seen.length >= n) break
  }
  return seen
}

const GENRE_UP = /(electro|techno|house|drum|dnb|edm|punk|metal|rock|hip ?hop|rap|dance|disco|drill|trap)/i
const GENRE_SOFT = /(ambient|classical|folk|acoustic|jazz|lo-?fi|ballad|piano|chamber|bossa|soul)/i
const GENRE_GEOMETRIC = /(electro|techno|house|idm|synth|minimal)/i

/** What the rules read. Photographs are optional: their colours arrive a moment later. */
export interface DayInput {
  story: string
  date: string
  time?: string
  weather?: string
  mood?: string
  location?: string
  /** who was there: company adds a little pace to a page */
  people?: string[]
  song?: Song
  photoCount: number
  swatches?: Swatch[]
  /** the day the page is looked at: old days slowly turn into film */
  today?: Date
}

export function inputFor(m: Memory, swatches?: Swatch[], today?: Date): DayInput {
  return { story: m.story, date: m.date, time: m.time, weather: m.weather, mood: m.mood, location: m.location, people: m.people, song: m.song, photoCount: Math.max(1, m.photoIds.length), swatches, today }
}

type Season = 'winter' | 'spring' | 'summer' | 'autumn'
type PartOfDay = 'night' | 'morning' | 'afternoon' | 'evening'

function season(date: string): Season {
  const mth = Number(date.slice(5, 7))
  return mth === 12 || mth <= 2 ? 'winter' : mth <= 5 ? 'spring' : mth <= 8 ? 'summer' : 'autumn'
}
function partOfDay(time?: string): PartOfDay | undefined {
  const h = time ? Number(time.split(':')[0]) : NaN
  if (Number.isNaN(h)) return undefined
  return h >= 21 || h < 5 ? 'night' : h < 11 ? 'morning' : h < 17 ? 'afternoon' : 'evening'
}

/** Warm hues (reds, oranges, yellows) push towards +1, blues and greens towards -1. */
function photoTone(sw?: Swatch[]) {
  if (!sw?.length) return { warmth: 0, known: false }
  let w = 0
  let t = 0
  for (const s of sw) {
    t += s.weight
    if (s.h < 0) continue
    const warm = s.h < 70 || s.h > 330 ? 1 : s.h > 170 && s.h < 270 ? -1 : 0
    w += warm * s.weight * (0.5 + s.s)
  }
  return { warmth: clamp(w / (t || 1), -1, 1), known: true }
}

export function hslHex(h: number, s: number, l: number) {
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

const BASE: Record<Technique, { paper: string; ink: string; accent: string; second: string; wash: string }> = {
  monet: { paper: '#F4EADB', ink: '#3A2E25', accent: '#C27A3A', second: '#9DAF8A', wash: '#F2C98B' },
  kandinsky: { paper: '#E6E9EC', ink: '#121820', accent: '#2F5DA8', second: '#C8393B', wash: '#E8C23A' },
  film: { paper: '#E8DBC2', ink: '#2B241E', accent: '#E0782C', second: '#7C8B6E', wash: '#F0A44B' },
  collage: { paper: '#FAF6EE', ink: '#211B17', accent: '#D0452F', second: '#3F6FB5', wash: '#E9B73E' },
  ma: { paper: '#F4F3EF', ink: '#2A2A28', accent: '#B8352B', second: '#8E9A8C', wash: '#D9D4C8' },
}

/** The rules. The same day in gives the same page out: nothing is random. */
export function atmosphere(d: DayInput): Atmosphere {
  const text = `${d.story}\n${d.mood ?? ''}. ${d.mood ?? ''}.\n${d.weather ?? ''}`.toLowerCase()
  const sentences = Math.max(1, d.story.split(/[.!?…\n]+/).filter((s) => s.trim()).length)
  const n = (k: Lex) => count(text, k)
  const per = (x: number) => x / Math.sqrt(sentences)
  const reasons: string[] = []

  // music: tempo, energy, key, genre, era
  const song = d.song
  const bpm = song?.bpm ?? TEMPO_BPM[song?.tempo ?? 'mid']
  // tempo says how fast; a measured recording also says how loud and dense it is
  const tempoEnergy = clamp((bpm - 60) / 80)
  let musicEnergy = song?.energy !== undefined ? 0.5 * song.energy + 0.5 * tempoEnergy : tempoEnergy
  if (song?.genre && GENRE_UP.test(song.genre)) musicEnergy = clamp(musicEnergy + 0.15)
  if (song?.genre && GENRE_SOFT.test(song.genre)) musicEnergy = clamp(musicEnergy - 0.1)
  const minor = song?.mode === 'minor'
  const major = song?.mode === 'major'

  // words, time and season
  const textEnergy = clamp(0.45 + 0.22 * per(n('tense') + n('motion') + 0.5 * n('joy') - 0.7 * n('calm')))
  const pod = partOfDay(d.time)
  const sea = season(d.date)

  // photographs
  const ph = photoTone(d.swatches)

  // the four axes
  const company = d.people?.filter((p) => p.trim()) ?? []
  const energy = clamp(0.5 * musicEnergy + 0.5 * textEnergy + (d.photoCount >= 5 ? 0.04 : 0) + Math.min(0.12, 0.03 * company.length))
  const weather = d.weather ?? ''
  const weatherTone = /sun|clear|солн|ясн/i.test(weather) ? 0.1 : /rain|snow|sleet|grey|gray|fog|дожд|снег|туман/i.test(weather) ? -0.08 : 0
  const bright = song?.brightness !== undefined ? 0.12 * (song.brightness - 0.5) : 0
  const valence = clamp(0.16 * per(n('joy') + 0.6 * n('calm') - n('sad') - 0.75 * n('tense')) + (major ? 0.22 : minor ? -0.22 : 0) + weatherTone + bright, -1, 1)
  const seasonWarm = { summer: 0.5, autumn: 0.6, spring: 0.1, winter: -0.6 }[sea]
  const timeWarm = pod === 'night' ? -0.6 : pod === 'evening' || pod === 'afternoon' ? 0.3 : 0
  const wordWarm = clamp((n('warm') - n('cold')) / 3, -1, 1)
  const degrees = Number(weather.match(/(-?\d+)\s*°/)?.[1] ?? NaN)
  const tempWarm = Number.isNaN(degrees) ? 0 : clamp((degrees - 12) / 12, -1, 1)
  const warmth = clamp((ph.known ? 0.45 * ph.warmth + 0.15 * seasonWarm : 0.25 * seasonWarm) + 0.25 * tempWarm + 0.15 * timeWarm + 0.2 * wordWarm, -1, 1)
  const today = d.today ?? new Date()
  const ageYears = Math.max(0, (today.getTime() - new Date(d.date + 'T12:00').getTime()) / (365.25 * 86400000))
  const ageScore = clamp((ageYears - 1.5) / 4)
  const eraScore = song?.year ? clamp((2005 - song.year) / 30) : 0
  const nostalgia = clamp(0.85 * Math.max(ageScore, eraScore) + 0.15 * clamp(n('nostalgic') / 2))

  // the technique: time first (old days turn into film), then pace, then weight
  const geometric = !!song?.genre && GENRE_GEOMETRIC.test(song.genre)
  let technique: Technique
  if (nostalgia >= 0.6) technique = 'film'
  else if ((energy >= 0.6 && valence < 0.15) || (geometric && energy >= 0.5 && valence < 0.3)) technique = 'kandinsky'
  else if (energy >= 0.55) technique = 'collage'
  else if (valence <= -0.2) technique = 'ma'
  else technique = 'monet'

  // rhythm: a photograph stays for a number of beats of the day's song
  const beats = { monet: 8, ma: 12, film: 6, collage: 4, kandinsky: 4 }[technique]
  const hold = +clamp((beats * 60) / bpm, 0.9, 10).toFixed(2)
  const fade = { monet: 2.2, ma: 2.8, film: 0.9, collage: 0.3, kandinsky: 0.06 }[technique]

  // why, most important first
  const tq = TECHNIQUES[technique]
  if (technique === 'film' && ageScore >= eraScore) reasons.push(`This day is ${Math.floor(ageYears)} years old, and old days are printed as a ${tq.name.toLowerCase()}, after ${tq.after}: ${tq.how}. ${capital(tq.why)}.`)
  else if (technique === 'film') reasons.push(`The song comes from the ${Math.floor((song?.year ?? 2000) / 10) * 10}s, so the day is printed as a ${tq.name.toLowerCase()}, after ${tq.after}: ${tq.how}. ${capital(tq.why)}.`)
  else reasons.push(`${tq.name}, after ${tq.after}: the rule for ${tq.when}. ${capital(tq.how)}. ${capital(tq.why)}.`)
  const songName = song?.title ? `“${song.title}”` : 'With no song, a steady'
  const facts = [`${Math.round(bpm)} bpm`, song?.mode ? `${song.mode} key` : '', song?.genre?.toLowerCase() ?? '', song?.year ? String(song.year) : ''].filter(Boolean).join(', ')
  reasons.push(
    `${songName} (${facts}) sets the rhythm: a new photograph every ${hold.toFixed(1)} s, ${beats} beats each${minor ? '. The minor key mutes the colours' : major ? '. The major key keeps the colours bright' : ''}.`,
  )
  const q = (ws: string[]) => ws.map((w) => `‘${w}’`).join(' and ')
  const pace = (energy >= 0.55 ? [...found(text, 'tense'), ...found(text, 'motion')] : found(text, 'calm')).slice(0, 2)
  const tone = valence >= 0.15 ? found(text, 'joy') : valence <= -0.15 ? found(text, 'sad') : []
  const said = [
    pace.length ? `${q(pace)} ${pace.length === 1 ? 'makes' : 'make'} the page ${energy >= 0.55 ? 'faster and sharper' : 'slower and softer'}` : '',
    tone.length ? `${q(tone)} ${tone.length === 1 ? (valence > 0 ? 'keeps' : 'gives') : valence > 0 ? 'keep' : 'give'} it ${valence > 0 ? 'light' : 'weight'}` : '',
  ].filter(Boolean)
  if (said.length) reasons.push(`In the story, ${said.join('; ')}.`)
  if (song?.energy !== undefined) reasons.push(`Measured from the recording on this device: energy ${Math.round(song.energy * 100)} of 100, brightness ${Math.round((song.brightness ?? 0) * 100)} of 100.`)
  if (company.length) reasons.push(`${company.length === 1 ? `With ${company[0]}` : `With ${company.slice(0, -1).join(', ')} and ${company[company.length - 1]}`}: company adds a little pace to the page.`)
  if (ph.known) reasons.push(`The photographs lean ${ph.warmth > 0.15 ? 'warm (ambers and reds)' : ph.warmth < -0.15 ? 'cool (blues and greys)' : 'neutral'}; the page takes its colours from them.`)
  reasons.push(`${capital(pod ? `${sea} ${pod}` : sea)}${weather ? `, ${weather.toLowerCase()}` : ''}: the light on the page is ${warmth > 0.15 ? 'warm' : warmth < -0.15 ? 'cold' : 'neutral'}.`)

  // palette: the technique's family, tuned by the photographs and the key
  const base = BASE[technique]
  const lead = d.swatches?.find((x) => x.h >= 0 && x.s > 0.18)
  const sat = minor ? 0.72 : major ? 1.1 : 1
  let { accent, second, wash, paper } = base
  if (lead && technique === 'monet') {
    accent = hslHex(lead.h, 0.5 * sat, 0.48)
    wash = hslHex(lead.h, 0.6 * sat, 0.78)
    paper = hslHex(lead.h, 0.36, 0.92)
  }
  if (lead && technique === 'collage') {
    accent = hslHex(lead.h, Math.min(0.85, 0.7 * sat), 0.5)
    second = hslHex((lead.h + 180) % 360, 0.55, 0.45)
  }
  if (lead && technique === 'film') wash = hslHex(lead.h, 0.55, 0.62)
  if (technique === 'monet' && warmth < -0.3) {
    paper = '#ECEEEC'
    wash = '#BFD3E0'
  }

  const grade = {
    monet: `sepia(${(0.12 + 0.18 * Math.max(0, warmth)).toFixed(2)}) saturate(${minor ? 0.85 : 1.1}) contrast(0.9) brightness(1.05)`,
    kandinsky: 'grayscale(0.6) contrast(1.35) brightness(0.92)',
    film: 'sepia(0.32) saturate(0.85) contrast(0.84) brightness(1.08)',
    collage: `saturate(${minor ? 1.05 : 1.3}) contrast(1.08)`,
    ma: 'grayscale(0.45) contrast(0.86) brightness(1.08)',
  }[technique]
  const texture = ({ monet: 'linen', kandinsky: 'smooth', film: 'grain', collage: 'kraft', ma: 'washi' } as const)[technique]

  const lang = /[а-яё]/i.test(d.story) ? 'ru' : 'en'
  const voice = { lang, rate: +(0.84 + energy * 0.36).toFixed(2), pitch: +(0.92 + (valence + 1) * 0.06).toFixed(2), pause: Math.round(160 + (1 - energy) * 520) } as const
  reasons.push(`Read aloud, a synthetic voice speaks at ${voice.rate}× with ${voice.pause} ms between sentences: ${energy >= 0.55 ? 'quick, like the day' : 'unhurried, like the day'}.`)

  const mood = `${energy >= 0.6 ? 'fast' : energy <= 0.4 ? 'slow' : 'steady'}, ${valence >= 0.15 ? 'light' : valence <= -0.15 ? 'heavy' : 'even'} and ${warmth >= 0.15 ? 'warm' : warmth <= -0.15 ? 'cold' : 'neutral'}`

  return {
    technique,
    mood,
    axes: { energy: +energy.toFixed(2), valence: +valence.toFixed(2), warmth: +warmth.toFixed(2), nostalgia: +nostalgia.toFixed(2) },
    palette: { paper, ink: base.ink, accent, second, wash },
    grade,
    texture,
    rhythm: { bpm: Math.round(bpm), beats, hold, fade },
    voice,
    reasons,
  }
}

function capital(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s
}

// ---------------------------------------------------------------------------------------------------
// Folder names: three to seven words in one quiet tone, built only from what the entry says.

/** [stem, English phrase, Russian phrase] for places a story mentions. */
const PLACES: [RegExp, string, string][] = [
  [/bus stop|остановк/i, 'at the bus stop', 'на остановке'],
  [/park|парк/i, 'in the park', 'в парке'],
  [/office|офис/i, 'at the office', 'в офисе'],
  [/beach|пляж/i, 'on the beach', 'на пляже'],
  [/\bsea\b|мор[еяю]/i, 'by the sea', 'у моря'],
  [/lake|озер/i, 'by the lake', 'у озера'],
  [/kitchen|кухн/i, 'in the kitchen', 'на кухне'],
  [/station|вокзал/i, 'at the station', 'на вокзале'],
  [/train|поезд/i, 'on the train', 'в поезде'],
  [/school|школ/i, 'at school', 'в школе'],
  [/rooftop|roof|крыш/i, 'on the roof', 'на крыше'],
  [/market|рын/i, 'at the market', 'на рынке'],
  [/river|рек[аеиу]/i, 'by the river', 'у реки'],
  [/café|cafe|coffee shop|кафе/i, 'in a café', 'в кафе'],
  [/garden|сад/i, 'in the garden', 'в саду'],
  [/forest|woods|лес/i, 'in the woods', 'в лесу'],
  [/library|библиотек/i, 'in the library', 'в библиотеке'],
  [/desk|стол/i, 'at the desk', 'за столом'],
  [/mountain|гор[ыах]/i, 'in the mountains', 'в горах'],
]

/** Events name the day on their own; details colour it. [stem, kind, English, Russian] */
const DETAILS: [RegExp, 'before' | 'at' | 'of' | 'after' | 'with', string, string][] = [
  [/deadline|submit|дедлайн|сдач/i, 'before', 'the deadline', 'перед дедлайном'],
  [/\bexam|экзамен/i, 'before', 'the exam', 'перед экзаменом'],
  [/concert|gig|концерт/i, 'at', 'the concert', 'на концерте'],
  [/birthday|день рожд/i, 'at', 'a birthday', 'на дне рождения'],
  [/goodbye|left for|said bye|прощ|уехал/i, 'after', 'a goodbye', 'после прощания'],
  [/millionaire|my own company|big plans|мечта|планы/i, 'of', 'big plans', 'больших планов'],
  [/first snow|первый снег/i, 'with', 'first snow', 'с первым снегом'],
  [/leaves|листопад|листь/i, 'with', 'falling leaves', 'с листопадом'],
  [/cocoa|какао/i, 'with', 'cocoa', 'с какао'],
  [/\btea\b|чай/i, 'with', 'tea', 'с чаем'],
  [/rain|дожд/i, 'with', 'rain', 'под дождём'],
]

// Russian adjectives agree with the noun: вечер and день are masculine, утро neuter, ночь feminine
const RU_POD: Record<PartOfDay, [string, 'm' | 'n' | 'f']> = { night: ['ночь', 'f'], morning: ['утро', 'n'], afternoon: ['день', 'm'], evening: ['вечер', 'm'] }
const RU_SEASON: Record<Season, Record<'m' | 'n' | 'f', string>> = {
  winter: { m: 'Зимний', n: 'Зимнее', f: 'Зимняя' },
  spring: { m: 'Весенний', n: 'Весеннее', f: 'Весенняя' },
  summer: { m: 'Летний', n: 'Летнее', f: 'Летняя' },
  autumn: { m: 'Осенний', n: 'Осеннее', f: 'Осенняя' },
}

/** "Autumn afternoon in Linden Park", "Night before the deadline": the name the day's folder gets. */
export function folderName(d: Pick<DayInput, 'story' | 'date' | 'time' | 'location'>): string {
  const ru = /[а-яё]/i.test(d.story)
  const text = `${d.story} ${d.location ?? ''}`
  const pod = partOfDay(d.time) ?? partOfDay(d.story.match(/\b(\d{1,2}):\d{2}\b/)?.[0])
  const sea = season(d.date)
  const event = DETAILS.find(([re]) => re.test(text))
  // a proper name ("Linden Park") is kept as written; "my bedroom desk" becomes a generic place
  const loc = d.location?.trim() ?? ''
  const proper = /^\p{Lu}/u.test(loc) && !/^(my|the|our|мой|моя|наш|наша)\s/i.test(loc) && !loc.includes(',') && loc.split(/\s+/).length <= 3 ? loc : undefined
  const place = PLACES.find(([re]) => re.test(text))

  let name: string
  if (ru) {
    const [noun, g] = pod ? RU_POD[pod] : (['день', 'm'] as const)
    const lead = `${RU_SEASON[sea][g]} ${noun}`
    if (event?.[1] === 'before' && pod) name = `${capital(noun)} ${event[3]}`
    else if (event && event[1] !== 'with') name = `${lead} ${event[3]}`
    else if (proper) name = `${lead}, ${proper}`
    else if (place) name = `${lead} ${place[2]}`
    else if (event) name = `${lead} ${event[3]}`
    else name = `${{ m: 'Обычный', n: 'Обычное', f: 'Обычная' }[g]} ${RU_SEASON[sea][g].toLowerCase()} ${noun}`
  } else {
    const lead = `${capital(sea)} ${pod ?? 'day'}`
    if (event?.[1] === 'before') name = `${pod ? capital(pod) : 'The day'} before ${event[2]}`
    else if (event && event[1] !== 'with') name = `${lead} ${event[1]} ${event[2]}`
    else if (proper) name = `${lead} in ${proper}`
    else if (place) name = `${lead} ${place[1]}`
    else if (event) name = `${lead} with ${event[2]}`
    else name = `An ordinary ${sea} ${pod ?? 'day'}`
  }
  // one length for the whole diary: three to seven words
  const words = name.split(/\s+/).filter(Boolean).slice(0, 7)
  while (words.length < 3) words.push(ru ? 'дня' : 'again')
  return words.join(' ')
}
