import type { components } from 'shared/api'

// Valori del contratto e le parole che legge l'Operatore. Regole dai ticket #5 (tassonomia),
// #6 (ciclo di vita) e #8 (criteri di priorità).

export type Segnalazione = components['schemas']['SegnalazioneDettaglio']
export type Stato = components['schemas']['Stato']
export type Priorita = components['schemas']['Priorita']
export type Esito = components['schemas']['Esito']
export type Acquaiolo = components['schemas']['Acquaiolo']
export type Operatore = components['schemas']['Operatore']
export type Evento = components['schemas']['Evento']

export const STATI: Stato[] = ['ricevuta', 'in_verifica', 'assegnata', 'in_intervento', 'chiusa']
export const NOME_STATO: Record<Stato, string> = {
  ricevuta: 'Ricevuta',
  in_verifica: 'In verifica',
  assegnata: 'Assegnata',
  in_intervento: 'In intervento',
  chiusa: 'Chiusa',
}

export const LIVELLI: Priorita[] = ['critica', 'alta', 'media', 'bassa']
export const NOME_LIVELLO: Record<Priorita, string> = { critica: 'Critica', alta: 'Alta', media: 'Media', bassa: 'Bassa' }
export const COLORI: Record<Priorita, string> = { critica: '#d0021b', alta: '#f07b05', media: '#e8c400', bassa: '#2f6fd6' }
export const TEMPI: Record<Priorita, string> = {
  critica: 'verifica immediata',
  alta: 'verifica entro 4 ore',
  media: 'entro 1 giorno lavorativo',
  bassa: 'entro 3 giorni lavorativi',
}

export const ESITI: { valore: Esito; etichetta: string }[] = [
  { valore: 'risolta', etichetta: 'risolta' },
  { valore: 'duplicata', etichetta: 'duplicata' },
  { valore: 'non_di_competenza', etichetta: 'non di competenza' },
  { valore: 'non_riscontrata', etichetta: 'non riscontrata' },
  { valore: 'falsa', etichetta: 'falsa' },
]
export const nomeEsito = (e: string) => ESITI.find((x) => x.valore === e)?.etichetta ?? e

const CATEGORIE: Record<string, string> = {
  acqua_che_affiora: 'Acqua che affiora o perdita',
  canale_che_tracima: 'Canale che tracima o allagamento',
  argine_danneggiato: 'Argine o sponda danneggiata/franata',
  ostruzione: 'Ostruzione o accumulo',
  paratoia_danneggiata: 'Paratoia o impianto danneggiato',
  acqua_sporca: 'Acqua sporca o cattivo odore',
  altro: 'Altro',
}
export const titolo = (s: Pick<Segnalazione, 'categoria'>) => CATEGORIE[s.categoria] ?? 'Categoria da definire'

const VALORI: Record<string, string> = {
  si: 'sì',
  no: 'no',
  non_so: 'non so',
  non_applicabile: 'non applicabile',
  adesso: 'adesso',
  meno_di_un_ora: 'da meno di un’ora',
  alcune_ore: 'da alcune ore',
  piu_di_un_giorno: 'da più di un giorno',
  gocce: 'gocce',
  piccolo_flusso: 'piccolo flusso',
  molta_acqua: 'molta acqua',
}
export const valore = (v: string) => (v ? (VALORI[v] ?? v) : '—')

export const NOME_LAYER: Record<string, string> = { canale: 'Canale', condotta: 'Condotta', reticolo_principale: 'Reticolo principale' }

export const PERICOLI = [
  { campo: 'pericolo_persone', nome: 'Pericolo per persone', breve: 'persone' },
  { campo: 'pericolo_strada', nome: 'Pericolo per la strada', breve: 'strada' },
  { campo: 'pericolo_edifici', nome: 'Pericolo per edifici', breve: 'edifici' },
] as const
export const pericoliSi = (s: Segnalazione) => PERICOLI.filter((p) => s[p.campo] === 'si').map((p) => p.breve)

// Il tasto che fa avanzare di un passo, per Stato (ticket #6).
export const AVANZA: Record<Stato, { azione: 'prendi_in_carico' | 'assegna' | 'avvia_intervento'; etichetta: string } | null> = {
  ricevuta: { azione: 'prendi_in_carico', etichetta: 'Prendi in carico' },
  in_verifica: { azione: 'assegna', etichetta: 'Assegna a…' },
  assegnata: { azione: 'avvia_intervento', etichetta: 'Intervento avviato' },
  in_intervento: null,
  chiusa: null,
}

/** L'Acquaiolo competente è anche l'assegnatario quando la Segnalazione è stata assegnata. */
export const assegnata = (s: Segnalazione) =>
  s.stato_corrente === 'assegnata' || s.stato_corrente === 'in_intervento' || (s.stato_corrente === 'chiusa' && s.registro.some((e) => e.stato === 'assegnata'))

// Oltre i tempi di presa in carico del ticket #8 (qui senza calendario lavorativo).
const LIMITE_MIN: Record<Priorita, number> = { critica: 15, alta: 240, media: 1440, bassa: 4320 }
export const inRitardo = (s: Segnalazione) =>
  s.stato_corrente === 'ricevuta' && (Date.now() - new Date(s.created_at).getTime()) / 60000 > LIMITE_MIN[s.priorita]

export const eta = (iso: string) => {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (min < 60) return `${min} min fa`
  if (min < 60 * 24) return `${Math.round(min / 60)} h fa`
  return `${Math.round(min / 60 / 24)} g fa`
}
export const dataOra = (iso: string) =>
  new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

// Ordine della lista (ticket #8): Critica → Bassa, a parità di livello le più vecchie prima.
export const ordina = (lista: Segnalazione[]) =>
  [...lista].sort((a, b) => LIVELLI.indexOf(a.priorita) - LIVELLI.indexOf(b.priorita) || a.created_at.localeCompare(b.created_at))

export type Filtri = { stati: Stato[]; livelli: Priorita[]; zona: string; testo: string }
export const FILTRI_INIZIALI: Filtri = { stati: STATI.filter((s) => s !== 'chiusa'), livelli: LIVELLI, zona: '', testo: '' }

/** Cosa serve per filtrare oltre alla Segnalazione: il nome della zona e dell'acquaiolo. */
export type Contesto = { zona: (id: number | null) => string | null; acquaiolo: (id: number | null) => Acquaiolo | undefined }

export const filtra = (lista: Segnalazione[], f: Filtri, c: Contesto) =>
  lista.filter(
    (s) =>
      f.stati.includes(s.stato_corrente) &&
      f.livelli.includes(s.priorita) &&
      (!f.zona || c.zona(s.zona_id) === f.zona) &&
      (!f.testo ||
        `${s.codice_pratica} ${s.descrizione} ${s.nome_completo_tracciato} ${c.acquaiolo(s.acquaiolo_competente_id)?.nome ?? ''}`
          .toLowerCase()
          .includes(f.testo.toLowerCase())),
  )
