import { useEffect, useRef } from 'react'
import { agree } from '../lib/agreement'

/** Shown once on entering the app: what stays on the device, what goes to AI services, and the terms. */
export default function Agreement() {
  const btn = useRef<HTMLButtonElement>(null)
  const box = useRef<HTMLElement>(null)
  useEffect(() => {
    btn.current?.focus()
    // a modal keeps the keyboard inside it: Tab cycles through its links and its button
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !box.current) return
      const items = [...box.current.querySelectorAll<HTMLElement>('a[href], button')]
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (!box.current.contains(document.activeElement)) {
        e.preventDefault()
        first.focus()
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
  return (
    <div className="agree-backdrop">
      <section ref={box} className="agree" role="dialog" aria-modal="true" aria-labelledby="agree-h">
        <p className="kicker">Before you begin</p>
        <h2 id="agree-h" className="agree-h">
          Your days stay on this device.
        </h2>
        <ul className="agree-list">
          <li>Stories, photographs, songs and letters are kept in this browser. There are no accounts, and none of it is uploaded except as described below.</li>
          <li>
            <strong>The Stranger</strong> sends a selection of passages you wrote to Google Gemini, through our server and our key, to imitate your style. Names are masked; photos and sealed letters are never sent.
          </li>
          <li>
            <strong>Drawing a picture from your story</strong> stays off until you turn it on. When it is on, the story goes to Google Gemini and a description of the picture goes to Pollinations.
          </li>
          <li>Afterimage is a hackathon prototype, offered as it is. Keep a backup of anything you would hate to lose.</li>
        </ul>
        <p className="agree-fine">
          By continuing you accept the <a href="#/terms">Terms</a> and the <a href="#/privacy">Privacy notice</a>.
        </p>
        <div className="agree-acts">
          <button ref={btn} type="button" className="btn btn-ink" onClick={agree}>
            I agree, open Afterimage
          </button>
        </div>
      </section>
    </div>
  )
}
