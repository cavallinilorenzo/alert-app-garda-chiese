// PROTOTIPO. Variante A: procedura guidata, una cosa per schermata, POSIZIONE PER PRIMA.
// Ordine: scelta Parla/Scrivi → posizione (+ controllo perimetro) → foto → cosa è successo → cellulare → riepilogo → conferma.
// Col form: una domanda per schermata.
import { useState } from 'react'
import { useBozza } from './bozza.js'
import { DOMANDE, chiediGpsFinto, controllaPerimetroFinto, estraiFinta, isEmergenza, mancanti, obbligatoriMancanti, descrizioneValida, CENTRO_COMPRENSORIO } from './dati.js'
import { Caricamento, Campo, CampoCellulare, Checklist, Conferma, Emergenza, FuoriPerimetro, Mappa, Registratore, Riepilogo, ScattaFoto, cellulareValido } from './comuni.jsx'

export const nome = 'Procedura guidata, posizione prima'

const PASSI = ['posizione', 'foto', 'cosa', 'cellulare', 'riepilogo']

export default function VarianteA({ scenario, onStato }) {
  const [bozza, aggiorna, aggiornaCampi] = useBozza(onStato)
  const [passo, setPasso] = useState('inizio')
  const [attesa, setAttesa] = useState(null)
  const [gpsNegato, setGpsNegato] = useState(false)
  const [emergenza, setEmergenza] = useState(false)
  const [emergenzaVista, setEmergenzaVista] = useState(false)
  const [domandaForm, setDomandaForm] = useState(0)
  const [giro, setGiro] = useState(0)
  const [daCompletare, setDaCompletare] = useState([])

  const vai = (p) => {
    setPasso(p)
    window.scrollTo(0, 0)
  }

  const controllaEmergenza = (campi) => {
    if (isEmergenza(campi) && !emergenzaVista) {
      setEmergenza(true)
      setEmergenzaVista(true)
    }
  }

  async function inizia(modalita) {
    aggiorna({ modalita })
    vai('posizione')
    setAttesa('Sto cercando dove sei…')
    try {
      const pos = await chiediGpsFinto(scenario)
      aggiorna({ posizione: pos })
    } catch {
      setGpsNegato(true)
      aggiorna({ posizione: { ...CENTRO_COMPRENSORIO, fonte: 'pin' } })
    }
    setAttesa(null)
  }

  async function confermaPosizione() {
    setAttesa('Controllo se è una zona del Consorzio…')
    const perimetro = await controllaPerimetroFinto(scenario)
    aggiorna({ perimetro })
    setAttesa(null)
    vai(perimetro.dentro ? 'foto' : 'fuori')
  }

  async function parlato() {
    setAttesa('Sto capendo cosa hai detto…')
    const r = await estraiFinta(scenario, bozza.campi, giro + 1)
    setGiro(giro + 1)
    aggiorna({ transcript: (bozza.transcript ? bozza.transcript + ' ' : '') + r.transcript, campi: r.campi })
    setDaCompletare(mancanti(r.campi))
    setAttesa(null)
    controllaEmergenza(r.campi)
  }

  const indice = PASSI.indexOf(passo)

  let contenuto
  if (attesa) contenuto = <Caricamento testo={attesa} />
  else if (passo === 'inizio')
    contenuto = (
      <>
        <h1>Segnala un problema su canali e fossi</h1>
        <p className="lead">Acqua che esce dal terreno, un canale che straripa, un argine rotto… Ci vogliono 2 minuti.</p>
        <button className="btn btn-grande" onClick={() => inizia('voce')}>
          🎤 Voglio parlare
        </button>
        <button className="btn btn-grande btn-secondario" onClick={() => inizia('form')}>
          ✍️ Preferisco scrivere
        </button>
        <p className="aiuto">Ti chiederemo dove sei, una foto e il tuo cellulare.</p>
      </>
    )
  else if (passo === 'posizione')
    contenuto = (
      <>
        <h1>Dove sei?</h1>
        {gpsNegato ? (
          <p className="avviso">Non riusciamo a sapere dove sei. Tocca la mappa nel punto del problema.</p>
        ) : (
          <p className="lead">Il punto rosso è dove ti troviamo. È qui il problema?</p>
        )}
        <Mappa pos={bozza.posizione} onMove={(p) => aggiorna({ posizione: p })} altezza={300} />
        <button className="btn btn-grande" onClick={confermaPosizione}>
          Sì, è qui
        </button>
      </>
    )
  else if (passo === 'fuori') contenuto = <FuoriPerimetro onSposta={() => vai('posizione')} />
  else if (passo === 'foto')
    contenuto = (
      <>
        <h1>Fai una foto</h1>
        <p className="lead">Inquadra il problema. Serve a capire cosa mandare.</p>
        <ScattaFoto grande foto={bozza.foto} onFoto={(foto) => aggiorna({ foto })} />
        <button className="btn btn-grande" disabled={!bozza.foto} onClick={() => vai('cosa')}>
          Avanti
        </button>
      </>
    )
  else if (passo === 'cosa' && bozza.modalita === 'voce')
    contenuto =
      giro === 0 ? (
        <>
          <h1>Raccontaci cosa vedi</h1>
          <p className="lead">Premi il microfono e rispondi a queste domande, come ti viene:</p>
          <Checklist campi={bozza.campi} />
          <Registratore onFine={parlato} etichetta="Premi e parla" />
          <button className="btn-link" onClick={() => aggiorna({ modalita: 'form' })}>
            Preferisco scrivere
          </button>
        </>
      ) : (
        <>
          <h1>{daCompletare.length ? 'Ci manca qualcosa' : 'Ho capito tutto'}</h1>
          <blockquote className="transcript">“{bozza.transcript}”</blockquote>
          <Checklist campi={bozza.campi} />
          {daCompletare.length > 0 && (
            <>
              <Registratore onFine={parlato} etichetta="Premi e dimmi il resto" piccolo />
              <p className="aiuto">…oppure rispondi qui sotto:</p>
              {daCompletare.map((d) => (
                <div key={d.campo} className="domanda">
                  <h3>
                    {d.testo} {!d.obbligatorio && <em className="facolt">(se lo sai)</em>}
                  </h3>
                  <Campo domanda={d} valore={bozza.campi[d.campo]} onChange={(v) => { aggiornaCampi({ [d.campo]: v }); controllaEmergenza({ ...bozza.campi, [d.campo]: v }) }} />
                </div>
              ))}
            </>
          )}
          <button
            className="btn btn-grande"
            disabled={obbligatoriMancanti(bozza.campi).length > 0 || !descrizioneValida(bozza.campi.descrizione)}
            onClick={() => vai('cellulare')}
          >
            Avanti
          </button>
        </>
      )
  else if (passo === 'cosa') {
    const d = DOMANDE[domandaForm]
    const valore = bozza.campi[d.campo]
    const ok = d.campo === 'descrizione' ? descrizioneValida(valore) : valore != null
    contenuto = (
      <>
        <p className="aiuto">
          Domanda {domandaForm + 1} di {DOMANDE.length}
        </p>
        <h1>{d.testo}</h1>
        <Campo domanda={d} valore={valore} onChange={(v) => { aggiornaCampi({ [d.campo]: v }); controllaEmergenza({ ...bozza.campi, [d.campo]: v }) }} />
        <button
          className="btn btn-grande"
          disabled={d.obbligatorio && !ok}
          onClick={() => (domandaForm < DOMANDE.length - 1 ? setDomandaForm(domandaForm + 1) : vai('cellulare'))}
        >
          {ok || d.obbligatorio ? 'Avanti' : 'Non lo so, avanti'}
        </button>
        {domandaForm > 0 && (
          <button className="btn-link" onClick={() => setDomandaForm(domandaForm - 1)}>
            ← Domanda precedente
          </button>
        )}
      </>
    )
  } else if (passo === 'cellulare')
    contenuto = (
      <>
        <h1>Il tuo cellulare</h1>
        <p className="lead">Ultima cosa. Ci serve se dobbiamo chiederti dov’è esattamente.</p>
        <CampoCellulare valore={bozza.cellulare} onChange={(cellulare) => aggiorna({ cellulare })} />
        <button className="btn btn-grande" disabled={!cellulareValido(bozza.cellulare)} onClick={() => vai('riepilogo')}>
          Avanti
        </button>
      </>
    )
  else if (passo === 'riepilogo')
    contenuto = (
      <>
        <h1>Controlla e invia</h1>
        <Riepilogo
          bozza={bozza}
          onModifica={(k) => vai(k === 'foto' ? 'foto' : k === 'posizione' ? 'posizione' : k === 'cellulare' ? 'cellulare' : 'cosa')}
        />
        <button className="btn btn-grande btn-verde" onClick={() => { aggiorna({ inviata: true }); vai('fine') }}>
          Invia la segnalazione
        </button>
      </>
    )
  else if (passo === 'fine') contenuto = <Conferma />

  return (
    <div className="var-a">
      <header className="testata">
        {indice > 0 && passo !== 'fine' && (
          <button className="btn-indietro" onClick={() => vai(PASSI[indice - 1])} aria-label="Indietro">
            ←
          </button>
        )}
        <span>Consorzio Garda Chiese</span>
      </header>
      {indice >= 0 && (
        <div className="progresso">
          <div className="barra" style={{ width: `${((indice + 1) / PASSI.length) * 100}%` }} />
          <span>
            Passo {indice + 1} di {PASSI.length}
          </span>
        </div>
      )}
      <main className="schermata">{contenuto}</main>
      {emergenza && <Emergenza onContinua={() => setEmergenza(false)} />}
    </div>
  )
}
