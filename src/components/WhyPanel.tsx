import { CONSTANTS, TECHNIQUES, type Reason, type TechniqueId } from '../lib/atmosphere'
import type { CardModel } from '../lib/daycard'

const FROM: Record<Reason['from'], string> = {
  text: 'Story',
  photo: 'Photo',
  music: 'Song',
  time: 'Time',
  people: 'People',
  weather: 'Weather',
}

const LAYOUT: Record<string, string> = {
  bleed: 'the photo fills the window',
  grid: 'a hard grid over the photo',
  offset: 'one print, set off-centre',
  air: 'one small image in a wide margin',
  scatter: 'overlapping, crooked frames',
}

/** "Why it looks like this": the technique, the signals that chose it, and what is fixed vs. what moved. */
export default function WhyPanel({ card }: { card: CardModel }) {
  const { atm } = card
  const t = atm.technique
  const ranked = (Object.entries(atm.scores) as [TechniqueId, number][]).sort((a, b) => b[1] - a[1])
  const top = ranked[0][1]
  const low = Math.min(...ranked.map(([, v]) => v))
  const runnerUp = TECHNIQUES[ranked[1][0]]
  const mu = atm.signals.music

  return (
    <aside className="why" aria-labelledby="why-h">
      <p className="why-k">Why it looks like this</p>
      <h2 id="why-h" className="why-name">
        {t.name}
      </h2>
      <p className="why-ref">{t.reference}</p>
      <p className="why-text">{t.why}</p>

      <ol className="why-scores" aria-label="How well each technique fits this day">
        {ranked.map(([id, v]) => (
          <li key={id} className={id === t.id ? 'is-on' : ''}>
            <span className="why-score-name">{TECHNIQUES[id].name}</span>
            <span className="why-bar" aria-hidden="true">
              <i style={{ width: `${Math.round(((v - low) / Math.max(0.001, top - low)) * 100)}%` }} />
            </span>
            <span className="why-score-v">{v.toFixed(2)}</span>
          </li>
        ))}
      </ol>
      <p className="why-note">
        Runner-up: {runnerUp.name}, for {runnerUp.for}.
      </p>

      <h3 className="why-h">What the day said, and what it changed</h3>
      <ul className="why-reasons">
        {atm.reasons.map((r, i) => (
          <li key={i}>
            <span className="why-from" data-from={r.from}>
              {FROM[r.from]}
            </span>
            <span>
              {r.signal} <span className="why-arrow">→</span> {r.effect}
            </span>
          </li>
        ))}
      </ul>

      <details className="why-details">
        <summary>Fixed for every day, and what moved today</summary>
        <div className="why-split">
          <div>
            <h4>Constant</h4>
            <ul>
              <li>{CONSTANTS.format}</li>
              <li>{CONSTANTS.grid}</li>
              <li>{CONSTANTS.date}</li>
              <li>{CONSTANTS.title}</li>
              <li>{CONSTANTS.caption}</li>
              <li>{CONSTANTS.song}</li>
              <li>{CONSTANTS.mark}</li>
            </ul>
          </div>
          <div>
            <h4>Variable, today</h4>
            <dl>
              <dt>Palette</dt>
              <dd className="why-strip">
                {atm.palette.strip.map((c) => (
                  <span key={c} style={{ background: c }} title={c} />
                ))}
              </dd>
              <dt>Photo treatment</dt>
              <dd>
                <code>{atm.treatment.filter}</code>
              </dd>
              <dt>Grain</dt>
              <dd>{Math.round(atm.grain * 100)}%</dd>
              <dt>Composition</dt>
              <dd>
                {LAYOUT[atm.composition.layout]}, {Math.round(atm.composition.air * 100)}% empty
              </dd>
              <dt>Rhythm</dt>
              <dd>
                {atm.rhythm.bpm} bpm{mu ? ` (${mu.source.bpm === 'measured' ? 'measured from your file' : mu.source.bpm === 'typed' ? 'typed in' : 'from “how it felt”'})` : ' (from the pace of the story)'}, {atm.rhythm.hold}s per photo, {atm.rhythm.transition}
              </dd>
              <dt>Motion</dt>
              <dd>
                drift {Math.round(atm.motion.drift * 100)}%, {atm.motion.pulse ? 'pulses on the beat' : `breathes every ${atm.motion.breath}s`}
              </dd>
              <dt>Narration</dt>
              <dd>
                {atm.voice.style}: rate {atm.voice.rate}, pitch {atm.voice.pitch}
              </dd>
            </dl>
          </div>
        </div>
      </details>
    </aside>
  )
}
