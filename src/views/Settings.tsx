import { useEffect, useRef, useState, type ReactNode } from 'react'
import { eraseEverything, restoreDemos, useStore } from '../lib/store'
import { replayTour } from '../components/Tour'
import { openPalette } from '../components/Palette'
import { closeSettings } from '../components/Shell'
import { ConfirmButton } from '../components/common'
import { bytes, downloadBlob, exportBackup, importBackup, storageInfo } from '../lib/backup'
import { todayISO } from '../lib/time'
import { toast } from '../lib/toast'

const I: Record<string, ReactNode> = {
  backup: <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14" />,
  restore: <path d="M12 20V9M7.5 13.5L12 9l4.5 4.5M5 4.5h14" />,
  photos: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <path d="M3.5 16l5-4.5 4 3.5 3-2.5 5 4" />
      <circle cx="15.5" cy="9.5" r="1.4" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
  keys: (
    <>
      <rect x="2.5" y="6.5" width="19" height="11" rx="2" />
      <path d="M6 10h.01M9.5 10h.01M13 10h.01M16.5 10h.01M7.5 14h9" />
    </>
  ),
  tour: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9.6 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 16.8h.01" />
    </>
  ),
  about: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.2" />
    </>
  ),
  shield: <path d="M12 3.5l7 2.8v5.2c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6.3z M8.8 12l2.2 2.2 4.3-4.4" />,
}

function Icon({ name }: { name: string }) {
  return (
    <span className="set-ico" aria-hidden="true">
      <svg viewBox="0 0 24 24">{I[name]}</svg>
    </span>
  )
}

function Row({ icon, title, text, children, tone }: { icon: string; title: string; text: ReactNode; children?: ReactNode; tone?: 'warn' }) {
  return (
    <li className={`set-row ${tone === 'warn' ? 'is-warn' : ''}`}>
      <Icon name={icon} />
      <span className="set-text">
        <b>{title}</b>
        <small>{text}</small>
      </span>
      {children && <span className="set-act">{children}</span>}
    </li>
  )
}

export default function Settings() {
  const { memories, shoebox, letters } = useStore()
  const [busy, setBusy] = useState<string | null>(null)
  const [store, setStore] = useState<{ used: number; quota: number; persisted: boolean } | null>(null)
  const [pending, setPending] = useState<File | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const auto = useRef(false)

  useEffect(() => {
    storageInfo().then(setStore)
  }, [memories.length, shoebox.length])

  // Esc closes settings, like the button that opened it
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || e.defaultPrevented) return
      if (document.querySelector('.pal-wrap, .tour, .sheet-wrap')) return
      closeSettings()
    }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [])

  const backup = async () => {
    if (busy) return
    setBusy('Packing…')
    try {
      const blob = await exportBackup((d, t) => setBusy(`Packing ${Math.round((d / t) * 100)}%`))
      downloadBlob(blob, `afterimage-backup-${todayISO()}.json`)
      toast(`Backup saved — ${bytes(blob.size)}. Keep it somewhere safe.`)
    } catch (e) {
      toast('The backup couldn’t be made: ' + String(e))
    } finally {
      setBusy(null)
    }
  }

  // "Back up everything" from the search palette lands here and starts at once
  useEffect(() => {
    if (!auto.current && window.location.hash.includes('backup=1')) {
      auto.current = true
      window.history.replaceState(null, '', '#/settings')
      backup()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const restore = async (f: File) => {
    setPending(null)
    setBusy('Restoring…')
    try {
      const r = await importBackup(f)
      toast(`Restored ${r.memories} memories, ${r.photos} photos, ${r.letters} letters.`)
      window.setTimeout(() => window.location.reload(), 900)
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e))
      setBusy(null)
    }
  }

  const persist = async () => {
    const ok = await navigator.storage?.persist?.().catch(() => false)
    toast(ok ? 'Done — your browser won’t clear Afterimage to free up space.' : 'Your browser said no. A backup file is the safe way.')
    storageInfo().then(setStore)
  }

  const pct = store && store.quota ? Math.max(1.5, Math.min(100, (store.used / store.quota) * 100)) : 0
  const counts: [number | string, string][] = [
    [memories.length, memories.length === 1 ? 'memory' : 'memories'],
    [shoebox.length, shoebox.length === 1 ? 'photo' : 'photos'],
    [letters.length, letters.length === 1 ? 'letter' : 'letters'],
    [store ? bytes(store.used) : '—', 'on this device'],
  ]

  return (
    <main className="paper app-page set-page">
      <header className="set-head">
        <div>
          <p className="kicker">Afterimage</p>
          <h1 className="page-title">Settings</h1>
        </div>
        <button type="button" className="set-close" onClick={closeSettings} aria-label="Close settings">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
          <kbd>Esc</kbd>
        </button>
      </header>

      <section className="set-hero" aria-label="On this device">
        <div className="set-hero-top">
          <span className="set-hero-k">
            <Icon name="shield" />
            Everything lives in this browser. Nothing is uploaded.
          </span>
          {store &&
            (store.persisted ? (
              <span className="set-pill is-ok">✓ Kept safe</span>
            ) : (
              <button type="button" className="set-pill" onClick={persist} title="Ask the browser never to clear this site’s storage on its own">
                Keep safe
              </button>
            ))}
        </div>
        <ul className="set-counts">
          {counts.map(([n, l]) => (
            <li key={l}>
              <b>{n}</b>
              <span>{l}</span>
            </li>
          ))}
        </ul>
        {store && store.quota > 0 && (
          <div className="set-meter" title={`${bytes(store.used)} of ${bytes(store.quota)}`}>
            <i style={{ width: `${pct}%` }} />
          </div>
        )}
      </section>

      <section className="set-group" aria-labelledby="g-things">
        <h2 id="g-things" className="set-h">
          Your things
        </h2>
        <ul className="set-card">
          <Row icon="backup" title="Back up everything" text="One file with every memory, photo, page and letter. It only goes where you move it.">
            <button type="button" className="btn btn-ink btn-sm" onClick={backup} disabled={!!busy}>
              {busy ?? 'Download'}
            </button>
          </Row>
          <Row
            icon="restore"
            title="Restore from a backup"
            tone={pending ? 'warn' : undefined}
            text={pending ? <>This replaces everything here with “{pending.name}”. What’s on this device now will be gone.</> : 'Bring back a backup file — on this phone, or a new one.'}
          >
            {pending ? (
              <>
                <button type="button" className="btn btn-ghost-ink btn-sm" onClick={() => setPending(null)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-ink btn-sm danger-btn" onClick={() => restore(pending)}>
                  Replace
                </button>
              </>
            ) : (
              <>
                <button type="button" className="btn btn-ghost-ink btn-sm" onClick={() => file.current?.click()} disabled={!!busy}>
                  Choose file
                </button>
                <input
                  ref={file}
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    if (f) setPending(f)
                  }}
                />
              </>
            )}
          </Row>
          <Row icon="photos" title="Bring in photos" text={`${shoebox.length} in your journal. Add more from your gallery or an Instagram export.`}>
            <a className="btn btn-ghost-ink btn-sm" href="#/connect">
              Open
            </a>
          </Row>
        </ul>
      </section>

      <section className="set-group" aria-labelledby="g-around">
        <h2 id="g-around" className="set-h">
          Getting around
        </h2>
        <ul className="set-card">
          <Row icon="search" title="Search everything" text={<>Any day, person, place, song, caption or letter. <kbd>Ctrl K</kbd> or <kbd>/</kbd> anywhere.</>}>
            <button type="button" className="btn btn-ghost-ink btn-sm" onClick={() => openPalette()}>
              Search
            </button>
          </Row>
          <Row icon="keys" title="Keyboard shortcuts" text={<><kbd>g</kbd> <kbd>t</kbd> to jump between rooms · <kbd>n</kbd> new day · <kbd>r</kbd> random memory</>}>
            <button type="button" className="btn btn-ghost-ink btn-sm" onClick={() => openPalette('keys')}>
              Show
            </button>
          </Row>
          <Row icon="tour" title="Show the tour again" text="The short walkthrough of where everything lives.">
            <button type="button" className="btn btn-ghost-ink btn-sm" onClick={replayTour}>
              Show
            </button>
          </Row>
          <Row icon="about" title="About Afterimage" text="The front page — what this is and why.">
            <a className="btn btn-ghost-ink btn-sm" href="#/welcome">
              Open
            </a>
          </Row>
        </ul>
      </section>

      <section className="set-group" aria-labelledby="g-danger">
        <h2 id="g-danger" className="set-h">
          Start over
        </h2>
        <div className="set-card set-danger">
          <p>
            The three demo days belong to a fictional person; their photographs are illustrations made for this project.
            Anything the app writes is marked <span className="app-mark">◇</span>.
          </p>
          <div className="set-danger-acts">
            <ConfirmButton confirm="Put the three demo days back as they were?" onConfirm={() => restoreDemos().then(() => toast('The demo days are back.'))}>
              Restore demo days
            </ConfirmButton>
            <ConfirmButton
              className="danger"
              confirm="Erase every memory, photo and letter on this device? This cannot be undone."
              onConfirm={() => eraseEverything().then(() => toast('Everything on this device was erased.'))}
            >
              Erase everything
            </ConfirmButton>
          </div>
        </div>
      </section>
    </main>
  )
}
