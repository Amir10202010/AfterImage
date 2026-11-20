import type { CSSProperties } from 'react'
import { useBlobUrl } from '../lib/store'
import type { Memory } from '../lib/types'
import { artUrl, photogramUrl } from '../demo/art'
import { hash } from '../lib/extract'
import { accentFor } from '../lib/prompts'

export function useMemoryImage(m: Memory, index = 0) {
  const blob = useBlobUrl(m.photoIds[index])
  if (m.photoIds[index]) return blob
  if (m.art) return artUrl(m.art)
  return photogramUrl(hash(m.id), accentFor(m), [m.title, ...m.details, ...m.people].filter(Boolean))
}

/** How far a developed print has faded from being left alone (0 = fresh, 0.7 = very faded). */
export function fadeOf(m: Memory, now = Date.now()) {
  if (!m.progress.developedAt) return 0
  const last = new Date(m.visitedAt ?? m.progress.developedAt).getTime()
  const days = (now - last) / 86400000
  return Math.max(0, Math.min(0.7, (days - 30) / 400))
}

/**
 * A photograph at a given stage of development.
 * p = 0 → an inverted, grainy negative; p = 1 → a finished print.
 */
export default function Photo({ memory, p, index = 0, className = '', alt, fade = 0 }: { memory: Memory; p: number; index?: number; className?: string; alt?: string; fade?: number }) {
  const src = useMemoryImage(memory, index)
  const e = Math.max(0, Math.min(1, p))
  const ease = e * e * (3 - 2 * e)
  const style = {
    '--neg': String(1 - Math.min(1, ease * 1.6)),
    '--blur': `${(1 - ease) * 7}px`,
    '--sepia': String(0.85 * (1 - ease)),
    '--sat': String(0.35 + 0.65 * ease),
    '--bright': String(0.45 + 0.55 * ease),
    '--safelight': String(0.45 * (1 - ease)),
    '--fade': String(fade),
  } as CSSProperties
  return (
    <figure className={`photo ${className}`} style={style} data-developed={e >= 1 ? 'true' : 'false'} data-fading={fade > 0.02 ? 'true' : undefined}>
      {src ? (
        <>
          <img className="photo-pos" src={src} alt={alt ?? `Photograph from “${memory.title}”`} draggable={false} />
          <img className="photo-neg" src={src} alt="" aria-hidden="true" draggable={false} />
        </>
      ) : (
        <div className="photo-empty" />
      )}
      <span className="photo-safelight" aria-hidden="true" />
      <span className="grain" aria-hidden="true" />
    </figure>
  )
}
