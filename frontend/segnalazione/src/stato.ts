import type { components } from 'shared/api'

// La Pagina di stato è una rotta dell'App: `/stato/<token_stato>`. In produzione nginx deve
// rispondere con index.html anche su questo percorso.

export type StatoPubblico = components['schemas']['SegnalazioneStatoPubblico']
export type Stato = StatoPubblico['stato_corrente']

export const linkStato = (token: string) => `${window.location.origin}/stato/${encodeURIComponent(token)}`

/** Il token se l'indirizzo è quello di una Pagina di stato, altrimenti null. */
export function tokenDallIndirizzo(percorso = window.location.pathname) {
  const trovato = percorso.match(/^\/stato\/([^/]+)\/?$/)
  return trovato ? decodeURIComponent(trovato[1]) : null
}

/** Gli Stati nell'ordine del ciclo di vita, con le parole per il Segnalante. */
export const STATI: { stato: Stato; etichetta: string; spiegazione: string }[] = [
  { stato: 'ricevuta', etichetta: 'Ricevuta', spiegazione: 'Il Consorzio ha ricevuto la segnalazione.' },
  { stato: 'in_verifica', etichetta: 'In verifica', spiegazione: 'Il personale del Consorzio la sta verificando.' },
  { stato: 'assegnata', etichetta: 'Assegnata', spiegazione: 'È stata affidata all’acquaiolo della zona.' },
  { stato: 'in_intervento', etichetta: 'In intervento', spiegazione: 'Il Consorzio sta intervenendo sul posto.' },
  { stato: 'chiusa', etichetta: 'Chiusa', spiegazione: 'Il Consorzio ha chiuso la segnalazione.' },
]

export type Tappa = (typeof STATI)[number] & { quando: 'fatta' | 'attuale' | 'futura'; data?: string }

/**
 * Le tappe da mostrare: quelle attraversate fino allo Stato attuale, con la data più recente, e
 * quelle che mancano. Dopo un passo indietro le tappe oltre lo Stato attuale tornano future; gli
 * Stati saltati (una chiusura diretta da Ricevuta) non compaiono.
 */
export function tappe({ stato_corrente, timeline }: StatoPubblico): Tappa[] {
  const attuale = STATI.findIndex((s) => s.stato === stato_corrente)
  const ultimaData = (stato: Stato) =>
    timeline
      .filter((e) => e.stato === stato && e.data)
      .map((e) => e.data!)
      .sort((a, b) => Date.parse(a) - Date.parse(b))
      .at(-1)

  return STATI.flatMap((s, i): Tappa[] => {
    if (i > attuale) return [{ ...s, quando: 'futura' }]
    const data = ultimaData(s.stato)
    if (i === attuale) return [{ ...s, quando: 'attuale', data }]
    return data ? [{ ...s, quando: 'fatta', data }] : []
  })
}
