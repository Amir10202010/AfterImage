import { useMemo } from 'react'
import { useStore } from '../lib/store'
import { dayIndex, dayPhotos, dayWords, monthKey, type Day } from '../lib/journal'
import { hash } from '../lib/extract'
import { todayISO } from '../lib/time'
import { OptionalImg, ScrapPhoto, Sticker } from '../components/Scrap'
import { go } from '../App'
import { playPageTurn } from '../lib/pageTurn'

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const DOW = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

function shiftMonth(ym: string, d: number) {
  const [y, m] = ym.split('-').map(Number)
  const t = new Date(y, m - 1 + d, 1)
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`
}

/** The month in rows of seven, so screen readers get a real grid; the rows use display: contents. */
function weeks<T>(cells: T[]) {
  const out: { c: T; i: number }[][] = []
  cells.forEach((c, i) => {
    if (i % 7 === 0) out.push([])
    out[out.length - 1].push({ c, i })
  })
  return out
}

export default function Journal({ ym }: { ym?: string }) {
  const { memories, shoebox } = useStore()
  const days = useMemo(() => dayIndex(memories, shoebox), [memories, shoebox])
  const months = useMemo(() => [...new Set([...days.keys()].map(monthKey))].sort(), [days])
  const today = todayISO()
  const current = ym && /^\d{4}-\d{2}$/.test(ym) ? ym : (months.filter((m) => m <= monthKey(today)).pop() ?? monthKey(today))
  const [y, m] = current.split('-').map(Number)

  const cells = useMemo(() => {
    const first = new Date(y, m - 1, 1)
    const lead = (first.getDay() + 6) % 7
    const count = new Date(y, m, 0).getDate()
    const out: (Day | { date: string; empty: true } | null)[] = []
    for (let i = 0; i < lead; i++) out.push(null)
    for (let d = 1; d <= count; d++) {
      const date = `${current}-${String(d).padStart(2, '0')}`
      out.push(days.get(date) ?? { date, empty: true })
    }
    while (out.length % 7) out.push(null)
    return out
  }, [current, days, m, y])

  const monthDays = cells.filter((c): c is Day => !!c && !('empty' in c))
  const words = monthDays.flatMap(dayWords)
  const headNote = [...words].filter((w) => w.length <= 64).sort((a, b) => hash(a + current) - hash(b + current))[0]
  const sticky = words.filter((w) => w !== headNote && w.length <= 90).sort((a, b) => hash(b + current) - hash(a + current))[0]
  const best = [...monthDays].sort((a, b) => dayPhotos(b).length - dayPhotos(a).length)[0]
  const bestPhoto = best ? dayPhotos(best)[1] ?? dayPhotos(best)[0] : undefined
  const idx = months.indexOf(current)
  const prev = idx > 0 ? months[idx - 1] : shiftMonth(current, -1)
  const next = idx >= 0 && idx < months.length - 1 ? months[idx + 1] : shiftMonth(current, 1)
  const photoCount = monthDays.reduce((n, d) => n + dayPhotos(d).length, 0)

  return (
    <main className="paper journal">
      <div className="journal-head">
        <div>
          <p className="kicker">The journal</p>
          <h1 className="print-title">Every day you kept a picture of.</h1>
        </div>
        <p className="section-meta">
          {shoebox.length} photos · {days.size} days · <a href="#/connect">add photos</a>
        </p>
      </div>

      <nav className="month-nav" aria-label="Months">
        <button type="button" className="btn btn-ghost-ink btn-sm" onClick={() => go(`/journal/${prev}`)} aria-label="Previous month">
          ←
        </button>
        <div className="month-chips">
          {months.map((mk) => (
            <a key={mk} href={`#/journal/${mk}`} className={`chip ${mk === current ? 'is-on' : ''}`} aria-current={mk === current ? 'page' : undefined}>
              {MONTHS[Number(mk.slice(5)) - 1].slice(0, 3)} {mk.slice(2, 4)}
            </a>
          ))}
        </div>
        <button type="button" className="btn btn-ghost-ink btn-sm" onClick={() => go(`/journal/${next}`)} aria-label="Next month">
          →
        </button>
        <a className="btn btn-ink btn-sm music-cta" href={`#/music/${current}`}>
          ♪ Music box
        </a>
      </nav>

      <section className="board" aria-label={`${MONTHS[m - 1]} ${y}`}>
        <div className="board-top">
          <span className="board-num">{String(m).padStart(2, '0')}</span>
          {headNote && <span className="board-note">{headNote}</span>}
          <span className="board-flower" aria-hidden="true">
            <Sticker variant="flower" />
          </span>
          <span className="board-month">
            {MONTHS[m - 1]} <small>{y}</small>
          </span>
        </div>
        <div className="cal" role="grid" aria-label={`${MONTHS[m - 1]} ${y}`}>
          <div className="cal-row" role="row">
            {DOW.map((d) => (
              <span key={d} className="cal-dow" role="columnheader">
                {d}
              </span>
            ))}
          </div>
          {weeks(cells).map((week, wk) => (
            <div key={wk} className="cal-row" role="row">
              {week.map(({ c, i }) => {
                if (!c) return <span key={'x' + i} className="cal-cell cal-blank" role="gridcell" />
                const dnum = Number(c.date.slice(8))
                if ('empty' in c)
                  return (
                    <span key={c.date} className={`cal-cell ${c.date === today ? 'is-today' : ''}`} role="gridcell">
                      <span className="cal-n">{dnum}</span>
                    </span>
                  )
                const ph = dayPhotos(c)
                const w = dayWords(c)
                const mem = c.memories[0]
                return (
                  <a key={c.date} className={`cal-cell has-day ${ph.length ? 'has-photo' : ''}`} href={`#/page/${c.date}`} onClick={playPageTurn} role="gridcell" aria-label={`${dnum} ${MONTHS[m - 1]}: ${ph.length} photos${mem ? `, ${mem.title}` : ''}`}>
                    {ph[0] ? <ScrapPhoto refId={ph[0].ref} negative={ph[0].negative} variant="cell" thumb /> : <span className="cal-words">{w[0]}</span>}
                    <span className="cal-n">{dnum}</span>
                    {ph.length > 1 && <span className="cal-more">+{ph.length - 1}</span>}
                    {mem && <span className={`cal-mem ${mem.progress.developedAt ? 'is-dev' : ''}`} title={mem.progress.developedAt ? 'A developed memory' : 'An undeveloped negative'} />}
                  </a>
                )
              })}
            </div>
          ))}
        </div>
        {best && bestPhoto && (
          <a className="board-polaroid" href={`#/page/${best.date}`} aria-label="The fullest day this month">
            <span className="tape tape-kraft" aria-hidden="true" />
            <ScrapPhoto refId={bestPhoto.ref} negative={bestPhoto.negative} variant="polaroid" caption={clip(dayWords(best)[0]) ?? `${Number(best.date.slice(8))} ${MONTHS[m - 1]}`} />
          </a>
        )}
        {sticky && (
          <span className="board-sticky">
            <span className="pin-dot" aria-hidden="true" />
            {sticky}
          </span>
        )}
        <span className="board-ticket" aria-hidden="true">
          <Sticker variant="ticket" />
        </span>
        <div className="board-foot" aria-hidden="true">
          {Array.from({ length: 22 }, (_, i) => (
            <span key={i}>✿</span>
          ))}
        </div>
      </section>

      {photoCount === 0 && (
        <section className="journal-empty">
          <OptionalImg src="/demo/ui/empty-journal.jpg" className="ui-art" />
          <p>Nothing kept this month yet.</p>
          <a className="btn btn-ink" href="#/connect">
            Connect your photos
          </a>
        </section>
      )}
    </main>
  )
}

/** Shortens a caption at a word boundary, so handwriting never stops mid-word. */
function clip(s?: string, max = 30) {
  if (!s) return undefined
  if (s.length <= max) return s
  return s.slice(0, max).replace(/\s+\S*$/, '') + '…'
}
