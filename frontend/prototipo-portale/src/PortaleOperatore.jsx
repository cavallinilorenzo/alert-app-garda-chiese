// PROTOTIPO. Portale operatore: la coda di lavoro (variante B del primo giro su #10), rifinita.
// - menu laterale flottante a sezioni, richiudibile, con il tema chiaro/scuro
// - filtri in una barra sola, condivisa tra Segnalazioni e Mappa; il canale di ingresso va in "Altri filtri"
// - lista con la colonna "Assegnata a" (avatar e nome)
// - scheda in ordine di lettura, senza vuoti: intestazione con assegnatario → pericolo → foto e mappa →
//   avanzamento e azioni → cosa è successo | contatti e infrastruttura → registro (chiuso di default)
// - transizioni: elementi della scheda che entrano uno dopo l'altro; dalla Mappa la mappa vola sul pallino
//   e si trasforma nella mappa della scheda (View Transitions API, dove c'è)
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { CATEGORIE, COLORI, FILTRI_INIZIALI, INGRESSI, LIVELLI, STATI, ZONE, dataOra, eta, filtra, ordina, ORA } from './dati.js'
import { Avatar, AzioniStato, Contatti, Duplicati, Icona, Mappa, Pallino, Portale, PrioritaDettaglio, Registro, Rubrica, titoloNome, usePortale } from './comuni.jsx'

const titolo = (s) => CATEGORIE[s.categoria]
const pericoliSi = (s) => Object.entries(s.pericoli).filter(([, v]) => v === 'sì').map(([k]) => k)
const movimentoRidotto = () => matchMedia('(prefers-reduced-motion: reduce)').matches

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

// ---------- tema

function useTema() {
  const [tema, setTema] = useState(() => localStorage.getItem('tema') ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'scuro' : 'chiaro'))
  useLayoutEffect(() => {
    document.documentElement.dataset.tema = tema
    localStorage.setItem('tema', tema)
  }, [tema])
  return [tema, setTema]
}

// ---------- menu laterale

function Menu({ pagina, setPagina, nuove, tema, setTema }) {
  const [compresso, setCompresso] = useState(false)
  const [utente, setUtente] = useState(false)
  const voce = (k, testo, icona, badge) => (
    <button key={k} className={`voce ${pagina === k ? 'on' : ''}`} onClick={() => setPagina(k)} title={compresso ? testo : undefined}>
      <Icona nome={icona} piena={pagina === k} />
      <span className="testo">{testo}</span>
      {badge ? <span className="badge">{badge}</span> : null}
    </button>
  )
  return (
    <nav className={`menu ${compresso ? 'compresso' : ''}`}>
      <div className="menu-utente-box">
        <button className="menu-utente" onClick={() => setUtente(!utente)}>
          <span className="avatar accento">LC</span>
          <span className="testo">
            Lorenzo Cavallini
            <small>Operatore centrale</small>
          </span>
          <Icona nome="unfold_more" className="testo" />
        </button>
        {utente && (
          <div className="popover menu-popover">
            <div className="muto">Consorzio di bonifica Garda Chiese</div>
            <button className="voce">
              <Icona nome="logout" /> <span className="testo">Esci</span>
            </button>
          </div>
        )}
      </div>

      <div className="sezione">Lavoro</div>
      {voce('coda', 'Segnalazioni', 'inbox', nuove)}
      {voce('mappa', 'Mappa', 'map')}
      <div className="sezione">Consorzio</div>
      {voce('rubrica', 'Rubrica acquaioli', 'contacts')}

      <span className="spazio" />
      <div className="menu-piede">
        <button className="voce" onClick={() => setTema(tema === 'scuro' ? 'chiaro' : 'scuro')} title={compresso ? 'Tema' : undefined}>
          <Icona nome={tema === 'scuro' ? 'light_mode' : 'dark_mode'} />
          <span className="testo">{tema === 'scuro' ? 'Tema chiaro' : 'Tema scuro'}</span>
        </button>
        <button className="voce" onClick={() => setCompresso(!compresso)} title={compresso ? 'Espandi' : undefined}>
          <Icona nome={compresso ? 'left_panel_open' : 'left_panel_close'} />
          <span className="testo">Comprimi</span>
        </button>
      </div>
    </nav>
  )
}

// ---------- barra dei filtri

function Chips({ etichetta, tutti, scelti, onChange, render = (x) => x }) {
  return (
    <div className="chips">
      <span className="etichetta">{etichetta}</span>
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
    <div className="filtri">
      <div className="filtri-riga">
        <label className="cerca">
          <Icona nome="search" />
          <input placeholder="Cerca per codice, descrizione, canale o acquaiolo" value={f.testo} onChange={(e) => set({ ...f, testo: e.target.value })} />
        </label>
        <select value={f.zona} onChange={(e) => set({ ...f, zona: e.target.value })}>
          <option value="">Tutte le zone</option>
          {ZONE.map((z) => (
            <option key={z}>{z}</option>
          ))}
        </select>
        <div className="altri">
          <button className={`btn ${altri || nascosti ? 'attivo' : ''}`} onClick={() => setAltri(!altri)}>
            <Icona nome="tune" /> Altri filtri{nascosti ? ` · ${nascosti}` : ''}
          </button>
          {altri && (
            <div className="popover">
              <div className="etichetta">Canale di ingresso</div>
              {INGRESSI.map((i) => (
                <label key={i} className="check">
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
        <span className="conteggio">
          <strong>{conteggio}</strong> segnalazioni
        </span>
      </div>
      <div className="filtri-riga">
        <Chips etichetta="Priorità" tutti={LIVELLI} scelti={f.livelli} onChange={(livelli) => set({ ...f, livelli })} render={(l) => (<><Pallino livello={l} /> {l}</>)} />
        <Chips etichetta="Stato" tutti={STATI} scelti={f.stati} onChange={(stati) => set({ ...f, stati })} />
      </div>
    </div>
  )
}

// ---------- lista

const StatoPill = ({ s }) => <span className={`stato st-${STATI.indexOf(s.stato)}`}>{s.stato}{s.esito ? ` · ${s.esito}` : ''}</span>

function Assegnatario({ s }) {
  return (
    <span className="persona">
      <Avatar nome={s.acquaiolo} piccolo />
      <span className="cella">
        <span className={s.acquaiolo ? '' : 'muto'}>{s.acquaiolo ? titoloNome(s.acquaiolo) : 'Non assegnata'}</span>
        <span className="sotto">{s.acquaiolo ? s.zona : s.acquaiolo_zona ? `proposto ${titoloNome(s.acquaiolo_zona)}` : 'zona non servita'}</span>
      </span>
    </span>
  )
}

function Lista({ lista, sel, setSel, compatta, lampo }) {
  const box = useRef(null)
  useEffect(() => {
    box.current?.querySelector(`[data-id="${sel}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [sel])
  return (
    <div ref={box} className={compatta ? 'lista compatta' : 'lista'}>
      <div className="riga intestazione">
        <span>Priorità</span>
        <span>Segnalazione</span>
        <span className="extra">Stato</span>
        <span className="extra">Assegnata a</span>
        <span className="destra">Ricevuta</span>
      </div>
      {lista.map((s) => (
        <button key={s.id} data-id={s.id} className={`riga ${s.id === sel ? 'sel' : ''} ${s.id === lampo ? 'lampo' : ''}`} onClick={() => setSel(s.id)}>
          <span className="prio">
            <Pallino livello={s.priorita} /> <span className="extra">{s.priorita}</span>
          </span>
          <span className="cella">
            <span className="titolo-riga">
              <span className="taglia">{titolo(s)}</span>
              {pericoliSi(s).length > 0 && <span className="tag-pericolo">Pericolo</span>}
            </span>
            <span className="sotto">
              {s.codice} · {compatta ? s.stato : `${s.infrastruttura.layer} ${s.infrastruttura.nome?.replace(/^\S+ /, '') ?? ''}`}
            </span>
          </span>
          <span className="extra">
            <StatoPill s={s} />
          </span>
          <span className="extra">
            <Assegnatario s={s} />
          </span>
          {compatta && <Avatar nome={s.acquaiolo} piccolo />}
          <span className="cella tempo">
            <span className={inRitardo(s) ? 'ritardo' : ''}>{eta(s.ricevuta_il)}</span>
            <span className="sotto">{inRitardo(s) ? 'oltre i tempi' : dataOra(s.ricevuta_il)}</span>
          </span>
        </button>
      ))}
      {lista.length === 0 && <div className="lista-vuota">Nessuna segnalazione con questi filtri.</div>}
    </div>
  )
}

// ---------- scheda

function Avanzamento({ s }) {
  const i = STATI.indexOf(s.stato)
  return (
    <div className="card avanzamento">
      <div className="stepper" style={{ '--p': i / (STATI.length - 1) }}>
        <div className="traccia" />
        {STATI.map((x, j) => (
          <div key={x} className={`passo ${j < i ? 'fatto' : ''} ${j === i ? 'qui' : ''}`}>
            <span className="nodo">{j < i && <Icona nome="check" />}</span>
            <span className="nome">{x}</span>
          </div>
        ))}
      </div>
      <AzioniStato s={s} />
    </div>
  )
}

const Fatto = ({ nome, valore, conf, forte }) => (
  <div className={`dato ${forte ? 'forte' : ''}`}>
    <dt>{nome}</dt>
    <dd>
      {valore}
      {conf != null && conf < 0.7 && <span className="da-verificare" title={`confidenza dell'AI ${Math.round(conf * 100)}%`}>da verificare</span>}
    </dd>
  </div>
)

function Trascrizione({ s }) {
  const [aperta, setAperta] = useState(false)
  if (!s.transcript) return <p className="muto trascrizione">Nessun audio: segnalazione arrivata da {s.canale_ingresso}.</p>
  return (
    <div className={aperta ? 'trascrizione aperta' : 'trascrizione'}>
      <div className="etichetta">Trascrizione del vocale</div>
      <p>“{s.transcript}”</p>
      <div className="trascrizione-azioni">
        <button className="btn-link" onClick={() => setAperta(!aperta)}>{aperta ? 'Riduci' : 'Mostra tutto'}</button>
        <button className="btn-link"><Icona nome="play_arrow" piena /> Ascolta</button>
      </div>
    </div>
  )
}

// Contenuto che si apre e si chiude con un'altezza animata (grid 0fr → 1fr).
function Richiudibile({ titolo, riassunto, children }) {
  const [aperto, setAperto] = useState(false)
  return (
    <div className={`card richiudibile ${aperto ? 'aperto' : ''}`}>
      <button className="richiudibile-testa" onClick={() => setAperto(!aperto)} aria-expanded={aperto}>
        <h2>{titolo}</h2>
        <span className="muto">{riassunto}</span>
        <Icona nome="expand_more" className="freccia" />
      </button>
      <div className="richiudibile-corpo">
        <div>{children}</div>
      </div>
    </div>
  )
}

function Scheda({ s, onChiudi, onApri, daMappa }) {
  const per = pericoliSi(s)
  const i = s.infrastruttura
  const rottura = i.layer === 'Condotta' && s.categoria === 'affiora'
  const ultimo = s.registro[s.registro.length - 1]
  let n = 0
  // ogni blocco entra dopo il precedente
  const entra = (extra = '') => ({ className: `entra ${extra}`, style: { '--i': n++ } })

  return (
    <section className="scheda">
      <header {...entra('scheda-testa')}>
        <div className="scheda-titolo">
          <div className="sopra">
            <span className="prio-chip" style={{ '--c': COLORI[s.priorita] }}>
              <Pallino livello={s.priorita} /> {s.priorita}
            </span>
            <StatoPill s={s} />
            <span className="codice">{s.codice}</span>
          </div>
          <h1>{titolo(s)}</h1>
          <div className="quando">
            <strong className={inRitardo(s) ? 'ritardo' : ''}>Ricevuta {eta(s.ricevuta_il)}</strong>
            <span>{dataOra(s.ricevuta_il)}</span>
            <span className="muto">via {s.canale_ingresso}</span>
          </div>
          <PrioritaDettaglio s={s} />
        </div>
        <div className="assegnatario">
          <Avatar nome={s.acquaiolo} />
          <div>
            <div className="etichetta">{s.acquaiolo ? 'Assegnata a' : 'Non ancora assegnata'}</div>
            <strong>{s.acquaiolo ? titoloNome(s.acquaiolo) : s.acquaiolo_zona ? `Proposto: ${titoloNome(s.acquaiolo_zona)}` : 'Zona non servita'}</strong>
            <div className="muto">{s.operatore_riferimento ? `In carico a ${s.operatore_riferimento}` : 'Nessun operatore di riferimento'}</div>
          </div>
        </div>
        <button className="btn-icona chiudi" onClick={onChiudi} aria-label="Chiudi scheda">
          <Icona nome="close" />
        </button>
      </header>

      {per.length > 0 && (
        <div {...entra('banner pericolo')}>
          <Icona nome="warning" piena />
          <div>
            <strong>Pericolo per {per.join(', ')}</strong>
            <span>Il segnalante ha indicato un pericolo: verifica subito.</span>
          </div>
        </div>
      )}
      {rottura && (
        <div {...entra('banner avviso')}>
          <Icona nome="water_damage" />
          <div>
            <strong>Possibile rottura della condotta</strong>
            <span>Acqua che affiora a {i.distanza_m} m da una condotta in pressione.</span>
          </div>
        </div>
      )}
      {(s.duplicato_di || s.duplicati.length > 0) && (
        <div {...entra()}>
          <Duplicati s={s} onApri={onApri} />
        </div>
      )}

      {/* dalla Mappa la mappa della scheda è la destinazione della transizione: niente animazione propria */}
      <div {...entra(`media ${daMappa ? 'fermo' : ''}`)}>
        <img src={s.foto} alt="Foto della segnalazione" />
        <div className="media-mappa">
          <Mappa key={s.id} className="vt-mappa" segnalazioni={[s]} selezionata={s.id} centro={[s.lat, s.lng]} zoom={16} strati={['canali', 'condotte', 'rip']} conLegenda={false} />
        </div>
      </div>

      <div {...entra()}>
        <Avanzamento s={s} />
      </div>

      <div {...entra('griglia')}>
        <div className="card">
          <h2>Cosa è successo</h2>
          <p className="descrizione">{s.descrizione}</p>
          <dl className="fatti">
            {['persone', 'strada', 'edifici'].map((k) => (
              <Fatto key={k} nome={{ persone: 'Pericolo per persone', strada: 'Pericolo per la strada', edifici: 'Pericolo per edifici' }[k]} valore={s.pericoli[k]} conf={s.confidenza.pericoli} forte={s.pericoli[k] === 'sì'} />
            ))}
            <Fatto nome="Quanta acqua" valore={s.quantita} conf={s.confidenza.quantita} />
            <Fatto nome="Da quanto" valore={s.durata} conf={s.confidenza.durata} />
            <Fatto nome="Categoria" valore={titolo(s)} conf={s.confidenza.categoria} />
          </dl>
          <Trascrizione s={s} />
        </div>
        <div className="card colonna">
          <h2>Contatti</h2>
          <Contatti s={s} />
          <h2 className="separa">Infrastruttura</h2>
          <div className="infra-nome">{i.nome}</div>
          <div className="muto">
            {i.layer} · codice {i.codice ?? '—'} · a {i.distanza_m} m
          </div>
          <div className="muto">
            Zona {s.zona ?? '—'} · {s.lat.toFixed(5)}, {s.lng.toFixed(5)}
          </div>
        </div>
      </div>

      <div {...entra()}>
        <Richiudibile titolo="Registro" riassunto={`${s.registro.length} eventi · ultimo ${dataOra(ultimo.quando)}`}>
          <Registro s={s} />
        </Richiudibile>
      </div>
    </section>
  )
}

// ---------- pagina

export default function PortaleOperatore({ sel, setSel }) {
  const { st, fai } = usePortale()
  const [tema, setTema] = useTema()
  const [pagina, setPagina] = useState('coda')
  const [f, setF] = useState(FILTRI_INIZIALI)
  const [toast, setToast] = useState(null)
  const [lampo, setLampo] = useState(null)
  const [daMappa, setDaMappa] = useState(false)
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

  const apri = (id) => {
    setDaMappa(false)
    setSel(id)
  }

  // Dalla mappa: la mappa ha già volato sul pallino; la View Transition la trasforma nella mappa della scheda.
  const apriDaMappa = (id) => {
    const cambia = () => {
      setDaMappa(true)
      setPagina('coda')
      setSel(id)
      setLampo(id)
    }
    setTimeout(() => setLampo(null), 1600)
    if (!document.startViewTransition || movimentoRidotto()) return cambia()
    document.startViewTransition(async () => {
      flushSync(cambia)
      await new Promise((r) => setTimeout(r, 200)) // tempo per le tessere della mini-mappa
    })
  }

  return (
    <Portale.Provider value={{ st, fai: faiConToast }}>
      <div className="app">
        <Menu pagina={pagina} setPagina={setPagina} nuove={nuove} tema={tema} setTema={setTema} />

        <main className="principale">
          {pagina !== 'rubrica' && <BarraFiltri f={f} set={setF} conteggio={lista.length} />}

          {pagina === 'coda' && (
            <div className="pagina split" key="coda">
              <Lista lista={lista} sel={sel} setSel={apri} compatta={!!s} lampo={lampo} />
              {s && <Scheda key={s.id} s={s} onChiudi={() => setSel(null)} onApri={apri} daMappa={daMappa} />}
            </div>
          )}

          {pagina === 'mappa' && (
            <div className="pagina pagina-mappa" key="mappa">
              <Mappa className="vt-mappa" segnalazioni={lista} selezionata={sel} onSeleziona={apriDaMappa} volaPrima={!movimentoRidotto()} />
              <div className="suggerimento">
                <Icona nome="touch_app" /> Clicca un pallino per aprire la segnalazione
              </div>
            </div>
          )}

          {pagina === 'rubrica' && (
            <div className="pagina pagina-rubrica" key="rubrica">
              <h1>Rubrica acquaioli</h1>
              <p className="muto">I numeri che l’operatore usa per chiamare l’acquaiolo competente.</p>
              <div className="card">
                <Rubrica />
              </div>
            </div>
          )}
        </main>

        {toast && (
          <div className="toast" key={toast.n}>
            <Icona nome="check_circle" piena /> {toast.testo}
          </div>
        )}
      </div>
    </Portale.Provider>
  )
}
