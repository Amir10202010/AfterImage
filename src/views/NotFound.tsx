// The page for an address that leads nowhere: say so plainly and offer the two places people usually want.
export default function NotFound() {
  const address = decodeURIComponent(window.location.hash.slice(1)) || '/'
  return (
    <main className="paper not-found">
      <p className="kicker">Not found</p>
      <h1 className="print-title">Nothing developed here.</h1>
      <p className="not-found-lede">
        <code>{address}</code> isn’t a page in Afterimage. It may be an old link, a mistyped address, or a day that was erased from this device.
      </p>
      <div className="row">
        <a className="btn btn-ink" href="#/today">
          Go to Today
        </a>
        <a className="btn btn-ghost-ink" href="#/memories">
          Open Memories
        </a>
      </div>
    </main>
  )
}
