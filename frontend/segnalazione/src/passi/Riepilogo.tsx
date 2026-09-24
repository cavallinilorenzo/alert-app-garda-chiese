import { useEffect, useState, type ReactNode } from 'react'
import { useBozza } from '../bozza'
import { Icona, Spinner } from '../comuni'
import { cifreCellulare, invia, type ErroreInvio } from '../invio'
import { Schermata, useProcedura, type Passo } from '../procedura'
import { CATEGORIE, domandeDa, etichettaValore, isPericolo, riassuntoPericoli } from '../tassonomia'

const MESSAGGI: Record<Exclude<ErroreInvio, 'fuori_perimetro'>, string> = {
  dati_non_validi: 'Alcuni dati non vanno bene. Controllali e riprova.',
  foto_troppo_grande: 'La foto è troppo pesante. Scattane un’altra.',
  rete: 'Invio non riuscito. Verifica la connessione e riprova.',
}

type PropsRiga = { passo: Passo; icona: ReactNode; titolo: string; sotto?: string }

/** Una riga del riepilogo: toccandola si corregge il suo passo e si torna qui. */
function Riga({ passo, icona, titolo, sotto }: PropsRiga) {
  const { modifica } = useProcedura()
  return (
    <button className="riga-info" onClick={() => modifica(passo)}>
      {icona}
      <span>
        <strong>{titolo}</strong>
        {sotto && <small>{sotto}</small>}
      </span>
      <Icona n="chevron_right" />
    </button>
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
  // Durata e quantità d'acqua, poi i pericoli: la prima è il titolo della riga, le altre sotto.
  const dettagli = [
    ...domandeDa(campi)
      .filter((d) => !d.obbligatorio && !isPericolo(d.campo) && campi[d.campo] != null)
      .map((d) => etichettaValore(d, campi[d.campo]!)),
    riassuntoPericoli(campi),
  ].filter((d) => d != null)

  return (
    <Schermata
      titolo="Tutto giusto?"
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
      <div className="gruppo">
        <Riga
          passo="foto"
          icona={anteprima ? <img className="miniatura" src={anteprima} alt="" /> : <Icona n="photo_camera" />}
          titolo="Foto"
          sotto="Tocca per cambiarla"
        />
        <Riga
          passo="posizione"
          icona={<Icona n="location_on" />}
          titolo={bozza.perimetro?.messaggio ?? 'Punto sulla mappa'}
          sotto={posizione ? `${posizione.lat.toFixed(5)}, ${posizione.lng.toFixed(5)}` : undefined}
        />
        <Riga
          passo="descrizione"
          icona={<Icona n={categoria?.icona ?? 'water_drop'} />}
          titolo={categoria?.etichetta ?? 'Il problema'}
          sotto={campi.descrizione}
        />
        {dettagli.length > 0 && (
          <Riga
            passo="descrizione"
            icona={<Icona n="schedule" />}
            titolo={dettagli[0]}
            sotto={dettagli.slice(1).join(' · ') || undefined}
          />
        )}
        <Riga
          passo="contatto"
          icona={<Icona n="call" />}
          titolo={`+39 ${cifreCellulare(bozza.cellulare)}`}
          sotto="Ti chiamiamo solo se serve"
        />
      </div>
      <p className="legale">Inviando accetti che il Consorzio usi questi dati solo per questa segnalazione.</p>
    </Schermata>
  )
}
