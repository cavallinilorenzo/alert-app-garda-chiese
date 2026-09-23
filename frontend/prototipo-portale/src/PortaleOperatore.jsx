// PROTOTIPO. Portale operatore: la coda di lavoro (variante B del primo giro su #10), rifinita.
// - filtri in una barra sola, condivisa tra Segnalazioni e Mappa; il canale di ingresso va in "Altri filtri"
// - righe su due livelli (titolo + dettaglio), icone Material Symbols e niente emoji, tempo di ricezione in evidenza
// - scheda in ordine di lettura: titolo grande → pericolo → foto e mappa → avanzamento e azioni →
//   cosa è successo (pericoli prima del transcript) → contatti e infrastruttura → registro
// - clic su un pallino della Mappa: si torna a Segnalazioni con la scheda già aperta
// - transizioni: scheda che entra da destra, lista che si stringe, cambio pagina in dissolvenza, toast
import { useEffect, useRef, useState } from 'react'
import { CATEGORIE, COLORI, FILTRI_INIZIALI, INGRESSI, LIVELLI, STATI, TEMPI, ZONE, dataOra, eta, filtra, ordina, ORA } from './dati.js'
import { AzioniStato, Contatti, Duplicati, Icona, Mappa, Pallino, Portale, PrioritaDettaglio, Registro, Rubrica, usePortale } from './comuni.jsx'

const titolo = (s) => CATEGORIE[s.categoria]
const pericoliSi = (s) => Object.entries(s.pericoli).filter(([, v]) => v === 'sì').map(([k]) => k)

// Oltre i tempi di presa in carico del ticket #8 (qui senza calendario lavorativo).
const LIMITE_MIN = { Critica: 15, Alta: 240, Media: 1440, Bassa: 4320 }
const inRitardo = (s) => s.stato === 'Ricevuta' && (ORA - new Date(s.ricevuta_il)) / 60000 > LIMITE_MIN[s.priorita]

const MESSAGGI = {
  avanza: 'Stato aggiornato',
  indietro: 'Stato riportato indietro',
  chiudi: 'Segnalazione chiusa',
  riapri: 'Segnalazione riaperta',
  nota: 'Nota aggiunta al registro',
  override: 'Priorità corretta',
  rubrica_salva: 'Rubrica aggiornata',
  rubrica_elimina: 'Acquaiolo eliminato',
}

// ---------- barra dei filtri

function Chips({ etichetta, tutti, scelti, onChange, render = (x) => x }) {
  return (
    <div className="b2-chips">
      <span className="b2-etichetta">{etichetta}</span>
      {tutti.map((x) => (
        <button key={x} className={scelti.includes(x) ? 'on' : ''} onClick={() => onChange(scelti.includes(x) ? scelti.filter((y) => y !== x) : [...scelti, x])}>
          {render(x)}
        </button>
      ))}
    </div>
  )
}

function BarraFiltri({ f, set, conteggio }) {
  const [altri, setAltri] = useState(false)
  const nascosti = INGRESSI.length - f.ingressi.length
  return (
    <div className="b2-filtri">
      <div className="b2-filtri-riga">
        <label className="b2-cerca">
          <Icona nome="search" />
          <input placeholder="Cerca per codice, descrizione, canale o acquaiolo" value={f.testo} onChange={(e) => set({ ...f, testo: e.target.value })} />
        </label>
        <select className="b2-select" value={f.zona} onChange={(e) => set({ ...f, zona: e.target.value })}>
          <option value="">Tutte le zone</option>
          {ZONE.map((z) => (
            <option key={z}>{z}</option>
          ))}
        </select>
        <div className="b2-altri">
          <button className={`b2-btn ${altri || nascosti ? 'attivo' : ''}`} onClick={() => setAltri(!altri)}>
            <Icona nome="tune" /> Altri filtri{nascosti ? ` · ${nascosti}` : ''}
          </button>
          {altri && (
            <div className="b2-popover">
              <div className="b2-etichetta">Canale di ingresso</div>
              {INGRESSI.map((i) => (
                <label key={i} className="b2-check">
                  <input
                    type="checkbox"
                    checked={f.ingressi.includes(i)}
                    onChange={() => set({ ...f, ingressi: f.ingressi.includes(i) ? f.ingressi.filter((x) => x !== i) : [...f.ingressi, i] })}
                  />
                  {i}
                </label>
              ))}
            </div>
          )}
        </div>
        <span className="b2-conteggio">
          <strong>{conteggio}</strong> segnalazioni
        </span>
      </div>
      <div className="b2-filtri-riga">
        <Chips etichetta="Priorità" tutti={LIVELLI} scelti={f.livelli} onChange={(livelli) => set({ ...f, livelli })} render={(l) => (<><Pallino livello={l} /> {l}</>)} />
        <Chips etichetta="Stato" tutti={STATI} scelti={f.stati} onChange={(stati) => set({ ...f, stati })} />
      </div>
    </div>
  )
}

// ---------- lista

const StatoPill = ({ s }) => <span className={`b2-stato b2-st-${STATI.indexOf(s.stato)}`}>{s.stato}{s.esito ? ` · ${s.esito}` : ''}</span>

function Lista({ lista, sel, setSel, compatta, lampo }) {
  const box = useRef(null)
  useEffect(() => {
    box.current?.querySelector(`[data-id="${sel}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [sel])
  return (
    <div ref={box} className={compatta ? 'b2-lista compatta' : 'b2-lista'}>
      <div className="b2-riga b2-intestazione">
        <span>Priorità</span>
        <span>Segnalazione</span>
        <span className="extra">Stato</span>
        <span className="extra">Zona e acquaiolo</span>
        <span>Ricevuta</span>
      </div>
      {lista.map((s) => {
        const per = pericoliSi(s)
        return (
          <button key={s.id} data-id={s.id} className={`b2-riga ${s.id === sel ? 'sel' : ''} ${s.id === lampo ? 'lampo' : ''}`} onClick={() => setSel(s.id)}>
            <span className="b2-prio" style={{ '--c': COLORI[s.priorita] }}>
              <Pallino livello={s.priorita} /> <span className="extra-testo">{s.priorita}</span>
            </span>
            <span className="b2-cella">
              <span className="b2-titolo-riga">
                {titolo(s)}
                {per.length > 0 && <span className="b2-tag-pericolo">Pericolo</span>}
              </span>
              <span className="b2-sotto">
                {s.codice} · {compatta ? s.stato : `${s.infrastruttura.layer} ${s.infrastruttura.nome?.replace(/^\S+ /, '') ?? ''}`}
              </span>
            </span>
            <span className="extra">
              <StatoPill s={s} />
            </span>
            <span className="b2-cella extra">
              <span>{s.zona ?? 'Fuori zona'}</span>
              <span className="b2-sotto">{s.acquaiolo ?? (s.acquaiolo_zona ? `${s.acquaiolo_zona} (di zona)` : 'non servita')}</span>
            </span>
            <span className="b2-cella b2-tempo">
              <span className={inRitardo(s) ? 'ritardo' : ''}>{eta(s.ricevuta_il)}</span>
              <span className="b2-sotto">{inRitardo(s) ? 'oltre i tempi' : dataOra(s.ricevuta_il)}</span>
            </span>
          </button>
        )
      })}
      {lista.length === 0 && <div className="b2-vuoto">Nessuna segnalazione con questi filtri.</div>}
    </div>
  )
}

// ---------- scheda

function Avanzamento({ s }) {
  const i = STATI.indexOf(s.stato)
  return (
    <div className="b2-avanzamento">
      <div className="b2-stepper" style={{ '--p': i / (STATI.length - 1) }}>
        <div className="b2-traccia" />
        {STATI.map((x, j) => (
          <div key={x} className={`b2-passo ${j < i ? 'fatto' : ''} ${j === i ? 'qui' : ''}`}>
            <span className="b2-nodo" />
            <span className="b2-nome">{x}</span>
          </div>
        ))}
      </div>
      <AzioniStato s={s} senzaPercorso />
    </div>
  )
}

const Fatto = ({ nome, valore, conf, forte }) => (
  <div className={`b2-fatto ${forte ? 'forte' : ''}`}>
    <dt>{nome}</dt>
    <dd>
      {valore}
      {conf != null && conf < 0.7 && <span className="b2-da-verificare" title={`confidenza dell'AI ${Math.round(conf * 100)}%`}>da verificare</span>}
    </dd>
  </div>
)

function Trascrizione({ s }) {
  const [aperta, setAperta] = useState(false)
  if (!s.transcript) return <p className="b2-muto">Nessun audio: segnalazione arrivata da {s.canale_ingresso}.</p>
  return (
    <div className={aperta ? 'b2-trascrizione aperta' : 'b2-trascrizione'}>
      <div className="b2-etichetta">Trascrizione del vocale</div>
      <p>“{s.transcript}”</p>
      <div className="b2-trascrizione-azioni">
        <button className="b2-link" onClick={() => setAperta(!aperta)}>{aperta ? 'Riduci' : 'Mostra tutto'}</button>
        <button className="b2-link"><Icona nome="play_arrow" piena /> Ascolta</button>
      </div>
    </div>
  )
}

function Scheda({ s, onChiudi, onApri }) {
  const per = pericoliSi(s)
  const i = s.infrastruttura
  const rottura = i.layer === 'Condotta' && s.categoria === 'affiora'
  return (
    <section className="b2-scheda" key={s.id}>
      <header className="b2-s-testa">
        <div>
          <div className="b2-s-sopra">
            <span className="b2-prio-chip" style={{ '--c': COLORI[s.priorita] }}>
              <Pallino livello={s.priorita} /> {s.priorita}
            </span>
            <StatoPill s={s} />
            <span className="b2-codice">{s.codice}</span>
          </div>
          <h1>{titolo(s)}</h1>
          <div className="b2-s-quando">
            <strong className={inRitardo(s) ? 'ritardo' : ''}>Ricevuta {eta(s.ricevuta_il)}</strong>
            <span>{dataOra(s.ricevuta_il)}</span>
            <span className="b2-muto">via {s.canale_ingresso}</span>
          </div>
        </div>
        <button className="b2-chiudi" onClick={onChiudi} aria-label="Chiudi scheda"><Icona nome="close" /></button>
      </header>

      {per.length > 0 && (
        <div className="b2-banner pericolo">
          <Icona nome="warning" piena />
          <div>
            <strong>Pericolo per {per.join(', ')}</strong>
            <span>Il segnalante ha indicato un pericolo: verifica subito.</span>
          </div>
        </div>
      )}
      {rottura && (
        <div className="b2-banner avviso">
          <Icona nome="water_damage" />
          <div>
            <strong>Possibile rottura della condotta</strong>
            <span>Acqua che affiora a {i.distanza_m} m da una condotta in pressione.</span>
          </div>
        </div>
      )}
      <Duplicati s={s} onApri={onApri} />

      <div className="b2-media">
        <img src={s.foto} alt="Foto della segnalazione" />
        <div className="b2-media-mappa">
          <Mappa key={s.id} segnalazioni={[s]} selezionata={s.id} centro={[s.lat, s.lng]} zoom={16} strati={['canali', 'condotte', 'rip']} conLegenda={false} />
        </div>
      </div>

      <Avanzamento s={s} />

      <div className="b2-griglia">
        <div className="b2-card">
          <h2>Cosa è successo</h2>
          <p className="b2-descrizione">{s.descrizione}</p>
          <dl className="b2-fatti">
            {['persone', 'strada', 'edifici'].map((k) => (
              <Fatto key={k} nome={`Pericolo ${k === 'strada' ? 'per la strada' : k === 'edifici' ? 'per edifici' : 'per persone'}`} valore={s.pericoli[k]} conf={s.confidenza.pericoli} forte={s.pericoli[k] === 'sì'} />
            ))}
            <Fatto nome="Quanta acqua" valore={s.quantita} conf={s.confidenza.quantita} />
            <Fatto nome="Da quanto" valore={s.durata} conf={s.confidenza.durata} />
            <Fatto nome="Categoria" valore={titolo(s)} conf={s.confidenza.categoria} />
          </dl>
          <Trascrizione s={s} />
        </div>
        <div className="b2-colonna">
          <div className="b2-card">
            <h2>Contatti</h2>
            <Contatti s={s} />
          </div>
          <div className="b2-card">
            <h2>Infrastruttura</h2>
            <div className="b2-infra-nome">{i.nome}</div>
            <div className="b2-muto">
              {i.layer} · codice {i.codice ?? '—'} · a {i.distanza_m} m
            </div>
            <div className="b2-muto">
              Zona {s.zona ?? '—'} · {s.lat.toFixed(5)}, {s.lng.toFixed(5)}
            </div>
          </div>
          <div className="b2-card">
            <h2>Priorità</h2>
            <PrioritaDettaglio s={s} />
            <div className="b2-muto">Tempo di presa in carico: {TEMPI[s.priorita]}.</div>
          </div>
        </div>
      </div>

      <div className="b2-card">
        <h2>Registro</h2>
        <Registro s={s} />
      </div>
    </section>
  )
}

// ---------- pagina

export default function PortaleOperatore({ sel, setSel }) {
  const { st, fai } = usePortale()
  const [pagina, setPagina] = useState('coda')
  const [f, setF] = useState(FILTRI_INIZIALI)
  const [toast, setToast] = useState(null)
  const [lampo, setLampo] = useState(null)
  const lista = ordina(filtra(st.segnalazioni, f))
  const s = st.segnalazioni.find((x) => x.id === sel)
  const nuove = st.segnalazioni.filter((x) => x.stato === 'Ricevuta').length

  // dispatch con conferma visiva
  const faiConToast = (az) => {
    fai(az)
    if (MESSAGGI[az.tipo]) setToast({ testo: MESSAGGI[az.tipo], n: Date.now() })
  }
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2400)
    return () => clearTimeout(t)
  }, [toast])

  const daMappa = (id) => {
    setPagina('coda')
    setSel(id)
    setLampo(id)
    setTimeout(() => setLampo(null), 1400)
  }

  return (
    <Portale.Provider value={{ st, fai: faiConToast }}>
      <div className="b2">
        <nav className="b2-nav">
          <div className="b2-logo">
            <span className="b2-logo-segno" />
            <div>
              Garda Chiese
              <small>Portale operatore</small>
            </div>
          </div>
          {[
            ['coda', 'Segnalazioni', 'inbox', nuove],
            ['mappa', 'Mappa', 'map'],
            ['rubrica', 'Rubrica acquaioli', 'contacts'],
          ].map(([k, t, ic, n]) => (
            <button key={k} className={pagina === k ? 'on' : ''} onClick={() => setPagina(k)}>
              <Icona nome={ic} piena={pagina === k} />
              <span className="b2-nav-testo">{t}</span>
              {n ? <span className="b2-badge">{n}</span> : null}
            </button>
          ))}
          <span className="spazio" />
          <div className="b2-utente">
            <span className="b2-avatar">L</span>
            <div>
              Lorenzo
              <small>Operatore centrale</small>
            </div>
          </div>
        </nav>

        <main className="b2-main">
          {pagina !== 'rubrica' && <BarraFiltri f={f} set={setF} conteggio={lista.length} />}

          {pagina === 'coda' && (
            <div className="b2-pagina b2-split" key="coda">
              <Lista lista={lista} sel={sel} setSel={setSel} compatta={!!s} lampo={lampo} />
              {s && <Scheda key={s.id} s={s} onChiudi={() => setSel(null)} onApri={setSel} />}
            </div>
          )}

          {pagina === 'mappa' && (
            <div className="b2-pagina b2-pagina-mappa" key="mappa">
              <Mappa segnalazioni={lista} selezionata={sel} onSeleziona={daMappa} />
              <div className="b2-suggerimento">Clicca un pallino per aprire la segnalazione</div>
            </div>
          )}

          {pagina === 'rubrica' && (
            <div className="b2-pagina b2-pagina-rubrica" key="rubrica">
              <h1>Rubrica acquaioli</h1>
              <p className="b2-muto">I numeri che l’operatore usa per chiamare l’acquaiolo competente.</p>
              <div className="b2-card">
                <Rubrica />
              </div>
            </div>
          )}
        </main>

        {toast && (
          <div className="b2-toast" key={toast.n}>
            <Icona nome="check_circle" piena /> {toast.testo}
          </div>
        )}
      </div>
    </Portale.Provider>
  )
}
