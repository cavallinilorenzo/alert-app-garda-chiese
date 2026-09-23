// PROTOTIPO. Variante C: pagina unica che si riempie, FOTO PER PRIMA.
// Ordine: foto → posizione (parte da sola dopo la foto, perimetro ricontrollato a ogni spostamento) → cosa è successo (schede Parla/Scrivi) → cellulare.
// Barra fissa in basso "Controlla e invia" che dice cosa manca; riepilogo in un foglio dal basso.
import { useEffect, useState } from 'react'
import { useBozza } from './bozza.js'
import { DOMANDE, chiediGpsFinto, controllaPerimetroFinto, estraiFinta, isEmergenza, mancanti, obbligatoriMancanti, descrizioneValida, CENTRO_COMPRENSORIO } from './dati.js'
import { Campo, CampoCellulare, Caricamento, Checklist, Conferma, Emergenza, FuoriPerimetro, Mappa, Registratore, Riepilogo, ScattaFoto, cellulareValido } from './comuni.jsx'

export const nome = 'Pagina unica, foto prima'

export default function VarianteC({ scenario, onStato }) {
  const [bozza, aggiorna, aggiornaCampi] = useBozza(onStato)
  const [gps, setGps] = useState('fermo') // fermo | cerca | ok | negato
  const [controllo, setControllo] = useState(false)
  const [scheda, setScheda] = useState('voce')
  const [capendo, setCapendo] = useState(false)
  const [giro, setGiro] = useState(0)
  const [daCompletare, setDaCompletare] = useState(null)
  const [foglio, setFoglio] = useState(false)
  const [fine, setFine] = useState(false)
  const [emergenza, setEmergenza] = useState(false)
  const [emergenzaVista, setEmergenzaVista] = useState(false)

  const controllaEmergenza = (campi) => {
    if (isEmergenza(campi) && !emergenzaVista) {
      setEmergenza(true)
      setEmergenzaVista(true)
    }
  }

  // Dopo la foto parte subito la posizione.
  useEffect(() => {
    if (!bozza.foto || gps !== 'fermo') return
    setGps('cerca')
    chiediGpsFinto(scenario)
      .then((pos) => {
        aggiorna({ posizione: pos })
        setGps('ok')
      })
      .catch(() => {
        aggiorna({ posizione: { ...CENTRO_COMPRENSORIO, fonte: 'pin' } })
        setGps('negato')
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bozza.foto])

  // Ricontrolla il perimetro a ogni spostamento del punto.
  useEffect(() => {
    if (!bozza.posizione) return
    setControllo(true)
    controllaPerimetroFinto(scenario).then((perimetro) => {
      aggiorna({ perimetro })
      setControllo(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bozza.posizione?.lat, bozza.posizione?.lng, scenario.perimetro])

  async function parlato() {
    setCapendo(true)
    const r = await estraiFinta(scenario, bozza.campi, giro + 1)
    setGiro(giro + 1)
    aggiorna({ modalita: 'voce', transcript: r.transcript, campi: r.campi })
    setDaCompletare(mancanti(r.campi))
    setCapendo(false)
    controllaEmergenza(r.campi)
  }

  const cambia = (campo, v) => {
    aggiornaCampi({ [campo]: v })
    controllaEmergenza({ ...bozza.campi, [campo]: v })
  }

  if (fine)
    return (
      <div className="var-c">
        <main className="schermata">
          <Conferma />
        </main>
      </div>
    )

  const fuori = bozza.perimetro && !bozza.perimetro.dentro
  const cosaMancano = [
    !bozza.foto && 'la foto',
    !bozza.perimetro?.dentro && 'il punto',
    obbligatoriMancanti(bozza.campi).some((d) => d.campo === 'categoria') && 'cosa hai visto',
    !descrizioneValida(bozza.campi.descrizione) && 'una frase di descrizione',
    !cellulareValido(bozza.cellulare) && 'il cellulare',
  ].filter(Boolean)

  return (
    <div className="var-c">
      <header className="testata">
        <span>Consorzio Garda Chiese · Segnala un problema</span>
      </header>
      <main className="pagina">
        <section className="sezione">
          <h2>
            <span className="num">1</span> Fotografa il problema
          </h2>
          <ScattaFoto grande foto={bozza.foto} onFoto={(foto) => aggiorna({ foto })} />
        </section>

        <section className={bozza.foto ? 'sezione' : 'sezione spenta'}>
          <h2>
            <span className="num">2</span> Dov’è
          </h2>
          {gps === 'fermo' && <p className="aiuto">Dopo la foto cerchiamo dove sei.</p>}
          {gps === 'cerca' && <Caricamento testo="Sto cercando dove sei…" />}
          {gps === 'negato' && <p className="avviso">Non riusciamo a sapere dove sei. Tocca la mappa nel punto del problema.</p>}
          {bozza.posizione && (
            <>
              <Mappa pos={bozza.posizione} onMove={(p) => aggiorna({ posizione: p })} />
              {controllo ? (
                <p className="badge">Controllo la zona…</p>
              ) : bozza.perimetro?.dentro ? (
                <p className="badge ok">✅ Vicino a {bozza.perimetro.tracciato}</p>
              ) : null}
            </>
          )}
        </section>

        {fuori && !controllo ? (
          <FuoriPerimetro onSposta={() => window.scrollTo({ top: 300, behavior: 'smooth' })} />
        ) : (
          <>
            <section className="sezione">
              <h2>
                <span className="num">3</span> Cosa succede
              </h2>
              <div className="schede">
                <button className={scheda === 'voce' ? 'scheda attiva' : 'scheda'} onClick={() => setScheda('voce')}>
                  🎤 Parla
                </button>
                <button className={scheda === 'form' ? 'scheda attiva' : 'scheda'} onClick={() => { setScheda('form'); aggiorna({ modalita: 'form' }) }}>
                  ✍️ Scrivi
                </button>
              </div>
              {scheda === 'voce' ? (
                <>
                  <Checklist campi={bozza.campi} compatta />
                  {capendo ? (
                    <Caricamento testo="Sto capendo cosa hai detto…" />
                  ) : (
                    <Registratore onFine={parlato} etichetta={giro ? 'Premi e aggiungi' : 'Premi e racconta'} piccolo={giro > 0} />
                  )}
                  {bozza.transcript && <blockquote className="transcript">“{bozza.transcript}”</blockquote>}
                  {daCompletare?.map((d) => (
                    <div key={d.campo} className="domanda">
                      <h3>
                        {d.testo} {!d.obbligatorio && <em className="facolt">(se lo sai)</em>}
                      </h3>
                      <Campo domanda={d} valore={bozza.campi[d.campo]} onChange={(v) => cambia(d.campo, v)} />
                    </div>
                  ))}
                </>
              ) : (
                DOMANDE.map((d) => (
                  <div key={d.campo} className="domanda">
                    <h3>
                      {d.testo} {!d.obbligatorio && <em className="facolt">(se lo sai)</em>}
                    </h3>
                    <Campo domanda={d} valore={bozza.campi[d.campo]} onChange={(v) => cambia(d.campo, v)} />
                  </div>
                ))
              )}
            </section>

            <section className="sezione">
              <h2>
                <span className="num">4</span> Il tuo cellulare
              </h2>
              <CampoCellulare valore={bozza.cellulare} onChange={(cellulare) => aggiorna({ cellulare })} />
            </section>
          </>
        )}
      </main>

      <footer className="barra-invio">
        {cosaMancano.length > 0 && !fuori && <p className="aiuto">Manca: {cosaMancano.join(', ')}</p>}
        <button className="btn btn-grande btn-verde" disabled={cosaMancano.length > 0} onClick={() => setFoglio(true)}>
          Controlla e invia
        </button>
      </footer>

      {foglio && (
        <div className="overlay" onClick={() => setFoglio(false)}>
          <div className="foglio" onClick={(e) => e.stopPropagation()}>
            <h2>Controlla e invia</h2>
            <Riepilogo bozza={bozza} />
            <button className="btn btn-grande btn-verde" onClick={() => { aggiorna({ inviata: true }); setFine(true) }}>
              Invia la segnalazione
            </button>
            <button className="btn-link" onClick={() => setFoglio(false)}>
              Torna a modificare
            </button>
          </div>
        </div>
      )}
      {emergenza && <Emergenza onContinua={() => setEmergenza(false)} />}
    </div>
  )
}
