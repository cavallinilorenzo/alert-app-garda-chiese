// Foto d'esempio per chi prova l'App lontano dai canali (ticket #139): invece di fotografare
// quello che ha davanti, sceglie un caso tipico. Crediti e licenze in public/esempi/CREDITI.md.

export type FotoEsempio = { file: string; etichetta: string }

export const FOTO_ESEMPIO: FotoEsempio[] = [
  { file: 'canale-che-esonda.jpg', etichetta: 'Canale che esonda' },
  { file: 'argine-franato.jpg', etichetta: 'Argine franato' },
  { file: 'ostruzione.jpg', etichetta: 'Ramaglie che bloccano l’acqua' },
  { file: 'acqua-dal-terreno.jpg', etichetta: 'Acqua che esce dal terreno' },
  { file: 'canale-asciutto.jpg', etichetta: 'Canale senz’acqua' },
  { file: 'rifiuti.jpg', etichetta: 'Rifiuti nel canale' },
]

export const urlEsempio = (esempio: FotoEsempio) => `${import.meta.env.BASE_URL}esempi/${esempio.file}`

/** La foto d'esempio come file, pronta per la stessa strada di una foto scattata. */
export async function caricaEsempio(esempio: FotoEsempio): Promise<File> {
  const risposta = await fetch(urlEsempio(esempio))
  if (!risposta.ok) throw new Error(`Foto d'esempio ${esempio.file} non disponibile`)
  return new File([await risposta.blob()], esempio.file, { type: 'image/jpeg' })
}
