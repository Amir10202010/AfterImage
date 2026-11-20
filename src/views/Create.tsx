import { useEffect, useMemo, useRef, useState } from 'react'
import { putBlob, saveLetter, saveMemory, uid, useBlobUrl, useStore } from '../lib/store'
import type { Cover, Memory, Moment, RecallItem, Tempo, Theme, Thread } from '../lib/types'
import {
  bathsFor,
  coverFor,
  extractMoments,
  extractRecall,
  extractThreads,
  findTime,
  recallable,
  sentences,
  splitAround,
  suggestTheme,
  suggestTitles,
} from '../lib/extract'
import { todayISO, roman } from '../lib/time'
import { AppVoice, Back, InfoTip, SealPicker, sealToDate, type SealChoice } from '../components/common'
import Photo from '../components/Photo'
import { BATH_NAMES } from './Darkroom'

const STEPS = ['The day', 'What you kept', 'Around it', 'What we noticed', 'A letter forward']
const WEATHER = ['Sun', 'Cold sun', 'Clouds', 'Rain', 'Snow', 'Wind', 'Heat', 'Fog']
const MOODS = ['Happy', 'Nostalgic', 'Calm', 'Wired', 'Determined', 'Tired', 'Anxious', 'In love', 'Lost', 'Proud']
const TEMPOS: [Tempo, string][] = [
  ['slow', 'Slow & warm'],
  ['mid', 'Steady'],
  ['fast', 'Fast & electric'],
]
const THEMES: [Theme, string, string][] = [
  ['autumn', 'Amber', 'Warm safelight, leaves to brush away'],
  ['paper', 'Daylight', 'Ink and paper, dust to blow off'],
  ['night', 'Phosphor', 'A screen at night, static to wipe'],
]

type PhotoItem = { id?: string; file?: File; url: string }

async function downscale(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') return file
  try {
    const bmp = await createImageBitmap(file)
    const max = 2000
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height))
    if (k === 1 && file.size < 2_500_000) return file
    const c = document.createElement('canvas')
    c.width = Math.round(bmp.width * k)
    c.height = Math.round(bmp.height * k)
    c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height)
    return await new Promise<Blob>((res) => c.toBlob((b) => res(b ?? file), 'image/jpeg', 0.88))
  } catch {
    return file
  }
}

function ExistingPhoto({ id, onUrl }: { id: string; onUrl: (u: string) => void }) {
  const u = useBlobUrl(id)
  useEffect(() => {
    if (u) onUrl(u)
  }, [u, onUrl])
  return null
}

export default function Create({ editId, fromDate }: { editId?: string; fromDate?: string }) {
  const { memories, shoebox } = useStore()
  const editing = editId ? memories.find((m) => m.id === editId) : undefined
  // starting from a journal day: its photos, and the captions you wrote for them
  const shots = fromDate ? shoebox.filter((x) => x.date === fromDate) : []
  const shotStory = [...new Set(shots.map((x) => x.caption).filter(Boolean))].join('\n')
  const shotTime = shots[0] ? new Date(shots[0].takenAt).toTimeString().slice(0, 5) : ''
  const [step, setStep] = useState(0)
  const [saved, setSaved] = useState<Memory | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  // 1
  const [date, setDate] = useState(editing?.date ?? fromDate ?? todayISO())
  const [story, setStory] = useState(editing?.story ?? shotStory)
  const [title, setTitle] = useState(editing?.title ?? '')
  // 2
  const [photos, setPhotos] = useState<PhotoItem[]>(() => editing?.photoIds.map((id) => ({ id, url: '' })) ?? shots.slice(0, 12).map((x) => ({ id: x.blobId, url: '' })))
  const [song, setSong] = useState({ title: editing?.song?.title ?? '', artist: editing?.song?.artist ?? '', url: editing?.song?.url ?? '' })
  const [tempo, setTempo] = useState<Tempo>(editing?.song?.tempo ?? 'slow')
  const [audio, setAudio] = useState<{ id?: string; file?: File } | null>(editing?.song?.audioId ? { id: editing.song.audioId } : null)
  // 3
  const [time, setTime] = useState(editing?.time ?? shotTime)
  const [location, setLocation] = useState(editing?.location ?? '')
  const [people, setPeople] = useState(editing?.people.join(', ') ?? '')
  const [weather, setWeather] = useState(editing?.weather ?? '')
  const [mood, setMood] = useState(editing?.mood ?? '')
  // 4
  const [extractedFor, setExtractedFor] = useState(editing?.story ?? '')
  const [moments, setMoments] = useState<Moment[]>(editing?.moments ?? [])
  const [recall, setRecall] = useState<RecallItem[]>(editing?.recall ?? [])
  const [threads, setThreads] = useState<Thread[]>(editing?.threads ?? [])
  const [details, setDetails] = useState<string[]>(editing?.details ?? [])
  const [theme, setTheme] = useState<Theme | null>(editing?.theme ?? null)
  // 5
  const [letter, setLetter] = useState('')
  const [seal, setSeal] = useState<SealChoice>('develop')
  const [sealDate, setSealDate] = useState('')

  const ss = useMemo(() => sentences(story), [story])
  const titles = useMemo(() => suggestTitles(story, location || undefined, date), [story, location, date])
  const autoTheme = suggestTheme({ story, time, tempo: song.title ? tempo : undefined, mood })
  const chosenTheme = theme ?? autoTheme

  const runReader = () => {
    setMoments(extractMoments(story))
    const th = extractThreads(story)
    setThreads(th)
    setRecall(extractRecall(story, 3, th.map((t) => t.quote)))
    setExtractedFor(story)
  }

  const goto = (n: number) => {
    setErr('')
    if (n > 0 && !story.trim()) {
      setErr('Write at least a few words about the day first — everything else grows from them.')
      setStep(0)
      return
    }
    if (n >= 3 && extractedFor !== story && !(editing && n === 4)) runReader()
    setStep(n)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const save = async () => {
    if (!story.trim()) return goto(0)
    if (letter.trim() && seal === 'date' && !sealDate) {
      setErr('Choose the date the letter should open.')
      return
    }
    setBusy(true)
    try {
      const photoIds: string[] = []
      for (const p of photos) photoIds.push(p.id ?? (await putBlob(await downscale(p.file!))))
      let audioId = audio?.id
      if (audio?.file) audioId = await putBlob(audio.file)
      const t = chosenTheme
      let base = { details, moments, recall, threads }
      if (extractedFor !== story && !editing) {
        const th = extractThreads(story)
        base = { details, moments: extractMoments(story), threads: th, recall: extractRecall(story, 3, th.map((x) => x.quote)) }
      }
      const baths = bathsFor(base)
      const m: Memory = {
        id: editing?.id ?? uid('m_'),
        demo: editing?.demo,
        title: title.trim() || titles[0] || 'Untitled day',
        date,
        time: time || undefined,
        location: location.trim() || undefined,
        people: people.split(',').map((x) => x.trim()).filter(Boolean),
        weather: weather.trim() || undefined,
        mood: mood.trim() || undefined,
        story: story.trim(),
        photoIds,
        art: photoIds.length ? undefined : editing?.art,
        song: song.title.trim() ? { title: song.title.trim(), artist: song.artist.trim() || 'Unknown artist', url: song.url.trim() || undefined, audioId, tempo } : undefined,
        ...base,
        theme: t,
        cover: coverFor(t) as Cover,
        baths,
        createdAt: editing?.createdAt ?? new Date().toISOString(),
        progress: editing
          ? { done: Object.fromEntries(Object.entries(editing.progress.done).filter(([k]) => baths.includes(k as never))), developedAt: editing.progress.developedAt }
          : { done: {} },
        ledger: editing?.ledger ?? {},
        margin: editing?.margin ?? [],
      }
      await saveMemory(m)
      if (letter.trim()) {
        await saveLetter({
          id: uid('l_'),
          memoryId: m.id,
          to: 'future',
          body: letter.trim(),
          writtenAt: new Date().toISOString(),
          sealedUntil: sealToDate(seal, sealDate),
        })
      }
      setSaved(m)
      window.scrollTo({ top: 0 })
    } catch (e) {
      setErr('Something went wrong while saving: ' + String(e) + '. Your words are still here — try again.')
    } finally {
      setBusy(false)
    }
  }

  if (saved) return <Hung m={saved} edited={!!editing} />

  return (
    <main className="paper create">
      <header className="create-head">
        <Back href={editing ? `#/print/${editing.id}` : '#/today'}>{editing ? 'Back to the print' : 'Cancel'}</Back>
        <p className="kicker">{editing ? 'Retouching' : 'Exposing a new day'}</p>
      </header>

      <nav className="film" aria-label="Steps">
        {STEPS.map((s, i) => (
          <button key={s} type="button" className={`film-frame ${i === step ? 'is-now' : ''} ${i < step ? 'is-done' : ''}`} onClick={() => goto(i)} aria-current={i === step ? 'step' : undefined}>
            <span className="film-n">{roman(i + 1)}</span>
            <span className="film-label">{s}</span>
          </button>
        ))}
      </nav>

      {err && (
        <p className="form-error" role="alert">
          {err}
        </p>
      )}

      <div className="create-body">
        {step === 0 && (
          <section className="step">
            <h1 className="step-title">
              What happened? <InfoTip>Write it the way you’d tell a friend at midnight. Times (“at 4pm”, “23:40”), plans and questions are especially welcome — they become the game later.</InfoTip>
            </h1>
            <label className="field field-inline">
              <span>The date</span>
              <input type="date" value={date} max={todayISO()} onChange={(e) => setDate(e.target.value)} />
            </label>
            <label className="field">
              <span className="sr-only">The story of the day</span>
              <textarea className="story-input" rows={12} value={story} onChange={(e) => setStory(e.target.value)} placeholder="We met at the gate at 2pm…" autoFocus />
            </label>
            <p className="count">{story.trim() ? `${story.trim().split(/\s+/).length} words · ${ss.length} sentences` : ''}</p>
          </section>
        )}

        {step === 1 && (
          <section className="step">
            <h1 className="step-title">
              What did you keep? <InfoTip>Photographs become the negative you’ll develop. No photograph? The darkroom will make a photogram from your words instead.</InfoTip>
            </h1>
            <div className="uploads">
              {photos.map((p, i) => (
                <figure key={p.id ?? p.url} className="upload">
                  {p.id && !p.url && <ExistingPhoto id={p.id} onUrl={(u) => setPhotos((ps) => ps.map((x) => (x.id === p.id ? { ...x, url: u } : x)))} />}
                  {p.url && <img src={p.url} alt={`Photograph ${i + 1}`} />}
                  <figcaption>
                    {i === 0 ? 'the negative' : `frame ${i + 1}`}
                    <span>
                      {i > 0 && (
                        <button type="button" className="link" onClick={() => setPhotos((ps) => [ps[i], ...ps.filter((_, k) => k !== i)])}>
                          make first
                        </button>
                      )}
                      <button type="button" className="link danger" onClick={() => setPhotos((ps) => ps.filter((_, k) => k !== i))}>
                        remove
                      </button>
                    </span>
                  </figcaption>
                </figure>
              ))}
              <PhotoDrop onFiles={(fs) => setPhotos((ps) => [...ps, ...fs.map((file) => ({ file, url: URL.createObjectURL(file) }))])} />
            </div>

            <h2 className="step-sub">
              The song <InfoTip>It sets the darkroom’s chemistry: the tempo rocks the tray and drives the soundscape; the title tints the print.</InfoTip>
            </h2>
            <div className="fields-2">
              <label className="field">
                <span>Title</span>
                <input value={song.title} onChange={(e) => setSong({ ...song, title: e.target.value })} placeholder="The song that was playing" />
              </label>
              <label className="field">
                <span>Artist</span>
                <input value={song.artist} onChange={(e) => setSong({ ...song, artist: e.target.value })} />
              </label>
            </div>
            <label className="field">
              <span>Link (Spotify, Apple Music, YouTube, Bandcamp…)</span>
              <input type="url" value={song.url} onChange={(e) => setSong({ ...song, url: e.target.value })} placeholder="https://" />
            </label>
            <div className="field">
              <span>How it felt</span>
              <div className="chips">
                {TEMPOS.map(([k, label]) => (
                  <button key={k} type="button" className={`chip ${tempo === k ? 'is-on' : ''}`} aria-pressed={tempo === k} onClick={() => setTempo(k)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <label className="field file-field">
              <span>Or your own recording (optional) — plays in the darkroom</span>
              <input type="file" accept="audio/*" onChange={(e) => e.target.files?.[0] && setAudio({ file: e.target.files[0] })} />
              {audio && (
                <span className="file-chosen">
                  {audio.file ? audio.file.name : 'an audio file is attached'}{' '}
                  <button type="button" className="link danger" onClick={() => setAudio(null)}>
                    remove
                  </button>
                </span>
              )}
            </label>
          </section>
        )}

        {step === 2 && (
          <section className="step">
            <h1 className="step-title">
              Around it. <InfoTip>All optional. Small facts that help you find the day again.</InfoTip>
            </h1>
            <div className="fields-2">
              <label className="field">
                <span>Time</span>
                <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </label>
              <label className="field">
                <span>Place</span>
                <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Linden Park" />
              </label>
            </div>
            <label className="field">
              <span>People (comma separated)</span>
              <input value={people} onChange={(e) => setPeople(e.target.value)} placeholder="Mira, Tom" />
            </label>
            <div className="field">
              <span>Weather</span>
              <div className="chips">
                {WEATHER.map((w) => (
                  <button key={w} type="button" className={`chip ${weather === w ? 'is-on' : ''}`} aria-pressed={weather === w} onClick={() => setWeather(weather === w ? '' : w)}>
                    {w}
                  </button>
                ))}
              </div>
              <input value={weather} onChange={(e) => setWeather(e.target.value)} placeholder="or in your words" aria-label="Weather in your words" />
            </div>
            <div className="field">
              <span>Mood</span>
              <div className="chips">
                {MOODS.map((w) => (
                  <button key={w} type="button" className={`chip ${mood === w ? 'is-on' : ''}`} aria-pressed={mood === w} onClick={() => setMood(mood === w ? '' : w)}>
                    {w}
                  </button>
                ))}
              </div>
              <input value={mood} onChange={(e) => setMood(e.target.value)} placeholder="or in your words" aria-label="Mood in your words" />
            </div>
          </section>
        )}

        {step === 3 && (
          <section className="step step-wide">
            <h1 className="step-title">Here’s what we noticed.</h1>
            <AppVoice>
              Afterimage read your story and picked out pieces for the darkroom — only things you actually wrote. Change anything. Remove anything. Nothing here
              is invented.
            </AppVoice>
            {extractedFor !== story && (
              <button type="button" className="link" onClick={runReader}>
                Your story changed — read it again
              </button>
            )}

            <div className="field">
              <span>Title</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={titles[0] ?? 'A title'} />
              <div className="chips">
                {titles.map((t) => (
                  <button key={t} type="button" className="chip chip-suggest" onClick={() => setTitle(t)}>
                    <span className="app-mark" aria-hidden="true">
                      ◇
                    </span>{' '}
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <ReviewBlock title="Moments" sub={`Sequence bath — needs 3 or more. You’ll put them back in order. ${moments.length < 3 ? 'Add more to unlock it.' : ''}`}>
              <ol className="edit-list">
                {moments.map((mo, i) => (
                  <li key={mo.id} className="edit-row">
                    <input className="edit-time" value={mo.time ?? ''} placeholder="time" aria-label="Time" onChange={(e) => setMoments(moments.map((x) => (x.id === mo.id ? { ...x, time: e.target.value || undefined } : x)))} />
                    <input className="edit-text" value={mo.text} aria-label="Moment" onChange={(e) => setMoments(moments.map((x) => (x.id === mo.id ? { ...x, text: e.target.value } : x)))} />
                    <span className="edit-tools">
                      <button type="button" aria-label="Earlier" disabled={i === 0} onClick={() => setMoments(swap(moments, i, i - 1))}>
                        ↑
                      </button>
                      <button type="button" aria-label="Later" disabled={i === moments.length - 1} onClick={() => setMoments(swap(moments, i, i + 1))}>
                        ↓
                      </button>
                      <button type="button" aria-label="Remove" onClick={() => setMoments(moments.filter((x) => x.id !== mo.id))}>
                        ×
                      </button>
                    </span>
                  </li>
                ))}
              </ol>
              <SentencePicker label="Add a moment from your story" options={ss} onPick={(s) => setMoments([...moments, { id: uid('m'), text: s, time: findTime(s) }])} />
              <p className="step-hint small">They’re in the order of your story. If the day happened in a different order, arrange them here — this order is the answer.</p>
            </ReviewBlock>

            <ReviewBlock title="Words to recall" sub="Recall bath — one word goes missing from each sentence. Tap a word to choose it instead.">
              <ul className="edit-list">
                {recall.map((r) => (
                  <li key={r.id} className="recall-edit">
                    <p className="recall-edit-s">
                      {r.sentence.split(/(\s+)/).map((tok, k) => {
                        const w = tok.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')
                        if (!w || !recallable(w)) return <span key={k}>{tok}</span>
                        return (
                          <button key={k} type="button" className={`word ${w === r.word ? 'is-on' : ''}`} onClick={() => setRecall(recall.map((x) => (x.id === r.id ? { ...x, word: w } : x)))}>
                            {tok}
                          </button>
                        )
                      })}
                    </p>
                    <button type="button" className="link danger" onClick={() => setRecall(recall.filter((x) => x.id !== r.id))}>
                      remove
                    </button>
                  </li>
                ))}
              </ul>
              <SentencePicker
                label="Add a sentence"
                options={ss.filter((s) => s.split(/\s+/).some((w) => recallable(w.replace(/[^\p{L}]/gu, ''))))}
                onPick={(s) => {
                  const w = s.split(/\s+/).map((x) => x.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '')).filter(recallable).sort((a, b) => b.length - a.length)[0]
                  if (w && splitAround(s, w)) setRecall([...recall, { id: uid('r'), sentence: s, word: w }])
                }}
              />
            </ReviewBlock>

            <ReviewBlock title="Promises and questions" sub="Ledger bath — one day you’ll stamp these: kept, changed, let go, still trying.">
              <ul className="edit-list">
                {threads.map((t) => (
                  <li key={t.id} className="edit-row">
                    <span className="thread-kind">{t.kind === 'question' ? '?' : '→'}</span>
                    <span className="edit-quote">“{t.quote}”</span>
                    <button type="button" className="link danger" onClick={() => setThreads(threads.filter((x) => x.id !== t.id))}>
                      remove
                    </button>
                  </li>
                ))}
              </ul>
              <SentencePicker label="Add one from your story" options={ss} onPick={(s) => setThreads([...threads, { id: uid('t'), quote: s, kind: /\?\s*["'”’]?$/.test(s) ? 'question' : 'intention' }])} />
            </ReviewBlock>

            <ReviewBlock title="Small things" sub="Surface bath — they hide under the cover, waiting to be uncovered. The receipt, a scarf, what was written on the wall.">
              <DetailsEditor details={details} onChange={setDetails} />
            </ReviewBlock>

            <ReviewBlock title="Darkroom light" sub={`Chosen from your story and song: ${THEMES.find((x) => x[0] === autoTheme)![1]}.`}>
              <div className="theme-pick">
                {THEMES.map(([k, label, hint]) => (
                  <button key={k} type="button" className={`theme-swatch theme-${k} ${chosenTheme === k ? 'is-on' : ''}`} aria-pressed={chosenTheme === k} onClick={() => setTheme(k)}>
                    <span className="swatch" aria-hidden="true" />
                    <strong>{label}</strong>
                    <span>{hint}</span>
                  </button>
                ))}
              </div>
            </ReviewBlock>

            <p className="baths-preview">
              This day will develop in {bathsFor({ details, moments, recall, threads }).length} baths:{' '}
              {bathsFor({ details, moments, recall, threads })
                .map((b, i) => `${roman(i + 1)}. ${BATH_NAMES[b]}`)
                .join('  ·  ')}
            </p>
          </section>
        )}

        {step === 4 && (
          <section className="step">
            <h1 className="step-title">
              A letter forward. <InfoTip>To whoever you’ll be when this comes back. It will be kept exactly as you write it.</InfoTip>
            </h1>
            {editing ? (
              <AppVoice>Letters for this day live in its correspondence, on the print. You can add a new one below, or leave this empty.</AppVoice>
            ) : null}
            <textarea className="letter-input" rows={10} value={letter} onChange={(e) => setLetter(e.target.value)} placeholder={'Dear future me,\n\nI don’t know where you’ll be when you read this…'} />
            {letter.trim() && <SealPicker value={seal} date={sealDate} onChange={(c, d) => (setSeal(c), setSealDate(d))} allowDevelop />}
          </section>
        )}
      </div>

      <footer className="create-foot">
        {step > 0 ? (
          <button type="button" className="btn btn-ghost-ink" onClick={() => goto(step - 1)}>
            ← {STEPS[step - 1]}
          </button>
        ) : (
          <span />
        )}
        {step < STEPS.length - 1 ? (
          <div className="row">
            {editing && (
              <button type="button" className="link" onClick={save} disabled={busy}>
                Save now
              </button>
            )}
            <button type="button" className="btn btn-ink" onClick={() => goto(step + 1)}>
              {STEPS[step + 1]} →
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-ink" onClick={save} disabled={busy}>
            {busy ? 'Hanging it up…' : editing ? 'Save changes' : 'Hang it to dry'}
          </button>
        )}
      </footer>
    </main>
  )
}

function swap<T>(a: T[], i: number, j: number) {
  const n = [...a]
  ;[n[i], n[j]] = [n[j], n[i]]
  return n
}

function ReviewBlock({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="review">
      <h2 className="review-h">{title}</h2>
      <p className="review-sub">{sub}</p>
      {children}
    </div>
  )
}

function SentencePicker({ label, options, onPick }: { label: string; options: string[]; onPick: (s: string) => void }) {
  return (
    <label className="picker">
      <span>+ {label}</span>
      <select
        value=""
        onChange={(e) => {
          if (e.target.value) onPick(e.target.value)
        }}
      >
        <option value="">choose…</option>
        {options.map((s, i) => (
          <option key={i} value={s}>
            {s.length > 90 ? s.slice(0, 88) + '…' : s}
          </option>
        ))}
      </select>
    </label>
  )
}

function DetailsEditor({ details, onChange }: { details: string[]; onChange: (d: string[]) => void }) {
  const [v, setV] = useState('')
  const add = () => {
    if (v.trim()) onChange([...details, v.trim()])
    setV('')
  }
  return (
    <div>
      <ul className="detail-chips">
        {details.map((d, i) => (
          <li key={i}>
            {d}
            <button type="button" aria-label={`Remove ${d}`} onClick={() => onChange(details.filter((_, k) => k !== i))}>
              ×
            </button>
          </li>
        ))}
      </ul>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          add()
        }}
      >
        <input value={v} onChange={(e) => setV(e.target.value)} placeholder="the receipt in my coat pocket" aria-label="A small thing" />
        <button type="submit" className="btn btn-ghost-ink btn-sm">
          Add
        </button>
      </form>
    </div>
  )
}

function PhotoDrop({ onFiles }: { onFiles: (f: File[]) => void }) {
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  return (
    <label
      className={`drop ${over ? 'is-over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        onFiles([...e.dataTransfer.files].filter((f) => f.type.startsWith('image/')))
      }}
    >
      <input
        ref={input}
        type="file"
        accept="image/*"
        multiple
        className="sr-only"
        onChange={(e) => {
          onFiles([...(e.target.files ?? [])])
          e.target.value = ''
        }}
      />
      <span className="drop-plus" aria-hidden="true">
        +
      </span>
      <span>Add photographs</span>
      <span className="drop-sub">drop them here, or tap to choose</span>
    </label>
  )
}

function Hung({ m, edited }: { m: Memory; edited: boolean }) {
  return (
    <main className="paper hung">
      <div className="hung-pin">
        <span className="pin" aria-hidden="true" />
        <div className="hung-frame">
          <Photo memory={m} p={m.progress.developedAt ? 1 : 0} />
        </div>
      </div>
      <div className="hung-text">
        <p className="kicker">{edited ? 'Retouched' : 'Exposed'}</p>
        <h1>{edited ? 'Saved.' : 'It’s hanging on the line.'}</h1>
        <p>
          {edited
            ? `“${m.title}” has been updated.`
            : `“${m.title}” is a negative now — dark and backwards, the way memories are before you go looking for them. Develop it tonight, or leave it for a while. It gets better when you’ve half forgotten.`}
        </p>
        <div className="row">
          <a className="btn btn-ink" href={m.progress.developedAt ? `#/print/${m.id}` : `#/develop/${m.id}`}>
            {m.progress.developedAt ? 'Open the print' : 'Develop it now'}
          </a>
          <a className="link" href="#/memories">
            Leave it to dry
          </a>
        </div>
      </div>
    </main>
  )
}
