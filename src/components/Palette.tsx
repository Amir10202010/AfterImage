// The command palette: Ctrl/⌘ K (or "/") from anywhere — find any day, photo caption or letter,
// jump to any room, or run an action. Also owns the keyboard shortcuts (g t, g j, n, ? …).
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { letterStatus, useStore } from '../lib/store'
import { longDate, monthYear, todayISO } from '../lib/time'
import { hrefFor } from '../views/Home'
import { replayTour } from './Tour'
import type { Memory } from '../lib/types'

interface Item {
  id: string
  group: string
  title: string
  sub?: string
  hint?: string
  icon: string
  run: () => void
  /** text searched, lower-case */
  hay: string
  /** a matching snippet to show under the title */
  snippet?: string
}

const go = (href: string) => () => {
  window.location.hash = href.replace(/^#/, '')
}

export function openPalette(mode: 'search' | 'keys' = 'search') {
  window.dispatchEvent(new CustomEvent('afterimage:palette', { detail: mode }))
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

function snippetOf(text: string, q: string) {
  const i = norm(text).indexOf(q)
  if (i < 0) return undefined
  const start = Math.max(0, i - 36)
  const end = Math.min(text.length, i + q.length + 60)
  return (start > 0 ? '…' : '') + text.slice(start, end).replace(/\s+/g, ' ') + (end < text.length ? '…' : '')
}

function Mark({ text, q }: { text: string; q: string }): ReactNode {
  if (!q) return text
  const i = norm(text).indexOf(q)
  if (i < 0) return text
  return (
    <>
      {text.slice(0, i)}
      <mark>{text.slice(i, i + q.length)}</mark>
      {text.slice(i + q.length)}
    </>
  )
}

const SHORTCUTS: [string, string][] = [
  ['Ctrl K  or  /', 'Search everything'],
  ['g  t', 'Go to Today'],
  ['g  j', 'Go to Journal'],
  ['g  m', 'Go to Memories'],
  ['g  l', 'Go to Letters'],
  ['g  s', 'Go to Settings'],
  ['n', 'Save a new day'],
  ['r', 'Open a random memory'],
  ['?', 'Show these shortcuts'],
  ['Esc', 'Close any window'],
]

function typing(e: KeyboardEvent) {
  const t = e.target as HTMLElement | null
  return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
}

export function randomMemoryHref(memories: Memory[]) {
  if (!memories.length) return '#/new'
  return hrefFor(memories[Math.floor(Math.random() * memories.length)])
}

export default function Palette() {
  const { memories, letters, shoebox } = useStore()
  const [open, setOpen] = useState<false | 'search' | 'keys'>(false)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLUListElement>(null)

  // opening, and the global shortcuts
  useEffect(() => {
    let g = 0
    const onEvent = (e: Event) => setOpen(((e as CustomEvent).detail as 'search' | 'keys') ?? 'search')
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => (o ? false : 'search'))
        return
      }
      if (e.ctrlKey || e.metaKey || e.altKey || typing(e) || e.defaultPrevented) return
      // single-key shortcuts only inside the main app frame, never over the darkroom or the music box
      if (!document.querySelector('.shell')) return
      if (document.querySelector('.sheet-wrap, .tour, [role="dialog"]')) return
      const k = e.key
      if (k === '/') {
        e.preventDefault()
        setOpen('search')
      } else if (k === '?') {
        e.preventDefault()
        setOpen('keys')
      } else if (Date.now() - g < 900) {
        g = 0
        const to: Record<string, string> = { t: '/today', j: '/journal', m: '/memories', l: '/letters', s: '/settings' }
        if (to[k]) window.location.hash = to[k]
      } else if (k === 'g') g = Date.now()
      else if (k === 'n') window.location.hash = '/new'
      else if (k === 'r') window.location.hash = randomMemoryHref(memories).slice(1)
    }
    window.addEventListener('afterimage:palette', onEvent)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('afterimage:palette', onEvent)
      window.removeEventListener('keydown', onKey)
    }
  }, [memories])

  useEffect(() => {
    if (!open) return
    setQ('')
    setSel(0)
    const close = () => setOpen(false)
    window.addEventListener('hashchange', close)
    document.documentElement.classList.add('no-scroll')
    window.setTimeout(() => input.current?.focus(), 10)
    return () => {
      window.removeEventListener('hashchange', close)
      document.documentElement.classList.remove('no-scroll')
    }
  }, [open])

  const base = useMemo<Item[]>(() => {
    const ym = todayISO().slice(0, 7)
    const pages: Item[] = [
      { id: 'p-today', group: 'Go to', title: 'Today', icon: '☀', hint: 'g t', run: go('/today'), hay: 'today home' },
      { id: 'p-journal', group: 'Go to', title: 'Journal', icon: '▦', hint: 'g j', run: go('/journal'), hay: 'journal calendar photos month' },
      { id: 'p-mem', group: 'Go to', title: 'Memories', icon: '◫', hint: 'g m', run: go('/memories'), hay: 'memories drying line negatives prints' },
      { id: 'p-let', group: 'Go to', title: 'Letters', icon: '✉', hint: 'g l', run: go('/letters'), hay: 'letters correspondence mail' },
      { id: 'p-set', group: 'Go to', title: 'Settings', icon: '⚙', hint: 'g s', run: go('/settings'), hay: 'settings preferences backup export storage' },
    ]
    const actions: Item[] = [
      { id: 'a-new', group: 'Do', title: 'Save a day', sub: 'Write it down, add photos and the song', icon: '✎', hint: 'n', run: go('/new'), hay: 'save new day write create add memory' },
      { id: 'a-photos', group: 'Do', title: 'Bring in photos', sub: 'Gallery or Instagram export', icon: '⇪', run: go('/connect'), hay: 'bring import photos gallery instagram connect upload' },
      { id: 'a-letter', group: 'Do', title: 'Write to future you', sub: 'Seal a letter until a date', icon: '✉', run: go('/letters?write=future'), hay: 'write letter future seal' },
      { id: 'a-stranger', group: 'Do', title: 'Play Stranger', sub: 'Find the one who isn’t you', icon: '▤', run: go('/stranger'), hay: 'stranger game play guess quiz ai gemini test strip' },
      { id: 'a-double', group: 'Do', title: 'The enlarger', sub: 'Lay two days over each other', icon: '◎', run: go('/double'), hay: 'enlarger double exposure two days compare' },
      { id: 'a-music', group: 'Do', title: 'Music box — this month', sub: monthYear(todayISO()), icon: '♪', run: go(`/music/${ym}`), hay: 'music box song tune crank' },
      { id: 'a-random', group: 'Do', title: 'Surprise me', sub: 'Open a random memory', icon: '⟳', hint: 'r', run: () => (window.location.hash = randomMemoryHref(memories).slice(1)), hay: 'random surprise shuffle lucky' },
      { id: 'a-backup', group: 'Do', title: 'Back up everything', sub: 'Download one file with all your days', icon: '⤓', run: go('/settings?backup=1'), hay: 'backup export download save file restore' },
      { id: 'a-tour', group: 'Do', title: 'Show the tour again', icon: '?', run: replayTour, hay: 'tour help walkthrough guide' },
      { id: 'a-keys', group: 'Do', title: 'Keyboard shortcuts', icon: '⌨', hint: '?', run: () => window.setTimeout(() => openPalette('keys'), 0), hay: 'keyboard shortcuts keys hotkeys' },
    ]
    const mems: Item[] = [...memories].reverse().map((m) => ({
      id: 'm-' + m.id,
      group: 'Memories',
      title: m.title,
      sub: [longDate(m.date), m.location, m.people.join(', '), m.progress.developedAt ? 'print' : 'negative'].filter(Boolean).join(' · '),
      icon: m.progress.developedAt ? '▣' : '▢',
      run: go(hrefFor(m)),
      hay: norm([m.title, m.date, longDate(m.date), m.location, m.people.join(' '), m.mood, m.weather, m.song?.title, m.song?.artist, m.details.join(' '), m.story].filter(Boolean).join(' ')),
      snippet: m.story,
    }))
    const months = new Map<string, number>()
    for (const s of shoebox) months.set(s.date.slice(0, 7), (months.get(s.date.slice(0, 7)) ?? 0) + 1)
    for (const m of memories) months.set(m.date.slice(0, 7), (months.get(m.date.slice(0, 7)) ?? 0) + 1)
    const monthItems: Item[] = [...months.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([k, n]) => ({
        id: 'mo-' + k,
        group: 'Months',
        title: monthYear(k + '-01'),
        sub: `${n} ${n === 1 ? 'thing' : 'things'} kept`,
        icon: '▦',
        run: go(`/journal/${k}`),
        hay: norm(`${monthYear(k + '-01')} ${k}`),
      }))
    const captions: Item[] = shoebox
      .filter((s) => s.caption)
      .map((s) => ({
        id: 's-' + s.id,
        group: 'Photo captions',
        title: s.caption!.length > 70 ? s.caption!.slice(0, 68) + '…' : s.caption!,
        sub: longDate(s.date),
        icon: '▧',
        run: go(`/page/${s.date}`),
        hay: norm(s.caption! + ' ' + s.date),
      }))
    // sealed letters stay sealed — their words are never searchable
    const lets: Item[] = letters
      .filter((l) => letterStatus(l) !== 'sealed')
      .map((l) => {
        const st = letterStatus(l)
        return {
          id: 'l-' + l.id,
          group: 'Letters',
          title: l.body.split('\n')[0].slice(0, 70) || 'A letter',
          sub: `${l.to === 'future' ? 'To future you' : 'To past you'} · written ${longDate(l.writtenAt)}${st === 'arrived' ? ' · arrived, unopened' : ''}`,
          icon: '✉',
          run: go(st === 'arrived' ? `/arrival/${l.id}` : '/letters'),
          hay: norm(st === 'arrived' ? 'letter arrived unopened' : l.body),
          snippet: st === 'arrived' ? undefined : l.body,
        }
      })
    return [...pages, ...actions, ...mems, ...monthItems, ...captions, ...lets]
  }, [memories, letters, shoebox])

  const nq = norm(q.trim())
  const results = useMemo(() => {
    if (open === 'keys') return []
    if (!nq) {
      const recent = base.filter((i) => i.group === 'Memories').slice(0, 4)
      return [...base.filter((i) => i.group === 'Do').slice(0, 6), ...recent.map((r) => ({ ...r, group: 'Recent' })), ...base.filter((i) => i.group === 'Go to')]
    }
    const words = nq.split(/\s+/)
    const scored: { it: Item; s: number }[] = []
    for (const it of base) {
      const t = norm(it.title)
      const hay = t + ' ' + it.hay
      if (!words.every((w) => hay.includes(w))) continue
      let s = 0
      if (t.startsWith(nq)) s += 100
      else if (t.includes(nq)) s += 60
      for (const w of words) if (t.includes(w)) s += 10
      if (it.group === 'Go to') s += 8
      if (it.group === 'Memories') s += 5
      scored.push({ it, s })
    }
    scored.sort((a, b) => b.s - a.s)
    const out = scored.slice(0, 40).map(({ it }) => ({ ...it, snippet: it.snippet && !norm(it.title).includes(words[0]) ? snippetOf(it.snippet, words[0]) : undefined }))
    // keep groups together, in order of their best hit
    const order: string[] = []
    for (const r of out) if (!order.includes(r.group)) order.push(r.group)
    return order.flatMap((g) => out.filter((r) => r.group === g))
  }, [base, nq, open])

  useEffect(() => setSel(0), [nq])
  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [sel])

  if (!open) return null

  const run = (it: Item) => {
    setOpen(false)
    it.run()
  }

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSel((s) => Math.min(results.length - 1, s + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSel((s) => Math.max(0, s - 1))
    } else if (e.key === 'Enter' && results[sel]) {
      e.preventDefault()
      run(results[sel])
    }
  }

  let lastGroup = ''
  return (
    <div className="pal-wrap" onMouseDown={() => setOpen(false)}>
      <div className="pal" role="dialog" aria-modal="true" aria-label={open === 'keys' ? 'Keyboard shortcuts' : 'Search'} onMouseDown={(e) => e.stopPropagation()} onKeyDown={onKey}>
        {open === 'keys' ? (
          <div className="pal-keys">
            <h2>Keyboard shortcuts</h2>
            <dl>
              {SHORTCUTS.map(([k, v]) => (
                <div key={k}>
                  <dt>
                    {k.split('  ').map((x, i) => (
                      <kbd key={i}>{x}</kbd>
                    ))}
                  </dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
            <button type="button" className="btn btn-ghost-ink btn-sm" onClick={() => setOpen('search')} ref={(b) => b?.focus()}>
              Search instead
            </button>
          </div>
        ) : (
          <>
            <label className="pal-search">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" />
                <path d="M16 16l4.5 4.5" />
              </svg>
              <input
                ref={input}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search days, people, places, songs, captions…"
                aria-label="Search"
                role="combobox"
                aria-expanded="true"
                aria-controls="pal-list"
                aria-activedescendant={results[sel] ? 'pal-' + results[sel].id : undefined}
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className="pal-esc">Esc</kbd>
            </label>
            <ul className="pal-list" id="pal-list" role="listbox" ref={list}>
              {results.length === 0 && (
                <li className="pal-empty">
                  Nothing kept matches “{q}”. <a href="#/new">Save it as a new day →</a>
                </li>
              )}
              {results.map((it, i) => {
                const head = it.group !== lastGroup ? it.group : null
                lastGroup = it.group
                return (
                  <li key={it.id + i} role="presentation">
                    {head && <p className="pal-group">{head}</p>}
                    <div
                      id={'pal-' + it.id}
                      role="option"
                      aria-selected={i === sel}
                      className="pal-item"
                      onMouseMove={() => i !== sel && setSel(i)}
                      onClick={() => run(it)}
                    >
                      <span className="pal-ico" aria-hidden="true">
                        {it.icon}
                      </span>
                      <span className="pal-text">
                        <b>
                          <Mark text={it.title} q={nq} />
                        </b>
                        {it.snippet ? <small className="pal-snip"><Mark text={it.snippet} q={nq.split(/\s+/)[0]} /></small> : it.sub && <small>{it.sub}</small>}
                      </span>
                      {it.hint && <kbd className="pal-hint">{it.hint}</kbd>}
                    </div>
                  </li>
                )
              })}
            </ul>
            <p className="pal-foot">
              <span>
                <kbd>↑</kbd>
                <kbd>↓</kbd> move
              </span>
              <span>
                <kbd>↵</kbd> open
              </span>
              <button type="button" className="link" onClick={() => setOpen('keys')}>
                <kbd>?</kbd> all shortcuts
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
