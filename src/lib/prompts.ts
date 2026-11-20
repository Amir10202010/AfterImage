// The app's own voice. Everything here is marked ◇ in the interface and is never
// presented as something the user wrote.
import { hash } from './extract'
import type { Memory, Theme } from './types'

const REPLY_PROMPTS = [
  'What did they get right about you?',
  'What would you tell them that they would not believe?',
  'Which of their worries turned out to be the wrong one?',
  'What are you still carrying from this day?',
  'Is there something you would like to give back to them?',
  'What do you know now that you wish they had known then?',
  'If they could ask you one thing, what would it be — and what is the honest answer?',
  'What changed shape, rather than disappearing?',
  'What would make them laugh about your life today?',
  'Is there anything you would like to apologise for? Or thank them for?',
]

export function promptsFor(seed: string, n = 3) {
  const h = hash(seed)
  const out: string[] = []
  for (let i = 0; out.length < n && i < REPLY_PROMPTS.length * 2; i++) {
    const p = REPLY_PROMPTS[(h + i * 7) % REPLY_PROMPTS.length]
    if (!out.includes(p)) out.push(p)
  }
  return out
}

export const STAMPS = {
  kept: { label: 'Kept', hint: 'It happened, or I did it' },
  changed: { label: 'Changed', hint: 'It became something else' },
  'let-go': { label: 'Let go', hint: 'Not mine any more' },
  trying: { label: 'Still trying', hint: 'Not yet — still on it' },
} as const

export const QUESTION_STAMPS = {
  kept: { label: 'Yes', hint: 'The answer turned out to be yes' },
  changed: { label: 'Sort of', hint: 'It turned out complicated' },
  'let-go': { label: 'No', hint: 'The answer was no' },
  trying: { label: 'Still asking', hint: 'I still don’t know' },
} as const

/** Muted accents a song can tint a print with. */
const ACCENTS = ['#B4664A', '#7A2E2E', '#6E6E45', '#A7803F', '#5D6B73', '#8C5A6B', '#4F6B57']

export function accentFor(m: Pick<Memory, 'song' | 'theme' | 'title'>) {
  if (!m.song) return { autumn: '#B4664A', paper: '#7A2E2E', night: '#A9B38A' }[m.theme as Theme]
  return ACCENTS[hash(m.song.title.toLowerCase() + '|' + m.song.artist.toLowerCase()) % ACCENTS.length]
}

export const COVER_COPY = {
  leaves: { verb: 'Brush the leaves away', hint: 'Drag across the picture — with a finger, a mouse, or press Space to sweep.' },
  dust: { verb: 'Blow the dust off', hint: 'Drag across the picture — with a finger, a mouse, or press Space to sweep.' },
  static: { verb: 'Wipe the static off the screen', hint: 'Drag across the picture — with a finger, a mouse, or press Space to sweep.' },
}
