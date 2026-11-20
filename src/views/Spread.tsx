import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { deletePage, savePage, useStore } from '../lib/store'
import type { PageItem } from '../lib/types'
import { autoLayout, dayIndex, dayPhotos, newItem, type Day } from '../lib/journal'
import { longDate, weekday } from '../lib/time'
import { AppVoice, Back, ConfirmButton, InfoTip } from '../components/common'
import { ItemBody, ScrapPhoto, Sticker, Tape } from '../components/Scrap'
import { hrefFor } from './Home'

const STICKERS = ['flower', 'flower2', 'flower3', 'leaf', 'camera', 'stamp', 'stamp2', 'stamp3', 'ticket', 'heart', 'star', 'clip', 'wax']
const TAPES = ['kraft', 'grid', 'flower', 'red']

export default function Spread({ date }: { date: string }) {
  const { memories, shoebox, pages } = useStore()
  const days = useMemo(() => dayIndex(memories, shoebox), [memories, shoebox])
  const day: Day = days.get(date) ?? { date, memories: [], shots: [] }
  const sorted = useMemo(() => [...days.keys()].sort(), [days])
  const i = sorted.indexOf(date)
  const saved = pages[date]
  return <Book key={date} day={day} initial={saved?.items ?? autoLayout(day)} isSaved={!!saved} prev={i > 0 ? sorted[i - 1] : undefined} next={i >= 0 && i < sorted.length - 1 ? sorted[i + 1] : undefined} />
}

function Book({ day, initial, isSaved, prev, next }: { day: Day; initial: PageItem[]; isSaved: boolean; prev?: string; next?: string }) {
  const [items, setItems] = useState<PageItem[]>(initial)
  const [sel, setSel] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const pageRefs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)]
  const drag = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null)
  const photos = dayPhotos(day)
  const negatives = new Set(photos.filter((p) => p.negative).map((p) => p.ref))
  const placed = new Set(items.filter((x) => x.kind === 'photo').map((x) => x.ref))
  const unplaced = photos.filter((p) => !placed.has(p.ref))
  const m = day.memories[0]
  const selected = items.find((x) => x.id === sel)

  // autosave, gently
  useEffect(() => {
    if (!dirty) return
    const t = window.setTimeout(() => {
      savePage({ date: day.date, items, updatedAt: new Date().toISOString() })
      setDirty(false)
    }, 450)
    return () => window.clearTimeout(t)
  }, [items, dirty, day.date])

  const update = useCallback((id: string, fn: (x: PageItem) => PageItem) => {
    setItems((xs) => xs.map((x) => (x.id === id ? fn(x) : x)))
    setDirty(true)
  }, [])
  const add = (it: PageItem) => {
    const z = Math.max(0, ...items.map((x) => x.z)) + 1
    setItems((xs) => [...xs, { ...it, z }])
    setSel(it.id)
    setDirty(true)
  }
  const remove = (id: string) => {
    setItems((xs) => xs.filter((x) => x.id !== id))
    setSel(null)
    setDirty(true)
  }
  const front = (id: string) => update(id, (x) => ({ ...x, z: Math.max(0, ...items.map((y) => y.z)) + 1 }))

  const onKey = (e: React.KeyboardEvent) => {
    if (!selected || (e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return
    const step = e.shiftKey ? 5 : 1
    const k = e.key
    if (k === 'ArrowLeft') update(selected.id, (x) => ({ ...x, x: x.x - step }))
    else if (k === 'ArrowRight') update(selected.id, (x) => ({ ...x, x: x.x + step }))
    else if (k === 'ArrowUp') update(selected.id, (x) => ({ ...x, y: x.y - step }))
    else if (k === 'ArrowDown') update(selected.id, (x) => ({ ...x, y: x.y + step }))
    else if (k === '+' || k === '=') update(selected.id, (x) => ({ ...x, w: Math.min(95, x.w * 1.08) }))
    else if (k === '-') update(selected.id, (x) => ({ ...x, w: Math.max(6, x.w / 1.08) }))
    else if (k === 'r' || k === 'R') update(selected.id, (x) => ({ ...x, r: x.r + (e.shiftKey ? -5 : 5) }))
    else if (k === 'Delete' || k === 'Backspace') remove(selected.id)
    else if (k === 'Escape') setSel(null)
    else return
    e.preventDefault()
  }

  return (
    <main className="paper spread-page" onKeyDown={onKey}>
      <header className="print-bar">
        <Back href={`#/journal/${day.date.slice(0, 7)}`}>The month</Back>
        <nav className="print-actions" aria-label="Day">
          {prev && (
            <a className="link" href={`#/page/${prev}`}>
              ← previous day
            </a>
          )}
          {next && (
            <a className="link" href={`#/page/${next}`}>
              next day →
            </a>
          )}
        </nav>
      </header>

      <div className="spread-head">
        <div>
          <p className="print-dateline">
            {weekday(day.date)}, {longDate(day.date)}
          </p>
          <h1 className="spread-title">{m?.title ?? `${photos.length} ${photos.length === 1 ? 'photograph' : 'photographs'}`}</h1>
        </div>
        <div className="row">
          {m ? (
            <a className="btn btn-ink" href={hrefFor(m)}>
              {m.progress.developedAt ? 'Open the print' : 'Develop it in the darkroom'}
            </a>
          ) : (
            <a className="btn btn-ink" href={`#/new/from/${day.date}`}>
              Turn this day into a memory
            </a>
          )}
        </div>
      </div>
      {!m && photos.length > 0 && (
        <AppVoice>These photos aren’t a memory yet — just what your camera kept. Write what happened, and the day goes into the darkroom.</AppVoice>
      )}

      <div className="desk" onPointerDown={(e) => e.target === e.currentTarget && setSel(null)}>
        <div className="notebook">
          <span className="nb-elastic" aria-hidden="true" />
          {[0, 1].map((pg) => (
            <div
              key={pg}
              ref={pageRefs[pg]}
              className={`nb-page nb-${pg ? 'right' : 'left'}`}
              onPointerDown={(e) => {
                if (e.target === e.currentTarget) setSel(null)
              }}
              onPointerMove={(e) => {
                const d = drag.current
                const r = pageRefs[pg].current?.getBoundingClientRect()
                if (!d || !r) return
                const dx = ((e.clientX - d.sx) / r.width) * 100
                const dy = ((e.clientY - d.sy) / r.height) * 100
                if (Math.abs(dx) + Math.abs(dy) > 0.6) d.moved = true
                update(d.id, (x) => ({ ...x, x: Math.max(-15, Math.min(100, d.ox + dx)), y: Math.max(-10, Math.min(100, d.oy + dy)) }))
              }}
              onPointerUp={() => (drag.current = null)}
              onPointerCancel={() => (drag.current = null)}
            >
              {items
                .filter((x) => x.page === pg)
                .map((it) => (
                  <div
                    key={it.id}
                    className={`pi pi-${it.kind} ${sel === it.id ? 'is-sel' : ''}`}
                    style={{ left: `${it.x}%`, top: `${it.y}%`, width: `${it.w}%`, zIndex: it.z, '--r': `${it.r}deg` } as CSSProperties}
                    tabIndex={0}
                    role="button"
                    aria-label={`${it.kind}${it.text ? ': ' + it.text : ''}. Arrow keys move, plus and minus resize, R rotates.`}
                    onFocus={() => setSel(it.id)}
                    onPointerDown={(e) => {
                      e.stopPropagation()
                      setSel(it.id)
                      ;(pageRefs[pg].current as HTMLElement).setPointerCapture(e.pointerId)
                      drag.current = { id: it.id, sx: e.clientX, sy: e.clientY, ox: it.x, oy: it.y, moved: false }
                    }}
                  >
                    <ItemBody it={it} negative={it.kind === 'photo' && negatives.has(it.ref ?? '')} />
                  </div>
                ))}
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="toolbar" role="toolbar" aria-label="Selected piece">
          {(selected.kind === 'note' || selected.kind === 'label' || selected.kind === 'ticket') && (
            <input className="toolbar-text" value={selected.text ?? ''} onChange={(e) => update(selected.id, (x) => ({ ...x, text: e.target.value }))} aria-label="Text" />
          )}
          <button type="button" onClick={() => update(selected.id, (x) => ({ ...x, r: x.r - 5 }))} aria-label="Rotate left">
            ⟲
          </button>
          <button type="button" onClick={() => update(selected.id, (x) => ({ ...x, r: x.r + 5 }))} aria-label="Rotate right">
            ⟳
          </button>
          <button type="button" onClick={() => update(selected.id, (x) => ({ ...x, w: Math.max(6, x.w / 1.12) }))} aria-label="Smaller">
            −
          </button>
          <button type="button" onClick={() => update(selected.id, (x) => ({ ...x, w: Math.min(95, x.w * 1.12) }))} aria-label="Bigger">
            +
          </button>
          <button type="button" onClick={() => front(selected.id)}>
            To front
          </button>
          <button type="button" onClick={() => update(selected.id, (x) => ({ ...x, page: x.page ? 0 : 1 }))}>
            Other page
          </button>
          <button type="button" className="danger" onClick={() => remove(selected.id)}>
            Remove
          </button>
          <button type="button" onClick={() => setSel(null)} aria-label="Done">
            ✓
          </button>
        </div>
      )}

      <section className="tray" aria-label="Add to the page">
        {unplaced.length > 0 && (
          <div className="tray-row">
            <span className="tray-k">Photos from this day</span>
            <div className="tray-items">
              {unplaced.map((p) => (
                <button key={p.ref} type="button" className="tray-photo" onClick={() => add(newItem('photo', 0, { ref: p.ref, w: 46 }))} aria-label="Put this photo on the page">
                  <ScrapPhoto refId={p.ref} negative={p.negative} variant="cell" thumb />
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="tray-row">
          <span className="tray-k">Write</span>
          <div className="tray-items">
            <button type="button" className="tray-btn" onClick={() => add(newItem('note', 1, { variant: 'hand' }))}>
              <span className="note note-hand">handwriting</span>
            </button>
            <button type="button" className="tray-btn" onClick={() => add(newItem('note', 1, { variant: 'sticky', w: 34 }))}>
              <span className="note note-sticky">sticky note</span>
            </button>
            <button type="button" className="tray-btn" onClick={() => add(newItem('note', 0, { variant: 'torn', w: 40 }))}>
              <span className="note note-torn">torn paper</span>
            </button>
            <button type="button" className="tray-btn" onClick={() => add(newItem('label', 1, { text: 'HELLO' }))}>
              <span className="stamp-letters small">ABC</span>
            </button>
            <button type="button" className="tray-btn" onClick={() => add(newItem('label', 1, { variant: 'typed', text: day.date.replace(/-/g, ' '), w: 40 }))}>
              <span className="typed">typed</span>
            </button>
            <button type="button" className="tray-btn" onClick={() => add(newItem('ticket', 0, { text: `№ ${Math.floor(Math.random() * 90000 + 10000)}` }))}>
              ticket
            </button>
          </div>
        </div>
        <div className="tray-row">
          <span className="tray-k">Tape</span>
          <div className="tray-items">
            {TAPES.map((t) => (
              <button key={t} type="button" className="tray-btn tray-tape" onClick={() => add(newItem('tape', 0, { variant: t }))} aria-label={`${t} washi tape`}>
                <Tape variant={t} />
              </button>
            ))}
          </div>
        </div>
        <div className="tray-row">
          <span className="tray-k">Stickers</span>
          <div className="tray-items">
            {STICKERS.map((s) => (
              <button key={s} type="button" className="tray-btn tray-sticker" onClick={() => add(newItem('sticker', 1, { variant: s, w: s === 'ticket' ? 22 : 14 }))} aria-label={`${s} sticker`}>
                <Sticker variant={s} />
              </button>
            ))}
          </div>
        </div>
        <p className="tray-foot">
          <InfoTip label="How to arrange the page">Drag anything on the pages. Tap to select · arrows move · + − resize · R rotates. Saved on this device as you go.</InfoTip>
          {(isSaved || dirty) && (
            <>
              {' '}
              <ConfirmButton
                confirm="Start this page over with an automatic layout?"
                onConfirm={async () => {
                  await deletePage(day.date)
                  setItems(autoLayout(day))
                  setSel(null)
                  setDirty(false)
                }}
              >
                Start the page over
              </ConfirmButton>
            </>
          )}
        </p>
      </section>
    </main>
  )
}
