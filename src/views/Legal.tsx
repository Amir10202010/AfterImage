import { Back } from '../components/common'
import { hasEntered } from './Landing'

/** The privacy notice and the terms: short, plain, and true to what the code does. */
export default function Legal({ kind }: { kind: 'privacy' | 'terms' }) {
  const back = hasEntered() ? '#/settings' : '#/welcome'
  return (
    <main className="paper legal app-page">
      <Back href={back}>{hasEntered() ? 'Settings' : 'Afterimage'}</Back>
      {kind === 'privacy' ? <Privacy /> : <Terms />}
      <p className="legal-foot">
        Last updated 22 November 2026 ·{' '}
        {kind === 'privacy' ? (
          <a className="link" href="#/terms">
            Terms
          </a>
        ) : (
          <a className="link" href="#/privacy">
            Privacy
          </a>
        )}
      </p>
    </main>
  )
}

function Privacy() {
  return (
    <article className="legal-body">
      <p className="kicker">Privacy</p>
      <h1>Your days stay on your device.</h1>
      <p className="legal-lede">Afterimage has no accounts and no database of its own. What you write and keep lives in this browser, on this device.</p>

      <h2>What is stored, and where</h2>
      <ul>
        <li>Stories, photographs, songs you attach, letters and notes are saved in this browser’s storage (IndexedDB). They are not uploaded anywhere.</li>
        <li>A few settings (sound on or off, which view you prefer, whether you have seen the tour) are kept in the browser’s local storage.</li>
        <li>No analytics, no advertising and no tracking cookies.</li>
      </ul>

      <h2>When something leaves the device</h2>
      <ul>
        <li>
          <strong>Drawing a picture from your story</strong> is off unless you turn it on. When it is on, the story and the facts of the day are sent to Google Gemini, which writes a description of a picture, and that description
          (not your story) is sent to Pollinations, which draws it. The picture is then kept only on your device.
        </li>
        <li>
          <strong>The Stranger’s AI questions</strong> work only if you add your own Google Gemini key. Then the parts of your diary it asks about are sent to Google with your key. The key is kept in this browser and never in a backup
          file.
        </li>
        <li>
          <strong>Read it aloud</strong> uses your browser’s speech voices. Afterimage picks a voice built into the device when there is one; some browsers only offer online voices, which send the text to the browser maker.
        </li>
        <li>
          <strong>Song links</strong> open the service you linked (Spotify, YouTube and so on). Nothing is sent to them until you click.
        </li>
      </ul>

      <h2>Backups and deleting</h2>
      <p>
        You can save a backup file from Settings and restore it later; the file stays wherever you put it. Clearing this browser’s site data, or <em>Erase everything</em> in Settings, deletes your days from this device for good.
      </p>
    </article>
  )
}

function Terms() {
  return (
    <article className="legal-body">
      <p className="kicker">Terms</p>
      <h1>A small prototype, offered as it is.</h1>
      <p className="legal-lede">Afterimage was made for the Genesis Hackathon. It is free to try and comes without any warranty: keep a backup of anything you would hate to lose.</p>

      <h2>Your content</h2>
      <ul>
        <li>What you write, photograph and attach is yours, and it stays on your device (see Privacy).</li>
        <li>Only add photographs and audio you have the right to use. For songs, use a link or your own recording; Afterimage does not provide or share music.</li>
        <li>Pictures drawn from your words are made by AI services and marked as drawn, not photographed.</li>
      </ul>

      <h2>What the pages mean</h2>
      <p>
        Each day’s page is chosen by simple, visible rules from the words, photographs and song you give it. The rules describe how a page looks, not how you are. Afterimage is not a medical or psychological tool and gives no advice.
        If a day was very hard, talking to someone you trust or a professional is a better place for it than any app.
      </p>

      <h2>The demo days</h2>
      <p>The demo days belong to an invented person. Their friends, songs and bands are fictional, and their photographs were generated with an image model for this project.</p>
    </article>
  )
}
