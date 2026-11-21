// The visual system of Afterimage: how the feeling of a day becomes form.
//
// Everything here is deterministic and explainable. The same day always gets the same
// card, and every choice comes with the reason it was made. No network, no model:
// the "reader" works on word stems (English and Russian), the photo's own colours and
// whatever is known about the song (tempo, energy, major/minor, genre, year).
//
//   signals  →  technique (an art reference)  →  variable parameters  →  reasons
//
// What never changes from day to day lives in CONSTANTS below; it is what makes
// a feed of days look like one person's diary.
import type { Memory, Mode, MusicMeta, Song } from './types'
import { BPM } from './sound'
import type { Swatch } from './colors'
import { extractRecall, norm, sentences } from './extract'

/* ------------------------------------------------------------------ */
/* constants: the parts of the card that never move                    */
/* ------------------------------------------------------------------ */

export const CONSTANTS = {
  format: 'A 4:5 card (1080×1350), the same frame for every day',
  grid: '12 columns, 6% outer margin, 8px baseline; the photo window always sits on columns 2–11',
  type: 'Cormorant Garamond for the folder name and the quoted line, JetBrains Mono for the date, Inter for labels',
  date: 'Top left, mono, upper case: weekday · date · time',
  title: 'Bottom left, serif, the folder name in 3–7 words',
  caption: 'Under the title: one sentence quoted verbatim from the story, never rewritten',
  song: 'Bottom right: the record tag with the song and artist',
  photo: 'Photos change inside one window; they never break the grid, only its treatment changes',
  mark: 'The ◇ Afterimage mark in the lower margin, so every page is signed the same way',
} as const

/* ------------------------------------------------------------------ */
/* music: what we know (or can guess) about the song                   */
/* ------------------------------------------------------------------ */

export type { Mode, MusicMeta }
export type GenreFamily = 'acoustic' | 'classical' | 'jazz' | 'folk' | 'electronic' | 'rock' | 'pop' | 'hiphop' | 'ambient'

/** A regex that matches at the start of a word in any script (\b only knows ASCII). */
const W = (src: string) => new RegExp(`(?<!\\p{L})(?:${src})`, 'u')

const GENRES: [GenreFamily, RegExp][] = [
  ['electronic', W('electro|techno|house|edm|synth|trance|drum.?n.?bass|dnb|dubstep|электрон|техно|хаус|синт')],
  ['hiphop', W('hip.?hop|rap|trap|grime|хип.?хоп|рэп|рап|трэп')],
  ['rock', W('rock|punk|metal|grunge|indie rock|рок|панк|метал|гранж')],
  ['jazz', W('jazz|swing|bossa|blues|soul|джаз|свинг|босса|блюз|соул')],
  ['classical', W('classical|piano|orchestr|symphon|sonata|chamber|классик|фортепиан|пианин|оркестр|симфон|соната')],
  ['folk', W('folk|country|acoustic guitar|singer.?songwriter|фолк|кантри|бард|домбр')],
  ['ambient', W('ambient|drone|lo.?fi|lofi|chill|downtempo|эмбиент|лоу.?фай|чил')],
  ['acoustic', W('acoustic|unplugged|акустик')],
  ['pop', W('pop|k-?pop|dance|disco|поп|диско|танцев')],
]

const MINOR_HINT = W('sad|melanchol|minor|dark|blue|lonely|грустн|печальн|минор|меланхол|мрачн|тоскл')
const MAJOR_HINT = W('happy|bright|major|sunny|upbeat|joy|весел|радостн|мажор|светл|солнечн')

export interface MusicSignals {
  bpm: number
  energy: number
  mode?: Mode
  genre?: GenreFamily
  year?: number
  era: 'vintage' | 'retro' | 'modern'
  /** where each value came from, for the explanation */
  source: { bpm: 'measured' | 'typed' | 'tempo'; mode: 'typed' | 'guessed' | 'unknown' }
}

export function musicSignals(song?: Song): MusicSignals | undefined {
  if (!song) return undefined
  // genre and key only from what was said about the song: a title like "Lake House" is not a genre,
  // and "Blue Suede Shoes" is not in a minor key
  const text = norm([song.genre, song.description].filter(Boolean).join(' '))
  const genre = text ? GENRES.find(([, re]) => re.test(text))?.[0] : undefined
  const bpm = song.bpm && song.bpm > 30 && song.bpm < 240 ? Math.round(song.bpm) : BPM[song.tempo ?? 'slow']
  const baseEnergy = { slow: 0.28, mid: 0.55, fast: 0.85 }[song.tempo ?? 'slow']
  const genreEnergy: Partial<Record<GenreFamily, number>> = { electronic: 0.12, rock: 0.15, hiphop: 0.08, ambient: -0.18, classical: -0.1, acoustic: -0.08, folk: -0.05 }
  const energy = clamp(song.energy ?? baseEnergy + (genre ? (genreEnergy[genre] ?? 0) : 0), 0, 1)
  let mode = song.mode
  let modeSource: MusicSignals['source']['mode'] = mode ? 'typed' : 'unknown'
  if (!mode && MINOR_HINT.test(text)) [mode, modeSource] = ['minor', 'guessed']
  else if (!mode && MAJOR_HINT.test(text)) [mode, modeSource] = ['major', 'guessed']
  const year = song.year && song.year > 1900 && song.year < 2100 ? song.year : undefined
  const era = year === undefined ? 'modern' : year < 1985 ? 'vintage' : year < 2005 ? 'retro' : 'modern'
  return { bpm, energy, mode, genre, year, era, source: { bpm: song.bpm ? (song.bpmSource ?? 'typed') : 'tempo', mode: modeSource } }
}

/* ------------------------------------------------------------------ */
/* the text: a small bilingual lexicon of word stems                   */
/* ------------------------------------------------------------------ */

const L = (s: string) => s.split(/\s+/).filter(Boolean).map(norm)

const LEX = {
  pos: L(`happy happi joy laugh love lovely perfect beautiful warm cozy cosy smil fun= funny glad delight wonderful peace grateful hug= hugs= hugged celebrat cocoa kiss sweet bliss proud free=
    счаст радост радов смея смеял смех люблю любим прекрас красив тепл уют улыб весел кайф нежн обним праздн благодар какао сладк горд свобод`),
  neg: L(`sad cried crying tired lonely lost angry afraid scared anxious worried worry stress pain= painful sick broke failed fail hate empty exhaust gloomy miserable awful
    грус печал плак устал одинок скуча потерял злой злюсь злость страш боюсь тревог стресс больно болел сломал провал ненав пуст тоск ужасн`),
  high: L(`run running rush dance danc scream yell party loud crowd fast wild deadline excit jump concert club race hurry panic shout adrenaline
    бежал бега спеш танц крич вечерин громк толп быстр дедлайн взволн прыг концерт клуб гонк паник адренал`),
  calm: L(`quiet slow calm sleep tea= read= reading sat= sitting lazy soft gentle silence nap breath slowly drift
    тих медлен спокой спал сон чай читал сидел лениво мягк тишин дремал дыша плед`),
  tension: L(`deadline due exam panic stress urgent crash bug error office submit rush overtime
    дедлайн сдач экзам срочн ошибк баг офис паник стресс нерв аврал`),
  nostalgia: L(`remember nostalg childhood grandma grandmother grandpa cassette vinyl polaroid ago= old=
    помню вспомин ностальг детств бабуш дедуш кассет винил полароид давно старый`),
  nature: L(`park lake sea= river forest garden mountain beach leaves leaf flower sky meadow field pond shore waves
    парк озер море моря реке река лес= леса= лесу= лесн сад= саду= горы= гора= горах пляж листь лист цвет небо неба луг поле пруд берег волн`),
  night: L(`midnight night neon dark 3am insomnia
    ночь ночью полноч темн неон бессон`),
  group: L(`friends together everyone family crowd party we= us= team
    друз вместе семь толп вечерин мы= нас= команд`),
  alone: L(`alone myself lonely solitude empty
    один= одна= одиноч сам= сама= пуст`),
  sense: L(`light smell sound sun wind rain snow warm cold glow shadow golden orange voice music song birds quiet loud taste air
    свет запах звук солнц ветер дожд снег тепл холод сиян тень золот оранж голос музык песн птиц тишин вкус воздух`),
}

/** English as whole words ("clear", not "clearly"), Russian as stems ("дожд…"). */
const EW = (en: string, ru: string) => new RegExp(`(?<!\\p{L})(?:(?:${en})(?!\\p{L})|${ru})`, 'u')

const WEATHER: [Weather, RegExp][] = [
  ['snow', EW('snow|snowy|snowing|snowfall|blizzard|frost|frosty', 'снег|снеж|метел|мороз')],
  ['rain', EW('rain|rainy|raining|drizzle|storm|stormy|shower|showers', 'дожд|ливн|гроз|морос')],
  ['fog', EW('fog|foggy|mist|misty|haze|hazy', 'туман|дымк')],
  ['wind', EW('wind|windy|gust|gusts', 'ветр|ветер')],
  ['clear', EW('sun|sunny|sunshine|clear sky|cloudless', 'солн|ясн')],
  ['cloud', EW('cloud|cloudy|clouds|overcast|grey sky|gray sky', 'облач|пасмур|хмур')],
]

function tokens(s: string) {
  return [...norm(s).matchAll(/\p{L}[\p{L}\d]*|\d+am/gu)].map((m) => m[0])
}

/** Counts words that start with a stem; a stem ending in "=" must match the whole word ("we=" is not "went"). */
function hits(words: string[], stems: string[]) {
  let n = 0
  for (const w of words) if (stems.some((s) => (s.endsWith('=') ? w === s.slice(0, -1) : w.startsWith(s)))) n++
  return n
}

/* ------------------------------------------------------------------ */
/* signals                                                             */
/* ------------------------------------------------------------------ */

export type Light = 'dawn' | 'day' | 'golden' | 'dusk' | 'night'
export type Season = 'winter' | 'spring' | 'summer' | 'autumn'
export type Weather = 'clear' | 'cloud' | 'rain' | 'snow' | 'fog' | 'wind'
export type Company = 'alone' | 'pair' | 'group'

export interface DaySignals {
  /** −1 heavy … +1 light-hearted */
  valence: number
  /** 0 still … 1 rushing */
  arousal: number
  /** 0 … 1: deadlines, exams, alarms */
  tension: number
  nostalgia: number
  nature: number
  light: Light
  season: Season
  weather?: Weather
  company: Company
  music?: MusicSignals
  photo?: { hue: number; sat: number; light: number; warmth: number }
}

function lightFrom(time: string | undefined, text: string): Light {
  const h = time && /^\d{1,2}:\d\d/.test(time) ? Number(time.split(':')[0]) : NaN
  if (!Number.isNaN(h)) return h >= 5 && h < 8 ? 'dawn' : h < 16 && h >= 8 ? 'day' : h >= 16 && h < 19 ? 'golden' : h >= 19 && h < 21 ? 'dusk' : 'night'
  const t = norm(text)
  if (W('dawn|sunrise|рассвет').test(t)) return 'dawn'
  if (W('sunset|golden hour|закат').test(t)) return 'golden'
  if (W('night|midnight|ночь|ночью|полноч').test(t)) return 'night'
  if (W('evening|вечер').test(t)) return 'dusk'
  return 'day'
}

function seasonFrom(date: string): Season {
  const mo = Number(date.slice(5, 7))
  return mo === 12 || mo <= 2 ? 'winter' : mo <= 5 ? 'spring' : mo <= 8 ? 'summer' : 'autumn'
}

function photoFrom(sw?: Swatch[]) {
  if (!sw?.length) return undefined
  let x = 0, y = 0, s = 0, l = 0, w = 0
  for (const c of sw) {
    const a = (c.h * Math.PI) / 180
    x += Math.cos(a) * c.weight * c.s
    y += Math.sin(a) * c.weight * c.s
    s += c.s * c.weight
    l += c.l * c.weight
    w += c.weight
  }
  if (!w) return undefined
  const hue = ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
  const warmth = Math.cos(((hue - 35) * Math.PI) / 180) // 1 = orange, −1 = blue
  return { hue, sat: s / w, light: l / w, warmth: (s / w) > 0.08 ? warmth : 0 }
}

/** The first time found in the day: the memory's own time, else the first timed moment. */
function firstTime(m: Pick<Memory, 'time' | 'moments'>) {
  return m.time ?? m.moments.find((x) => x.time && /^\d\d:\d\d$/.test(x.time))?.time
}

export type DayInput = Pick<Memory, 'story' | 'date' | 'people' | 'moments'> & Partial<Pick<Memory, 'time' | 'mood' | 'weather' | 'location' | 'title'>> & { song?: Song }

export function readSignals(m: DayInput, swatches?: Swatch[]): DaySignals {
  const all = [m.story, m.mood, m.weather, m.location].filter(Boolean).join(' ')
  const words = tokens(all)
  // the mood field is the user telling us directly — it counts double
  const moodWords = tokens(m.mood ?? '')
  const count = (k: keyof typeof LEX) => hits(words, LEX[k]) + hits(moodWords, LEX[k])
  const pos = count('pos')
  const neg = count('neg')
  const high = count('high')
  const calm = count('calm')
  const music = musicSignals(m.song)

  let valence = (pos - neg) / (pos + neg + 1.5)
  if (music?.mode === 'major') valence += 0.12
  if (music?.mode === 'minor') valence -= 0.15
  valence = clamp(valence, -1, 1)

  const textArousal = 0.45 + ((high - calm) / (high + calm + 2)) * 0.55
  const arousal = clamp(music ? textArousal * 0.6 + music.energy * 0.4 : textArousal, 0, 1)
  const scale = (n: number, k: number) => clamp(n / k, 0, 1)
  const people = m.people.length
  const groupWords = count('group')
  const aloneWords = count('alone')
  const company: Company = people >= 2 || groupWords >= 3 ? 'group' : people === 1 || groupWords >= 1 ? 'pair' : aloneWords > 0 || people === 0 ? 'alone' : 'pair'
  const night = count('night')
  let light = lightFrom(firstTime(m), all)
  if (light === 'day' && night >= 2) light = 'night'

  return {
    valence,
    arousal,
    tension: scale(count('tension'), 3),
    nostalgia: scale(count('nostalgia'), 2),
    nature: scale(count('nature'), 3),
    light,
    season: seasonFrom(m.date),
    // what the user typed in the weather field wins over what the story mentions in passing
    weather: (m.weather && WEATHER.find(([, re]) => re.test(norm(m.weather!)))?.[0]) || WEATHER.find(([, re]) => re.test(norm(all)))?.[0],
    company,
    music,
    photo: photoFrom(swatches),
  }
}

/* ------------------------------------------------------------------ */
/* techniques: the references the system draws from                    */
/* ------------------------------------------------------------------ */

export type TechniqueId = 'impression' | 'kandinsky' | 'film' | 'ma' | 'collage' | 'nocturne'

export interface Technique {
  id: TechniqueId
  name: string
  reference: string
  /** which feeling it is for, and why it carries that feeling */
  for: string
  why: string
}

export const TECHNIQUES: Record<TechniqueId, Technique> = {
  impression: {
    id: 'impression',
    name: 'Brushed light',
    reference: 'Claude Monet, Impressionism: broken colour, soft edges, light over outline',
    for: 'calm, warm, unhurried days outdoors; slow songs in a major key',
    why: 'Impressionism paints the light of a moment rather than the things in it, which is how a calm day is remembered: as a temperature and a glow, not as a list of objects.',
  },
  kandinsky: {
    id: 'kandinsky',
    name: 'Composition in tension',
    reference: 'Wassily Kandinsky, Composition VIII; Bauhaus geometry',
    for: 'deadlines, exams, wired nights; fast, electronic or loud songs',
    why: 'Kandinsky treated line and angle as sound. Sharp diagonals, circles and a hard grid feel like pressure and rhythm, the way a high-stakes day feels from the inside.',
  },
  film: {
    id: 'film',
    name: 'Found film',
    reference: '35mm and Polaroid snapshots, the vernacular photography of the 70s–90s',
    for: 'nostalgic days, childhood places, songs from another decade',
    why: 'Grain, warm casts and light leaks are how we have learned to see "the past". Borrowing them makes a recent day already feel like something kept.',
  },
  ma: {
    id: 'ma',
    name: 'Ma (the space between)',
    reference: 'Japanese minimal graphics: Hasegawa Tōhaku’s pine screens, Muji-era layout, the empty interval ma',
    for: 'quiet, solitary, grey or rainy days; slow songs in a minor key',
    why: 'Emptiness is not absence here: the wide margin is the silence of the day. A single small image and one red seal say "this was enough".',
  },
  collage: {
    id: 'collage',
    name: 'Cut and paste',
    reference: 'Hannah Höch and Dada photomontage; zine and scrapbook collage',
    for: 'loud, crowded, happy days; parties, trips, many people; pop and hip-hop',
    why: 'A day with many people has many centres. Overlapping, slightly crooked frames carry noise and abundance that a single photo cannot.',
  },
  nocturne: {
    id: 'nocturne',
    name: 'Nocturne',
    reference: 'James McNeill Whistler’s Nocturnes; Tonalism',
    for: 'late, calm or tender nights; ambient and slow songs',
    why: 'Whistler painted night as a single breathing tone. Dissolving everything into one deep colour with a few lights turns a night into a mood rather than a scene.',
  },
}

function scoreTechniques(s: DaySignals): Record<TechniqueId, number> {
  const calm = 1 - s.arousal
  const pos = Math.max(s.valence, 0)
  const negv = Math.max(-s.valence, 0)
  const g = s.music?.genre
  const minor = s.music?.mode === 'minor' ? 1 : 0
  const major = s.music?.mode === 'major' ? 1 : 0
  const inGenre = (...gs: GenreFamily[]) => (g && gs.includes(g) ? 1 : 0)
  const daylight = s.light === 'day' || s.light === 'golden' ? 1 : 0
  const night = s.light === 'night' ? 1 : s.light === 'dusk' ? 0.4 : 0
  const greyWeather = s.weather === 'rain' || s.weather === 'snow' || s.weather === 'fog' || s.weather === 'cloud' ? 1 : 0
  const era = s.music?.era === 'vintage' ? 1 : s.music?.era === 'retro' ? 0.6 : 0
  return {
    impression: calm * 1.0 + pos * 1.2 + daylight * 0.6 + s.nature * 0.7 + inGenre('acoustic', 'classical', 'jazz', 'folk') * 0.6 + major * 0.3 - s.tension * 0.8,
    kandinsky: s.tension * 1.8 + s.arousal * 0.9 + inGenre('electronic', 'rock') * 0.8 + night * 0.2 - calm * 0.3,
    film: s.nostalgia * 1.3 + era * 1.1 + (s.valence > -0.4 && s.valence < 0.7 ? 0.25 : 0) + inGenre('rock', 'folk', 'jazz') * 0.2,
    ma: (s.company === 'alone' ? 0.9 : 0) + calm * 0.6 + minor * 0.6 + greyWeather * 0.5 + negv * 0.7 - (s.company === 'group' ? 0.7 : 0) - s.tension * 0.4,
    // a crowd alone is not enough: collage is for days that were loud *and* glad
    collage: (s.company === 'group' ? 0.7 : s.company === 'pair' ? 0.2 : 0) + s.arousal * 0.7 + pos * 0.9 + inGenre('pop', 'hiphop') * 0.7 - s.tension * 0.5 - negv * 0.8,
    nocturne: night * 1.0 + calm * 0.5 + minor * 0.3 + inGenre('ambient', 'jazz') * 0.5 - s.tension * 0.7 - daylight * 0.5,
  }
}

/* ------------------------------------------------------------------ */
/* the variable parameters                                             */
/* ------------------------------------------------------------------ */

export interface Palette {
  /** the card's ground */
  paper: string
  /** text */
  ink: string
  /** the day's main colour */
  accent: string
  /** a second colour that answers the first */
  second: string
  /** for shadows, rules and the grain tint */
  shadow: string
  /** all five, light to dark, for the swatch strip */
  strip: string[]
}

export type Layout = 'bleed' | 'grid' | 'scatter' | 'air' | 'offset'
export type Transition = 'dissolve' | 'cut' | 'slide' | 'drift'

export interface Atmosphere {
  signals: DaySignals
  technique: Technique
  scores: Record<TechniqueId, number>
  surface: 'light' | 'dark'
  palette: Palette
  treatment: { saturate: number; contrast: number; brightness: number; sepia: number; hueRotate: number; blur: number; filter: string }
  /** 0 … 1 */
  grain: number
  composition: { layout: Layout; /** share of the card left empty, 0 … 1 */ air: number; /** photo window, share of the grid width */ photoScale: number; tilt: number }
  rhythm: { bpm: number; beat: number; /** seconds each photo stays */ hold: number; transition: Transition; easing: string }
  motion: { /** Ken Burns drift, 0 … 1 */ drift: number; /** pulse on the beat */ pulse: boolean; /** seconds of one slow "breath" of the card */ breath: number }
  voice: VoicePlan
  reasons: Reason[]
}

export interface VoicePlan {
  /** speechSynthesis.rate, 0.75 … 1.2 */
  rate: number
  /** speechSynthesis.pitch, 0.8 … 1.2 */
  pitch: number
  volume: number
  /** pause between sentences */
  pauseMs: number
  /** prefer a lower voice if the device has one */
  low: boolean
  style: string
}

export interface Reason {
  from: 'text' | 'photo' | 'music' | 'time' | 'people' | 'weather'
  signal: string
  effect: string
}

const SEASON_HUE: Record<Season, number> = { winter: 205, spring: 95, summer: 48, autumn: 26 }
const LIGHT_HUE: Partial<Record<Light, number>> = { golden: 30, dawn: 340, night: 225, dusk: 265 }

export function atmosphere(m: DayInput, swatches?: Swatch[]): Atmosphere {
  const s = readSignals(m, swatches)
  const scores = scoreTechniques(s)
  const order: TechniqueId[] = ['impression', 'kandinsky', 'film', 'ma', 'collage', 'nocturne']
  const id = order.reduce((best, k) => (scores[k] > scores[best] + 1e-9 ? k : best), order[0])
  const technique = TECHNIQUES[id]
  const reasons: Reason[] = []
  const mu = s.music

  /* ----- palette ----- */
  // The base hue comes from what was actually in front of the camera, not from the mood.
  let hue = s.photo && s.photo.sat > 0.1 ? s.photo.hue : (LIGHT_HUE[s.light] ?? SEASON_HUE[s.season])
  if (s.photo && s.photo.sat > 0.1) reasons.push({ from: 'photo', signal: `the photo’s main colour is ${hueName(s.photo.hue)}`, effect: 'the palette starts from it instead of from a preset' })
  else reasons.push({ from: 'time', signal: `${s.light === 'day' ? s.season + ' daylight' : s.light} light`, effect: `the palette starts from ${hueName(hue)}` })
  // Mood bends the photo's own hue a little — warmer when light-hearted, cooler when heavy —
  // instead of replacing it with a "mood colour".
  const bend = s.valence >= 0 ? towards(hue, 32, s.valence * 22) : towards(hue, 215, -s.valence * 18)
  if (Math.abs(bend - hue) > 3) reasons.push({ from: 'text', signal: s.valence >= 0 ? 'the story reads light-hearted' : 'the story reads heavy', effect: `the colours lean ${s.valence >= 0 ? 'warmer' : 'cooler'} by ${Math.round(Math.abs(angle(bend - hue)))}°, the photo’s own hue is kept` })
  hue = bend
  let sat = 0.42 + s.arousal * 0.28
  let lift = 0
  if (mu?.mode === 'minor') {
    sat *= 0.68
    lift -= 0.05
    reasons.push({ from: 'music', signal: `the song is in a minor key${mu.source.mode === 'guessed' ? ' (from its description)' : ''}`, effect: 'colours are muted by a third and the ground darkens slightly' })
  } else if (mu?.mode === 'major') {
    sat *= 1.08
    lift += 0.02
    reasons.push({ from: 'music', signal: 'the song is in a major key', effect: 'colours are a little clearer and lighter' })
  }
  if (mu && mu.energy > 0.7) reasons.push({ from: 'music', signal: `high energy (${Math.round(mu.energy * 100)}%)`, effect: 'saturation and contrast go up, photos cut on the beat' })
  if (mu?.era === 'vintage' || mu?.era === 'retro') {
    hue = towards(hue, 45, 12)
    sat *= 0.82
    reasons.push({ from: 'music', signal: `the song is from ${mu.year}`, effect: 'a yellowed cast and stronger grain, like a print from that time' })
  }

  const dark = id === 'nocturne' || (id === 'kandinsky' && (s.light === 'night' || s.light === 'dusk'))
  const pal = buildPalette(id, hue, clamp(sat, 0.08, 0.85), dark, lift)

  /* ----- photo treatment ----- */
  const t = { saturate: 1, contrast: 1, brightness: 1, sepia: 0, hueRotate: 0, blur: 0 }
  t.saturate = clamp(0.75 + s.arousal * 0.5 + s.valence * 0.15 - (mu?.mode === 'minor' ? 0.2 : 0), 0.35, 1.5)
  t.contrast = clamp(0.92 + s.arousal * 0.2 + s.tension * 0.25, 0.85, 1.4)
  t.brightness = clamp(1 + lift + (dark ? -0.08 : 0.02), 0.75, 1.1)
  if (id === 'impression') Object.assign(t, { blur: 0.6, contrast: t.contrast * 0.92, saturate: t.saturate * 1.1 })
  if (id === 'kandinsky') Object.assign(t, { contrast: t.contrast * 1.15, saturate: t.saturate * 0.7, hueRotate: -12 })
  if (id === 'film') Object.assign(t, { sepia: 0.28, contrast: t.contrast * 0.95 })
  if (id === 'ma') Object.assign(t, { saturate: t.saturate * 0.55, brightness: t.brightness * 1.04 })
  if (id === 'nocturne') Object.assign(t, { brightness: t.brightness * 0.82, saturate: t.saturate * 0.7, hueRotate: 8 })
  if (mu?.era === 'vintage') t.sepia = Math.max(t.sepia, 0.22)
  const r2 = (n: number) => Math.round(n * 100) / 100
  const filter = `saturate(${r2(t.saturate)}) contrast(${r2(t.contrast)}) brightness(${r2(t.brightness)})${t.sepia ? ` sepia(${r2(t.sepia)})` : ''}${t.hueRotate ? ` hue-rotate(${t.hueRotate}deg)` : ''}${t.blur ? ` blur(${t.blur}px)` : ''}`

  /* ----- grain ----- */
  let grain = 0.12 + (mu?.era === 'vintage' ? 0.25 : mu?.era === 'retro' ? 0.14 : 0) + (s.light === 'night' ? 0.1 : 0) + (mu?.mode === 'minor' ? 0.05 : 0)
  if (id === 'film') grain += 0.2
  if (id === 'ma') grain *= 0.5
  grain = clamp(grain, 0.05, 0.6)

  /* ----- composition ----- */
  // "A slow minor song gives the page more air": empty space grows as the day slows down.
  const slowness = mu ? clamp((110 - mu.bpm) / 60, 0, 1) : 1 - s.arousal
  let air = clamp(0.18 + slowness * 0.25 + (1 - s.arousal) * 0.15 + (mu?.mode === 'minor' ? 0.1 : 0), 0.1, 0.7)
  const layout: Layout = { impression: 'bleed', kandinsky: 'grid', film: 'offset', ma: 'air', collage: 'scatter', nocturne: 'offset' }[id] as Layout
  if (id === 'ma') air = Math.max(air, 0.55)
  if (id === 'collage' || id === 'kandinsky') air = Math.min(air, 0.22)
  reasons.push({ from: mu ? 'music' : 'text', signal: mu ? `${mu.bpm} bpm${mu.mode ? ', ' + mu.mode : ''}` : `the pace of the story`, effect: `${Math.round(air * 100)}% of the card is left empty` })
  const photoScale = clamp(1 - air * 0.75, 0.45, 1)
  const tilt = id === 'collage' ? 2.5 + s.arousal * 3 : id === 'film' ? 1.2 : 0

  /* ----- rhythm & motion ----- */
  const bpm = mu?.bpm ?? Math.round(70 + s.arousal * 55)
  const beat = 60 / bpm
  const beats = bpm >= 115 ? 4 : bpm >= 90 ? 8 : 12
  const hold = r2(beat * beats)
  const transition: Transition = id === 'kandinsky' ? 'cut' : id === 'collage' ? 'slide' : id === 'impression' || id === 'nocturne' ? 'dissolve' : 'drift'
  reasons.push({ from: mu ? 'music' : 'text', signal: `${bpm} bpm`, effect: `each photo stays ${beats} beats (${hold}s), then ${transition === 'cut' ? 'cuts hard' : transition === 'slide' ? 'slides away' : transition === 'dissolve' ? 'dissolves' : 'drifts out'}` })
  const easing = transition === 'cut' ? 'steps(1, end)' : s.arousal > 0.6 ? 'cubic-bezier(.2,.8,.2,1)' : 'cubic-bezier(.45,.05,.25,1)'
  const energy = mu?.energy ?? s.arousal
  const motion = { drift: r2(clamp(0.2 + energy * 0.6, 0, 1)), pulse: energy > 0.7, breath: r2(beat * 8) }

  /* ----- text-side reasons ----- */
  if (s.tension > 0.3) reasons.push({ from: 'text', signal: 'deadline / pressure words in the story', effect: 'a hard grid, sharper contrast, geometric marks' })
  if (s.nostalgia > 0.4) reasons.push({ from: 'text', signal: 'the story looks back (“remember”, childhood, old things)', effect: 'found-film treatment pulls ahead' })
  if (s.company !== 'alone') reasons.push({ from: 'people', signal: s.company === 'group' ? 'several people were there' : 'one other person was there', effect: s.company === 'group' ? 'more centres on the page: frames overlap' : 'two frames can share the window' })
  else reasons.push({ from: 'people', signal: 'a day mostly alone', effect: 'one image, more margin' })
  if (s.weather) reasons.push({ from: 'weather', signal: s.weather, effect: WEATHER_EFFECT[s.weather] })

  const voice = voiceFor(s)
  reasons.push({ from: 'text', signal: `${describeMood(s)}`, effect: `narration: ${voice.style} (rate ${voice.rate}, pitch ${voice.pitch})` })

  return {
    signals: s,
    technique,
    scores,
    surface: dark ? 'dark' : 'light',
    palette: pal,
    treatment: { ...t, filter },
    grain: r2(grain),
    composition: { layout, air: r2(air), photoScale: r2(photoScale), tilt: r2(tilt) },
    rhythm: { bpm, beat: r2(beat), hold, transition, easing },
    motion,
    voice,
    reasons,
  }
}

const WEATHER_EFFECT: Record<Weather, string> = {
  rain: 'soft diagonal streaks and a lower, greyer light over the photo',
  snow: 'the ground lifts towards white; contrast drops',
  fog: 'a veil over the photo, edges dissolve',
  wind: 'the drift of the photo goes sideways',
  clear: 'a clear, unveiled print',
  cloud: 'a flatter, even light',
}

/* ------------------------------------------------------------------ */
/* voice                                                               */
/* ------------------------------------------------------------------ */

export function voiceFor(s: DaySignals): VoicePlan {
  const bpm = s.music?.bpm ?? 90
  const rate = r(clamp(0.84 + s.arousal * 0.28 + (bpm - 90) / 500 - (s.light === 'night' ? 0.04 : 0), 0.75, 1.2))
  const pitch = r(clamp(1 + s.valence * 0.12 - (s.music?.mode === 'minor' ? 0.06 : 0) - (s.light === 'night' ? 0.05 : 0), 0.8, 1.2))
  const pauseMs = Math.round(220 + (1 - s.arousal) * 520)
  const calm = s.arousal < 0.5
  const style =
    s.tension > 0.4 ? 'clipped and focused'
    : s.light === 'night' && calm ? 'hushed, close to the microphone'
    : calm && s.valence >= 0 ? 'quiet and warm'
    : calm ? 'low and slow'
    : s.valence >= 0 ? 'lively and quick'
    : 'tight and restless'
  return { rate, pitch, volume: calm ? 0.85 : 1, pauseMs, low: s.valence < 0 || s.light === 'night', style }
}

function describeMood(s: DaySignals) {
  const a = s.arousal > 0.6 ? 'fast' : s.arousal < 0.4 ? 'slow' : 'steady'
  const v = s.valence > 0.25 ? 'light' : s.valence < -0.25 ? 'heavy' : 'mixed'
  return `a ${a}, ${v} day`
}

/* ------------------------------------------------------------------ */
/* folder name: 3–7 words, one tone                                    */
/* ------------------------------------------------------------------ */

export const TITLE_MIN = 3
export const TITLE_MAX = 7

const isRu = (s: string) => (s.match(/[а-яё]/gi)?.length ?? 0) > (s.match(/[a-z]/gi)?.length ?? 0)

export function wordCount(s: string) {
  return s.trim().split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length
}

const TAIL_STOP = new Set(['in', 'of', 'with', 'and', 'the', 'a', 'at', 'on', 'to', 'for', 'и', 'в', 'с', 'на', 'у', 'по', 'к', 'о', 'из', 'за', 'для'])
const MONTH_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const MONTH_RU_IN = ['в январе', 'в феврале', 'в марте', 'в апреле', 'в мае', 'в июне', 'в июле', 'в августе', 'в сентябре', 'в октябре', 'в ноябре', 'в декабре']

/** Fits any title into 3–7 words without changing its tone: trims dangling words, pads with the month. */
export function normalizeFolderTitle(title: string, date: string): string {
  const ru = isRu(title)
  let w = title
    .replace(/[\r\n]+/g, ' ')
    .replace(/[“”"«»…]+/g, '')
    .replace(/[.!?;:,]+$/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (w.length > TITLE_MAX) w = w.slice(0, TITLE_MAX)
  while (w.length > TITLE_MIN && TAIL_STOP.has(w[w.length - 1].toLowerCase().replace(/[^\p{L}]/gu, ''))) w.pop()
  if (w.length) w[w.length - 1] = w[w.length - 1].replace(/[,;:—–-]+$/, '')
  const mo = Number(date.slice(5, 7)) - 1
  if (w.length < TITLE_MIN) {
    const pad = ru ? MONTH_RU_IN[mo].split(' ') : ['in', MONTH_EN[mo]]
    w = [...w, ...pad]
  }
  while (w.length < TITLE_MIN) w.push(ru ? 'день' : 'day')
  const out = w.join(' ')
  return out.charAt(0).toUpperCase() + out.slice(1)
}

const PART_EN: Record<Light, string> = { dawn: 'morning', day: 'day', golden: 'afternoon', dusk: 'evening', night: 'night' }
const SEASON_EN: Record<Season, string> = { winter: 'Winter', spring: 'Spring', summer: 'Summer', autumn: 'Autumn' }
// Russian adjectives agree with the noun: утро (n), день / вечер (m), ночь (f)
const PART_RU: Record<Light, [string, 'n' | 'm' | 'f']> = { dawn: ['утро', 'n'], day: ['день', 'm'], golden: ['день', 'm'], dusk: ['вечер', 'm'], night: ['ночь', 'f'] }
const SEASON_RU: Record<Season, Record<'n' | 'm' | 'f', string>> = {
  winter: { n: 'Зимнее', m: 'Зимний', f: 'Зимняя' },
  spring: { n: 'Весеннее', m: 'Весенний', f: 'Весенняя' },
  summer: { n: 'Летнее', m: 'Летний', f: 'Летняя' },
  autumn: { n: 'Осеннее', m: 'Осенний', f: 'Осенняя' },
}

/**
 * The name of the day's folder, made from what the day was: when, where, what stood out, with whom.
 * Always the same shape — "<Season> <part of day> <where/what> <with whom>" — so a shelf of
 * folders reads in one voice. Always 3–7 words.
 */
export function folderTitle(m: DayInput): string {
  const s = readSignals(m)
  const ru = isRu(m.story)
  // the place up to its first comma ("Studio flat, 4th floor" → "Studio flat"); "My desk" → "my desk"
  const place = m.location
    ?.split(',')[0]
    .trim()
    .replace(/^(The|My|Our|Мой|Моя|Моё|Наш|Наша)(?=\s)/, (w) => w.toLowerCase())
    .split(/\s+/)
    .slice(0, 3)
    .join(' ')
  const key = extractRecall(m.story, 1)[0]?.word
  // "with whom" only when the story says so: friends or family; never guessed from a list of names
  const words = tokens(m.story + ' ' + (m.mood ?? ''))
  const friends = hits(words, L('friend друз подруг'))
  const family = hits(words, L('mum= mom= dad= mother father family sister brother мама маму мамой папа семь сестр брат'))
  if (ru) {
    const [noun, g] = PART_RU[s.light]
    const head = `${SEASON_RU[s.season][g]} ${noun}`
    const where = place ? `, ${place}` : key ? `, ${key.toLowerCase()}` : ''
    const who = friends ? ' с друзьями' : family ? ' с семьёй' : s.company === 'alone' ? ' наедине с собой' : ''
    const full = head + where + who
    return normalizeFolderTitle(wordCount(full) <= TITLE_MAX ? full : head + where, m.date)
  }
  const head = `${SEASON_EN[s.season]} ${PART_EN[s.light]}`
  const where = place ? ` at ${place}` : key ? ` of ${key.toLowerCase()}` : ''
  const who = friends ? ' with friends' : family ? ' with family' : s.company === 'alone' ? ' on my own' : ''
  // keep "with whom" only if it still fits
  const full = head + where + who
  return normalizeFolderTitle(wordCount(full) <= TITLE_MAX ? full : head + where, m.date)
}

/* ------------------------------------------------------------------ */
/* the caption: one verbatim sentence, the most sensory one            */
/* ------------------------------------------------------------------ */

/** Picks the sentence richest in light, sound, weather and touch. Verbatim, never rewritten. */
export function pickCaption(story: string, maxLen = 140): string | undefined {
  const ss = sentences(story).filter((x) => x.length <= maxLen && !/\?\s*["'”’]?$/.test(x))
  if (!ss.length) return sentences(story)[0]?.slice(0, maxLen)
  let best = ss[0]
  let bestScore = -1
  for (const x of ss) {
    const w = tokens(x)
    const score = hits(w, LEX.sense) * 2 + hits(w, LEX.nature) + hits(w, LEX.pos) * 0.5 - Math.abs(x.length - 80) / 80
    if (score > bestScore) [best, bestScore] = [x, score]
  }
  return best
}

/* ------------------------------------------------------------------ */
/* colour helpers                                                      */
/* ------------------------------------------------------------------ */

function buildPalette(id: TechniqueId, h: number, s: number, dark: boolean, lift: number): Palette {
  const H = (d: number) => (h + d + 360) % 360
  let paper: string, ink: string, accent: string, second: string, shadow: string
  switch (id) {
    case 'impression':
      paper = hsl(H(10), s * 0.35, 0.93 + lift / 2)
      accent = hsl(H(0), s * 0.95, 0.62 + lift)
      second = hsl(H(-28), s * 0.7, 0.72 + lift)
      shadow = hsl(H(180), s * 0.35, 0.42)
      ink = hsl(H(15), 0.25, 0.2)
      break
    case 'kandinsky':
      paper = dark ? hsl(H(200), 0.18, 0.1) : hsl(H(200), 0.1, 0.92)
      accent = hsl(H(0), Math.min(0.85, s * 1.4), 0.52)
      second = hsl(H(180), Math.min(0.8, s * 1.3), 0.5)
      shadow = hsl(H(120), 0.6, 0.55)
      ink = dark ? hsl(H(200), 0.1, 0.88) : hsl(H(200), 0.2, 0.12)
      break
    case 'film':
      paper = hsl(42, 0.32, 0.9 + lift / 2)
      accent = hsl(H(0), s, 0.5 + lift)
      second = hsl(H(35), s * 0.8, 0.62)
      shadow = hsl(25, 0.3, 0.3)
      ink = hsl(28, 0.3, 0.17)
      break
    case 'ma':
      paper = hsl(H(0), 0.06, 0.95 + lift / 2)
      accent = hsl(H(0), s * 0.45, 0.45 + lift)
      second = hsl(8, 0.62, 0.45) // the seal — vermilion, the only loud thing on the page
      shadow = hsl(H(0), 0.05, 0.62)
      ink = hsl(H(0), 0.08, 0.16)
      break
    case 'collage':
      paper = hsl(H(15), s * 0.3, 0.9)
      accent = hsl(H(0), Math.min(0.9, s * 1.3), 0.55)
      second = hsl(H(150), Math.min(0.85, s * 1.2), 0.55)
      shadow = hsl(H(210), Math.min(0.85, s * 1.2), 0.45)
      ink = hsl(H(0), 0.3, 0.14)
      break
    case 'nocturne':
    default:
      paper = hsl(H(0), Math.max(0.2, s * 0.6), 0.11 + lift / 2)
      accent = hsl(40, 0.7, 0.68) // a lamp in the dark: one warm light against the ground
      second = hsl(H(0), s * 0.6, 0.32)
      shadow = hsl(H(0), s * 0.5, 0.05)
      ink = hsl(H(0), 0.15, 0.86)
  }
  const strip = [paper, second, accent, shadow, ink].sort((a, b) => lum(b) - lum(a))
  return { paper, ink, accent, second, shadow, strip }
}

export function hsl(h: number, s: number, l: number) {
  s = clamp(s, 0, 1)
  l = clamp(l, 0, 1)
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const hex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0')
  return `#${hex(f(0))}${hex(f(8))}${hex(f(4))}`.toUpperCase()
}

function lum(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)
}

function hueName(h: number) {
  const names: [number, string][] = [[15, 'red'], [40, 'orange'], [65, 'ochre-yellow'], [150, 'green'], [190, 'teal'], [250, 'blue'], [290, 'violet'], [340, 'magenta'], [360, 'red']]
  return names.find(([max]) => h < max)![1]
}

/** Angle difference in −180…180. */
function angle(d: number) {
  return ((d + 540) % 360) - 180
}

/** Moves hue `h` towards `target` by at most `deg` degrees, the short way round. */
function towards(h: number, target: number, deg: number) {
  const d = angle(target - h)
  const step = Math.sign(d) * Math.min(Math.abs(d), Math.abs(deg))
  return (h + step + 360) % 360
}

function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x))
}

function r(n: number) {
  return Math.round(n * 100) / 100
}
