import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from 'shared/api'
import type { Estrazione } from './tassonomia'

// Registrazione con MediaRecorder e invio a `/estrazione/vocale`. Le scelte vengono dalla
// ricerca sull'audio da Safari iOS (ticket #56).

/** Oltre questa durata la registrazione si ferma da sola. */
export const REGISTRAZIONE_MAX_S = 90

// Il primo formato che il browser sa registrare: Chrome e Safari 18.4+ WebM/Opus, Safari
// più vecchio MP4/AAC, Firefox Ogg. Se nessuno va si lascia scegliere al browser.
const FORMATI = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/ogg;codecs=opus']

export const registrazioneSupportata = () =>
  typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

/**
 * `secondi` è null quando non si registra. `avvia` chiede il microfono (va chiamato da un tocco,
 * per Safari) e rifiuta se il permesso è negato; `ferma` chiude e passa l'audio a `onFine`.
 */
export function useRegistrazione(onFine: (audio: Blob) => void) {
  const [secondi, setSecondi] = useState<number | null>(null)
  const registratore = useRef<MediaRecorder | null>(null)
  const alTermine = useRef(onFine)
  useEffect(() => {
    alTermine.current = onFine
  })

  const ferma = useCallback(() => {
    if (registratore.current?.state === 'recording') registratore.current.stop()
  }, [])

  useEffect(() => {
    if (secondi === null) return
    if (secondi >= REGISTRAZIONE_MAX_S) return ferma()
    const t = setTimeout(() => setSecondi((s) => (s === null ? null : s + 1)), 1000)
    return () => clearTimeout(t)
  }, [secondi, ferma])

  // Chi esce dal passo mentre registra spegne il microfono e non invia niente.
  useEffect(
    () => () => {
      const r = registratore.current
      if (!r) return
      r.onstop = null
      if (r.state !== 'inactive') r.stop()
      r.stream.getTracks().forEach((t) => t.stop())
    },
    [],
  )

  const avvia = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const mimeType = FORMATI.find((f) => MediaRecorder.isTypeSupported(f))
    const r = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
    const pezzi: Blob[] = []
    r.ondataavailable = (e) => {
      if (e.data.size > 0) pezzi.push(e.data)
    }
    r.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      registratore.current = null
      setSecondi(null)
      alTermine.current(new Blob(pezzi, { type: r.mimeType }))
    }
    r.start()
    registratore.current = r
    setSecondi(0)
  }, [])

  return { secondi, avvia, ferma }
}

export type ErroreEstrazione = 'audio_non_valido' | 'audio_troppo_grande' | 'non_disponibile' | 'rete'

export type EsitoEstrazione = { estrazione: Estrazione } | { errore: ErroreEstrazione }

const ESTENSIONI: Record<string, string> = { 'audio/webm': 'webm', 'audio/mp4': 'm4a', 'audio/ogg': 'ogg' }

export async function estrai(audio: Blob): Promise<EsitoEstrazione> {
  const tipo = audio.type.split(';')[0]
  try {
    const { data, response } = await api.POST('/estrazione/vocale', {
      // Il client è tipizzato con `audio: string`; il corpo vero è il FormData qui sotto.
      body: { audio: '' },
      bodySerializer: () => {
        const fd = new FormData()
        fd.append('audio', audio, `voce.${ESTENSIONI[tipo] ?? 'audio'}`)
        return fd
      },
    })
    if (data) return { estrazione: data }
    // Si guarda lo status e non il corpo: un 413 di nginx arriva in HTML, non nel formato Error.
    if (response.status === 413) return { errore: 'audio_troppo_grande' }
    if (response.status === 400) return { errore: 'audio_non_valido' }
    if (response.status === 503) return { errore: 'non_disponibile' }
    return { errore: 'rete' }
  } catch {
    return { errore: 'rete' }
  }
}
