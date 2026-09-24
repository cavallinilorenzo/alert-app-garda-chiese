import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { Icona } from './comuni'

// Procedura guidata dell'App di segnalazione (variante A del ticket #9): una cosa per
// schermata, barra di avanzamento a 5 passi, azione principale fissa in basso.

export type Passo =
  | 'inizio'
  | 'posizione'
  | 'fuori_perimetro'
  | 'foto'
  | 'descrizione'
  | 'contatto'
  | 'riepilogo'
  | 'conferma'

// I passi contati nella barra di avanzamento. Inizio, Fuori perimetro e Conferma ne stanno fuori.
const NUMERATI: [Passo, string][] = [
  ['posizione', 'Posizione'],
  ['foto', 'Foto'],
  ['descrizione', 'Descrizione'],
  ['contatto', 'Contatto'],
  ['riepilogo', 'Invio'],
]

const INDIETRO: Partial<Record<Passo, Passo>> = {
  posizione: 'inizio',
  fuori_perimetro: 'posizione',
  foto: 'posizione',
  descrizione: 'foto',
  contatto: 'descrizione',
  riepilogo: 'contatto',
}

type ContestoProcedura = { passo: Passo; vai: (passo: Passo) => void }

const Contesto = createContext<ContestoProcedura | null>(null)

export function useProcedura() {
  const contesto = useContext(Contesto)
  if (!contesto) throw new Error('useProcedura va usato dentro ProceduraProvider')
  return contesto
}

export function ProceduraProvider({ children }: { children: ReactNode }) {
  const [passo, setPasso] = useState<Passo>('inizio')
  const vai = useCallback((p: Passo) => {
    setPasso(p)
    window.scrollTo(0, 0)
  }, [])
  const valore = useMemo(() => ({ passo, vai }), [passo, vai])
  return <Contesto.Provider value={valore}>{children}</Contesto.Provider>
}

type PropsSchermata = {
  titolo?: string
  sotto?: string
  /** Azione principale, fissa in basso. */
  azione?: ReactNode
  /** Sostituisce il passo precedente, per i passi con più schermate al loro interno. */
  onIndietro?: () => void
  children?: ReactNode
}

/** Impaginazione comune a ogni schermata: barra, avanzamento, corpo e azione fissa. */
export function Schermata({ titolo, sotto, azione, onIndietro, children }: PropsSchermata) {
  const { passo, vai } = useProcedura()
  const precedente = INDIETRO[passo]
  const indietro = onIndietro ?? (precedente ? () => vai(precedente) : null)
  const indice = NUMERATI.findIndex(([p]) => p === passo)
  const dentroLaProcedura = passo !== 'inizio' && passo !== 'conferma'

  return (
    <div className="app">
      <header className="barra">
        {indietro ? (
          <button className="icona-btn" onClick={indietro} aria-label="Indietro">
            <Icona n="arrow_back" />
          </button>
        ) : (
          <span className="logo">
            <Icona n="water_drop" piena />
          </span>
        )}
        <div className="barra-testo">
          <strong>{dentroLaProcedura ? 'Nuova segnalazione' : 'Consorzio di bonifica Garda Chiese'}</strong>
          {dentroLaProcedura && <span>Consorzio di bonifica Garda Chiese</span>}
        </div>
      </header>
      {indice >= 0 && (
        <div className="avanzamento" aria-label={`Passo ${indice + 1} di ${NUMERATI.length}`}>
          <div className="avanzamento-segmenti">
            {NUMERATI.map(([p], i) => (
              <span key={p} className={i <= indice ? 'fatto' : ''} />
            ))}
          </div>
          <span className="avanzamento-testo">
            Passo {indice + 1} di {NUMERATI.length} · {NUMERATI[indice][1]}
          </span>
        </div>
      )}
      <main className="corpo">
        {titolo && <h1>{titolo}</h1>}
        {sotto && <p className="lead">{sotto}</p>}
        {children}
      </main>
      {azione && <footer className="azioni">{azione}</footer>}
    </div>
  )
}
