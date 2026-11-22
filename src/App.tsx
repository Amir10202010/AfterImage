import { lazy, Suspense, useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { useStore } from './lib/store'
import Palette from './components/Palette'
import Toaster from './components/Toaster'
import Agreement from './components/Agreement'
import { agreed, onAgree } from './lib/agreement'

const hashRef = { current: window.location.hash.slice(1) || '/' }
import Memories from './views/Home'
import Today from './views/Today'
import Landing, { hasEntered } from './views/Landing'
import Shell, { type Tab } from './components/Shell'
import Darkroom from './views/Darkroom'
import Print from './views/Print'
import Create from './views/Create'
import Letters from './views/Letters'
import Journal from './views/Journal'
import NotFound from './views/NotFound'
import { isISODate, isYearMonth } from './lib/route'

// Rooms most visits never open are loaded when first needed, so the front page starts with less code.
const loaders = {
  settings: () => import('./views/Settings'),
  arrival: () => import('./views/Arrival'),
  double: () => import('./views/Double'),
  stranger: () => import('./views/Stranger'),
  spread: () => import('./views/Spread'),
  connect: () => import('./views/Connect'),
  music: () => import('./views/MusicBox'),
  legal: () => import('./views/Legal'),
}
const Settings = lazy(loaders.settings)
const Arrival = lazy(loaders.arrival)
const Double = lazy(loaders.double)
const Stranger = lazy(loaders.stranger)
const Spread = lazy(loaders.spread)
const Connect = lazy(loaders.connect)
const MusicBox = lazy(loaders.music)
const Legal = lazy(loaders.legal)

/** Once someone is inside the app, fetch the remaining rooms quietly so they open without a wait. */
function preloadRooms() {
  const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500))
  idle(() => Object.values(loaders).forEach((load) => load().catch(() => {})))
}

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash.slice(1) || '/')
  useEffect(() => {
    const on = () => {
      const next = window.location.hash.slice(1) || '/'
      const room = (h: string) => h.split('?')[0].split('/')[1] ?? ''
      // a soft cross-fade between rooms, where the browser can do it and motion is welcome
      type VT = { ready: Promise<void>; finished: Promise<void>; updateCallbackDone: Promise<void> }
      const doc = document as Document & { startViewTransition?: (cb: () => void) => VT }
      const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      if (doc.startViewTransition && !calm && !document.hidden && room(next) !== room(hashRef.current)) {
        const vt = doc.startViewTransition(() => flushSync(() => setHash(next)))
        // a skipped transition (hidden tab, quick double navigation) is fine — the page still updates
        for (const p of [vt.ready, vt.finished, vt.updateCallbackDone]) p.catch(() => {})
      } else setHash(next)
      hashRef.current = next
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return hash
}

function StripRedirect() {
  useEffect(() => window.location.replace('#/stranger'), [])
  return null
}

/** Rooms drawn on the dark of the darkroom; every other room is paper. */
const DARK_ROOMS = new Set(['', 'welcome', 'develop', 'double', 'arrival', 'music', 'stranger', 'strip'])

const TITLES: Record<string, string> = {
  welcome: 'Welcome',
  today: 'Today',
  memories: 'Memories',
  journal: 'Journal',
  page: 'Notebook page',
  letters: 'Letters',
  print: 'Print',
  stranger: 'The Stranger',
  strip: 'The Stranger',
  connect: 'Bring in photos',
  settings: 'Settings',
  new: 'A new day',
  edit: 'Retouching',
  develop: 'Darkroom',
  double: 'Double exposure',
  music: 'Music box',
  arrival: 'A letter arrived',
  privacy: 'Privacy',
  terms: 'Terms',
}

export function go(path: string) {
  window.location.hash = path
}

export default function App() {
  const route = useHash()
  const { ready, error } = useStore()
  const [path, query = ''] = route.split('?')
  const [, name = '', arg, arg2] = path.split('/')
  const params = new URLSearchParams(query)
  // the terms, accepted once on entering the app (the landing page and the legal pages stay readable)
  const [hasAgreedNow, setAgreedNow] = useState(agreed)
  useEffect(() => onAgree(() => setAgreedNow(true)), [])
  const needsAgreement = !hasAgreedNow && !['', 'welcome', 'privacy', 'terms'].includes(name)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [path])

  // the browser's own surfaces (the canvas behind an overscroll, the phone's address bar) match the room
  useEffect(() => {
    const dark = DARK_ROOMS.has(name)
    document.documentElement.dataset.room = dark ? 'dark' : 'paper'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#17110D' : '#F3EDE2')
  }, [name])

  // every room has its own tab title, so history, bookmarks and screen readers can tell pages apart
  useEffect(() => {
    const room = TITLES[name]
    document.title = room ? `${room} · Afterimage` : name ? 'Not found · Afterimage' : 'Afterimage, a darkroom for the person you were'
  }, [name])

  // first visit: the promo page; after that, straight into the app
  useEffect(() => {
    if (name === '' && hasEntered()) window.location.replace('#/today')
  }, [name])

  const inside = ready && name !== '' && name !== 'welcome'
  useEffect(() => {
    if (inside) preloadRooms()
  }, [inside])

  if (!ready) return <div className="boot" aria-busy="true"><span>Afterimage</span></div>

  let view
  let tab: Tab | null = 'none' // null = full-screen, no navigation
  switch (name) {
    case '':
    case 'welcome':
      view = <Landing />
      tab = null
      break
    case 'today':
      view = <Today />
      tab = 'today'
      break
    case 'memories':
      view = <Memories />
      tab = 'memories'
      break
    case 'journal':
      view = arg && !isYearMonth(arg) ? <NotFound /> : <Journal key={arg ?? 'now'} ym={arg} />
      tab = 'journal'
      break
    case 'page':
      view = isISODate(arg) ? <Spread key={arg} date={arg} /> : <NotFound />
      tab = 'journal'
      break
    case 'letters':
      view = <Letters key={query} write={params.get('write') ?? undefined} />
      tab = 'letters'
      break
    case 'print':
      view = <Print key={arg} id={arg} />
      tab = 'memories'
      break
    case 'stranger':
      view = <Stranger />
      tab = 'today'
      break
    case 'strip':
      // the old daily Test Strip grew into The Stranger; old links land there
      view = <StripRedirect />
      tab = 'today'
      break
    case 'connect':
      view = <Connect />
      break
    case 'settings':
      view = <Settings />
      break
    case 'new':
      if (arg === 'from' && !isISODate(arg2)) {
        view = <NotFound />
        break
      }
      view = arg === 'from' ? <Create key={'from' + arg2} fromDate={arg2} /> : <Create key="new" />
      tab = null
      break
    case 'edit':
      view = <Create key={'edit' + arg} editId={arg} />
      tab = null
      break
    case 'develop':
      view = <Darkroom key={arg} id={arg} />
      tab = null
      break
    case 'double':
      view = <Double key={(arg ?? '') + (arg2 ?? '')} a={arg} b={arg2} />
      tab = null
      break
    case 'music':
      if (arg && !isYearMonth(arg)) {
        view = <NotFound />
        tab = 'journal'
        break
      }
      view = <MusicBox key={arg ?? 'now'} ym={arg} />
      tab = null
      break
    case 'arrival':
      view = <Arrival key={arg} id={arg} />
      tab = null
      break
    case 'privacy':
    case 'terms':
      view = arg ? <NotFound /> : <Legal kind={name} />
      break
    default:
      view = <NotFound />
  }
  return (
    <>
      {error && <div className="banner-error" role="alert">{error}</div>}
      <Suspense fallback={<div className="room-wait" aria-busy="true" />}>{tab === null ? view : <Shell tab={tab}>{view}</Shell>}</Suspense>
      {name !== '' && name !== 'welcome' && !needsAgreement && <Palette />}
      {needsAgreement && <Agreement />}
      <Toaster />
    </>
  )
}
