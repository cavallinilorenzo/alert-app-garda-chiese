import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { Icona, Logo, Simbolo } from './comuni'

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

const ordine = (p: Passo) => NUMERATI.findIndex(([n]) => n === p)

type ContestoProcedura = {
  passo: Passo
  vai: (passo: Passo) => void
  /** Apre un passo dal riepilogo: appena si va avanti, o indietro, si torna al riepilogo. */
  modifica: (passo: Passo) => void
  dalRiepilogo: boolean
}

const Contesto = createContext<ContestoProcedura | null>(null)

export function useProcedura() {
  const contesto = useContext(Contesto)
  if (!contesto) throw new Error('useProcedura va usato dentro ProceduraProvider')
  return contesto
}

export function ProceduraProvider({ children }: { children: ReactNode }) {
  const [stato, setStato] = useState<{ passo: Passo; dalRiepilogo: boolean }>({ passo: 'inizio', dalRiepilogo: false })

  const vai = useCallback((p: Passo) => {
    setStato(({ passo, dalRiepilogo }) => {
      // Chi corregge un passo dal riepilogo non rifà tutti quelli dopo.
      if (dalRiepilogo && ordine(passo) >= 0 && ordine(p) > ordine(passo)) return { passo: 'riepilogo', dalRiepilogo: false }
      return { passo: p, dalRiepilogo: dalRiepilogo && p !== 'riepilogo' }
    })
    window.scrollTo(0, 0)
  }, [])

  const modifica = useCallback((p: Passo) => {
    setStato({ passo: p, dalRiepilogo: true })
    window.scrollTo(0, 0)
  }, [])

  const valore = useMemo(() => ({ ...stato, vai, modifica }), [stato, vai, modifica])
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
  const { passo, vai, dalRiepilogo } = useProcedura()
  const precedente = dalRiepilogo && passo !== 'fuori_perimetro' ? 'riepilogo' : INDIETRO[passo]
  const indietro = onIndietro ?? (precedente ? () => vai(precedente) : null)
  const indice = ordine(passo)
  const dentroLaProcedura = passo !== 'inizio' && passo !== 'conferma'

  return (
    <div className="app">
      <header className="barra">
        {indietro ? (
          <button className="icona-btn" onClick={indietro} aria-label="Indietro">
            <Icona n="arrow_back" />
          </button>
        ) : (
          dentroLaProcedura && <Simbolo />
        )}
        {dentroLaProcedura ? (
          <div className="barra-testo">
            <strong>Nuova segnalazione</strong>
            <span>Consorzio di bonifica Garda Chiese</span>
          </div>
        ) : (
          <Logo />
        )}
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
