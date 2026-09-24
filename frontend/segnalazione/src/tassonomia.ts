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

// Categoria, durata e quantità d'acqua come decise nella revisione delle opzioni (ticket #100).
export const CATEGORIE: { valore: Categoria; etichetta: string; icona: string }[] = [
  { valore: 'acqua_che_affiora', etichetta: 'Acqua che esce dal terreno', icona: 'water_drop' },
  { valore: 'perdita_dal_canale', etichetta: 'Canale che perde', icona: 'water_damage' },
  { valore: 'canale_che_tracima', etichetta: 'Canale che esonda o allaga', icona: 'flood' },
  { valore: 'argine_danneggiato', etichetta: 'Argine o sponda franata', icona: 'landslide' },
  { valore: 'ostruzione', etichetta: 'Qualcosa blocca l’acqua', icona: 'block' },
  { valore: 'canale_asciutto', etichetta: 'Canale senz’acqua', icona: 'water_loss' },
  { valore: 'paratoia_danneggiata', etichetta: 'Paratoia o impianto rotto', icona: 'valve' },
  { valore: 'acqua_sporca', etichetta: 'Acqua sporca o rifiuti', icona: 'water_ec' },
  { valore: 'altro', etichetta: 'Altro', icona: 'more_horiz' },
]

const DURATE: { valore: Durata; etichetta: string }[] = [
  { valore: 'adesso', etichetta: 'L’ho appena notato' },
  { valore: 'alcune_ore', etichetta: 'Da qualche ora' },
  { valore: 'piu_di_un_giorno', etichetta: 'Da qualche giorno' },
  { valore: 'da_settimane', etichetta: 'Da settimane' },
  { valore: 'non_so', etichetta: 'Non so' },
]

// Senza `non_applicabile`: non si sceglie, lo mette l'App quando la domanda non si fa.
const QUANTITA: { valore: QuantitaAcqua; etichetta: string }[] = [
  { valore: 'gocce', etichetta: 'Gocciola' },
  { valore: 'piccolo_flusso', etichetta: 'Un filo, come un rubinetto' },
  { valore: 'molta_acqua', etichetta: 'Tanta, scorre forte' },
  { valore: 'getto', etichetta: 'Zampilla con forza' },
  { valore: 'non_so', etichetta: 'Non so' },
]

/** Le categorie in cui l'acqua esce: solo per queste si chiede quanta se ne vede. */
const CATEGORIE_CON_QUANTITA: Categoria[] = [
  'acqua_che_affiora',
  'perdita_dal_canale',
  'canale_che_tracima',
  'argine_danneggiato',
]

const chiedeQuantita = (campi: Campi) =>
  campi.categoria != null && CATEGORIE_CON_QUANTITA.includes(campi.categoria)

/**
 * Le risposte con la quantità d'acqua coerente con la categoria: `non_applicabile` se la
 * domanda non si fa, nessuna risposta se si fa ma prima valeva `non_applicabile`.
 */
export function conQuantitaCoerente(campi: Campi): Campi {
  if (campi.categoria == null) return campi
  if (!chiedeQuantita(campi)) return { ...campi, quantita_acqua: 'non_applicabile' }
  if (campi.quantita_acqua !== 'non_applicabile') return campi
  const { quantita_acqua: _, ...senza } = campi
  return senza
}

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
  { campo: 'categoria', testo: 'Cosa hai visto?', etichetta: 'Cosa hai visto', obbligatorio: true, opzioni: CATEGORIE },
  { campo: 'descrizione', testo: 'Descrivilo in breve', etichetta: 'Descrizione', obbligatorio: true },
  { campo: 'durata', testo: 'Da quanto tempo?', etichetta: 'Da quando', obbligatorio: false, opzioni: DURATE },
  { campo: 'quantita_acqua', testo: 'Quanta acqua vedi?', etichetta: 'Quanta acqua', obbligatorio: false, opzioni: QUANTITA },
  { campo: 'pericolo_persone', testo: 'Qualcuno è in pericolo?', etichetta: 'Persone in pericolo', obbligatorio: false, opzioni: SI_NO },
  { campo: 'pericolo_strada', testo: 'Una strada è allagata o a rischio?', etichetta: 'Strada a rischio', obbligatorio: false, opzioni: SI_NO },
  { campo: 'pericolo_edifici', testo: 'Case o edifici a rischio?', etichetta: 'Case o edifici a rischio', obbligatorio: false, opzioni: SI_NO },
]

export type CampoPericolo = 'pericolo_persone' | 'pericolo_strada' | 'pericolo_edifici'

// Rispondendo alle domande i tre pericoli sono una domanda sola, la prima (ticket #102): tre
// tessere da accendere, oppure "Nessun pericolo" o "Non lo so".
export const DOMANDA_PERICOLI = 'C’è qualcosa in pericolo?'

export const PERICOLI: { campo: CampoPericolo; etichetta: string; icona: string }[] = [
  { campo: 'pericolo_persone', etichetta: 'Persone', icona: 'directions_walk' },
  { campo: 'pericolo_strada', etichetta: 'Strade', icona: 'add_road' },
  { campo: 'pericolo_edifici', etichetta: 'Case', icona: 'home' },
]

export const isPericolo = (campo: Campo): campo is CampoPericolo => PERICOLI.some((p) => p.campo === campo)

/** La risposta alla domanda dei pericoli: le tessere accese, "Nessun pericolo" o "Non lo so". */
export type RispostaPericoli = CampoPericolo[] | 'no' | 'non_so'

/**
 * I tre campi `pericolo_*` dalla risposta a tessere: una tessera accesa vale "sì" e le altre "no",
 * "Nessun pericolo" mette tutto a "no", "Non lo so" tutto a "non so". Senza tessere accese la
 * domanda torna senza risposta.
 */
export function campiPericoli(risposta: RispostaPericoli): Pick<Campi, CampoPericolo> {
  return Object.fromEntries(
    PERICOLI.map(({ campo }) => [
      campo,
      typeof risposta === 'string' ? risposta : risposta.length ? (risposta.includes(campo) ? 'si' : 'no') : undefined,
    ]),
  )
}

/** La risposta a tessere che corrisponde ai campi, detti a voce o scelti; null se non c'è. */
export function rispostaPericoli(campi: Campi): RispostaPericoli | null {
  const accesi = PERICOLI.filter((p) => campi[p.campo] === 'si').map((p) => p.campo)
  if (accesi.length) return accesi
  const valori = PERICOLI.map((p) => campi[p.campo]).filter((v) => v != null)
  if (!valori.length) return null
  return valori.includes('non_so') ? 'non_so' : 'no'
}

/** I pericoli in breve, per il riepilogo e i campi capiti a voce; null se non c'è risposta. */
export function riassuntoPericoli(campi: Campi): string | null {
  const risposta = rispostaPericoli(campi)
  if (risposta === null) return null
  if (risposta === 'no') return 'Nessun pericolo'
  if (risposta === 'non_so') return 'Pericolo: non so'
  const nomi = PERICOLI.filter((p) => risposta.includes(p.campo)).map((p) => p.etichetta.toLowerCase())
  return `Pericolo: ${nomi.join(', ')}`
}

/** Le domande da fare con queste risposte: la quantità d'acqua solo se la categoria la prevede. */
export const domandeDa = (campi: Campi) =>
  DOMANDE.filter((d) => d.campo !== 'quantita_acqua' || chiedeQuantita(campi))

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
