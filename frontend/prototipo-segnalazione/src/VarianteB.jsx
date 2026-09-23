// PROTOTIPO. Variante B: conversazione, VOCE PER PRIMA.
// Ordine: racconto (voce o scritto) → domande sui mancanti una alla volta → posizione (+ perimetro) → foto → cellulare → riepilogo → conferma.
// Col form la chat fa tutte le domande della checklist, una per messaggio.
import { useEffect, useRef, useState } from 'react'
import { useBozza } from './bozza.js'
import { DOMANDE, CATEGORIE, categoria, chiediGpsFinto, controllaPerimetroFinto, estraiFinta, isEmergenza, mancanti, descrizioneValida, CENTRO_COMPRENSORIO } from './dati.js'
import { CampoCellulare, Checklist, Conferma, Emergenza, FuoriPerimetro, Mappa, Opzioni, Registratore, Riepilogo, ScattaFoto, cellulareValido } from './comuni.jsx'

export const nome = 'Conversazione, voce prima'

export default function VarianteB({ scenario, onStato }) {
  const [bozza, aggiorna, aggiornaCampi] = useBozza(onStato)
  const [fase, setFase] = useState('racconto')
  const [log, setLog] = useState([{ da: 'app', testo: 'Ciao! Cosa hai visto? Premi il microfono e raccontamelo come faresti al telefono.' }, { da: 'app', tipo: 'checklist' }])
  const [coda, setCoda] = useState([])
  const [scrivendo, setScrivendo] = useState(false)
  const [testo, setTesto] = useState('')
  const [emergenza, setEmergenza] = useState(false)
  const [emergenzaVista, setEmergenzaVista] = useState(false)
  const [giro, setGiro] = useState(0)
  const fondo = useRef(null)

  useEffect(() => {
    fondo.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log, fase, scrivendo])

  const dice = (...m) => setLog((l) => [...l, ...m])

  const controllaEmergenza = (campi) => {
    if (isEmergenza(campi) && !emergenzaVista) {
      setEmergenza(true)
      setEmergenzaVista(true)
    }
  }

  function prossimaDomanda(nuovaCoda) {
    setCoda(nuovaCoda)
    if (nuovaCoda.length) {
      dice({ da: 'app', testo: nuovaCoda[0].testo + (nuovaCoda[0].obbligatorio ? '' : ' (se non lo sai, salta)') })
      setFase('domande')
    } else {
      dice({ da: 'app', testo: 'Perfetto. Adesso mi serve sapere dov’è il problema.' })
      setFase('posizione')
    }
  }

  async function parlato() {
    dice({ da: 'io', testo: '🎤 messaggio vocale' })
    setFase('attesa')
    const r = await estraiFinta(scenario, bozza.campi, giro + 1)
    setGiro(giro + 1)
    aggiorna({ modalita: bozza.modalita ?? 'voce', transcript: r.transcript, campi: r.campi })
    const cat = categoria(r.campi.categoria)
    dice(
      { da: 'io', testo: `“${r.transcript}”`, trascritto: true },
      { da: 'app', testo: cat ? `Ho capito: ${cat.icona} ${cat.label}.` : 'Non ho capito bene cosa hai visto.' },
      { da: 'app', tipo: 'checklist', campi: r.campi },
    )
    controllaEmergenza(r.campi)
    prossimaDomanda(mancanti(r.campi))
  }

  function scegliScrivere() {
    aggiorna({ modalita: 'form' })
    dice({ da: 'io', testo: 'Preferisco scrivere' })
    prossimaDomanda(DOMANDE)
  }

  function risponde(valore, etichetta) {
    const d = coda[0]
    dice({ da: 'io', testo: etichetta ?? valore ?? 'Non lo so' })
    const campi = { ...bozza.campi, [d.campo]: valore }
    aggiornaCampi({ [d.campo]: valore })
    controllaEmergenza(campi)
    setTesto('')
    prossimaDomanda(coda.slice(1))
  }

  async function usaPosizione() {
    dice({ da: 'io', testo: '📍 Usa la mia posizione' })
    setFase('attesa')
    let pos
    try {
      pos = await chiediGpsFinto(scenario)
      dice({ da: 'app', testo: 'Ti ho trovato. Il problema è qui? Se no, sposta il punto.' })
    } catch {
      pos = { ...CENTRO_COMPRENSORIO, fonte: 'pin' }
      dice({ da: 'app', testo: 'Non riesco a sapere dove sei. Tocca la mappa nel punto del problema.' })
    }
    aggiorna({ posizione: pos })
    dice({ da: 'app', tipo: 'mappa' })
    setFase('confermaPosizione')
  }

  async function confermaPosizione() {
    dice({ da: 'io', testo: 'Sì, è qui' })
    setFase('attesa')
    const perimetro = await controllaPerimetroFinto(scenario)
    aggiorna({ perimetro })
    if (!perimetro.dentro) {
      dice({ da: 'app', tipo: 'fuori' })
      setFase('fuori')
      return
    }
    dice({ da: 'app', testo: `Ok, è vicino al ${perimetro.tracciato}. Ora fai una foto del problema.` })
    setFase('foto')
  }

  function foto(url) {
    aggiorna({ foto: url })
    dice({ da: 'io', tipo: 'foto', url }, { da: 'app', testo: 'Grazie. Ultima cosa: il tuo cellulare, nel caso dobbiamo chiederti dov’è esattamente.' })
    setFase('cellulare')
  }

  function cellulare() {
    dice({ da: 'io', testo: bozza.cellulare }, { da: 'app', testo: 'Ecco la tua segnalazione. Controlla e invia.' }, { da: 'app', tipo: 'riepilogo' })
    setFase('riepilogo')
  }

  if (fase === 'fine')
    return (
      <div className="var-b">
        <main className="schermata">
          <Conferma />
        </main>
      </div>
    )

  const d = coda[0]
  let dock = null
  if (fase === 'racconto')
    dock = (
      <>
        <Registratore onFine={parlato} etichetta="Premi e racconta" />
        <button className="btn-link" onClick={scegliScrivere}>
          Preferisco scrivere
        </button>
      </>
    )
  else if (fase === 'attesa') dock = <div className="sta-scrivendo">● ● ●</div>
  else if (fase === 'domande' && d)
    dock = (
      <>
        {d.campo === 'categoria' && (
          <div className="chips">
            {CATEGORIE.map((c) => (
              <button key={c.id} className="chip" onClick={() => risponde(c.id, `${c.icona} ${c.label}`)}>
                {c.icona} {c.label}
              </button>
            ))}
          </div>
        )}
        {d.campo === 'descrizione' && (
          <div className="riga-invio">
            <input className="input-grande" value={testo} onChange={(e) => setTesto(e.target.value)} placeholder="Scrivi qui (almeno 10 caratteri)" maxLength={500} />
            <button className="btn" disabled={!descrizioneValida(testo)} onClick={() => risponde(testo)}>
              ➤
            </button>
          </div>
        )}
        {d.opzioni && <Opzioni opzioni={d.opzioni} valore={null} onChange={(v) => risponde(v)} />}
        {!d.obbligatorio && (
          <button className="btn-link" onClick={() => risponde(null, 'Salto')}>
            Salta
          </button>
        )}
        {bozza.modalita === 'voce' && <Registratore onFine={parlato} etichetta="…oppure dimmelo a voce" piccolo />}
      </>
    )
  else if (fase === 'posizione')
    dock = (
      <button className="btn btn-grande" onClick={usaPosizione}>
        📍 Usa la mia posizione
      </button>
    )
  else if (fase === 'confermaPosizione')
    dock = (
      <button className="btn btn-grande" onClick={confermaPosizione}>
        Sì, è qui
      </button>
    )
  else if (fase === 'foto') dock = <ScattaFoto foto={null} onFoto={foto} />
  else if (fase === 'cellulare')
    dock = (
      <>
        <CampoCellulare valore={bozza.cellulare} onChange={(c) => aggiorna({ cellulare: c })} />
        <button className="btn btn-grande" disabled={!cellulareValido(bozza.cellulare)} onClick={cellulare}>
          Avanti
        </button>
      </>
    )
  else if (fase === 'riepilogo')
    dock = (
      <button className="btn btn-grande btn-verde" onClick={() => { aggiorna({ inviata: true }); setFase('fine') }}>
        Invia la segnalazione
      </button>
    )

  return (
    <div className="var-b">
      <header className="testata chat-testata">
        <span className="avatar">💧</span>
        <div>
          <strong>Consorzio Garda Chiese</strong>
          <div className="aiuto">Segnala un problema su canali e fossi</div>
        </div>
      </header>
      <main className="chat">
        {log.map((m, i) => (
          <div key={i} className={`bolla ${m.da} ${m.trascritto ? 'trascritto' : ''}`}>
            {m.tipo === 'checklist' ? (
              <>
                {!m.campi && <p>Puoi dirmi:</p>}
                <Checklist campi={m.campi} compatta />
              </>
            ) : m.tipo === 'mappa' ? (
              <Mappa pos={bozza.posizione} onMove={(p) => aggiorna({ posizione: p })} />
            ) : m.tipo === 'fuori' ? (
              <FuoriPerimetro
                onSposta={() => {
                  dice({ da: 'app', tipo: 'mappa' })
                  setFase('confermaPosizione')
                }}
              />
            ) : m.tipo === 'foto' ? (
              <img className="foto-bolla" src={m.url} alt="" />
            ) : m.tipo === 'riepilogo' ? (
              <Riepilogo bozza={bozza} />
            ) : (
              m.testo
            )}
          </div>
        ))}
        <div ref={fondo} />
      </main>
      {dock && <footer className="dock">{dock}</footer>}
      {emergenza && <Emergenza onContinua={() => setEmergenza(false)} />}
    </div>
  )
}
