// The app's frame: one clear navigation everywhere — a top bar on computers, a tab bar on phones.
import { useEffect, useState, type ReactNode } from 'react'
import { letterStatus, useStore } from '../lib/store'
import Tour, { tourDone } from './Tour'
import { agreed, onAgree } from '../lib/agreement'
import { openPalette } from './Palette'

// where you were before opening Settings, so the same button (or Esc) takes you back there
let beforeSettings = window.location.hash.startsWith('#/settings') ? '#/today' : window.location.hash || '#/today'
window.addEventListener('hashchange', (e) => {
  const from = new URL(e.oldURL).hash
  if (window.location.hash.startsWith('#/settings') && from && !from.startsWith('#/settings')) beforeSettings = from
})
export function closeSettings() {
  window.location.hash = beforeSettings.slice(1)
}

export type Tab ='today' | 'journal' | 'memories' | 'letters' | 'none'

const ICON: Record<string, ReactNode> = {
  today: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
    </svg>
  ),
  journal: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
      <rect x="7" y="12.5" width="3.5" height="3" rx=".5" />
    </svg>
  ),
  memories: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="M3 8.5h18M3 15.5h18M6.5 5v3.5M10.5 5v3.5M14.5 5v3.5M18.5 5v3.5M6.5 15.5V19M10.5 15.5V19M14.5 15.5V19M18.5 15.5V19" />
    </svg>
  ),
  letters: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="5.5" width="18" height="13" rx="1.5" />
      <path d="M3.5 6.5l8.5 6.5 8.5-6.5" />
    </svg>
  ),
  add: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
      <circle cx="16" cy="7" r="2.2" />
      <circle cx="10" cy="17" r="2.2" />
    </svg>
  ),
}

const TABS: { id: Exclude<Tab, 'none'>; label: string; href: string }[] = [
  { id: 'today', label: 'Today', href: '#/today' },
  { id: 'journal', label: 'Journal', href: '#/journal' },
  { id: 'memories', label: 'Memories', href: '#/memories' },
  { id: 'letters', label: 'Letters', href: '#/letters' },
]

export default function Shell({ tab, children }: { tab: Tab; children: ReactNode }) {
  const { letters } = useStore()
  const [sheet, setSheet] = useState(false)
  const [tour, setTour] = useState(() => !tourDone())
  // the tour waits until the terms are accepted, so the two never stack
  const [agreedNow, setAgreedNow] = useState(agreed)
  useEffect(() => onAgree(() => setAgreedNow(true)), [])
  const unread = letters.filter((l) => letterStatus(l) === 'arrived').length
  const inSettings = window.location.hash.startsWith('#/settings')

  useEffect(() => {
    const on = () => setTour(true)
    window.addEventListener('afterimage:tour', on)
    return () => window.removeEventListener('afterimage:tour', on)
  }, [])

  // any navigation closes the sheet
  useEffect(() => {
    const close = () => setSheet(false)
    window.addEventListener('hashchange', close)
    return () => window.removeEventListener('hashchange', close)
  }, [])

  useEffect(() => {
    if (!sheet) return
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setSheet(false)
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [sheet])

  const item = (t: (typeof TABS)[number]) => (
    <a key={t.id} href={t.href} className={`nav-item ${tab === t.id ? 'is-on' : ''}`} aria-current={tab === t.id ? 'page' : undefined} data-tour={t.id}>
      <span className="nav-icon">
        {ICON[t.id]}
        {t.id === 'letters' && unread > 0 && <span className="nav-badge">{unread}</span>}
      </span>
      <span className="nav-label">{t.label}</span>
    </a>
  )

  const skip = () => {
    const main = document.querySelector<HTMLElement>('.shell main')
    if (!main) return
    main.tabIndex = -1
    main.focus()
  }

  return (
    <div className="shell">
      <button type="button" className="skip-link" onClick={skip}>
        Skip to content
      </button>
      <header className="topbar">
        <a className="brand" href="#/today" aria-label="Afterimage — Today">
          <img className="brand-mark" src="/favicon.svg" alt="" aria-hidden="true" />
          <span className="brand-word">Afterimage</span>
        </a>
        <nav className="topnav" aria-label="Sections">
          {TABS.map(item)}
        </nav>
        <div className="topbar-right">
          <button type="button" className="search-btn" onClick={() => openPalette()} aria-label="Search (Ctrl K)">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="M16 16l4.5 4.5" />
            </svg>
            <span className="search-btn-label">Search</span>
            <kbd className="search-btn-kbd">{/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K'}</kbd>
          </button>
          <button type="button" className="btn btn-ink btn-sm add-btn" onClick={() => setSheet(true)} data-tour="add">
            <span className="nav-icon">{ICON.add}</span> New
          </button>
          <button
            type="button"
            className={`icon-btn settings-toggle ${inSettings ? 'is-on' : ''}`}
            onClick={() => (inSettings ? closeSettings() : (window.location.hash = '/settings'))}
            aria-label={inSettings ? 'Close settings' : 'Settings'}
            aria-pressed={inSettings}
          >
            {inSettings ? ICON.close : ICON.settings}
          </button>
        </div>
      </header>

      <div className="shell-body">{children}</div>

      <nav className="tabbar" aria-label="Sections">
        {item(TABS[0])}
        {item(TABS[1])}
        <button type="button" className="tab-add" onClick={() => setSheet(true)} aria-label="New" data-tour="add-mobile">
          {ICON.add}
        </button>
        {item(TABS[2])}
        {item(TABS[3])}
      </nav>

      {sheet && (
        <div className="sheet-wrap" onClick={() => setSheet(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-label="Add" onClick={(e) => e.stopPropagation()}>
            <span className="sheet-grip" aria-hidden="true" />
            <a className="sheet-option" href="#/new" onClick={() => setSheet(false)} autoFocus>
              <span className="sheet-ico" aria-hidden="true">
                ✎
              </span>
              <span>
                <b>Save a day</b>
                <small>Write what happened. Develop it later.</small>
              </span>
            </a>
            <a className="sheet-option" href="#/connect" onClick={() => setSheet(false)}>
              <span className="sheet-ico" aria-hidden="true">
                ▦
              </span>
              <span>
                <b>Bring in photos</b>
                <small>From your gallery or Instagram.</small>
              </span>
            </a>
            <a className="sheet-option" href="#/letters?write=future" onClick={() => setSheet(false)}>
              <span className="sheet-ico" aria-hidden="true">
                ✉
              </span>
              <span>
                <b>Write to future you</b>
                <small>Sealed until the date you choose.</small>
              </span>
            </a>
            <button type="button" className="link sheet-close" onClick={() => setSheet(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {tour && agreedNow && <Tour onDone={() => setTour(false)} />}
    </div>
  )
}
