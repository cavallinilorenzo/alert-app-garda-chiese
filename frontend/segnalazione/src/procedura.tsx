import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { useBozza } from './bozza'
import { FinestraNumeroVerde, Icona, Logo, NUMERO_VERDE, TEL_NUMERO_VERDE } from './comuni'

// Procedura guidata dell'App di segnalazione: una cosa per schermata, azione principale fissa in
// basso. La cornice è la variante A del prototipo del ticket #102: barra traslucida con indietro,
// logo ridotto e n/5, segmenti di avanzamento, tastone del numero verde dal primo pericolo.

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

/**
 * Impaginazione comune a ogni schermata: barra, avanzamento, corpo e azione fissa. Inizio ha solo il
 * logo grande. Qui stanno anche il tastone del numero verde, che resta dal primo segnale di pericolo
 * fino alla Conferma, e la finestra, che così resta aperta se il pericolo si scopre al Continua.
 */
export function Schermata({ titolo, sotto, azione, onIndietro, children }: PropsSchermata) {
  const { passo, vai, dalRiepilogo } = useProcedura()
  const { bozza, aggiorna } = useBozza()
  const precedente = dalRiepilogo && passo !== 'fuori_perimetro' ? 'riepilogo' : INDIETRO[passo]
  const indietro = onIndietro ?? (precedente ? () => vai(precedente) : null)
  const indice = ordine(passo)
  const tastone = bozza.pericoloSegnalato && passo !== 'conferma'

  return (
    <div className="app">
      {passo === 'inizio' ? (
        <header className="testata">
          <Logo />
        </header>
      ) : (
        <header className="barra">
          <div className="barra-riga">
            {indietro ? (
              <button className="indietro" onClick={indietro} aria-label="Indietro">
                <Icona n="arrow_back" />
              </button>
            ) : (
              <span />
            )}
            <Logo piccolo />
            <span className="barra-passo">{indice >= 0 && `${indice + 1}/${NUMERATI.length}`}</span>
          </div>
          {indice >= 0 && (
            <div className="avanzamento" aria-label={`Passo ${indice + 1} di ${NUMERATI.length} · ${NUMERATI[indice][1]}`}>
              {NUMERATI.map(([p], i) => (
                <span key={p} className={i <= indice ? 'fatto' : ''} />
              ))}
            </div>
          )}
          {tastone && (
            <a className="tastone" href={TEL_NUMERO_VERDE}>
              <Icona n="call" piena />
              <span>
                Numero verde <b>{NUMERO_VERDE}</b>
              </span>
            </a>
          )}
        </header>
      )}
      <main className="corpo">
        {titolo && <h1>{titolo}</h1>}
        {sotto && <p className="lead">{sotto}</p>}
        {children}
      </main>
      {azione && <footer className="azioni">{azione}</footer>}
      {bozza.finestraNumeroVerde && <FinestraNumeroVerde onContinua={() => aggiorna({ finestraNumeroVerde: false })} />}
    </div>
  )
}
