// The Stranger · AI configuration: keys, consent, the writing profile, the queue.
// Used in Settings (everything) and inside the game when something is still missing.
import { useEffect, useState, useSyncExternalStore } from 'react'
import '../stranger.css'
import { GEMINI_MODELS, addKeys, getCursor, getKeys, maskKey, onKeysChange, removeKey, replaceKey, testKey } from '../lib/gemini'
import {
  BATCH,
  buildProfile,
  clearProfile,
  clearQueue,
  keysChanged,
  loadStranger,
  profileStaleness,
  realCount,
  refreshProfile,
  replenish,
  setPrefs,
  unused,
  useStranger,
} from '../lib/stranger/engine'
import { REAL_PER_ROUND } from '../lib/stranger/game'
import { ConfirmButton } from './common'
import { isoDate, longDate } from '../lib/time'
import { toast } from '../lib/toast'

function useKeys() {
  return useSyncExternalStore(onKeysChange, () => JSON.stringify(getKeys()))
}

const when = (t: number) => `${longDate(isoDate(new Date(t)))}, ${new Date(t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`

export function KeysPanel() {
  const keys: string[] = JSON.parse(useKeys())
  const [draft, setDraft] = useState('')
  const [shown, setShown] = useState<number | null>(null)
  const [editing, setEditing] = useState<number | null>(null)
  const [edit, setEdit] = useState('')
  const [tests, setTests] = useState<Record<number, string>>({})
  const cursor = getCursor()

  const add = () => {
    const n = addKeys(draft)
    setDraft('')
    keysChanged()
    toast(n ? `${n === 1 ? 'Key' : `${n} keys`} saved on this device.` : 'No new key found — paste the key itself (it starts with “AIza”).')
  }
  const test = async (i: number) => {
    setTests((t) => ({ ...t, [i]: 'Testing…' }))
    const r = await testKey(keys[i])
    setTests((t) => ({ ...t, [i]: r.ok ? '✓ Works' : r.error.message }))
  }

  return (
    <div className="sai-block">
      <h3 className="sai-h">Gemini API keys</h3>
      {keys.length > 0 ? (
        <ol className="sai-keys">
          {keys.map((k, i) => (
            <li key={k} className={keys.length > 1 && cursor % keys.length === i ? 'is-next' : ''}>
              <span className="sai-key-n">{i + 1}</span>
              {editing === i ? (
                <span className="sai-edit">
                  <input type="password" autoComplete="off" spellCheck={false} value={edit} onChange={(e) => setEdit(e.target.value)} placeholder="New key" aria-label={`Replacement for key ${i + 1}`} />
                  <button
                    type="button"
                    className="btn btn-ink btn-sm"
                    onClick={() => {
                      if (replaceKey(i, edit)) {
                        keysChanged()
                        toast('Key replaced.')
                        setEditing(null)
                        setEdit('')
                        setTests((t) => ({ ...t, [i]: '' }))
                      } else toast('That doesn’t look like a key.')
                    }}
                  >
                    Save
                  </button>
                  <button type="button" className="link" onClick={() => setEditing(null)}>
                    Cancel
                  </button>
                </span>
              ) : (
                <>
                  <code className="sai-key">{shown === i ? k : maskKey(k)}</code>
                  <span className="sai-key-acts">
                    <button type="button" className="link" onClick={() => setShown(shown === i ? null : i)}>
                      {shown === i ? 'Hide' : 'Show'}
                    </button>
                    <button type="button" className="link" onClick={() => test(i)}>
                      Test
                    </button>
                    <button type="button" className="link" onClick={() => (setEditing(i), setEdit(''))}>
                      Replace
                    </button>
                    <button
                      type="button"
                      className="link danger"
                      onClick={() => {
                        removeKey(i)
                        keysChanged()
                        setTests({})
                      }}
                    >
                      Remove
                    </button>
                  </span>
                  {tests[i] && <span className={`sai-test ${tests[i].startsWith('✓') ? 'is-ok' : ''}`}>{tests[i]}</span>}
                </>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <p className="sai-p">
          No key yet. Get a free one at{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
            Google AI Studio → API keys
          </a>
          , then paste it here.
        </p>
      )}
      <div className="sai-add">
        <textarea
          rows={2}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Paste one or more keys — separated by commas or new lines"
          spellCheck={false}
          autoComplete="off"
          aria-label="Gemini API keys"
          className="sai-input"
        />
        <button type="button" className="btn btn-ink btn-sm" onClick={add} disabled={!draft.trim()}>
          Add
        </button>
      </div>
      <details className="sai-more">
        <summary>How keys are used</summary>
      <p className="sai-fine">
        Model: <code>{GEMINI_MODELS[0]}</code>, falling back to <code>{GEMINI_MODELS[1]}</code>.
      </p>
      <p className="sai-fine">
        Requests take turns: the first uses key 1, the next key 2, and so on round the list — the place is remembered across reloads
        {keys.length > 1 ? <> (next: key {(cursor % keys.length) + 1})</> : null}. Free-tier limits are counted <b>per Google Cloud project</b>, not per key: several keys from one project share one quota, so rotation spreads requests but doesn’t add free quota.
      </p>
      <p className="sai-fine">
        Keys are stored only in this browser (localStorage) and are never put in backups. Anyone who can open this browser profile or its developer tools can read them — use keys you can revoke, and don’t use a shared computer.
      </p>
      </details>
    </div>
  )
}

export function ConsentPanel() {
  const { prefs } = useStranger()
  return (
    <div className="sai-block">
      <h3 className="sai-h">What is sent to Gemini</h3>
      <ul className="sai-list">
        <li>To learn your style: a spread of passages you wrote (stories, details, unsealed letters, captions, journal notes) — names of people and places you tagged are replaced with “[name]”. Choosing “whole archive” sends all of it, in batches.</li>
        <li>To write each batch of ten impostor lines: your style profile and about a dozen of your passages as examples.</li>
        <li>Never sent: photos, exact dates (only the month), the people and place fields, letters that are still sealed.</li>
        <li>Requests go straight from this browser to Google’s Gemini API under your own key and Google’s terms. On the free tier Google may use the content to improve its products.</li>
      </ul>
      {prefs.consentAt ? (
        <p className="sai-consent is-on">
          <span>✓ You agreed on {when(prefs.consentAt)}.</span>
          <button type="button" className="link" onClick={() => setPrefs({ consentAt: undefined })}>
            Withdraw consent
          </button>
        </p>
      ) : (
        <label className="sai-consent">
          <input type="checkbox" checked={false} onChange={() => setPrefs({ consentAt: Date.now() })} />
          <span>I agree to send the selected parts of my writing to Google’s Gemini API so The Stranger can imitate my style.</span>
        </label>
      )}
    </div>
  )
}

export function ProfilePanel() {
  const { profile, prefs, busy, progress } = useStranger()
  const keys = getKeys().length
  const can = !!prefs.consentAt && keys > 0 && !busy
  const n = realCount()
  const stale = profileStaleness()
  const why = !keys ? 'Add a key first.' : !prefs.consentAt ? 'Agree to the note above first.' : n < REAL_PER_ROUND ? `Only ${n} usable passages so far.` : null
  return (
    <div className="sai-block">
      <h3 className="sai-h">Your writing profile</h3>
      {profile ? (
        <>
          <p className="sai-p">
            Built {when(profile.createdAt)}
            {profile.updatedAt !== profile.createdAt && <> · updated {when(profile.updatedAt)}</>} · {profile.mode === 'full' ? 'whole archive' : 'representative sample'} · {profile.analyzed.length} passages read · {profile.model}
          </p>
          <blockquote className="sai-summary">{profile.style.summary}</blockquote>
          {stale?.stale && <p className="sai-fine is-warn">{stale.fresh} passages were written since — refresh to fold them in.</p>}
        </>
      ) : (
        <p className="sai-p">Not built yet. Gemini reads your writing once and keeps a description of how you write, on this device.</p>
      )}
      {busy === 'profile' && <p className="sai-progress">{progress ?? 'Working…'}</p>}
      <div className="sai-acts">
        <button type="button" className="btn btn-ink btn-sm" disabled={!can || n < REAL_PER_ROUND} onClick={() => buildProfile().then((ok) => ok && toast('Your writing profile is ready.'))}>
          {profile ? 'Rebuild from a sample' : 'Build my writing profile'}
        </button>
        <button type="button" className="btn btn-ghost-ink btn-sm" disabled={!can || n < REAL_PER_ROUND} onClick={() => buildProfile({ full: true }).then((ok) => ok && toast('Built from your whole archive.'))}>
          Use whole archive
        </button>
        {profile && (
          <button type="button" className="btn btn-ghost-ink btn-sm" disabled={!can} onClick={() => refreshProfile().then((ok) => ok && toast('Profile refreshed.'))}>
            Refresh with new writing
          </button>
        )}
      </div>
      {why && !profile && <p className="sai-fine">{why}</p>}
    </div>
  )
}

export function QueuePanel() {
  const { queue, busy, profile, prefs, log } = useStranger()
  const open = unused(queue).length
  const can = !!profile && !!prefs.consentAt && getKeys().length > 0 && !busy
  const recent = log.slice(-5).reverse()
  return (
    <div className="sai-block">
      <h3 className="sai-h">Impostors waiting</h3>
      <p className="sai-p">
        {open} {open === 1 ? 'line' : 'lines'} ready · {queue.length - open} played. Topped up in the background, so rounds never wait.
      </p>
      {busy === 'lines' && <p className="sai-progress">Writing new lines…</p>}
      <div className="sai-acts">
        <button type="button" className="btn btn-ghost-ink btn-sm" disabled={!can} onClick={() => replenish(true).then((n) => n && toast(`${n} new ${n === 1 ? 'line' : 'lines'} in the queue.`))}>
          Write {BATCH} more now
        </button>
        <ConfirmButton confirm="Throw away every generated line?" onConfirm={() => clearQueue().then(() => toast('Generated lines cleared.'))}>
          Clear generated lines
        </ConfirmButton>
        <ConfirmButton confirm="Delete your writing profile from this device?" onConfirm={() => clearProfile().then(() => toast('Writing profile deleted.'))}>
          Delete writing profile
        </ConfirmButton>
      </div>
      {recent.length > 0 && (
        <ul className="sai-log" aria-label="Recent Gemini requests">
          {recent.map((l) => (
            <li key={l.at + l.purpose}>
              <span>{new Date(l.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <span>{l.purpose}</span>
              <span>key {l.keyIndex + 1}</span>
              <span className={l.ok ? 'is-ok' : 'is-bad'}>{l.ok ? `ok · ${(l.ms / 1000).toFixed(1)}s` : l.kind}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function LastError() {
  const { lastError } = useStranger()
  if (!lastError) return null
  return (
    <p className="sai-error" role="alert">
      {lastError.message}
    </p>
  )
}

/** Everything, for Settings. */
export default function StrangerAI() {
  useEffect(() => {
    loadStranger()
  }, [])
  const { loaded } = useStranger()
  if (!loaded) return null
  return (
    <div className="sai">
      <p className="sai-p">
        Five passages you wrote, one Gemini wrote in your style. Only this game goes online.
      </p>

      <LastError />
      <KeysPanel />
      <ConsentPanel />
      <ProfilePanel />
      <QueuePanel />
    </div>
  )
}
