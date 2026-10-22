import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './styles/fonts.css'
import './styles/tokens.css'
import './styles/app.css'
import './styles/home.css'
import './styles/sunday.css'
import './styles/power.css'
import './styles/growthstory.css'
import './styles/learn.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
