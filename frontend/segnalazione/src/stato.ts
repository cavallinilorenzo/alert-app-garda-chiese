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
export const STATI: { stato: Stato; etichetta: string }[] = [
  { stato: 'ricevuta', etichetta: 'Ricevuta' },
  { stato: 'in_verifica', etichetta: 'In verifica' },
  { stato: 'assegnata', etichetta: 'Assegnata' },
  { stato: 'in_intervento', etichetta: 'In intervento' },
  { stato: 'chiusa', etichetta: 'Chiusa' },
]

/** Dove si trova il problema: comune e tracciato, quelli che ci sono. */
export const luogo = ({ comune, nome_completo_tracciato }: Pick<StatoPubblico, 'comune' | 'nome_completo_tracciato'>) =>
  [comune, nome_completo_tracciato].filter((t) => t?.trim()).join(' · ')

const formatoGiorno = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
const formatoGiornoAnno = new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' })

/** "24 set, 09:12"; con l'anno solo se non è quello in corso. */
export function formatoData(iso: string, oggi = new Date()) {
  const data = new Date(iso)
  return (data.getFullYear() === oggi.getFullYear() ? formatoGiorno : formatoGiornoAnno).format(data)
}

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
