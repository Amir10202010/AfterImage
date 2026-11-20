// The notebook page turns as a day opens: a short clip over the screen, fast, and skippable with a tap.
export function playPageTurn() {
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  if (document.querySelector('.page-turn')) return
  const wrap = document.createElement('div')
  wrap.className = 'page-turn'
  wrap.setAttribute('aria-hidden', 'true')
  const v = document.createElement('video')
  v.src = '/media/page-turn.mp4'
  v.poster = '/media/page-turn.jpg'
  v.muted = true
  v.playsInline = true
  wrap.appendChild(v)
  document.body.appendChild(wrap)
  let done = false
  const end = () => {
    if (done) return
    done = true
    wrap.classList.add('is-out')
    window.setTimeout(() => wrap.remove(), 520)
  }
  v.addEventListener('loadedmetadata', () => (v.playbackRate = 1.9))
  v.playbackRate = 1.9
  v.addEventListener('ended', end)
  v.addEventListener('error', end)
  wrap.addEventListener('click', end)
  v.play().catch(end)
  window.setTimeout(end, 3000)
}
