import type { ComponentType } from 'react'
import { BozzaProvider } from './bozza'
import { ProceduraProvider, useProcedura, type Passo } from './procedura'
import { Inizio } from './passi/Inizio'
import { Posizione } from './passi/Posizione'
import { FuoriPerimetro } from './passi/FuoriPerimetro'
import { InArrivo } from './passi/InArrivo'

const SCHERMATE: Record<Passo, ComponentType> = {
  inizio: Inizio,
  posizione: Posizione,
  fuori_perimetro: FuoriPerimetro,
  foto: InArrivo,
  descrizione: InArrivo,
  contatto: InArrivo,
  riepilogo: InArrivo,
  conferma: InArrivo,
}

function SchermataCorrente() {
  const { passo } = useProcedura()
  const Schermata = SCHERMATE[passo]
  return <Schermata />
}

export function App() {
  return (
    <BozzaProvider>
      <ProceduraProvider>
        <SchermataCorrente />
      </ProceduraProvider>
    </BozzaProvider>
  )
}
