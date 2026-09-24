import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'material-symbols/outlined.css'
import { ProvaCollegamento } from 'shared/ProvaCollegamento'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ProvaCollegamento titolo="App di segnalazione" />
  </StrictMode>,
)
