// Portale operatore: la coda di lavoro scelta nel ticket #10 (variante B, rifinita).
// - menu laterale flottante a sezioni, richiudibile, con il tema chiaro/scuro
// - filtri in una barra sola, condivisa tra Segnalazioni e Mappa
// - lista con la colonna "Assegnata a"; con la scheda aperta la lista si stringe a colonna e la scheda entra da destra
// - dalla Mappa la mappa vola sul pallino e si trasforma nella mappa della scheda
// - il tema cambia con un'onda che attraversa la pagina (ticket #97; View Transitions API, dove c'è)
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Avatar, Icona, Mappa, Pallino, tessereCaricate, titoloNome } from './comuni'
import { usePortale } from './dati'
import {
  FILTRI_INIZIALI,
  LIVELLI,
  NOME_LAYER,
  NOME_LIVELLO,
  NOME_STATO,
  STATI,
  assegnata,
  dataOra,
  eta,
  filtra,
  inRitardo,
  nomeEsito,
  ordina,
  pericoliSi,
  titolo,
  type Filtri,
  type Operatore,
  type Segnalazione,
} from './dominio'
import { Rubrica } from './Rubrica'
import { Scheda, StatoPill } from './Scheda'
import { movimentoRidotto, ondaTema, transizione } from './transizioni'

type Pagina = 'coda' | 'mappa' | 'rubrica'
type Tema = 'chiaro' | 'scuro'

// ---------- tema

export function useTema() {
  const [tema, setTema] = useState<Tema>(
    () => (localStorage.getItem('tema') as Tema | null) ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'scuro' : 'chiaro'),
  )
  useLayoutEffect(() => {
    document.documentElement.dataset.tema = tema
    localStorage.setItem('tema', tema)
  }, [tema])
  return [tema, setTema] as const
}

// ---------- menu laterale

type PropsMenu = {
  pagina: Pagina
  setPagina: (p: Pagina) => void
  nuove: number
  tema: Tema
  setTema: (t: Tema) => void
  operatore: Operatore | null
  onEsci: () => void
}

function Menu({ pagina, setPagina, nuove, tema, setTema, operatore, onEsci }: PropsMenu) {
  const [compresso, setCompresso] = useState(false)
  const [utente, setUtente] = useState(false)
  const voce = (k: Pagina, testo: string, icona: string, badge?: number) => (
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
          <Avatar nome={operatore?.nome_completo ?? 'Operatore'} accento />
          <span className="testo">
            {operatore?.nome_completo ?? 'Operatore'}
            <small>Operatore</small>
          </span>
          <Icona nome="unfold_more" className="testo" />
        </button>
        {utente && (
          <div className="popover menu-popover">
            <div className="muto">Consorzio di bonifica Garda Chiese</div>
            <button className="voce" onClick={onEsci}>
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
        <button className="voce" onClick={() => ondaTema(() => setTema(tema === 'scuro' ? 'chiaro' : 'scuro'))} title={compresso ? 'Tema' : undefined}>
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

function Chips<T extends string>({ etichetta, tutti, scelti, onChange, render }: {
  etichetta: string
  tutti: T[]
  scelti: T[]
  onChange: (x: T[]) => void
  render: (x: T) => React.ReactNode
}) {
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

function BarraFiltri({ f, set, conteggio }: { f: Filtri; set: (f: Filtri) => void; conteggio: number }) {
  const { zone, caricamento, ricarica } = usePortale()
  const nomiZone = [...new Set(zone.map((z) => z.nome))].sort()
  return (
    <div className="filtri">
      <div className="filtri-riga">
        <label className="cerca">
          <Icona nome="search" />
          <input placeholder="Cerca per codice, descrizione, canale o acquaiolo" value={f.testo} onChange={(e) => set({ ...f, testo: e.target.value })} />
        </label>
        <select value={f.zona} onChange={(e) => set({ ...f, zona: e.target.value })}>
          <option value="">Tutte le zone</option>
          {nomiZone.map((z) => (
            <option key={z}>{z}</option>
          ))}
        </select>
        <button className="btn" onClick={() => ricarica()} disabled={caricamento} title="Aggiorna le segnalazioni">
          <Icona nome="refresh" /> Aggiorna
        </button>
        <span className="conteggio">
          <strong>{conteggio}</strong> segnalazioni
        </span>
      </div>
      <div className="filtri-riga">
        <Chips
          etichetta="Priorità"
          tutti={LIVELLI}
          scelti={f.livelli}
          onChange={(livelli) => set({ ...f, livelli })}
          render={(l) => (
            <>
              <Pallino livello={l} /> {NOME_LIVELLO[l]}
            </>
          )}
        />
        <Chips etichetta="Stato" tutti={STATI} scelti={f.stati} onChange={(stati) => set({ ...f, stati })} render={(s) => NOME_STATO[s]} />
      </div>
    </div>
  )
}

// ---------- lista

function Assegnatario({ s }: { s: Segnalazione }) {
  const { acquaiolo, zona } = usePortale()
  const acq = acquaiolo(s.acquaiolo_competente_id)
  const si = assegnata(s)
  return (
    <span className="persona">
      <Avatar nome={si ? (acq?.nome ?? 'Acquaiolo') : null} piccolo />
      <span className="cella">
        <span className={si ? '' : 'muto'}>{si ? (acq ? titoloNome(acq.nome) : 'Acquaiolo') : 'Non assegnata'}</span>
        <span className="sotto">{si ? (zona(s.zona_id) ?? '—') : acq ? `proposto ${titoloNome(acq.nome)}` : 'zona non servita'}</span>
      </span>
    </span>
  )
}

const maiuscola = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)

type PropsLista = { lista: Segnalazione[]; sel: number | null; setSel: (id: number) => void; compatta: boolean; lampo: number | null }

function Lista({ lista, sel, setSel, compatta, lampo }: PropsLista) {
  const { caricamento, errore, ricarica, acquaiolo } = usePortale()
  const box = useRef<HTMLDivElement>(null)
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
            <Pallino livello={s.priorita} /> <span className="extra">{NOME_LIVELLO[s.priorita]}</span>
          </span>
          <span className="cella">
            <span className="titolo-riga">
              <span className="taglia">{titolo(s)}</span>
              {pericoliSi(s).length > 0 && <span className="tag-pericolo">Pericolo</span>}
            </span>
            <span className="sotto">
              {s.codice_pratica} ·{' '}
              {compatta ? NOME_STATO[s.stato_corrente] : [NOME_LAYER[s.layer], s.nome_tracciato].filter(Boolean).join(' ') || s.descrizione}
            </span>
          </span>
          <span className="extra cella stato-cella">
            <StatoPill s={s} senzaEsito />
            {s.esito && <span className="sotto">{maiuscola(nomeEsito(s.esito))}</span>}
          </span>
          <span className="extra">
            <Assegnatario s={s} />
          </span>
          {compatta && <Avatar nome={assegnata(s) ? (acquaiolo(s.acquaiolo_competente_id)?.nome ?? 'Acquaiolo') : null} piccolo />}
          <span className="cella tempo">
            <span className={inRitardo(s) ? 'ritardo' : ''}>{eta(s.created_at)}</span>
            <span className="sotto">{inRitardo(s) ? 'oltre i tempi' : dataOra(s.created_at)}</span>
          </span>
        </button>
      ))}
      {caricamento && <div className="lista-vuota">Caricamento delle segnalazioni…</div>}
      {!caricamento && errore && (
        <div className="lista-vuota">
          {errore}{' '}
          <button className="btn-link" onClick={() => ricarica()}>
            Riprova
          </button>
        </div>
      )}
      {!caricamento && !errore && lista.length === 0 && <div className="lista-vuota">Nessuna segnalazione con questi filtri.</div>}
    </div>
  )
}

// ---------- pagina

export function Portale({ operatore, onEsci }: { operatore: Operatore | null; onEsci: () => void }) {
  const portale = usePortale()
  const { segnalazioni, toast } = portale
  const [tema, setTema] = useTema()
  const [pagina, setPagina] = useState<Pagina>('coda')
  const [f, setF] = useState<Filtri>(FILTRI_INIZIALI)
  const [sel, setSel] = useState<number | null>(null)
  const [lampo, setLampo] = useState<number | null>(null)
  const [daMappa, setDaMappa] = useState(false)
  const lista = ordina(filtra(segnalazioni, f, portale))
  const s = segnalazioni.find((x) => x.id === sel)
  const nuove = segnalazioni.filter((x) => x.stato_corrente === 'ricevuta').length

  // Aprire dalla lista: la lista si stringe a colonna e la scheda entra da destra.
  // Con una scheda già aperta si passa all'altra senza transizione della pagina: entrano solo i blocchi.
  const apri = (id: number) => {
    if (id === sel) return
    const cambia = () => {
      setDaMappa(false)
      setSel(id)
    }
    if (s) cambia()
    else transizione('apri', cambia)
  }

  const chiudi = () => {
    if (sel === null) return
    if (s && pagina === 'coda') transizione('chiudi', () => setSel(null))
    else setSel(null)
  }
  const chiudiOra = useRef(chiudi)
  chiudiOra.current = chiudi

  useEffect(() => {
    const tasto = (e: KeyboardEvent) =>
      e.key === 'Escape' && !(e.target as HTMLElement).closest?.('input, textarea, select') && chiudiOra.current()
    window.addEventListener('keydown', tasto)
    return () => window.removeEventListener('keydown', tasto)
  }, [])

  // Dalla mappa: la mappa ha già volato sul pallino; la View Transition la trasforma nella mappa della scheda,
  // dopo aver aspettato le tessere della mini-mappa (sono le stesse, già in cache).
  const apriDaMappa = (id: number) => {
    const cambia = () => {
      setDaMappa(true)
      setPagina('coda')
      setSel(id)
      setLampo(id)
    }
    setTimeout(() => setLampo(null), 1600)
    transizione('mappa', cambia, () => tessereCaricate(document.querySelector('.scheda .media-mappa') ?? document, 400))
  }

  return (
    <div className="app">
      <Menu pagina={pagina} setPagina={setPagina} nuove={nuove} tema={tema} setTema={setTema} operatore={operatore} onEsci={onEsci} />

      <main className="principale">
        {pagina !== 'rubrica' && <BarraFiltri f={f} set={setF} conteggio={lista.length} />}

        {pagina === 'coda' && (
          <div className="pagina split" key="coda">
            <Lista lista={lista} sel={sel} setSel={apri} compatta={!!s} lampo={lampo} />
            {s && <Scheda key={s.id} s={s} onChiudi={chiudi} onApri={apri} daMappa={daMappa} />}
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
        <div className={`toast ${toast.errore ? 'errore' : ''}`} key={toast.n}>
          <Icona nome={toast.errore ? 'error' : 'check_circle'} piena /> {toast.testo}
        </div>
      )}
    </div>
  )
}
