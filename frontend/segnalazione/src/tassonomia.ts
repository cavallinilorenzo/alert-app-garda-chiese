import type { paths } from 'shared/api'

// Tassonomia delle criticità (ticket #5) con i valori del contratto e le parole che legge il
// Segnalante. Le domande sono nell'ordine della checklist vocale, uguale a quello del backend.

export type Estrazione =
  paths['/estrazione/vocale']['post']['responses'][200]['content']['application/json']

/** I campi della Segnalazione che si dicono a voce o si scelgono rispondendo alle domande. */
export type Campi = Estrazione['campi']
export type Campo = keyof Campi

type Categoria = NonNullable<Campi['categoria']>
type Durata = NonNullable<Campi['durata']>
type QuantitaAcqua = NonNullable<Campi['quantita_acqua']>
type SiNo = NonNullable<Campi['pericolo_persone']>

export type Opzione = { valore: string; etichetta: string; icona?: string }

export const CATEGORIE: { valore: Categoria; etichetta: string; icona: string }[] = [
  { valore: 'acqua_che_affiora', etichetta: 'Acqua che affiora o perdita', icona: 'water_drop' },
  { valore: 'canale_che_tracima', etichetta: 'Canale che tracima o allagamento', icona: 'flood' },
  { valore: 'argine_danneggiato', etichetta: 'Argine o sponda danneggiata o franata', icona: 'landslide' },
  { valore: 'ostruzione', etichetta: 'Ostruzione o accumulo', icona: 'block' },
  { valore: 'paratoia_danneggiata', etichetta: 'Paratoia o impianto danneggiato', icona: 'valve' },
  { valore: 'acqua_sporca', etichetta: 'Acqua sporca o cattivo odore', icona: 'water_ec' },
  { valore: 'altro', etichetta: 'Altro', icona: 'more_horiz' },
]

const DURATE: { valore: Durata; etichetta: string }[] = [
  { valore: 'adesso', etichetta: 'Adesso' },
  { valore: 'meno_di_un_ora', etichetta: 'Da meno di un’ora' },
  { valore: 'alcune_ore', etichetta: 'Da alcune ore' },
  { valore: 'piu_di_un_giorno', etichetta: 'Da più di un giorno' },
  { valore: 'non_so', etichetta: 'Non so' },
  { valore: 'non_applicabile', etichetta: 'Non applicabile' },
]

const QUANTITA: { valore: QuantitaAcqua; etichetta: string }[] = [
  { valore: 'gocce', etichetta: 'Gocce' },
  { valore: 'piccolo_flusso', etichetta: 'Piccolo flusso' },
  { valore: 'molta_acqua', etichetta: 'Molta acqua' },
  { valore: 'non_so', etichetta: 'Non so' },
  { valore: 'non_applicabile', etichetta: 'Non applicabile' },
]

const SI_NO: { valore: SiNo; etichetta: string }[] = [
  { valore: 'si', etichetta: 'Sì' },
  { valore: 'no', etichetta: 'No' },
  { valore: 'non_so', etichetta: 'Non so' },
]

export type Domanda = {
  campo: Campo
  testo: string
  /** Come si chiama il campo nella riga dei campi capiti. */
  etichetta: string
  obbligatorio: boolean
  /** Assenti solo per la descrizione, che si scrive. */
  opzioni?: Opzione[]
}

export const DOMANDE: Domanda[] = [
  { campo: 'categoria', testo: 'Che cosa hai visto?', etichetta: 'Cosa hai visto', obbligatorio: true, opzioni: CATEGORIE },
  { campo: 'descrizione', testo: 'Raccontalo in una frase breve', etichetta: 'Descrizione', obbligatorio: true },
  { campo: 'durata', testo: 'Da quanto tempo lo vedi?', etichetta: 'Da quanto tempo', obbligatorio: false, opzioni: DURATE },
  { campo: 'quantita_acqua', testo: 'Quanta acqua vedi?', etichetta: 'Quanta acqua', obbligatorio: false, opzioni: QUANTITA },
  { campo: 'pericolo_persone', testo: 'C’è pericolo per le persone?', etichetta: 'Pericolo per le persone', obbligatorio: false, opzioni: SI_NO },
  { campo: 'pericolo_strada', testo: 'C’è pericolo per una strada?', etichetta: 'Pericolo per strade', obbligatorio: false, opzioni: SI_NO },
  { campo: 'pericolo_edifici', testo: 'C’è pericolo per case o altri edifici?', etichetta: 'Pericolo per case o edifici', obbligatorio: false, opzioni: SI_NO },
]

// Limiti di `descrizione` nell'invio (`POST /segnalazioni`).
export const DESCRIZIONE_MIN = 10
export const DESCRIZIONE_MAX = 500

export const descrizioneValida = (d: string | undefined) =>
  d != null && d.trim().length >= DESCRIZIONE_MIN && d.length <= DESCRIZIONE_MAX

/** Un campo ha una risposta valida: la descrizione con la lunghezza giusta, gli altri se scelti. */
export const risposto = (campi: Campi, campo: Campo) =>
  campo === 'descrizione' ? descrizioneValida(campi.descrizione) : campi[campo] != null

export const obbligatoriCompleti = (campi: Campi) =>
  DOMANDE.every((d) => !d.obbligatorio || risposto(campi, d.campo))

export function etichettaValore(domanda: Domanda, valore: string) {
  return domanda.opzioni?.find((o) => o.valore === valore)?.etichetta ?? valore
}
