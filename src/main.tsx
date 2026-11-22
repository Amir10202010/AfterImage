import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// the typefaces are served from this site, so opening Afterimage sends nothing to a font service
import '@fontsource/cormorant-garamond/400.css'
import '@fontsource/cormorant-garamond/500.css'
import '@fontsource/cormorant-garamond/600.css'
import '@fontsource/cormorant-garamond/400-italic.css'
import '@fontsource/cormorant-garamond/500-italic.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/caveat/400.css'
import '@fontsource/caveat/600.css'
import '@fontsource/special-elite/400.css'
import './styles.css'
import './upgrade.css'
import './settings.css'
import './buttons.css'
import './system.css'
import './dayfilm.css'
import App from './App'
import { init } from './lib/store'
import { upgradeDemoAssets } from './demo/upgrade'
import { forgetBrowserKeys } from './lib/gemini'

// The Stranger runs on the project's keys now: drop any key an older version kept in this browser
forgetBrowserKeys()

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
