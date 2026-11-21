import { useEffect, useState } from 'react'
import { flushSync } from 'react-dom'
import { useStore } from './lib/store'
import Palette from './components/Palette'
import Toaster from './components/Toaster'

const hashRef = { current: window.location.hash.slice(1) || '/' }
import Memories from './views/Home'
import Today from './views/Today'
import Settings from './views/Settings'
import Landing, { hasEntered } from './views/Landing'
import Shell, { type Tab } from './components/Shell'
import Darkroom from './views/Darkroom'
import Print from './views/Print'
import Create from './views/Create'
import Letters from './views/Letters'
import Arrival from './views/Arrival'
import Double from './views/Double'
import Stranger from './views/Stranger'
import Journal from './views/Journal'
import Spread from './views/Spread'
import Connect from './views/Connect'
import MusicBox from './views/MusicBox'

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

export function go(path: string) {
  window.location.hash = path
}

export default function App() {
  const route = useHash()
  const { ready, error } = useStore()
  const [path, query = ''] = route.split('?')
  const [, name = '', arg, arg2] = path.split('/')
  const params = new URLSearchParams(query)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [path])

  // first visit: the promo page; after that, straight into the app
  useEffect(() => {
    if (name === '' && hasEntered()) window.location.replace('#/today')
  }, [name])

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
      view = <Journal key={arg ?? 'now'} ym={arg} />
      tab = 'journal'
      break
    case 'page':
      view = <Spread key={arg} date={arg} />
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
      view = <MusicBox key={arg ?? 'now'} ym={arg} />
      tab = null
      break
    case 'arrival':
      view = <Arrival key={arg} id={arg} />
      tab = null
      break
    default:
      view = <Today />
      tab = 'today'
  }
  return (
    <>
      {error && <div className="banner-error" role="alert">{error}</div>}
      {tab === null ? view : <Shell tab={tab}>{view}</Shell>}
      {name !== '' && name !== 'welcome' && <Palette />}
      <Toaster />
    </>
  )
}
