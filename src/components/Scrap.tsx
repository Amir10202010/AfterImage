// The scrapbook's materials: photo frames, handwriting, tickets, tags, washi tape, stamped letters
// and small hand-drawn stickers. All original drawings.
import { useState, type CSSProperties, type ReactNode } from 'react'
import { useBlobUrl, useStore } from '../lib/store'
import type { PageItem } from '../lib/types'
import { artUrl, photogramUrl } from '../demo/art'
import { hash } from '../lib/extract'
import { accentFor } from '../lib/prompts'

/** Resolves a page photo reference to an image URL. */
export function useRefUrl(ref?: string, thumb = false) {
  const { memories, shoebox } = useStore()
  let blobId: string | undefined
  let direct: string | undefined
  if (ref?.startsWith('art:')) direct = artUrl(ref.slice(4))
  else if (ref?.startsWith('gram:')) {
    const m = memories.find((x) => x.id === ref.slice(5))
    if (m) direct = photogramUrl(hash(m.id), accentFor(m), [m.title, ...m.details, ...m.people])
  } else if (ref) {
    blobId = thumb ? (shoebox.find((s) => s.blobId === ref)?.thumbId ?? ref) : ref
  }
  const blob = useBlobUrl(blobId)
  return direct ?? blob
}

export function ScrapPhoto({ refId, negative, variant = 'instax', thumb = false, caption }: { refId?: string; negative?: boolean; variant?: string; thumb?: boolean; caption?: ReactNode }) {
  const url = useRefUrl(refId, thumb)
  return (
    <figure className={`sp sp-${variant} ${negative ? 'is-negative' : ''}`}>
      <span className="sp-img">{url ? <img src={url} alt="" draggable={false} loading="lazy" /> : null}</span>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}

const INK = '#3B3430'

/** A photographed piece, cut out of its white backdrop (scripts/cutout_scrap.py), or the drawing if the photo isn't there. */
function Photographed({ file, fallback, className }: { file: string; fallback: ReactNode; className: string }) {
  const [ok, setOk] = useState<boolean | null>(null)
  if (ok === false) return <>{fallback}</>
  return (
    <>
      <img className={`${className} ${ok ? '' : 'is-loading'}`} src={file} alt="" draggable={false} onLoad={() => setOk(true)} onError={() => setOk(false)} />
      {ok === null && fallback}
    </>
  )
}

export function Sticker({ variant }: { variant?: string }) {
  return <Photographed file={`/demo/scrap/sticker-${variant ?? 'flower'}.webp`} className="scrap-photo" fallback={<DrawnSticker variant={variant} />} />
}

const SAME: Record<string, string> = { flower2: 'flower', flower3: 'leaf', stamp2: 'stamp', stamp3: 'stamp' }

function DrawnSticker({ variant: v }: { variant?: string }) {
  const variant = v && SAME[v] ? SAME[v] : v
  switch (variant) {
    case 'clip':
      return (
        <svg viewBox="0 0 40 100" className="sticker-svg" aria-hidden="true">
          <path d="M28 20 V78 a10 10 0 0 1 -20 0 V14 a7 7 0 0 1 14 0 V72 a3 3 0 0 1 -6 0 V26" fill="none" stroke="#a88a52" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      )
    case 'wax':
      return (
        <svg viewBox="0 0 100 100" className="sticker-svg" aria-hidden="true">
          <path d="M50 6 C66 4 70 14 82 18 C94 24 92 38 96 50 C98 64 88 70 84 82 C76 94 62 92 50 96 C36 98 30 88 18 82 C6 74 8 62 4 50 C2 36 12 30 18 18 C28 8 38 8 50 6Z" fill="#7a2e2e" />
          <circle cx="50" cy="50" r="26" fill="none" stroke="#5a1f1f" strokeWidth="3" />
          <path d="M38 58 Q50 30 62 58" fill="none" stroke="#9a4a40" strokeWidth="4" strokeLinecap="round" />
        </svg>
      )
    case 'camera':
      return (
        <svg viewBox="0 0 100 80" className="sticker-svg" aria-hidden="true">
          <rect x="6" y="20" width="88" height="54" rx="8" fill="#E9DDC6" stroke={INK} strokeWidth="3" />
          <rect x="18" y="12" width="22" height="10" rx="2" fill="#E9DDC6" stroke={INK} strokeWidth="3" />
          <circle cx="54" cy="47" r="19" fill="#5D6B73" stroke={INK} strokeWidth="3" />
          <circle cx="54" cy="47" r="9" fill="#2B2724" />
          <circle cx="50" cy="43" r="3" fill="#fff" opacity=".7" />
          <rect x="76" y="27" width="10" height="6" rx="1" fill="#B4664A" />
        </svg>
      )
    case 'stamp':
      return (
        <svg viewBox="0 0 80 100" className="sticker-svg" aria-hidden="true">
          <path d="M4 4h72v92H4z" fill="#F4EEE2" stroke="#C9BBA3" strokeWidth="2" strokeDasharray="4 3" />
          <rect x="12" y="12" width="56" height="62" fill="#B4664A" />
          <path d="M12 60 Q28 40 40 52 T68 44 V74 H12Z" fill="#7A2E2E" />
          <circle cx="54" cy="28" r="7" fill="#F1D9A8" />
          <text x="40" y="90" textAnchor="middle" fontFamily="Special Elite, monospace" fontSize="10" fill={INK}>
            POSTE
          </text>
        </svg>
      )
    case 'heart':
      return (
        <svg viewBox="0 0 100 90" className="sticker-svg" aria-hidden="true">
          <path d="M50 82 C10 56 4 30 22 16 C36 6 48 16 50 26 C52 16 64 6 78 16 C96 30 90 56 50 82Z" fill="none" stroke="#7A2E2E" strokeWidth="4" strokeLinejoin="round" />
        </svg>
      )
    case 'star':
      return (
        <svg viewBox="0 0 100 100" className="sticker-svg" aria-hidden="true">
          <path d="M50 8 L60 40 L94 40 L66 60 L77 92 L50 72 L23 92 L34 60 L6 40 L40 40Z" fill="none" stroke="#A7803F" strokeWidth="4" strokeLinejoin="round" />
        </svg>
      )
    case 'leaf':
      return (
        <svg viewBox="0 0 60 100" className="sticker-svg" aria-hidden="true">
          <path d="M30 6 C54 26 56 62 30 94 C4 62 6 26 30 6Z" fill="#B8532B" opacity=".85" />
          <path d="M30 10 V96 M30 40 L44 30 M30 58 L16 46 M30 72 L42 64" stroke="#5A2B18" strokeWidth="2" fill="none" />
        </svg>
      )
    case 'ticket':
      return (
        <svg viewBox="0 0 120 60" className="sticker-svg" aria-hidden="true">
          <path d="M4 4h112v18a8 8 0 0 0 0 16v18H4V38a8 8 0 0 0 0-16z" fill="#E7C65A" stroke={INK} strokeWidth="2" />
          <text x="60" y="36" textAnchor="middle" fontFamily="Special Elite, monospace" fontSize="14" fill={INK}>
            ADMIT ONE
          </text>
        </svg>
      )
    default:
      // a pressed flower
      return (
        <svg viewBox="0 0 120 120" className="sticker-svg" aria-hidden="true">
          <path d="M60 64 C58 84 46 104 20 116" stroke="#7E7A55" strokeWidth="2.5" fill="none" />
          <path d="M44 96 C34 92 30 84 32 78 C40 80 46 88 44 96Z" fill="#9C9A6E" opacity=".8" />
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <ellipse key={a} cx="60" cy="38" rx="11" ry="24" transform={`rotate(${a} 60 62)`} fill="#F1E9D6" stroke="#CDBE9E" strokeWidth="1.5" />
          ))}
          <circle cx="60" cy="62" r="8" fill="#D9B45E" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <circle key={i} cx={60 + Math.cos(i) * 4} cy={62 + Math.sin(i) * 4} r="1.2" fill="#8C6A2E" />
          ))}
        </svg>
      )
  }
}

export function Tape({ variant }: { variant?: string }) {
  const v = variant ?? 'kraft'
  return <Photographed file={`/demo/scrap/tape-${v}.webp`} className="scrap-photo scrap-tape" fallback={<span className={`tape tape-${v}`} aria-hidden="true" />} />
}

/** An optional picture from public/demo/ui — nothing at all if it isn't there. */
export function OptionalImg({ src, className = '', alt = '' }: { src: string; className?: string; alt?: string }) {
  const [ok, setOk] = useState(true)
  if (!ok) return null
  return <img className={className} src={src} alt={alt} onError={() => setOk(false)} />
}

export function Ticket({ variant, text }: { variant?: string; text?: string }) {
  if (variant === 'tag')
    return (
      <span className="tag">
        <span className="tag-string" aria-hidden="true" />
        <span className="tag-k">now playing</span>
        <span className="tag-t">{text}</span>
      </span>
    )
  return (
    <span className={`ticket ticket-${variant ?? 'yellow'}`}>
      <span className="ticket-k">ADMIT ONE</span>
      <span className="ticket-n">{text}</span>
      <span className="ticket-k">HOLD THIS STUB</span>
    </span>
  )
}

export function Label({ variant, text }: { variant?: string; text?: string }) {
  if (variant === 'stamp')
    return (
      <span className="stamp-letters">
        {[...(text ?? '')].map((c, i) => (
          <span key={i} style={{ '--t': `${((hash(c + i) % 9) - 4) * 1.2}deg` } as CSSProperties}>
            {c === ' ' ? '\u00a0' : c}
          </span>
        ))}
      </span>
    )
  return <span className="typed">{text}</span>
}

export function Note({ variant, text }: { variant?: string; text?: string }) {
  return <span className={`note note-${variant ?? 'hand'}`}>{text}</span>
}

/** Renders any page item's material. */
export function ItemBody({ it, negative }: { it: PageItem; negative?: boolean }) {
  switch (it.kind) {
    case 'photo':
      return <ScrapPhoto refId={it.ref} variant={it.variant} negative={negative} />
    case 'note':
      return <Note variant={it.variant} text={it.text} />
    case 'sticker':
      return <Sticker variant={it.variant} />
    case 'ticket':
      return <Ticket variant={it.variant} text={it.text} />
    case 'tape':
      return <Tape variant={it.variant} />
    case 'label':
      return <Label variant={it.variant} text={it.text} />
  }
}
