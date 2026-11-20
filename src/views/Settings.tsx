import { useStore } from '../lib/store'
import { replayTour } from '../components/Tour'
import { Colophon } from './Home'

export default function Settings() {
  const { memories, shoebox, letters } = useStore()
  return (
    <main className="paper app-page settings-page">
      <header className="page-head">
        <h1 className="page-title">Settings</h1>
      </header>
      <ul className="settings-list">
        <li>
          <span>
            <b>Show the tour again</b>
            <small>The short walkthrough of where everything lives.</small>
          </span>
          <button type="button" className="btn btn-ghost-ink btn-sm" onClick={replayTour}>
            Show
          </button>
        </li>
        <li>
          <span>
            <b>Bring in photos</b>
            <small>{shoebox.length} photos in your journal. Add more from your gallery or Instagram.</small>
          </span>
          <a className="btn btn-ghost-ink btn-sm" href="#/connect">
            Open
          </a>
        </li>
        <li>
          <span>
            <b>About Afterimage</b>
            <small>The front page — what this is and why.</small>
          </span>
          <a className="btn btn-ghost-ink btn-sm" href="#/welcome">
            Open
          </a>
        </li>
        <li>
          <span>
            <b>On this device</b>
            <small>
              {memories.length} memories · {letters.length} letters · {shoebox.length} photos. Stored in this browser only — nothing is uploaded.
            </small>
          </span>
        </li>
      </ul>
      <Colophon />
    </main>
  )
}
