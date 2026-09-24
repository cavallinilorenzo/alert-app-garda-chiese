import type { ComponentType } from 'react'
import { BozzaProvider } from './bozza'
import { ProceduraProvider, useProcedura, type Passo } from './procedura'
import { Inizio } from './passi/Inizio'
import { Posizione } from './passi/Posizione'
import { FuoriPerimetro } from './passi/FuoriPerimetro'
import { InArrivo } from './passi/InArrivo'
import { Foto } from './passi/Foto'
import { Descrizione } from './passi/Descrizione'

const SCHERMATE: Record<Passo, ComponentType> = {
  inizio: Inizio,
  posizione: Posizione,
  fuori_perimetro: FuoriPerimetro,
  foto: Foto,
  descrizione: Descrizione,
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
