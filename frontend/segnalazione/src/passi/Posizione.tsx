import { useState } from 'react'
import { api } from 'shared/api'
import { useBozza, type Posizione as PosizioneBozza } from '../bozza'
import { Icona, Spinner } from '../comuni'
import { CENTRO_COMPRENSORIO, Mappa } from '../Mappa'
import { Schermata, useProcedura } from '../procedura'

// Oltre questa precisione chiediamo di controllare bene il punto.
const PRECISIONE_SCARSA_M = 100

function leggiGps(): Promise<PosizioneBozza> {
  return new Promise((ok, ko) => {
    if (!navigator.geolocation) return ko(new Error('Geolocalizzazione non disponibile'))
    navigator.geolocation.getCurrentPosition(
      (p) =>
        ok({
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          fonte: 'gps',
          precisione_m: Math.round(p.coords.accuracy),
        }),
      ko,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  })
}

type Avviso = 'senza_gps' | 'manuale' | 'controllo_fallito' | null

export function Posizione() {
  const { bozza, aggiorna } = useBozza()
  const { vai } = useProcedura()
  const [cercando, setCercando] = useState(false)
  const [avviso, setAvviso] = useState<Avviso>(null)
  const [controllo, setControllo] = useState(false)
  // Chi torna qui dal Fuori perimetro o dal riepilogo ritrova il suo punto sulla mappa.
  const posizione = bozza.posizione

  async function cercaPosizione() {
    setCercando(true)
    try {
      aggiorna({ posizione: await leggiGps() })
      setAvviso(null)
    } catch {
      if (!posizione) aggiorna({ posizione: { ...CENTRO_COMPRENSORIO, fonte: 'mappa' } })
      setAvviso('senza_gps')
    } finally {
      setCercando(false)
    }
  }

  function sceglieSullaMappa() {
    aggiorna({ posizione: { ...CENTRO_COMPRENSORIO, fonte: 'mappa' } })
    setAvviso('manuale')
  }

  async function confermaPosizione() {
    if (!posizione) return
    setControllo(true)
    setAvviso(null)
    try {
      const { data } = await api.POST('/perimetro/check', { body: { lat: posizione.lat, lng: posizione.lng } })
      if (!data) throw new Error('Controllo del perimetro non riuscito')
      aggiorna({ perimetro: data })
      vai(data.accettato ? 'foto' : 'fuori_perimetro')
    } catch {
      setAvviso('controllo_fallito')
    } finally {
      setControllo(false)
    }
  }

  if (!posizione && cercando) {
    return (
      <Schermata titolo="Dove si trova?">
        <div className="centro">
          <Spinner />
          <p>Stiamo cercando la tua posizione…</p>
        </div>
      </Schermata>
    )
  }

  if (!posizione) {
    return (
      <Schermata
        titolo="Dove si trova?"
        azione={
          <>
            <button className="btn" onClick={cercaPosizione}>
              <Icona n="my_location" /> Usa la mia posizione
            </button>
            <button className="btn testo" onClick={sceglieSullaMappa}>
              Scelgo sulla mappa
            </button>
          </>
        }
      >
        <div className="centro">
          <span className="tondo grande"><Icona n="my_location" /></span>
          <p className="nota centrata">
            <span>
              Poi tocca <strong>Consenti</strong>.
            </span>
          </p>
        </div>
      </Schermata>
    )
  }

  const precisione = posizione.fonte === 'gps' ? posizione.precisione_m : undefined
  return (
    <Schermata
      titolo="Il punto è giusto?"
      azione={
        <button className="btn" onClick={confermaPosizione} disabled={controllo || cercando}>
          {controllo ? <><Spinner chiaro piccolo /> Controllo la zona…</> : 'Sì, è qui'}
        </button>
      }
    >
      {avviso === 'senza_gps' && (
        <div className="banner giallo">
          <Icona n="location_off" />
          <span>Posizione non trovata. Tocca il punto sulla mappa.</span>
        </div>
      )}
      {avviso === 'controllo_fallito' && (
        <div className="banner giallo" role="alert">
          <Icona n="wifi_off" />
          <span>Controllo non riuscito. Verifica la connessione e riprova.</span>
        </div>
      )}
      <div className="mappa-box">
        <Mappa posizione={posizione} onSposta={(lat, lng) => aggiorna({ posizione: { lat, lng, fonte: 'mappa' } })} />
        <span className="suggerimento">
          <Icona n="touch_app" /> {avviso === 'manuale' ? 'Tocca il punto del problema' : 'Trascina il segnaposto'}
        </span>
        <button className="fab" onClick={cercaPosizione} disabled={cercando} aria-label="Torna alla mia posizione">
          {cercando ? <Spinner piccolo /> : <Icona n="my_location" />}
        </button>
      </div>
      <p className="nota">
        <Icona n="location_on" piena className="rosso" />
        <span>
          {posizione.lat.toFixed(5)}, {posizione.lng.toFixed(5)}
          {precisione != null && ` · ±${precisione} m`}
        </span>
      </p>
      {precisione != null && precisione > PRECISIONE_SCARSA_M && (
        <p className="nota">
          <Icona n="info" />
          <span>Posizione approssimativa: controlla bene il punto.</span>
        </p>
      )}
    </Schermata>
  )
}
