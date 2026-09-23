// PROTOTIPO. Variante A: procedura guidata, una cosa per schermata, POSIZIONE PER PRIMA.
// Ordine: scelta Parla/Scrivi → posizione (+ controllo perimetro) → foto → cosa è successo → cellulare → riepilogo → conferma.
// Col form: una domanda per schermata. Scelta nel ticket #9; questa è la versione "professionale" dopo il primo giro.
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'material-symbols/outlined.css'
import './a.css'
import { useBozza } from './bozza.js'
import {
  CATEGORIE, DOMANDE, CENTRO_COMPRENSORIO, categoria,
  chiediGps, controllaPerimetroFinto, estraiDaTesto, estraiFinta, indirizzoDi,
  isEmergenza, obbligatoriMancanti, descrizioneValida,
} from './dati.js'

export const nome = 'Procedura guidata, posizione prima'

const NUMERO_EMERGENZA = '112'
const PASSI = [
  ['posizione', 'Posizione'],
  ['foto', 'Foto'],
  ['cosa', 'Descrizione'],
  ['cellulare', 'Contatto'],
  ['riepilogo', 'Invio'],
]
const ETICHETTE = {
  categoria: 'Cosa hai visto',
  descrizione: 'Descrizione',
  durata: 'Da quanto tempo',
  quantita: 'Quanta acqua',
  pericolo_persone: 'Pericolo per le persone',
  pericolo_strada: 'Pericolo per strade',
  pericolo_edifici: 'Pericolo per case o edifici',
}

const Icona = ({ n, piena, className = '' }) => (
  <span className={`msym ${piena ? 'piena' : ''} ${className}`} aria-hidden="true">
    {n}
  </span>
)

// ---------- mappa ----------

function Mappa({ pos, onMove }) {
  const el = useRef(null)
  const mappa = useRef(null)
  const pin = useRef(null)
  useEffect(() => {
    mappa.current = L.map(el.current, { zoomControl: false, attributionControl: false }).setView([pos.lat, pos.lng], pos.fonte === 'gps' ? 17 : 12)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mappa.current)
    const icona = L.divIcon({
      html: '<span class="msym piena va-pin">location_on</span>',
      className: '',
      iconSize: [48, 48],
      iconAnchor: [24, 46],
    })
    pin.current = L.marker([pos.lat, pos.lng], { draggable: true, icon: icona }).addTo(mappa.current)
    const sposta = (ll) => onMove({ lat: ll.lat, lng: ll.lng, fonte: 'pin' })
    pin.current.on('dragend', () => sposta(pin.current.getLatLng()))
    mappa.current.on('click', (e) => {
      pin.current.setLatLng(e.latlng)
      sposta(e.latlng)
    })
    return () => mappa.current.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => {
    pin.current?.setLatLng([pos.lat, pos.lng])
    if (pos.fonte === 'gps') mappa.current?.setView([pos.lat, pos.lng], 17)
  }, [pos.lat, pos.lng, pos.fonte])
  return <div ref={el} className="va-mappa" />
}

// ---------- voce ----------

const Riconoscimento = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)

// Dettatura vera col riconoscimento vocale del browser. Su iOS si ferma dopo un silenzio: la riavviamo finché l'utente non preme Fine.
function useDettatura() {
  const [testo, setTesto] = useState('')
  const [errore, setErrore] = useState(null)
  const rec = useRef(null)
  const base = useRef('')
  const attivo = useRef(false)
  const fine = useRef(null)

  function avvia() {
    base.current = ''
    setTesto('')
    setErrore(null)
    attivo.current = true
    const r = new Riconoscimento()
    r.lang = 'it-IT'
    r.continuous = true
    r.interimResults = true
    let sessione = ''
    r.onresult = (e) => {
      let definitivo = ''
      let provvisorio = ''
      for (const x of e.results) x.isFinal ? (definitivo += x[0].transcript + ' ') : (provvisorio += x[0].transcript)
      sessione = definitivo
      setTesto((base.current + definitivo + provvisorio).trim())
    }
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        attivo.current = false
        setErrore('Non abbiamo il permesso di usare il microfono.')
      }
    }
    r.onend = () => {
      base.current += sessione
      sessione = ''
      if (attivo.current) {
        try {
          r.start()
          return
        } catch {
          /* già avviato */
        }
      }
      fine.current?.(base.current.trim())
    }
    rec.current = r
    r.start()
  }

  function ferma() {
    attivo.current = false
    return new Promise((ok) => {
      fine.current = ok
      rec.current?.stop()
    })
  }

  return { testo, errore, avvia, ferma }
}

function Registratore({ scenario, onTesto, etichetta }) {
  const vera = scenario.ai === 'reale' && Riconoscimento
  const d = useDettatura()
  const [stato, setStato] = useState('fermo') // fermo | ascolto | elaboro
  const [sec, setSec] = useState(0)
  useEffect(() => {
    if (stato !== 'ascolto') return
    const t = setInterval(() => setSec((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [stato])
  useEffect(() => {
    if (d.errore) setStato('fermo')
  }, [d.errore])

  async function tocca() {
    if (stato === 'fermo') {
      setSec(0)
      setStato('ascolto')
      if (vera) d.avvia()
    } else if (stato === 'ascolto') {
      setStato('elaboro')
      const testo = vera ? await d.ferma() : null
      await onTesto(testo)
      setStato('fermo')
    }
  }

  const mm = `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
  return (
    <div className="va-rec">
      <button className={`va-mic ${stato}`} onClick={tocca} disabled={stato === 'elaboro'} aria-label={stato === 'ascolto' ? 'Ho finito' : etichetta}>
        {stato === 'elaboro' ? <span className="va-spinner chiaro" /> : <Icona n={stato === 'ascolto' ? 'stop' : 'mic'} piena />}
      </button>
      <div className="va-rec-etichetta">
        {stato === 'fermo' && etichetta}
        {stato === 'ascolto' && (
          <>
            <span className="va-live" /> In ascolto · {mm}
            <div className="va-rec-sub">Tocca di nuovo quando hai finito</div>
          </>
        )}
        {stato === 'elaboro' && 'Stiamo analizzando il messaggio…'}
      </div>
      {stato === 'ascolto' && vera && <p className="va-live-testo">{d.testo || 'Parla pure…'}</p>}
      {d.errore && <p className="va-errore"><Icona n="mic_off" /> {d.errore} Puoi rispondere scrivendo.</p>}
      {!vera && scenario.ai === 'reale' && (
        <p className="va-nota">Questo browser non supporta la dettatura: il messaggio è simulato.</p>
      )}
    </div>
  )
}

// ---------- controlli dei campi ----------

function ListaCategorie({ valore, onChange }) {
  return (
    <div className="va-lista" role="radiogroup">
      {CATEGORIE.map((c) => (
        <button key={c.id} role="radio" aria-checked={valore === c.id} className={`va-riga ${valore === c.id ? 'scelta' : ''}`} onClick={() => onChange(c.id)}>
          <span className="va-riga-icona"><Icona n={c.simbolo} /></span>
          <span className="va-riga-testo">{c.label}</span>
          <Icona n={valore === c.id ? 'radio_button_checked' : 'radio_button_unchecked'} className="va-radio" />
        </button>
      ))}
    </div>
  )
}

function ListaOpzioni({ opzioni, valore, onChange, affiancate }) {
  return (
    <div className={affiancate ? 'va-segmenti' : 'va-lista'} role="radiogroup">
      {opzioni.map((o) => (
        <button key={o} role="radio" aria-checked={valore === o} className={`va-riga ${valore === o ? 'scelta' : ''}`} onClick={() => onChange(o)}>
          <span className="va-riga-testo">{o.charAt(0).toUpperCase() + o.slice(1)}</span>
          {!affiancate && <Icona n={valore === o ? 'radio_button_checked' : 'radio_button_unchecked'} className="va-radio" />}
        </button>
      ))}
    </div>
  )
}

function Descrizione({ valore, onChange }) {
  const v = valore ?? ''
  return (
    <label className="va-campo">
      <textarea rows={4} maxLength={500} placeholder="Ad esempio: esce acqua dal terreno vicino alla strada" value={v} onChange={(e) => onChange(e.target.value)} />
      <span className={`va-contatore ${v.length > 0 && v.trim().length < 10 ? 'errore' : ''}`}>
        {v.trim().length < 10 ? 'Almeno 10 caratteri' : `${v.length}/500`}
      </span>
    </label>
  )
}

function Controllo({ domanda, valore, onChange }) {
  if (domanda.campo === 'categoria') return <ListaCategorie valore={valore} onChange={onChange} />
  if (domanda.campo === 'descrizione') return <Descrizione valore={valore} onChange={onChange} />
  return <ListaOpzioni opzioni={domanda.opzioni} valore={valore} onChange={onChange} affiancate={domanda.opzioni.length <= 3} />
}

const mostraValore = (campo, v) => {
  if (v == null) return null
  if (campo === 'categoria') return categoria(v)?.label
  return v.charAt(0).toUpperCase() + v.slice(1)
}

// ---------- finestre ----------

function Emergenza({ onContinua }) {
  return (
    <div className="va-velo">
      <div className="va-dialogo" role="alertdialog" aria-labelledby="em-titolo">
        <span className="va-tondo rosso"><Icona n="warning" piena /></span>
        <h2 id="em-titolo">Qualcuno è in pericolo?</h2>
        <p>Se c’è un pericolo immediato per le persone chiama subito il numero unico di emergenza. Il Consorzio non è un servizio di pronto intervento.</p>
        <a className="va-btn rosso" href={`tel:${NUMERO_EMERGENZA}`}>
          <Icona n="call" piena /> Chiama il {NUMERO_EMERGENZA}
        </a>
        <button className="va-btn secondario" onClick={onContinua}>
          Continua la segnalazione
        </button>
      </div>
    </div>
  )
}

// ---------- variante ----------

export default function VarianteA({ scenario, onStato }) {
  const [bozza, aggiorna, aggiornaCampi] = useBozza(onStato)
  const [passo, setPasso] = useState('inizio')
  const [gps, setGps] = useState('prima') // prima | cerca | ok | errore
  const [indirizzo, setIndirizzo] = useState(null)
  const [controllo, setControllo] = useState(false)
  const [emergenza, setEmergenza] = useState(false)
  const [emergenzaVista, setEmergenzaVista] = useState(false)
  const [domandaForm, setDomandaForm] = useState(0)
  const [ascoltato, setAscoltato] = useState(false)
  const [inModifica, setInModifica] = useState(null)
  const [copiato, setCopiato] = useState(false)
  const fotoInput = useRef(null)

  const vai = (p) => {
    setPasso(p)
    setInModifica(null)
    window.scrollTo(0, 0)
  }

  const controllaEmergenza = (campi) => {
    if (isEmergenza(campi) && !emergenzaVista) {
      setEmergenza(true)
      setEmergenzaVista(true)
    }
  }

  const cambiaCampo = (campo, v) => {
    aggiornaCampi({ [campo]: v })
    controllaEmergenza({ ...bozza.campi, [campo]: v })
  }

  // Indirizzo leggibile del punto, aggiornato quando il punto si sposta.
  useEffect(() => {
    if (!bozza.posizione) return
    setIndirizzo(null)
    const t = setTimeout(() => indirizzoDi(bozza.posizione).then(setIndirizzo), 500)
    return () => clearTimeout(t)
  }, [bozza.posizione?.lat, bozza.posizione?.lng])

  async function cercaPosizione() {
    setGps('cerca')
    try {
      const pos = await chiediGps(scenario)
      aggiorna({ posizione: pos })
      setGps('ok')
    } catch {
      if (!bozza.posizione) aggiorna({ posizione: { ...CENTRO_COMPRENSORIO, fonte: 'pin' } })
      setGps('errore')
    }
  }

  function sceglieSullaMappa() {
    aggiorna({ posizione: { ...CENTRO_COMPRENSORIO, fonte: 'pin' } })
    setGps('manuale')
  }

  async function confermaPosizione() {
    setControllo(true)
    const perimetro = await controllaPerimetroFinto(scenario)
    aggiorna({ perimetro, indirizzo })
    setControllo(false)
    vai(perimetro.dentro ? (bozza.foto ? 'riepilogo' : 'foto') : 'fuori')
  }

  // Testo vero dalla dettatura oppure null (messaggio simulato dallo scenario).
  async function messaggioVocale(testo) {
    let transcript
    let campi
    if (testo != null) {
      transcript = testo
      campi = { ...bozza.campi, ...estraiDaTesto(testo) }
      if (!descrizioneValida(campi.descrizione) && testo.trim().length >= 10) campi.descrizione = testo.trim().slice(0, 500)
    } else {
      const r = await estraiFinta(scenario, bozza.campi, ascoltato ? 2 : 1)
      transcript = r.transcript
      campi = r.campi
    }
    aggiorna({ modalita: 'voce', transcript: [bozza.transcript, transcript].filter(Boolean).join(' '), campi })
    setAscoltato(true)
    controllaEmergenza(campi)
  }

  const indice = PASSI.findIndex(([k]) => k === passo)
  const obbligatoriOk = obbligatoriMancanti(bozza.campi).length === 0 && descrizioneValida(bozza.campi.descrizione)
  const indietro = {
    posizione: 'inizio', foto: 'posizione', cosa: 'foto', cellulare: 'cosa', riepilogo: 'cellulare', fuori: 'posizione',
  }[passo]

  let titolo = null
  let sotto = null
  let corpo = null
  let azione = null

  if (passo === 'inizio') {
    corpo = (
      <div className="va-inizio">
        <span className="va-tondo"><Icona n="water_drop" piena /></span>
        <h1>Segnala un problema su canali e condotte</h1>
        <p className="va-lead">Acqua che esce dal terreno, un canale che tracima, un argine franato: avvisa il Consorzio in pochi minuti.</p>
        <div className="va-card">
          <p className="va-card-titolo">Ti chiederemo</p>
          <ul className="va-cosa-serve">
            <li><Icona n="location_on" /> La posizione del problema</li>
            <li><Icona n="photo_camera" /> Una foto</li>
            <li><Icona n="chat" /> Cosa hai visto</li>
            <li><Icona n="call" /> Il tuo numero di cellulare</li>
          </ul>
        </div>
        <p className="va-card-titolo">Come preferisci raccontarlo?</p>
        <button className="va-scelta" onClick={() => { aggiorna({ modalita: 'voce' }); vai('posizione') }}>
          <span className="va-riga-icona forte"><Icona n="mic" piena /></span>
          <span className="va-scelta-testo">
            <strong>A voce</strong>
            <span>Parli come al telefono, al resto pensiamo noi</span>
          </span>
          <Icona n="chevron_right" />
        </button>
        <button className="va-scelta" onClick={() => { aggiorna({ modalita: 'form' }); vai('posizione') }}>
          <span className="va-riga-icona"><Icona n="edit_note" /></span>
          <span className="va-scelta-testo">
            <strong>Rispondendo alle domande</strong>
            <span>Scegli tra poche risposte già pronte</span>
          </span>
          <Icona n="chevron_right" />
        </button>
        <p className="va-avviso-emergenza">
          <Icona n="emergency" /> Se qualcuno è in pericolo chiama il <a href={`tel:${NUMERO_EMERGENZA}`}>{NUMERO_EMERGENZA}</a>.
        </p>
      </div>
    )
  } else if (passo === 'posizione') {
    titolo = 'Dove si trova il problema?'
    if (gps === 'prima') {
      sotto = 'Usiamo la posizione del telefono per trovare il punto. Potrai correggerlo sulla mappa.'
      corpo = (
        <div className="va-centro">
          <span className="va-tondo grande"><Icona n="my_location" /></span>
          <p className="va-nota">Il telefono ti chiederà il permesso di usare la posizione: tocca <strong>Consenti</strong>.</p>
        </div>
      )
      azione = (
        <>
          <button className="va-btn" onClick={cercaPosizione}><Icona n="my_location" /> Usa la mia posizione</button>
          <button className="va-btn testo" onClick={sceglieSullaMappa}>Scelgo il punto sulla mappa</button>
        </>
      )
    } else if (gps === 'cerca') {
      corpo = (
        <div className="va-centro">
          <span className="va-spinner" />
          <p>Stiamo cercando la tua posizione…</p>
        </div>
      )
    } else {
      sotto = gps === 'ok' ? 'Controlla che il segnaposto sia sul punto giusto. Se non lo è, trascinalo o tocca la mappa.' : null
      corpo = (
        <>
          {gps === 'errore' && (
            <div className="va-banner giallo">
              <Icona n="location_off" />
              <span>Non riusciamo a sapere dove ti trovi. Cerca il punto sulla mappa e toccalo.</span>
            </div>
          )}
          {gps === 'manuale' && (
            <div className="va-banner">
              <Icona n="touch_app" />
              <span>Avvicina la mappa con due dita e tocca il punto del problema.</span>
            </div>
          )}
          <div className="va-mappa-box">
            <Mappa pos={bozza.posizione} onMove={(p) => aggiorna({ posizione: p })} />
            <button className="va-fab" onClick={cercaPosizione} aria-label="Torna alla mia posizione"><Icona n="my_location" /></button>
          </div>
          <div className="va-indirizzo">
            <Icona n="location_on" piena />
            <div>
              <strong>{indirizzo ?? 'Punto selezionato'}</strong>
              <span>
                {bozza.posizione.lat.toFixed(5)}, {bozza.posizione.lng.toFixed(5)}
                {bozza.posizione.precisione_m && bozza.posizione.fonte === 'gps' && ` · precisione ±${bozza.posizione.precisione_m} m`}
              </span>
            </div>
          </div>
          {bozza.posizione.precisione_m > 100 && bozza.posizione.fonte === 'gps' && (
            <p className="va-nota">La posizione è approssimativa: controlla bene il punto.</p>
          )}
        </>
      )
      azione = (
        <button className="va-btn" onClick={confermaPosizione} disabled={controllo}>
          {controllo ? <><span className="va-spinner chiaro piccolo" /> Controllo la zona…</> : 'Conferma la posizione'}
        </button>
      )
    }
  } else if (passo === 'fuori') {
    corpo = (
      <div className="va-fuori">
        <span className="va-tondo rosso"><Icona n="wrong_location" /></span>
        <h1>Questo punto non è di competenza del Consorzio</h1>
        <p className="va-lead">Qui non ci sono canali o condotte del Consorzio di bonifica Garda Chiese, quindi la segnalazione non verrà inviata.</p>
        <div className="va-card">
          <p className="va-card-titolo">A chi puoi rivolgerti</p>
          <ul className="va-cosa-serve">
            <li><Icona n="water_drop" /> <span><strong>Acqua di casa, fogne, tombini</strong><br />Il gestore dell’acquedotto del tuo Comune</span></li>
            <li><Icona n="account_balance" /> <span><strong>Strade, fossi privati, rifiuti</strong><br />L’ufficio tecnico del tuo Comune</span></li>
            <li><Icona n="emergency" /> <span><strong>Persone in pericolo</strong><br />Numero unico di emergenza <a href={`tel:${NUMERO_EMERGENZA}`}>{NUMERO_EMERGENZA}</a></span></li>
          </ul>
        </div>
      </div>
    )
    azione = <button className="va-btn secondario" onClick={() => vai('posizione')}><Icona n="edit_location_alt" /> Il punto è sbagliato, lo correggo</button>
  } else if (passo === 'foto') {
    titolo = 'Scatta una foto del problema'
    sotto = 'Inquadra il punto da vicino: aiuta il Consorzio a capire cosa serve.'
    corpo = (
      <>
        {bozza.foto ? (
          <div className="va-foto">
            <img src={bozza.foto} alt="Foto del problema" />
            <button className="va-btn secondario" onClick={() => fotoInput.current.click()}><Icona n="replay" /> Rifai la foto</button>
          </div>
        ) : (
          <button className="va-scatta" onClick={() => fotoInput.current.click()}>
            <Icona n="photo_camera" />
            <strong>Apri la fotocamera</strong>
          </button>
        )}
        <input ref={fotoInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => e.target.files[0] && aggiorna({ foto: URL.createObjectURL(e.target.files[0]) })} />
      </>
    )
    azione = <button className="va-btn" disabled={!bozza.foto} onClick={() => vai(obbligatoriOk && bozza.cellulare ? 'riepilogo' : 'cosa')}>Continua</button>
  } else if (passo === 'cosa' && bozza.modalita === 'voce') {
    if (!ascoltato) {
      titolo = 'Raccontaci cosa vedi'
      sotto = 'Tocca il microfono e parla con calma. Prova a dire:'
      corpo = (
        <>
          <ol className="va-traccia">
            {DOMANDE.map((d) => <li key={d.campo}>{d.testo}</li>)}
          </ol>
          <Registratore scenario={scenario} onTesto={messaggioVocale} etichetta="Tocca per parlare" />
        </>
      )
      azione = <button className="va-btn testo" onClick={() => aggiorna({ modalita: 'form' })}><Icona n="keyboard" /> Preferisco rispondere alle domande</button>
    } else {
      const mancano = DOMANDE.filter((d) => bozza.campi[d.campo] == null)
      titolo = mancano.length ? 'Ecco cosa abbiamo capito' : 'Abbiamo capito tutto'
      sotto = mancano.length ? 'Controlla e completa quello che manca. Tocca una risposta per cambiarla.' : 'Controlla le risposte. Tocca una risposta per cambiarla.'
      corpo = (
        <>
          <details className="va-trascritto">
            <summary><Icona n="graphic_eq" /> Il tuo messaggio</summary>
            <p>“{bozza.transcript}”</p>
          </details>
          <div className="va-risposte">
            {DOMANDE.map((d) => {
              const v = bozza.campi[d.campo]
              const aperta = v == null || inModifica === d.campo
              return (
                <div key={d.campo} className={`va-risposta ${v == null ? 'manca' : ''}`}>
                  <button className="va-risposta-testa" onClick={() => setInModifica(inModifica === d.campo ? null : d.campo)} disabled={v == null}>
                    <Icona n={v == null ? 'radio_button_unchecked' : 'check_circle'} piena={v != null} className={v == null ? 'grigio' : 'verde'} />
                    <span>
                      <span className="va-risposta-etichetta">{ETICHETTE[d.campo]}{d.obbligatorio ? '' : ' · facoltativo'}</span>
                      <span className="va-risposta-valore">{v == null ? d.testo : mostraValore(d.campo, v)}</span>
                    </span>
                    {v != null && <Icona n={aperta ? 'keyboard_arrow_up' : 'edit'} className="grigio" />}
                  </button>
                  {aperta && (
                    <div className="va-risposta-corpo">
                      <Controllo domanda={d} valore={v} onChange={(x) => cambiaCampo(d.campo, x)} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {mancano.length > 0 && (
            <div className="va-card">
              <p className="va-card-titolo">Puoi anche aggiungere a voce</p>
              <Registratore scenario={scenario} onTesto={messaggioVocale} etichetta="Tocca per aggiungere" />
            </div>
          )}
        </>
      )
      azione = (
        <>
          {!obbligatoriOk && <p className="va-azione-nota">Per continuare servono “Cosa hai visto” e una descrizione.</p>}
          <button className="va-btn" disabled={!obbligatoriOk} onClick={() => vai('cellulare')}>Continua</button>
        </>
      )
    }
  } else if (passo === 'cosa') {
    const d = DOMANDE[domandaForm]
    const v = bozza.campi[d.campo]
    const ok = d.campo === 'descrizione' ? descrizioneValida(v) : v != null
    titolo = d.testo
    sotto = d.obbligatorio ? null : 'Se non lo sai, puoi saltare questa domanda.'
    corpo = (
      <>
        <p className="va-contadomande">Domanda {domandaForm + 1} di {DOMANDE.length}</p>
        <Controllo domanda={d} valore={v} onChange={(x) => cambiaCampo(d.campo, x)} />
      </>
    )
    const avanti = () => (domandaForm < DOMANDE.length - 1 ? setDomandaForm(domandaForm + 1) : vai('cellulare'))
    azione = (
      <>
        <button className="va-btn" disabled={d.obbligatorio && !ok} onClick={avanti}>Continua</button>
        {!d.obbligatorio && !ok && <button className="va-btn testo" onClick={avanti}>Salta</button>}
        {domandaForm > 0 && <button className="va-btn testo" onClick={() => setDomandaForm(domandaForm - 1)}>Domanda precedente</button>}
      </>
    )
  } else if (passo === 'cellulare') {
    titolo = 'Il tuo numero di cellulare'
    sotto = 'Ti chiamiamo solo se ci serve un’informazione per trovare il problema.'
    corpo = (
      <>
        <label className="va-telefono">
          <span className="va-prefisso">+39</span>
          <input type="tel" inputMode="tel" autoComplete="tel-national" placeholder="333 123 4567" value={bozza.cellulare} onChange={(e) => aggiorna({ cellulare: e.target.value })} />
        </label>
        <p className="va-nota"><Icona n="lock" /> Il numero è visibile solo al personale del Consorzio e non viene usato per altro.</p>
      </>
    )
    azione = <button className="va-btn" disabled={bozza.cellulare.replace(/\D/g, '').length < 9} onClick={() => vai('riepilogo')}>Continua</button>
  } else if (passo === 'riepilogo') {
    titolo = 'Controlla e invia'
    sotto = 'Verifica i dati prima di inviare la segnalazione.'
    const c = bozza.campi
    const cat = categoria(c.categoria)
    const Sezione = ({ titolo: t, verso, children }) => (
      <section className="va-sezione">
        <header>
          <h2>{t}</h2>
          <button className="va-modifica" onClick={() => vai(verso)}><Icona n="edit" /> Modifica</button>
        </header>
        {children}
      </section>
    )
    const dettagli = DOMANDE.filter((d) => !d.obbligatorio && c[d.campo] != null)
    corpo = (
      <>
        <Sezione titolo="Posizione" verso="posizione">
          <div className="va-indirizzo piatto">
            <Icona n="location_on" piena />
            <div>
              <strong>{bozza.indirizzo ?? 'Punto sulla mappa'}</strong>
              <span>Vicino a {bozza.perimetro?.tracciato} ({bozza.perimetro?.distanza_m} m)</span>
            </div>
          </div>
        </Sezione>
        <Sezione titolo="Foto" verso="foto">
          <img className="va-foto-mini" src={bozza.foto} alt="Foto del problema" />
        </Sezione>
        <Sezione titolo="Il problema" verso="cosa">
          <p className="va-cat"><span className="va-riga-icona"><Icona n={cat?.simbolo} /></span> {cat?.label}</p>
          <p className="va-desc">{c.descrizione}</p>
          {dettagli.length > 0 && (
            <dl className="va-dettagli">
              {dettagli.map((d) => (
                <div key={d.campo}><dt>{ETICHETTE[d.campo]}</dt><dd>{mostraValore(d.campo, c[d.campo])}</dd></div>
              ))}
            </dl>
          )}
        </Sezione>
        <Sezione titolo="Contatto" verso="cellulare">
          <p>+39 {bozza.cellulare}</p>
        </Sezione>
        <p className="va-nota">Inviando accetti che il Consorzio tratti posizione, foto, messaggio e numero solo per gestire questa segnalazione.</p>
      </>
    )
    azione = <button className="va-btn verde" onClick={() => { aggiorna({ inviata: true }); vai('fine') }}><Icona n="send" /> Invia la segnalazione</button>
  } else if (passo === 'fine') {
    const link = 'https://garda-chiese.simonetrentin.me/s/7kQ2-xa9P'
    corpo = (
      <div className="va-fine">
        <span className="va-tondo verde grande"><Icona n="check" /></span>
        <h1>Segnalazione inviata</h1>
        <p className="va-lead">Grazie. Il Consorzio l’ha ricevuta e la prenderà in carico. Se serve, ti chiameremo al numero che ci hai dato.</p>
        <div className="va-card">
          <p className="va-card-titolo">Numero della segnalazione</p>
          <p className="va-codice">GC-2026-00481</p>
          <p className="va-card-titolo">Segui lo stato della tua segnalazione</p>
          <div className="va-link">
            <span>{link}</span>
            <button onClick={() => { navigator.clipboard?.writeText(link); setCopiato(true) }} aria-label="Copia il link">
              <Icona n={copiato ? 'check' : 'content_copy'} />
            </button>
          </div>
          <p className="va-nota">Salva questo link: è l’unico modo per vedere a che punto è la segnalazione.</p>
        </div>
      </div>
    )
    azione = navigator.share ? (
      <button className="va-btn secondario" onClick={() => navigator.share({ title: 'La mia segnalazione', url: link })}><Icona n="share" /> Salva o condividi il link</button>
    ) : null
  }

  return (
    <div className="va">
      <header className="va-barra">
        {indietro && passo !== 'fine' ? (
          <button className="va-icona-btn" onClick={() => vai(indietro)} aria-label="Indietro"><Icona n="arrow_back" /></button>
        ) : (
          <span className="va-logo"><Icona n="water_drop" piena /></span>
        )}
        <div className="va-barra-testo">
          <strong>{passo === 'inizio' || passo === 'fine' ? 'Consorzio di bonifica Garda Chiese' : 'Nuova segnalazione'}</strong>
          {passo !== 'inizio' && passo !== 'fine' && <span>Consorzio di bonifica Garda Chiese</span>}
        </div>
      </header>
      {indice >= 0 && (
        <div className="va-passi" aria-label={`Passo ${indice + 1} di ${PASSI.length}`}>
          <div className="va-segmenti-passi">
            {PASSI.map(([k], i) => <span key={k} className={i <= indice ? 'fatto' : ''} />)}
          </div>
          <span className="va-passi-testo">Passo {indice + 1} di {PASSI.length} · {PASSI[indice][1]}</span>
        </div>
      )}
      <main className="va-corpo">
        {titolo && <h1>{titolo}</h1>}
        {sotto && <p className="va-lead">{sotto}</p>}
        {corpo}
      </main>
      {azione && <footer className="va-azioni">{azione}</footer>}
      {emergenza && <Emergenza onContinua={() => setEmergenza(false)} />}
    </div>
  )
}

