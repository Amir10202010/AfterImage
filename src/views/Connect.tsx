import { useRef, useState } from 'react'
import { removeFromShoebox, useStore } from '../lib/store'
import { importGallery, importInstagram, keepAwake, type ImportResult, type Progress } from '../lib/importers'
import { longDate } from '../lib/time'
import { AppVoice, Back, ConfirmButton, InfoTip } from '../components/common'
import { OptionalImg } from '../components/Scrap'

type Job = { kind: 'gallery' | 'instagram'; progress: Progress } | null

export default function Connect() {
  const { shoebox } = useStore()
  const [job, setJob] = useState<Job>(null)
  const [result, setResult] = useState<(ImportResult & { kind: string }) | null>(null)
  const [error, setError] = useState('')
  const photos = useRef<HTMLInputElement>(null)
  const folder = useRef<HTMLInputElement>(null)
  const igZip = useRef<HTMLInputElement>(null)
  const igFolder = useRef<HTMLInputElement>(null)

  const run = async (kind: 'gallery' | 'instagram', fn: (p: (x: Progress) => void) => Promise<ImportResult>) => {
    setError('')
    setResult(null)
    setJob({ kind, progress: { done: 0, total: 0, added: 0, skipped: 0 } })
    const release = await keepAwake()
    try {
      const r = await fn((progress) => setJob({ kind, progress }))
      setResult({ ...r, kind })
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      release()
      setJob(null)
    }
  }

  const counts = {
    gallery: shoebox.filter((s) => s.source === 'gallery').length,
    instagram: shoebox.filter((s) => s.source.startsWith('instagram')).length,
    demo: shoebox.filter((s) => s.source === 'demo').length,
  }

  return (
    <main className="paper connect">
      <header className="print-bar">
        <Back href="#/journal">The journal</Back>
      </header>
      <header className="letters-head">
        <p className="kicker">Connect</p>
        <h1 className="print-title">Bring your photographs home.</h1>
        <p className="connect-lede">
          Read on this device. Nothing is uploaded.{' '}
          <InfoTip>
            Afterimage reads each photo right here, in this browser: the date it was taken, where, the caption you wrote. Then it sorts them into days. No
            server, no account, no AI looking at your pictures.
          </InfoTip>
        </p>
        <OptionalImg src="/demo/ui/connect.jpg" className="connect-art" />
      </header>

      <div className="connect-grid">
        <section className="connect-card">
          <p className="kicker">Camera roll</p>
          <h2>Your gallery</h2>
          <p>
            On a phone, this opens your photo library — select a month, an album, or everything. On a computer you can pick a whole folder. Dates come
            from inside each photo, so they land on the right day.
          </p>
          <div className="row">
            <button type="button" className="btn btn-ink" disabled={!!job} onClick={() => photos.current?.click()}>
              Choose photos
            </button>
            <button type="button" className="btn btn-ghost-ink" disabled={!!job} onClick={() => folder.current?.click()}>
              Choose a folder
            </button>
          </div>
          <input
            ref={photos}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              const fs = [...(e.target.files ?? [])]
              e.target.value = ''
              if (fs.length) run('gallery', (p) => importGallery(fs, p))
            }}
          />
          <input
            ref={folder}
            type="file"
            multiple
            hidden
            {...({ webkitdirectory: '' } as object)}
            onChange={(e) => {
              const fs = [...(e.target.files ?? [])]
              e.target.value = ''
              if (fs.length) run('gallery', (p) => importGallery(fs, p))
            }}
          />
        </section>

        <section className="connect-card connect-ig">
          <p className="kicker">Instagram</p>
          <h2>Your posts and stories</h2>
          <p>
            Instagram will give you a copy of everything you ever posted — including <strong>archived stories</strong> nobody else can see anymore — with dates
            and your captions. Open the file it sends you here.
          </p>
          <details className="howto-ig">
            <summary>How to get your export (about 5 minutes, then Instagram emails you)</summary>
            <ol>
              <li>Instagram → your profile → ☰ → <b>Accounts Center</b></li>
              <li>
                <b>Your information and permissions</b> → <b>Download your information</b>
              </li>
              <li>
                <b>Download or transfer information</b> → your account → <b>Some of your information</b> → tick <b>Content</b>
              </li>
              <li>
                <b>Download to device</b> · Date range: <b>All time</b> · Format: <b>JSON</b> · Media quality: <b>High</b>
              </li>
              <li>When the email arrives, download the ZIP — then choose it below.</li>
            </ol>
          </details>
          <div className="row">
            <button type="button" className="btn btn-ink" disabled={!!job} onClick={() => igZip.current?.click()}>
              Open the ZIP
            </button>
            <button type="button" className="btn btn-ghost-ink" disabled={!!job} onClick={() => igFolder.current?.click()}>
              Or the unzipped folder
            </button>
          </div>
          <input
            ref={igZip}
            type="file"
            accept=".zip,application/zip"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) run('instagram', (p) => importInstagram(f, p))
            }}
          />
          <input
            ref={igFolder}
            type="file"
            multiple
            hidden
            {...({ webkitdirectory: '' } as object)}
            onChange={(e) => {
              const fs = [...(e.target.files ?? [])]
              e.target.value = ''
              if (fs.length) run('instagram', (p) => importInstagram(fs, p))
            }}
          />
          <p className="connect-why">
            Why not just type a username? Because that would mean scraping — collecting someone’s photos without them knowing, and breaking
            Instagram’s rules. Your own export is more complete anyway.
          </p>
        </section>
      </div>

      {job && (
        <section className="import-progress" aria-live="polite">
          <p className="kicker">{job.kind === 'gallery' ? 'Reading your gallery' : 'Reading your Instagram export'}</p>
          <div className="import-bar">
            <span style={{ width: job.progress.total ? `${(job.progress.done / job.progress.total) * 100}%` : '4%' }} />
          </div>
          <p>
            {job.progress.note ??
              (job.progress.total ? `${job.progress.done} of ${job.progress.total} · ${job.progress.added} added` : 'Looking through the files…')}
          </p>
          <AppVoice>Keep this tab open. Everything happens on this device, so a big library takes a few minutes.</AppVoice>
        </section>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {result && (
        <section className="import-result" aria-live="polite">
          <h2>
            {result.added ? `${plural(result.added, 'photograph')}, ${plural(result.days, 'day')}.` : 'Nothing new this time.'}
          </h2>
          <ul>
            {result.from && result.to && (
              <li>
                From {longDate(result.from)} to {longDate(result.to)}
              </li>
            )}
            {result.duplicates > 0 && <li>{result.duplicates === 1 ? '1 was' : `${result.duplicates} were`} already in your journal</li>}
            {result.videos > 0 && <li>{plural(result.videos, 'video')} left out — only photographs for now</li>}
            {result.unreadable > 0 && <li>{result.unreadable} couldn’t be opened by this browser (often HEIC files on Chrome — try Safari, or export as JPEG)</li>}
          </ul>
          {result.to && (
            <a className="btn btn-ink" href={`#/journal/${result.to.slice(0, 7)}`}>
              Open the journal
            </a>
          )}
        </section>
      )}

      <section className="section" aria-labelledby="box-h">
        <div className="section-head">
          <h2 id="box-h">In your shoebox</h2>
          <p className="section-meta">{shoebox.length} photographs on this device</p>
        </div>
        <ul className="box-list">
          <li>
            <span>From your gallery</span>
            <b>{counts.gallery}</b>
            {counts.gallery > 0 && (
              <ConfirmButton className="danger" confirm="Remove the gallery photos from Afterimage? (Your phone keeps its own copies.)" onConfirm={() => removeFromShoebox((s) => s.source === 'gallery')}>
                remove
              </ConfirmButton>
            )}
          </li>
          <li>
            <span>From Instagram</span>
            <b>{counts.instagram}</b>
            {counts.instagram > 0 && (
              <ConfirmButton className="danger" confirm="Remove the Instagram photos from Afterimage?" onConfirm={() => removeFromShoebox((s) => s.source.startsWith('instagram'))}>
                remove
              </ConfirmButton>
            )}
          </li>
          <li>
            <span>Fictional demo roll</span>
            <b>{counts.demo}</b>
            {counts.demo > 0 && (
              <ConfirmButton className="danger" confirm="Remove the demo photos?" onConfirm={() => removeFromShoebox((s) => s.source === 'demo')}>
                remove
              </ConfirmButton>
            )}
          </li>
        </ul>
      </section>
    </main>
  )
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}
