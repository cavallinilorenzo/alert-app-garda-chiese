import { useEffect, useState, type ReactNode } from 'react'
import { useBozza } from '../bozza'
import { Icona, Spinner } from '../comuni'
import { cifreCellulare, invia, type ErroreInvio } from '../invio'
import { Schermata, useProcedura, type Passo } from '../procedura'
import { CATEGORIE, DOMANDE, etichettaValore } from '../tassonomia'

const MESSAGGI: Record<Exclude<ErroreInvio, 'fuori_perimetro'>, string> = {
  dati_non_validi: 'Alcuni dati non vanno bene. Controllali e riprova.',
  foto_troppo_grande: 'La foto è troppo pesante. Scattane un’altra e riprova.',
  rete: 'Non riusciamo a inviare la segnalazione. Verifica la connessione e riprova.',
}

function Sezione({ titolo, passo, children }: { titolo: string; passo: Passo; children: ReactNode }) {
  const { modifica } = useProcedura()
  return (
    <section className="sezione">
      <header>
        <h2>{titolo}</h2>
        <button className="modifica" onClick={() => modifica(passo)}>
          <Icona n="edit" /> Modifica
        </button>
      </header>
      {children}
    </section>
  )
}

export function Riepilogo() {
  const { bozza, aggiorna } = useBozza()
  const { vai, modifica } = useProcedura()
  const [invio, setInvio] = useState(false)
  const [errore, setErrore] = useState<keyof typeof MESSAGGI | null>(null)
  const [anteprima, setAnteprima] = useState<string | null>(null)

  useEffect(() => {
    if (!bozza.foto) return
    const url = URL.createObjectURL(bozza.foto)
    setAnteprima(url)
    return () => URL.revokeObjectURL(url)
  }, [bozza.foto])

  async function inviaSegnalazione() {
    setInvio(true)
    setErrore(null)
    const esito = await invia(bozza)
    setInvio(false)
    if ('ricevuta' in esito) {
      aggiorna({ ricevuta: esito.ricevuta })
      return vai('conferma')
    }
    // Il backend ricontrolla il punto: se nel frattempo è fuori, si corregge da lì.
    if (esito.errore === 'fuori_perimetro') return modifica('fuori_perimetro')
    setErrore(esito.errore)
  }

  const { campi, posizione } = bozza
  const categoria = CATEGORIE.find((c) => c.valore === campi.categoria)
  const dettagli = DOMANDE.filter((d) => !d.obbligatorio && campi[d.campo] != null)

  return (
    <Schermata
      titolo="Controlla e invia"
      sotto="Verifica i dati prima di inviare la segnalazione."
      azione={
        <button className="btn verde" onClick={inviaSegnalazione} disabled={invio}>
          {invio ? <><Spinner chiaro piccolo /> Invio in corso…</> : <><Icona n="send" /> Invia la segnalazione</>}
        </button>
      }
    >
      {errore && (
        <div className="banner giallo" role="alert">
          <Icona n={errore === 'rete' ? 'wifi_off' : 'error'} />
          <span>{MESSAGGI[errore]}</span>
        </div>
      )}
      <Sezione titolo="Posizione" passo="posizione">
        <div className="punto piatto">
          <Icona n="location_on" piena />
          <div>
            <strong>{bozza.perimetro?.messaggio ?? 'Punto sulla mappa'}</strong>
            {posizione && (
              <span>
                {posizione.lat.toFixed(5)}, {posizione.lng.toFixed(5)}
              </span>
            )}
          </div>
        </div>
      </Sezione>
      <Sezione titolo="Foto" passo="foto">
        {anteprima && <img className="foto-mini" src={anteprima} alt="Foto del problema" />}
      </Sezione>
      <Sezione titolo="Il problema" passo="descrizione">
        {categoria && (
          <p className="categoria">
            <span className="riga-icona"><Icona n={categoria.icona} /></span> {categoria.etichetta}
          </p>
        )}
        <p className="descrizione">{campi.descrizione}</p>
        {dettagli.length > 0 && (
          <dl className="dettagli">
            {dettagli.map((d) => (
              <div key={d.campo}>
                <dt>{d.etichetta}</dt>
                <dd>{etichettaValore(d, campi[d.campo]!)}</dd>
              </div>
            ))}
          </dl>
        )}
      </Sezione>
      <Sezione titolo="Contatto" passo="contatto">
        <p>+39 {cifreCellulare(bozza.cellulare)}</p>
      </Sezione>
      <p className="nota">
        Inviando accetti che il Consorzio tratti posizione, foto, messaggio e numero solo per gestire questa
        segnalazione.
      </p>
    </Schermata>
  )
}
