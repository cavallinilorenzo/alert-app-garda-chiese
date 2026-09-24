// Dati del Portale operatore dal backend: segnalazioni, Rubrica acquaioli, Zone acquaiolo.
// Le azioni dell'Operatore passano da qui, così la lista e la scheda restano allineate.
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, type paths } from 'shared/api'
import { caricaStrato } from './comuni'
import type { Acquaiolo, Contesto, Segnalazione } from './dominio'

type CorpoAzione = paths['/segnalazioni/{id}/azioni']['post']['requestBody']['content']['application/json']
type CorpoCorrezione = paths['/segnalazioni/{id}']['patch']['requestBody']['content']['application/json']
type CorpoAcquaiolo = { nome: string; telefono: string; zona_id: number | null }

export type Zona = { id: number; nome: string; acquaiolo: string | null }
export type Toast = { testo: string; errore?: boolean; n: number }

type Portale = Contesto & {
  segnalazioni: Segnalazione[]
  rubrica: Acquaiolo[]
  zone: Zona[]
  caricamento: boolean
  errore: string | null
  toast: Toast | null
  ricarica: () => Promise<void>
  azione: (id: number, corpo: CorpoAzione) => Promise<boolean>
  correggi: (id: number, corpo: CorpoCorrezione) => Promise<boolean>
  salvaAcquaiolo: (id: number | null, corpo: CorpoAcquaiolo) => Promise<boolean>
}

const PortaleContesto = createContext<Portale | null>(null)
export const usePortale = () => useContext(PortaleContesto)!

const MESSAGGI: Record<CorpoAzione['azione'], string> = {
  prendi_in_carico: 'Presa in carico',
  assegna: 'Segnalazione assegnata',
  avvia_intervento: 'Intervento avviato',
  chiudi: 'Segnalazione chiusa',
  indietro: 'Stato riportato indietro',
  riapri: 'Segnalazione riaperta',
  nota: 'Nota aggiunta al registro',
  messaggio_segnalante: 'Messaggio inviato al segnalante',
}

// La lista (`GET /segnalazioni`) ha pochi campi: per righe e filtri serve il dettaglio di ognuna.
// Per la demo ne bastano 100, le più urgenti prima.
async function caricaSegnalazioni(): Promise<Segnalazione[]> {
  const { data, error } = await api.GET('/segnalazioni', { params: { query: { page_size: 100 } as never } })
  if (error || !data) throw new Error('Non riesco a caricare le segnalazioni.')
  const ids = (data.items ?? []).map((x) => (x as { id: number }).id)
  const dettagli = await Promise.all(ids.map((id) => api.GET('/segnalazioni/{id}', { params: { path: { id } } })))
  return dettagli.flatMap((r) => (r.data ? [r.data] : []))
}

async function caricaZone(): Promise<Zona[]> {
  const dati = await caricaStrato('zona_acquaiolo')
  return dati.features.map((f) => ({ id: Number(f.id), nome: f.properties?.nome ?? '', acquaiolo: f.properties?.acquaiolo ?? null }))
}

const messaggioErrore = (e: unknown, riserva: string): string =>
  e && typeof e === 'object' && 'message' in e && typeof e.message === 'string' && e.message ? e.message : riserva

export function PortaleProvider({ children }: { children: ReactNode }) {
  const [segnalazioni, setSegnalazioni] = useState<Segnalazione[]>([])
  const [rubrica, setRubrica] = useState<Acquaiolo[]>([])
  const [zone, setZone] = useState<Zona[]>([])
  const [caricamento, setCaricamento] = useState(true)
  const [errore, setErrore] = useState<string | null>(null)
  const [toast, setToast] = useState<Toast | null>(null)

  const avvisa = (testo: string, errore = false) => setToast({ testo, errore, n: Date.now() })
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  const caricaRubrica = async () => {
    const { data } = await api.GET('/acquaioli')
    if (data) setRubrica(data)
  }

  const ricarica = useCallback(async () => {
    setErrore(null)
    try {
      setSegnalazioni(await caricaSegnalazioni())
    } catch (e) {
      setErrore(messaggioErrore(e, 'Non riesco a caricare le segnalazioni.'))
    }
    setCaricamento(false)
  }, [])

  useEffect(() => {
    ricarica()
    caricaRubrica()
    caricaZone().then(setZone, () => {})
  }, [ricarica])

  // Niente tasto Aggiorna: le segnalazioni si ricaricano da sole ogni 30 secondi e quando si torna sul Portale.
  // In silenzio: se una ricarica non riesce resta la lista che c'è.
  useEffect(() => {
    const aggiorna = () => {
      if (document.visibilityState === 'visible') caricaSegnalazioni().then(setSegnalazioni, () => {})
    }
    const t = setInterval(aggiorna, 30_000)
    document.addEventListener('visibilitychange', aggiorna)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', aggiorna)
    }
  }, [])

  const sostituisci = (s: Segnalazione) => setSegnalazioni((l) => l.map((x) => (x.id === s.id ? s : x)))

  const azione = async (id: number, corpo: CorpoAzione) => {
    const { data, error } = await api.POST('/segnalazioni/{id}/azioni', { params: { path: { id } }, body: corpo })
    if (!data) {
      avvisa(messaggioErrore(error, 'Azione non riuscita.'), true)
      return false
    }
    sostituisci(data)
    // chiudere come duplicata scrive anche nel Registro dell'originale
    if (corpo.duplicato_di) {
      const { data: originale } = await api.GET('/segnalazioni/{id}', { params: { path: { id: corpo.duplicato_di } } })
      if (originale) sostituisci(originale)
    }
    avvisa(MESSAGGI[corpo.azione])
    return true
  }

  const correggi = async (id: number, corpo: CorpoCorrezione) => {
    const { data, error } = await api.PATCH('/segnalazioni/{id}', { params: { path: { id } }, body: corpo })
    if (!data) {
      avvisa(messaggioErrore(error, 'Correzione non riuscita.'), true)
      return false
    }
    sostituisci(data)
    avvisa(corpo.priorita ? 'Priorità corretta' : 'Segnalazione corretta')
    return true
  }

  const salvaAcquaiolo = async (id: number | null, corpo: CorpoAcquaiolo) => {
    const { error } = id
      ? await api.PATCH('/acquaioli/{id}', { params: { path: { id } }, body: corpo })
      : await api.POST('/acquaioli', { body: corpo })
    if (error) {
      avvisa(messaggioErrore(error, 'Rubrica non aggiornata.'), true)
      return false
    }
    await caricaRubrica()
    avvisa('Rubrica aggiornata')
    return true
  }

  const zona = (id: number | null) => zone.find((z) => z.id === id)?.nome ?? null
  const acquaiolo = (id: number | null) => rubrica.find((a) => a.id === id)

  return (
    <PortaleContesto.Provider
      value={{ segnalazioni, rubrica, zone, caricamento, errore, toast, ricarica, azione, correggi, salvaAcquaiolo, zona, acquaiolo }}
    >
      {children}
    </PortaleContesto.Provider>
  )
}
