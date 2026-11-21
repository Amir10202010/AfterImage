import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './upgrade.css'
import './settings.css'
import './buttons.css'
import './system.css'
import App from './App'
import { init } from './lib/store'
import { upgradeDemoAssets } from './demo/upgrade'

init().then(() => upgradeDemoAssets())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
