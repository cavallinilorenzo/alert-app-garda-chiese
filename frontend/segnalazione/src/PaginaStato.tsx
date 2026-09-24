import { useCallback, useEffect, useState } from 'react'
import { api } from 'shared/api'
import { Icona, Logo, Spinner } from './comuni'
import { STATI, formatoData, luogo, tappe, type StatoPubblico } from './stato'
import { CATEGORIE } from './tassonomia'

// Pagina di stato pubblica: la apre il Segnalante dal link ricevuto a fine invio. Sta fuori dalla
// procedura guidata, quindi ha la sua testata con il logo grande. Layout della variante A del
// prototipo (ticket #102): codice, Stato in grande, la segnalazione in breve, messaggio e tappe.

type Caricamento = { dati: StatoPubblico } | { errore: 'non_trovata' | 'rete' } | null

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
      <header className="testata">
        <Logo />
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
            Nuova segnalazione
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
      {dati.codice_pratica && <p className="occhiello">{dati.codice_pratica}</p>}
      <h1 className="stato-attuale">{attuale?.etichetta ?? dati.stato_corrente}</h1>
      <InBreve dati={dati} />
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
          <p className="card-titolo">Dal Consorzio</p>
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
              {t.data && <span>{formatoData(t.data)}</span>}
            </div>
          </li>
        ))}
      </ol>
    </>
  )
}

/**
 * La segnalazione in breve, per riconoscerla quando si riapre il link dopo giorni: la prima foto,
 * la categoria, il luogo e la data d'invio. Sparisce se il backend non manda nessuno di questi campi.
 */
function InBreve({ dati }: { dati: StatoPubblico }) {
  const [fotoRotta, setFotoRotta] = useState(false)
  const foto = fotoRotta ? undefined : dati.foto?.[0]
  // Le etichette della tassonomia dell'App, che ha anche le due categorie che mancano ancora
  // all'enum della Pagina di stato nel contratto (ticket #128).
  const categoria = CATEGORIE.find((c) => c.valore === (dati.categoria as string))
  const dove = luogo(dati)

  if (!foto && !categoria && !dove && !dati.created_at) return null
  return (
    <div className="in-breve">
      {foto && <img src={foto} alt="La foto che hai inviato" onError={() => setFotoRotta(true)} />}
      <div>
        {categoria && (
          <strong>
            <Icona n={categoria.icona} /> {categoria.etichetta}
          </strong>
        )}
        {dove && (
          <span>
            <Icona n="location_on" /> {dove}
          </span>
        )}
        {dati.created_at && (
          <span>
            <Icona n="send" /> Inviata il {formatoData(dati.created_at)}
          </span>
        )}
      </div>
    </div>
  )
}
