// Foto d'esempio per chi prova l'App lontano dai canali (ticket #139): invece di fotografare
// quello che ha davanti, sceglie un caso tipico. Crediti e licenze in public/esempi/CREDITI.md.

import type { AnalisiFoto } from './foto'

export type FotoEsempio = { file: string; etichetta: string; analisi: AnalisiFoto }

export const FOTO_ESEMPIO: FotoEsempio[] = [
  {
    file: 'canale-che-esonda.jpg',
    etichetta: 'Canale che esonda',
    analisi: {
      pertinente: true,
      motivo: null,
      campi: {
        categoria: 'canale_che_tracima',
        descrizione: 'L\'acqua del canale sta tracimando oltre l\'argine e allagando il terreno circostante.',
        quantita_acqua: 'molta_acqua',
      },
    },
  },
  {
    file: 'argine-franato.jpg',
    etichetta: 'Argine franato',
    analisi: {
      pertinente: true,
      motivo: null,
      campi: {
        categoria: 'argine_danneggiato',
        descrizione: 'Una porzione dell\'argine di terra è franata all\'interno del canale.',
      },
    },
  },
  {
    file: 'ostruzione.jpg',
    etichetta: 'Ramaglie che bloccano l’acqua',
    analisi: {
      pertinente: true,
      motivo: null,
      campi: {
        categoria: 'ostruzione',
        descrizione: 'Un accumulo di rami e detriti blocca il flusso dell\'acqua in prossimità di un manufatto.',
      },
    },
  },
  {
    file: 'acqua-dal-terreno.jpg',
    etichetta: 'Acqua che esce dal terreno',
    analisi: {
      pertinente: true,
      motivo: null,
      campi: {
        categoria: 'acqua_che_affiora',
        descrizione: 'Una vistosa perdita d\'acqua sgorga direttamente dal terreno causando un allagamento.',
        quantita_acqua: 'molta_acqua',
      },
    },
  },
  {
    file: 'canale-asciutto.jpg',
    etichetta: 'Canale senz’acqua',
    analisi: {
      pertinente: true,
      motivo: null,
      campi: {
        categoria: 'canale_asciutto',
        descrizione: 'Il letto del canale è completamente asciutto e privo di scorrimento d\'acqua.',
      },
    },
  },
  {
    file: 'rifiuti.jpg',
    etichetta: 'Rifiuti nel canale',
    analisi: {
      pertinente: true,
      motivo: null,
      campi: {
        categoria: 'altro',
        descrizione: 'Presenza di rifiuti abbandonati all\'interno del canale.',
      },
    },
  },
]

export const urlEsempio = (esempio: FotoEsempio) => `${import.meta.env.BASE_URL}esempi/${esempio.file}`

/** La foto d'esempio come file, pronta per la stessa strada di una foto scattata. */
export async function caricaEsempio(esempio: FotoEsempio): Promise<File> {
  const risposta = await fetch(urlEsempio(esempio))
  if (!risposta.ok) throw new Error(`Foto d'esempio ${esempio.file} non disponibile`)
  return new File([await risposta.blob()], esempio.file, { type: 'image/jpeg' })
}
