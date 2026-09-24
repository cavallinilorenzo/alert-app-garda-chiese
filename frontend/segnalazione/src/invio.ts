import { api, type paths } from 'shared/api'
import type { Bozza, Ricevuta } from './bozza'

// Invio della Segnalazione a `POST /segnalazioni`, in multipart con la foto.

type Corpo = paths['/segnalazioni']['post']['requestBody']['content']['multipart/form-data']

// Un cellulare italiano: 9 o 10 cifre che iniziano per 3.
const CELLULARE = /^3\d{8,9}$/

/** Le cifre del numero senza prefisso internazionale, anche se il Segnalante ha incollato +39 o 0039. */
export function cifreCellulare(testo: string) {
  const cifre = testo.replace(/\D/g, '')
  const conPrefisso = /^\s*(\+|00)39/.test(testo) || (cifre.length > 10 && cifre.startsWith('39'))
  return conPrefisso ? cifre.replace(/^(00)?39/, '') : cifre
}

export const cellulareValido = (testo: string) => CELLULARE.test(cifreCellulare(testo))

export type ErroreInvio = 'fuori_perimetro' | 'dati_non_validi' | 'foto_troppo_grande' | 'rete'

export type EsitoInvio = { ricevuta: Ricevuta } | { errore: ErroreInvio }

export async function invia(bozza: Bozza): Promise<EsitoInvio> {
  const { posizione, foto, campi, estrazione, cellulare } = bozza
  if (!posizione || !foto || !campi.descrizione) return { errore: 'dati_non_validi' }

  const corpo: Omit<Corpo, 'foto'> = {
    ...campi,
    lat: posizione.lat,
    lng: posizione.lng,
    descrizione: campi.descrizione,
    cellulare: `+39${cifreCellulare(cellulare)}`,
    transcript_ai: estrazione?.transcript,
  }

  try {
    const { data, error, response } = await api.POST('/segnalazioni', {
      // Il client è tipizzato con `foto: string`; il corpo vero è il FormData qui sotto.
      body: { ...corpo, foto: '' },
      bodySerializer: () => {
        const fd = new FormData()
        for (const [chiave, valore] of Object.entries(corpo)) {
          if (valore != null) fd.append(chiave, String(valore))
        }
        fd.append('foto', foto, foto.name)
        return fd
      },
    })
    if (data) return { ricevuta: data }
    // Il 413 di nginx arriva in HTML; i 400 di validazione nel formato di DRF, non in Error.
    if (response.status === 413) return { errore: 'foto_troppo_grande' }
    if (response.status === 400)
      return { errore: error?.code === 'fuori_perimetro' ? 'fuori_perimetro' : 'dati_non_validi' }
    return { errore: 'rete' }
  } catch {
    return { errore: 'rete' }
  }
}
