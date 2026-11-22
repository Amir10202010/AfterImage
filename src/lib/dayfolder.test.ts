import { describe, expect, it } from 'vitest'
import { buildDemo } from '../demo/seed'
import { cardModel } from './daycard'
import { dayFolderFiles, dayFolderName } from './dayfolder'
import { readZip, writeZip } from './zip'

const demos = buildDemo(new Date('2026-11-21T12:00:00')).memories
const jpeg = (n: number) => new Blob([new Uint8Array([0xff, 0xd8, n, 0xff, 0xd9])], { type: 'image/jpeg' })

describe('the day folder', () => {
  it('is named by the date and the 3–7 word folder name, safe for any file system', () => {
    expect(dayFolderName({ date: '2025-10-12' }, 'Autumn day at Linden Park')).toBe('2025-10-12 Autumn day at Linden Park')
    expect(dayFolderName({ date: '2025-10-12' }, 'Осенний день: парк / дождь?')).toBe('2025-10-12 Осенний день парк дождь')
  })

  it('holds the story verbatim, the photos, the song data, the card, how it was made and the voice', () => {
    const m = demos.find((d) => d.id === 'demo-autumn')!
    const card = cardModel(m)
    const files = dayFolderFiles({ m, card, photos: [jpeg(1), jpeg(2)], cardPng: new Blob(['png'], { type: 'image/png' }) })
    const names = files.map((f) => f.name.split('/').slice(1).join('/'))
    expect(names).toEqual(['story.txt', 'photos/01.jpg', 'photos/02.jpg', 'song.json', 'memory.png', 'memory.json', 'voice.json', 'README.txt'])
    for (const f of files) expect(f.name.startsWith('2025-10-12 Autumn day at Linden Park/')).toBe(true)
    const text = (n: string) => files.find((f) => f.name.endsWith(n))!.data as string
    expect(text('story.txt')).toContain(m.story)
    expect(JSON.parse(text('song.json'))).toMatchObject({ title: 'Paper Lanterns', tempo: 'slow', audio: null })
    expect(JSON.parse(text('memory.json')).technique.id).toBe(card.technique)
    const voice = JSON.parse(text('voice.json'))
    expect(voice.lines[0]).toMatchObject({ text: card.title, kind: 'title' })
    expect(voice.rate).toBe(card.atm.voice.rate)
  })

  it('never puts the song’s audio in the folder, only says it was used', () => {
    const m = { ...demos[0], song: { ...demos[0].song!, audioId: 'b_123' } }
    const files = dayFolderFiles({ m, card: cardModel(m), photos: [] })
    expect(files.some((f) => /\.(mp3|m4a|wav|ogg|aac|flac)$/i.test(f.name))).toBe(false)
    expect(JSON.parse(files.find((f) => f.name.endsWith('song.json'))!.data as string).audio).toMatch(/not included/)
  })

  it('zips into an archive that reads back byte for byte, with UTF-8 names', async () => {
    const zip = await writeZip([
      { name: 'День/story.txt', data: 'Шёл дождь.\n' },
      { name: 'День/photos/01.jpg', data: jpeg(7) },
    ])
    const entries = await readZip(zip)
    expect(entries.map((e) => e.name)).toEqual(['День/story.txt', 'День/photos/01.jpg'])
    expect(await (await entries[0].read()).text()).toBe('Шёл дождь.\n')
    expect([...new Uint8Array(await (await entries[1].read()).arrayBuffer())]).toEqual([0xff, 0xd8, 7, 0xff, 0xd9])
  })
})
