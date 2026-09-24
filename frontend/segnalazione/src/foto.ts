import { api, type paths } from 'shared/api'
import type { Campi, Campo, Estrazione } from './tassonomia'

// Analisi della foto con `/estrazione/foto` (ticket #92): una foto che non c'entra si scarta
// subito, da una pertinente si prendono i campi che il Segnalante non dice o non sceglie.
// Quello che dice il Segnalante ha sempre la precedenza sulla foto.

export type AnalisiFoto =
  paths['/estrazione/foto']['post']['responses'][200]['content']['application/json']

/**
 * L'esito dell'analisi, oppure null se la foto non si è potuta controllare (assistente non
 * disponibile, rete, formato): in quel caso la foto si tiene lo stesso, senza campi.
 */
export async function analizzaFoto(foto: File): Promise<AnalisiFoto | null> {
  try {
    const { data } = await api.POST('/estrazione/foto', {
      // Il client è tipizzato con `foto: string`; il corpo vero è il FormData qui sotto.
      body: { foto: '' },
      bodySerializer: () => {
        const fd = new FormData()
        fd.append('foto', foto, foto.name)
        return fd
      },
    })
    return data ?? null
  } catch {
    return null
  }
}

/**
 * Le risposte con i campi della nuova foto al posto di quelli della foto precedente. I campi
 * che il Segnalante ha scelto o detto restano: una risposta uguale alla foto vecchia vale come
 * presa dalla foto.
 */
export function conCampiFoto(campi: Campi, vecchi: Campi, nuovi: Campi): Campi {
  const scelti = Object.entries(campi).filter(([c, v]) => vecchi[c as Campo] !== v)
  return { ...nuovi, ...Object.fromEntries(scelti) }
}

/** L'estrazione vocale completata con la foto: i campi non detti ma visti non sono più mancanti. */
export function completaConFoto(estrazione: Estrazione, campiFoto: Campi): Estrazione {
  const visti = estrazione.mancanti.filter((c) => campiFoto[c] != null)
  const daFoto = Object.fromEntries(visti.map((c) => [c, campiFoto[c]]))
  return {
    ...estrazione,
    campi: { ...daFoto, ...estrazione.campi },
    mancanti: estrazione.mancanti.filter((c) => !visti.includes(c)),
  }
}

/** La risposta attuale di un campo è quella presa dalla foto. */
export const dallaFoto = (campi: Campi, campiFoto: Campi, campo: Campo) =>
  campiFoto[campo] != null && campi[campo] === campiFoto[campo]
