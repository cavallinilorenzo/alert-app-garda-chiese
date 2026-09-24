import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import type { paths } from 'shared/api'
import type { Campi, Estrazione } from './tassonomia'

// La Segnalazione in corso, condivisa tra i passi della procedura guidata. Vive solo in
// memoria: si invia alla fine, e i passi successivi aggiungono qui i loro campi.

export type Modalita = 'voce' | 'domande'

export type Posizione = {
  lat: number
  lng: number
  fonte: 'gps' | 'mappa'
  /** Precisione dichiarata dal GPS, in metri. Solo con fonte `gps`. */
  precisione_m?: number
}

export type EsitoPerimetro =
  paths['/perimetro/check']['post']['responses'][200]['content']['application/json']

/** Risposta di `POST /segnalazioni`: codice pratica e token della Pagina di stato. */
export type Ricevuta =
  paths['/segnalazioni']['post']['responses'][201]['content']['application/json']

export type Bozza = {
  modalita: Modalita | null
  posizione: Posizione | null
  /** Esito di `/perimetro/check` per la posizione attuale; null se il punto non è ancora controllato. */
  perimetro: EsitoPerimetro | null
  /** La foto del problema, già ridotta per l'invio. */
  foto: File | null
  /** I campi visti nella foto da `/estrazione/foto`; vuoto se non si vede niente o non si è potuta controllare. */
  campiFoto: Campi
  /** Le risposte, dette a voce o scelte a mano. */
  campi: Campi
  /** Risposta di `/estrazione/vocale`; null finché il Segnalante non ha parlato. Si parla una volta sola. */
  estrazione: Estrazione | null
  /** Il cellulare senza prefisso, come l'ha scritto il Segnalante. Il +39 si aggiunge all'invio. */
  cellulare: string
  /** La risposta all'invio; null finché la Segnalazione non è inviata. */
  ricevuta: Ricevuta | null
  /** C'è stato un segnale di pericolo: resta fino alla Conferma, anche se poi le risposte cambiano. */
  pericoloSegnalato: boolean
  /** La finestra del numero verde è aperta. Si apre una volta sola, al primo segnale di pericolo. */
  finestraNumeroVerde: boolean
}

const VUOTA: Bozza = {
  modalita: null,
  posizione: null,
  perimetro: null,
  foto: null,
  campiFoto: {},
  campi: {},
  estrazione: null,
  cellulare: '',
  ricevuta: null,
  pericoloSegnalato: false,
  finestraNumeroVerde: false,
}

type ContestoBozza = {
  bozza: Bozza
  aggiorna: (modifica: Partial<Bozza>) => void
  /** Segna il pericolo e, se è il primo segnale della procedura, apre la finestra del numero verde. */
  segnalaPericolo: () => void
}

const Contesto = createContext<ContestoBozza | null>(null)

export function BozzaProvider({ children }: { children: ReactNode }) {
  const [bozza, setBozza] = useState(VUOTA)

  const aggiorna = useCallback((modifica: Partial<Bozza>) => {
    setBozza((b) => {
      const nuova = { ...b, ...modifica }
      // Un punto spostato va ricontrollato: l'esito vecchio non vale più.
      if (modifica.posizione && !('perimetro' in modifica)) nuova.perimetro = null
      return nuova
    })
  }, [])

  const segnalaPericolo = useCallback(() => {
    setBozza((b) => (b.pericoloSegnalato ? b : { ...b, pericoloSegnalato: true, finestraNumeroVerde: true }))
  }, [])

  const valore = useMemo(() => ({ bozza, aggiorna, segnalaPericolo }), [bozza, aggiorna, segnalaPericolo])
  return <Contesto.Provider value={valore}>{children}</Contesto.Provider>
}

export function useBozza() {
  const contesto = useContext(Contesto)
  if (!contesto) throw new Error('useBozza va usato dentro BozzaProvider')
  return contesto
}
