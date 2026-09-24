import { useCallback, useEffect, useState } from 'react'
import { api } from 'shared/api'
import { Icona, Spinner } from './comuni'
import { STATI, tappe, type StatoPubblico } from './stato'

// Pagina di stato pubblica: la apre il Segnalante dal link ricevuto a fine invio. Sta fuori dalla
// procedura guidata, quindi ha la sua barra.

type Caricamento = { dati: StatoPubblico } | { errore: 'non_trovata' | 'rete' } | null

const formatoData = new Intl.DateTimeFormat('it-IT', { dateStyle: 'medium', timeStyle: 'short' })

export function PaginaStato({ token }: { token: string }) {
  const [caricamento, setCaricamento] = useState<Caricamento>(null)
  const [aggiorno, setAggiorno] = useState(false)

  const carica = useCallback(async () => {
    setAggiorno(true)
    try {
      const { data, response } = await api.GET('/segnalazioni/stato/{token}', { params: { path: { token } } })
      if (data) setCaricamento({ dati: data })
      // Un token inesistente o storpiato risponde 404 (in HTML se non è nemmeno un UUID).
      else setCaricamento({ errore: response.status === 404 ? 'non_trovata' : 'rete' })
    } catch {
      setCaricamento({ errore: 'rete' })
    } finally {
      setAggiorno(false)
    }
  }, [token])

  useEffect(() => {
    carica()
  }, [carica])

  return (
    <div className="app">
      <header className="barra">
        <span className="logo"><Icona n="water_drop" piena /></span>
        <div className="barra-testo">
          <strong>Consorzio di bonifica Garda Chiese</strong>
          <span>Stato della segnalazione</span>
        </div>
      </header>
      <main className="corpo">
        {caricamento === null ? (
          <div className="centro">
            <Spinner />
            <p>Carichiamo la segnalazione…</p>
          </div>
        ) : 'errore' in caricamento ? (
          <Errore errore={caricamento.errore} onRiprova={carica} aggiorno={aggiorno} />
        ) : (
          <Contenuto dati={caricamento.dati} />
        )}
      </main>
      {caricamento && 'dati' in caricamento && (
        <footer className="azioni">
          <button className="btn secondario" onClick={carica} disabled={aggiorno}>
            {aggiorno ? <Spinner piccolo /> : <Icona n="refresh" />} Aggiorna
          </button>
          <a className="btn testo" href="/">
            Fai una nuova segnalazione
          </a>
        </footer>
      )}
    </div>
  )
}

function Errore({ errore, onRiprova, aggiorno }: { errore: 'non_trovata' | 'rete'; onRiprova: () => void; aggiorno: boolean }) {
  if (errore === 'non_trovata')
    return (
      <div className="centro">
        <span className="tondo grande"><Icona n="search_off" /></span>
        <h1>Segnalazione non trovata</h1>
        <p className="lead">Controlla di aver aperto il link completo, così come l’hai ricevuto a fine invio.</p>
        <a className="btn testo" href="/">Fai una nuova segnalazione</a>
      </div>
    )
  return (
    <div className="centro">
      <span className="tondo grande"><Icona n="wifi_off" /></span>
      <h1>Non riusciamo a caricare la segnalazione</h1>
      <p className="lead">Verifica la connessione e riprova.</p>
      <button className="btn" onClick={onRiprova} disabled={aggiorno}>
        <Icona n="refresh" /> Riprova
      </button>
    </div>
  )
}

function Contenuto({ dati }: { dati: StatoPubblico }) {
  const attuale = STATI.find((s) => s.stato === dati.stato_corrente)

  return (
    <>
      <p className="card-titolo">La tua segnalazione è</p>
      <h1 className="stato-attuale">{attuale?.etichetta ?? dati.stato_corrente}</h1>
      <p className="lead">{attuale?.spiegazione}</p>
      {dati.is_duplicato && (
        <div className="banner">
          <Icona n="group" />
          <span>
            Qualcun altro aveva già segnalato lo stesso problema: qui vedi a che punto è quella segnalazione.
          </span>
        </div>
      )}
      {dati.messaggio_al_segnalante && (
        <div className="card">
          <p className="card-titolo">Messaggio del Consorzio</p>
          <p className="messaggio">{dati.messaggio_al_segnalante}</p>
        </div>
      )}
      <ol className="tappe">
        {tappe(dati).map((t) => (
          <li key={t.stato} className={t.quando}>
            <span className="tappa-punto">
              {t.quando === 'fatta' && <Icona n="check" />}
            </span>
            <div>
              <strong>{t.etichetta}</strong>
              {t.data && <span>{formatoData.format(new Date(t.data))}</span>}
            </div>
          </li>
        ))}
      </ol>
    </>
  )
}
