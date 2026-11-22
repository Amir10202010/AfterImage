// The day folder: everything one day is made of, as files someone can keep without the app.
//
//   2025-10-12 Autumn day at Linden Park/
//     README.txt     what is in here
//     story.txt      the user's own words, verbatim, with the date, place and people
//     photos/        the photographs, as stored on the device
//     song.json      what is known about the song: name, artist, link, bpm, key, genre, year.
//                    Never the audio itself: an uploaded file is used on the device and stays there.
//     memory.png     the day card
//     memory.json    how the card was made: technique, palette, treatment, rhythm, and every reason
//     voice.json     the narration: the lines that are read and how (rate, pitch, pauses, voice)
//
// Pure: the caller supplies the photos and the rendered card, so this can be tested without a browser.
import { CONSTANTS, TECHNIQUES } from './atmosphere'
import type { CardModel } from './daycard'
import { narrationScript, pauseAfter } from './narration'
import type { Letter, Memory } from './types'
import type { ZipFile } from './zip'

/** "2025-10-12 Autumn day at Linden Park": the date, then the 3–7 word folder name. */
export function dayFolderName(m: Pick<Memory, 'date'>, title: string) {
  const clean = title
    .replace(/[^\p{L}\p{N} '’-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return `${m.date} ${clean}`.trim()
}

function ext(b: Blob) {
  const t = b.type.toLowerCase()
  if (t.includes('png')) return 'png'
  if (t.includes('webp')) return 'webp'
  if (t.includes('svg')) return 'svg'
  if (t.includes('gif')) return 'gif'
  return 'jpg'
}

const json = (v: unknown) => JSON.stringify(v, null, 2) + '\n'

export interface DayFolderInput {
  m: Memory
  card: CardModel
  photos: Blob[]
  /** the rendered card; left out when the browser could not draw it */
  cardPng?: Blob
  /** letters attached to this day that are already open (sealed ones stay sealed) */
  letters?: Letter[]
}

export function dayFolderFiles({ m, card, photos, cardPng, letters = [] }: DayFolderInput): ZipFile[] {
  const dir = dayFolderName(m, card.title)
  const at = (p: string) => `${dir}/${p}`
  const { atm } = card
  const files: ZipFile[] = []

  const head = [
    card.title,
    [m.date, m.time].filter(Boolean).join(' '),
    m.location && `Place: ${m.location}`,
    m.people.length > 0 && `With: ${m.people.join(', ')}`,
    m.weather && `Weather: ${m.weather}`,
    m.mood && `Mood: ${m.mood}`,
  ].filter(Boolean)
  const story = [...head, '', m.story.trim(), '']
  if (m.details.length) story.push('Kept:', ...m.details.map((d) => `- ${d}`), '')
  for (const l of letters) story.push(`Letter, written ${l.writtenAt.slice(0, 10)}:`, l.body.trim(), '')
  for (const n of m.margin) story.push(`Margin note, ${n.at.slice(0, 10)}: ${n.text}`)
  files.push({ name: at('story.txt'), data: story.join('\n').trimEnd() + '\n' })

  photos.forEach((b, i) => files.push({ name: at(`photos/${String(i + 1).padStart(2, '0')}.${ext(b)}`), data: b }))

  if (m.song) {
    const s = m.song
    files.push({
      name: at('song.json'),
      data: json({
        title: s.title,
        artist: s.artist,
        link: s.url ?? null,
        tempo: s.tempo,
        bpm: s.bpm ?? null,
        bpmSource: s.bpmSource ?? null,
        energy: s.energy ?? null,
        mode: s.mode ?? null,
        genre: s.genre ?? null,
        year: s.year ?? null,
        description: s.description ?? null,
        audio: s.audioId ? 'An audio file was used on the device to measure the song. It is not included here.' : null,
      }),
    })
  }

  if (cardPng) files.push({ name: at('memory.png'), data: cardPng })

  files.push({
    name: at('memory.json'),
    data: json({
      folder: card.title,
      date: card.dateLine,
      caption: card.caption ?? null,
      technique: { id: atm.technique.id, name: atm.technique.name, reference: atm.technique.reference, for: atm.technique.for, why: atm.technique.why },
      scores: atm.scores,
      runnerUp: TECHNIQUES[Object.entries(atm.scores).sort((a, b) => b[1] - a[1])[1][0] as keyof typeof TECHNIQUES].name,
      constant: CONSTANTS,
      variable: {
        surface: atm.surface,
        palette: atm.palette,
        filter: atm.treatment.filter,
        grain: atm.grain,
        composition: atm.composition,
        rhythm: atm.rhythm,
        motion: atm.motion,
      },
      reasons: atm.reasons,
    }),
  })

  const script = narrationScript(card.title, m.story, atm.voice)
  files.push({
    name: at('voice.json'),
    data: json({
      note: 'Read aloud by the device’s own speech synthesiser; these are the exact lines and settings, so it can be read again the same way.',
      lang: script.lang,
      style: atm.voice.style,
      rate: atm.voice.rate,
      pitch: atm.voice.pitch,
      lowerVoice: atm.voice.low,
      lines: script.lines.map((l) => ({ text: l.text, kind: l.kind, pauseAfterMs: pauseAfter(l, atm.voice) })),
    }),
  })

  files.push({
    name: at('README.txt'),
    data: [
      `${card.title}`,
      '',
      'A day from Afterimage.',
      '',
      'story.txt    the words of the day, exactly as written',
      `photos/      ${photos.length} photograph${photos.length === 1 ? '' : 's'}`,
      m.song ? 'song.json    what is known about the song (never the audio itself)' : 'song.json    (no song this day)',
      cardPng ? 'memory.png   the day card' : 'memory.png   (could not be drawn in this browser)',
      'memory.json  why the card looks the way it does: technique, palette, rhythm, reasons',
      'voice.json   the narration: the lines that are read aloud, and how',
      '',
    ].join('\n'),
  })
  return files
}
