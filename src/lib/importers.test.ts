import { describe, expect, it } from 'vitest'
import { fixText, parseInstagramJson } from './importers'
import { parseJpeg } from './exif'

describe('instagram export', () => {
  it('repairs mojibake captions', () => {
    expect(fixText('cafÃ© â\u0098\u0095')).toBe('café ☕')
    expect(fixText('plain')).toBe('plain')
  })
  it('reads posts and stories in both layouts', () => {
    const posts = parseInstagramJson('your_instagram_activity/content/posts_1.json', [
      { media: [{ uri: 'media/posts/201905/a.jpg', creation_timestamp: 1557000000 }], title: 'park day', creation_timestamp: 1557000000 },
      { media: [{ uri: 'media/posts/201905/b.mp4', creation_timestamp: 1557000100, title: 'single' }] },
    ])
    expect(posts.map((p) => [p.uri, p.caption, p.source])).toEqual([
      ['media/posts/201905/a.jpg', 'park day', 'instagram-post'],
      ['media/posts/201905/b.mp4', 'single', 'instagram-post'],
    ])
    const stories = parseInstagramJson('content/stories.json', { ig_stories: [{ uri: 'media/stories/202001/s.jpg', creation_timestamp: 1580000000, title: '' }] })
    expect(stories[0]).toMatchObject({ uri: 'media/stories/202001/s.jpg', source: 'instagram-story', ts: 1580000000 })
  })
})

describe('exif', () => {
  it('reads DateTimeOriginal from a minimal JPEG', () => {
    // SOI, APP1 Exif with IFD0 -> ExifIFD -> DateTimeOriginal
    const date = '2019:03:03 23:40:12\0'
    const tiff: number[] = []
    const w16 = (n: number) => tiff.push(n & 0xff, n >> 8)
    const w32 = (n: number) => tiff.push(n & 0xff, (n >> 8) & 0xff, (n >> 16) & 0xff, n >>> 24)
    tiff.push(0x49, 0x49); w16(42); w32(8) // header, IFD0 at 8
    w16(1); w16(0x8769); w16(4); w32(1); w32(26); w32(0) // IFD0: ExifIFD pointer -> 26
    w16(1); w16(0x9003); w16(2); w32(date.length); w32(44); w32(0) // ExifIFD at 26: DateTimeOriginal -> 44
    for (const c of date) tiff.push(c.charCodeAt(0))
    const app1 = [0x45, 0x78, 0x69, 0x66, 0, 0, ...tiff]
    const len = app1.length + 2
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, len >> 8, len & 0xff, ...app1, 0xff, 0xd9])
    const info = parseJpeg(new DataView(bytes.buffer))
    expect(info.taken?.getFullYear()).toBe(2019)
    expect(info.taken?.getHours()).toBe(23)
  })
})
