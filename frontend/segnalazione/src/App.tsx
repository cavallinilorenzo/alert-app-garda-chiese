import { lazy, Suspense, type ComponentType } from 'react'
import { BozzaProvider } from './bozza'
import { ProceduraProvider, useProcedura, type Passo } from './procedura'
import { Inizio } from './passi/Inizio'
import { Posizione } from './passi/Posizione'
import { FuoriPerimetro } from './passi/FuoriPerimetro'
import { Foto } from './passi/Foto'
import { Descrizione } from './passi/Descrizione'
import { Contatto } from './passi/Contatto'
import { Riepilogo } from './passi/Riepilogo'
import { Conferma } from './passi/Conferma'
import { PaginaStato } from './PaginaStato'
import { tokenDallIndirizzo } from './stato'

// PROTOTIPO del nuovo layout (ticket #102), solo in sviluppo: /?prototipo
const Prototipo = import.meta.env.DEV
  ? lazy(() => import('./prototipo/Prototipo').then((m) => ({ default: m.Prototipo })))
  : null

const SCHERMATE: Record<Passo, ComponentType> = {
  inizio: Inizio,
  posizione: Posizione,
  fuori_perimetro: FuoriPerimetro,
  foto: Foto,
  descrizione: Descrizione,
  contatto: Contatto,
  riepilogo: Riepilogo,
  conferma: Conferma,
}

function SchermataCorrente() {
  const { passo } = useProcedura()
  const Schermata = SCHERMATE[passo]
  return <Schermata />
}

export function App() {
  if (Prototipo && new URLSearchParams(window.location.search).has('prototipo'))
    return (
      <Suspense>
        <Prototipo />
      </Suspense>
    )

  const token = tokenDallIndirizzo()
  if (token) return <PaginaStato token={token} />

  return (
    <BozzaProvider>
      <ProceduraProvider>
        <SchermataCorrente />
      </ProceduraProvider>
    </BozzaProvider>
  )
}
