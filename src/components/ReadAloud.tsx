import { useEffect, useRef, useState } from 'react'
import { narrationScript, pauseAfter, pickVoice, type Narration } from '../lib/narration'
import { duckMusic } from '../lib/sound'
import type { CardModel } from '../lib/daycard'

type Status = 'idle' | 'speaking' | 'unsupported'

const supported = () => typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window

/** The installed voices; some browsers only list them after a 'voiceschanged' event. */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  const now = speechSynthesis.getVoices()
  if (now.length) return Promise.resolve(now)
  return new Promise((resolve) => {
    const done = () => {
      speechSynthesis.removeEventListener('voiceschanged', done)
      resolve(speechSynthesis.getVoices())
    }
    speechSynthesis.addEventListener('voiceschanged', done)
    window.setTimeout(done, 1200)
  })
}

/**
 * Reads the day aloud with the device's own synthesised voice: the folder name, then the
 * story, verbatim. Rate, pitch, pauses and a lower voice follow the day's voice plan.
 * `onLine` receives the sentence being spoken, so the card can show it as a subtitle.
 */
export default function ReadAloud({ story, card, onLine }: { story: string; card: CardModel; onLine: (text?: string) => void }) {
  const [status, setStatus] = useState<Status>(() => (supported() ? 'idle' : 'unsupported'))
  const [voiceName, setVoiceName] = useState<string>()
  const run = useRef(0)
  const live = useRef<SpeechSynthesisUtterance[]>([])
  const timer = useRef<number | undefined>(undefined)
  const plan = card.atm.voice

  const stop = () => {
    run.current++
    window.clearTimeout(timer.current)
    if (supported()) speechSynthesis.cancel()
    live.current = []
    duckMusic(false)
    onLine(undefined)
    setStatus((s) => (s === 'unsupported' ? s : 'idle'))
  }

  const start = async () => {
    stop()
    const token = run.current
    const script: Narration = narrationScript(card.title, story, plan)
    const voice = pickVoice(await loadVoices(), script.lang, plan.low)
    if (token !== run.current) return
    setVoiceName(voice ? voice.name : undefined)
    setStatus('speaking')
    duckMusic(true)

    const say = (i: number) => {
      if (token !== run.current) return
      if (i >= script.lines.length) {
        live.current = []
        duckMusic(false)
        onLine(undefined)
        setStatus('idle')
        return
      }
      const line = script.lines[i]
      const u = new SpeechSynthesisUtterance(line.text)
      u.lang = script.lang
      if (voice) u.voice = voice
      u.rate = plan.rate
      u.pitch = plan.pitch
      u.volume = plan.volume
      u.onstart = () => token === run.current && onLine(line.text)
      const next = () => {
        if (token !== run.current) return
        timer.current = window.setTimeout(() => say(i + 1), pauseAfter(line, plan))
      }
      u.onend = next
      u.onerror = (e) => (e.error === 'interrupted' || e.error === 'canceled' ? undefined : next())
      // keep a reference: some engines drop the events of utterances that were garbage-collected
      live.current.push(u)
      speechSynthesis.speak(u)
    }
    say(0)
  }

  // stop talking when the page is left
  useEffect(
    () => () => {
      run.current++
      window.clearTimeout(timer.current)
      if (supported()) speechSynthesis.cancel()
      duckMusic(false)
    },
    [],
  )

  if (status === 'unsupported')
    return <p className="read-aloud-note">This browser can’t read aloud. The voice plan is still shown in “Why it looks like this”.</p>

  return (
    <div className="read-aloud">
      <button type="button" className={`sound-btn read-btn ${status === 'speaking' ? 'is-on' : ''}`} aria-pressed={status === 'speaking'} onClick={() => (status === 'speaking' ? stop() : start())}>
        <span className="read-icon" aria-hidden="true">
          {status === 'speaking' ? '■' : '❝'}
        </span>
        <span className="sound-label">
          {status === 'speaking' ? 'Stop reading' : 'Read it aloud'}
          <span className="sound-song">
            {plan.style} · rate {plan.rate} · pitch {plan.pitch}
          </span>
        </span>
      </button>
      {status === 'speaking' && (
        <span className="read-aloud-voice">{voiceName ? `Voice: ${voiceName} (synthesised on this device)` : 'No voice for this language is installed; the browser picks one.'}</span>
      )}
    </div>
  )
}
