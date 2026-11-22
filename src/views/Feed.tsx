import { useStore } from '../lib/store'
import { longDate } from '../lib/time'
import type { Memory } from '../lib/types'
import { FEED_MAX, FEED_MIN, feedDays } from '../lib/feed'
import { Back } from '../components/common'
import DayCard from '../components/DayCard'
import { useDayCard } from '../components/useDayCard'

const LAYOUT: Record<string, string> = {
  bleed: 'photo fills the window',
  grid: 'hard grid',
  offset: 'one print, off-centre',
  air: 'small image, wide margin',
  scatter: 'crooked frames',
}

/** The last days side by side: the same frame every time, the weather of each day inside it. */
export default function Feed() {
  const { memories } = useStore()
  const days = feedDays(memories)

  return (
    <main className="paper feed app-page">
      <header className="feed-head">
        <Back href="#/memories">Memories</Back>
        <p className="kicker">Side by side</p>
        <h1 className="page-title">The last {days.length === 1 ? 'day' : `${days.length} days`}</h1>
        <p className="section-meta feed-lede">
          The frame never changes: a 4:5 card, the date on top, the folder name and one sentence of yours below. Everything inside it (technique,
          palette, grain, rhythm) comes from that day’s words, photos and song.
        </p>
      </header>

      {days.length === 0 ? (
        <p className="app-voice">
          Nothing here yet. <a href="#/new">Expose your first day</a>.
        </p>
      ) : (
        <ol className="feed-row" aria-label="The last days, newest first">
          {days.map((m) => (
            <FeedItem key={m.id} m={m} />
          ))}
        </ol>
      )}

      {days.length > 0 && days.length < FEED_MIN && (
        <p className="section-meta feed-more">
          The feed fills up to {FEED_MAX} days. <a href="#/new">Add another day</a>
        </p>
      )}
    </main>
  )
}

function FeedItem({ m }: { m: Memory }) {
  const card = useDayCard(m)
  const { atm } = card
  return (
    <li className="feed-item">
      <a className="feed-card" href={`#/print/${m.id}`} aria-label={`Open ${card.title}`}>
        <DayCard m={m} card={card} />
      </a>
      <div className="feed-meta">
        <p className="feed-date">{longDate(m.date)}</p>
        <p className="feed-tech">
          <span className="feed-dot" style={{ background: atm.palette.accent }} aria-hidden="true" />
          {atm.technique.name}
        </p>
        <p className="feed-ref">{atm.technique.reference}</p>
        <span className="why-strip feed-strip" aria-label="The day’s palette">
          {atm.palette.strip.map((c, i) => (
            <span key={i} style={{ background: c }} />
          ))}
        </span>
        <p className="feed-line">
          {atm.rhythm.bpm} bpm · each photo {atm.rhythm.hold}s · {LAYOUT[atm.composition.layout] ?? atm.composition.layout}
        </p>
      </div>
    </li>
  )
}
