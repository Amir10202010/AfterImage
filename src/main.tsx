import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './upgrade.css'
import './settings.css'
import './buttons.css'
import './system.css'
import './dayfilm.css'
import App from './App'
import { init } from './lib/store'
import { upgradeDemoAssets } from './demo/upgrade'

// The demo photographs are fetched once the person is inside the app, or a few seconds into the front page,
// so they never compete with the front page's first video.
init().then(() => {
  const onFrontPage = () => ['', 'welcome'].includes(window.location.hash.replace(/^#\/?/, '').split(/[/?]/)[0])
  if (!onFrontPage()) return void upgradeDemoAssets()
  let started = false
  const start = () => {
    if (started) return
    started = true
    window.removeEventListener('hashchange', onMove)
    upgradeDemoAssets()
  }
  const onMove = () => !onFrontPage() && start()
  window.addEventListener('hashchange', onMove)
  window.setTimeout(start, 5000)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
