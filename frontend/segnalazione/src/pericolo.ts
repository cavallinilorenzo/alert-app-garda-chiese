import type { Campi } from './tassonomia'

// Il segnale di pericolo che fa comparire il numero verde (ticket #103): uno dei tre pericoli a
// "sì", come la regola `pericolo_immediato` del backend, oppure parole chiave nella descrizione.
// Le parole chiave servono solo al Segnalante: non cambiano i campi `pericolo_*` né la priorità.
// Le negazioni non si gestiscono di proposito: "nessun ferito" fa scattare lo stesso la finestra.

// Persone: bastano da sole. Una voce con * vale come radice, le altre come parola intera.
const PERSONE = ['ferit*', 'bambin*', 'anzian*', 'intrappolat*', 'travolt*', 'trascinat*', 'annega*', 'svenut*', 'soccors*', 'aiuto']

// Strade ed edifici che bastano da soli.
const CEDIMENTI = ['crollat*', 'voragin*', 'frana', 'frane']

// Strade ed edifici con l'acqua: un luogo e un segno d'acqua nella stessa frase.
const LUOGHI = ['strad*', 'via', 'vie', 'sottopass*', 'auto', 'macchin*', 'casa', 'case', 'cantin*', 'scantinat*', 'garage', 'box']
const ACQUA = ['allag*', 'sommers*', 'sottacqua', 'in acqua', 'sott acqua', 'sotto acqua', 'nell acqua']

/** Minuscole, senza accenti, apostrofi come spazi: "Nell'acqua è" diventa "nell acqua e". */
const normalizza = (testo: string) =>
  testo.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/['’`]/g, ' ')

/** Una parola intera, una radice (con *) o due parole di fila, dentro un testo già normalizzato. */
const espressione = (voci: string[]) =>
  new RegExp(`\\b(?:${voci.map((v) => (v.endsWith('*') ? `${v.slice(0, -1)}[a-z]*` : v).replace(' ', '\\s+')).join('|')})\\b`)

const PERSONE_RE = espressione(PERSONE)
const CEDIMENTI_RE = espressione(CEDIMENTI)
const LUOGHI_RE = espressione(LUOGHI)
const ACQUA_RE = espressione(ACQUA)

/** La descrizione contiene parole chiave di pericolo per persone, strade o edifici. */
export function contieneParoleDiPericolo(descrizione: string): boolean {
  const testo = normalizza(descrizione)
  if (PERSONE_RE.test(testo) || CEDIMENTI_RE.test(testo)) return true
  return testo.split(/[.!?;\n]+/).some((frase) => LUOGHI_RE.test(frase) && ACQUA_RE.test(frase))
}

/** Uno dei tre pericoli è a "sì", detto a voce o scelto. */
export const pericoloDichiarato = (campi: Campi) =>
  campi.pericolo_persone === 'si' || campi.pericolo_strada === 'si' || campi.pericolo_edifici === 'si'

/** Nelle risposte c'è un segnale di pericolo: un pericolo a "sì" o parole chiave nella descrizione. */
export const segnaleDiPericolo = (campi: Campi) =>
  pericoloDichiarato(campi) || contieneParoleDiPericolo(campi.descrizione ?? '')
