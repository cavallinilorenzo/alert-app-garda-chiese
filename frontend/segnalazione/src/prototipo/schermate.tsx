// PROTOTIPO, da buttare (ticket #102). Il contenuto di ogni schermata con i testi proposti,
// dati finti e nessuna chiamata tranne i layer della mappa. Si impagina nella Cornice della variante.

import { useState, type FC } from 'react'
import { Icona, NUMERO_UNICO_EMERGENZA, NUMERO_VERDE, TEL_NUMERO_VERDE } from '../comuni'
import { Mappa } from '../Mappa'
import { CATEGORIE } from '../tassonomia'
import { Logo, useProto } from './contesto'

// Una foto finta: un canale con l'acqua che esce sul prato.
const FOTO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">
<defs><linearGradient id="c" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#bcd9ec"/><stop offset="1" stop-color="#e9f2f7"/></linearGradient></defs>
<rect width="400" height="300" fill="url(#c)"/><rect y="150" width="400" height="150" fill="#6c9a4a"/>
<path d="M0 205 C120 190 260 225 400 200 L400 250 C260 270 120 240 0 255Z" fill="#4b7fa3"/>
<ellipse cx="230" cy="185" rx="70" ry="16" fill="#5f8fb0" opacity=".8"/>
<path d="M0 198 C120 183 260 218 400 193" stroke="#7a6a4c" stroke-width="6" fill="none"/></svg>`)

const POSIZIONE = { lat: 45.4112, lng: 10.5018, fonte: 'gps' as const, precisione_m: 12 }

function Posizione() {
  const { Cornice } = useProto().variante
  const [pos, setPos] = useState(POSIZIONE)
  return (
    <Cornice titolo="Il punto è giusto?" passo={1} azione={<button className="p-btn">Sì, è qui</button>}>
      <div className="p-mappa">
        <Mappa posizione={pos} onSposta={(lat, lng) => setPos({ ...pos, lat, lng })} />
        <span className="p-suggerimento"><Icona n="touch_app" /> Trascina il segnaposto</span>
        <button className="p-fab" aria-label="Torna alla mia posizione"><Icona n="my_location" /></button>
      </div>
      <p className="p-nota"><Icona n="location_on" piena /> Castiglione delle Stiviere · ±12 m</p>
    </Cornice>
  )
}

function PosizioneChiedi() {
  const { variante: { Cornice }, vai } = useProto()
  return (
    <Cornice
      titolo="Dove si trova?"
      passo={1}
      azione={
        <>
          <button className="p-btn" onClick={() => vai('posizione')}><Icona n="my_location" /> Usa la mia posizione</button>
          <button className="p-btn testo" onClick={() => vai('posizione')}>Scelgo sulla mappa</button>
        </>
      }
    >
      <div className="p-illustrazione"><span className="p-tondo grande"><Icona n="my_location" /></span></div>
      <p className="p-nota centrata">Poi tocca <strong>Consenti</strong>.</p>
    </Cornice>
  )
}

function FuoriPerimetro() {
  const { Cornice } = useProto().variante
  return (
    <Cornice
      titolo="Qui non interviene il Consorzio"
      azione={<button className="p-btn secondario"><Icona n="edit_location_alt" /> Correggo il punto</button>}
    >
      <div className="p-gruppo">
        <div className="p-riga-info"><Icona n="water_drop" /><span><strong>Acqua di casa, fogne</strong><small>Acquedotto del Comune</small></span></div>
        <div className="p-riga-info"><Icona n="account_balance" /><span><strong>Strade, fossi privati</strong><small>Ufficio tecnico del Comune</small></span></div>
        <a className="p-riga-info rossa" href={`tel:${NUMERO_UNICO_EMERGENZA}`}><Icona n="emergency" /><span><strong>Persone in pericolo</strong><small>Chiama il {NUMERO_UNICO_EMERGENZA}</small></span><Icona n="call" /></a>
      </div>
    </Cornice>
  )
}

function Foto() {
  const { variante: { Cornice }, vai } = useProto()
  return (
    <Cornice titolo="Scatta una foto" passo={2} azione={<button className="p-btn" disabled>Continua</button>}>
      <button className="p-scatta" onClick={() => vai('foto-fatta')}>
        <Icona n="photo_camera" />
        <strong>Apri la fotocamera</strong>
      </button>
    </Cornice>
  )
}

function FotoFatta() {
  const { Cornice } = useProto().variante
  return (
    <Cornice
      titolo="Va bene questa?"
      passo={2}
      azione={
        <>
          <button className="p-btn">Continua</button>
          <button className="p-btn testo"><Icona n="replay" /> Rifai la foto</button>
        </>
      }
    >
      <img className="p-foto" src={FOTO} alt="Foto del problema" />
      <p className="p-chip"><Icona n="auto_awesome" /> Sembra: acqua che affiora</p>
    </Cornice>
  )
}

function Voce() {
  const { variante: { Cornice }, vai } = useProto()
  const [ascolto, setAscolto] = useState(false)
  return (
    <Cornice
      titolo="Racconta cosa vedi"
      passo={3}
      azione={<button className="p-btn testo"><Icona n="checklist" /> Preferisco le domande</button>}
    >
      <div className="p-temi">
        {['Cosa vedi', 'Da quando', 'Quanta acqua', 'Pericoli'].map((t) => <span key={t}>{t}</span>)}
      </div>
      <div className="p-registratore">
        <button
          className={`p-microfono ${ascolto ? 'ascolto' : ''}`}
          onClick={() => (ascolto ? vai('voce-capito') : setAscolto(true))}
          aria-label={ascolto ? 'Ho finito' : 'Tocca e parla'}
        >
          <Icona n={ascolto ? 'stop' : 'mic'} piena />
        </button>
        <strong>{ascolto ? <><span className="p-in-onda" /> In ascolto · 0:07</> : 'Tocca e parla'}</strong>
        {ascolto && <small>Tocca quando hai finito</small>}
      </div>
    </Cornice>
  )
}

const CAPITI = [
  ['Cosa', 'Acqua che affiora o perdita', 'photo_camera'],
  ['Descrizione', 'Esce acqua dal prato vicino al canale', 'check_circle'],
  ['Quanta acqua', 'Piccolo flusso', 'check_circle'],
  ['Pericoli', 'Nessuno', 'check_circle'],
]

function VoceCapito() {
  const { Cornice } = useProto().variante
  return (
    <Cornice titolo="Manca solo questo" passo={3} azione={<button className="p-btn">Continua</button>}>
      <h2 className="p-domanda">Da quanto tempo?</h2>
      <Opzioni opzioni={['Adesso', 'Meno di un’ora', 'Alcune ore', 'Più di un giorno', 'Non so']} />
      <details className="p-capiti">
        <summary><Icona n="check_circle" piena /> Capito 4 cose su 5 <Icona n="expand_more" /></summary>
        {CAPITI.map(([e, v, i]) => (
          <button key={e} className="p-capito"><Icona n={i} piena /><small>{e}</small><span>{v}</span><Icona n="edit" /></button>
        ))}
      </details>
    </Cornice>
  )
}

function Opzioni({ opzioni, scelta }: { opzioni: string[]; scelta?: string }) {
  const [valore, setValore] = useState(scelta)
  return (
    <div className="p-opzioni">
      {opzioni.map((o) => (
        <button key={o} className={`p-opzione ${valore === o ? 'scelta' : ''}`} onClick={() => setValore(o)}>{o}</button>
      ))}
    </div>
  )
}

// Il pericolo è la prima domanda: tre tessere da accendere, oppure "Nessuno" o "Non so".
// Una tessera accesa è "sì" per quel pericolo; le altre diventano "no".
function DomandaPericolo() {
  const { variante: { Cornice }, pericolo, vai } = useProto()
  const [accesi, setAccesi] = useState<string[]>(pericolo ? ['persone'] : [])
  const tocca = (k: string) => {
    if (!accesi.includes(k) && accesi.length === 0) vai('finestra')
    setAccesi(accesi.includes(k) ? accesi.filter((x) => x !== k) : [...accesi, k])
  }
  return (
    <Cornice
      titolo="C’è qualcosa in pericolo?"
      occhiello="Domanda 1 di 5"
      passo={3}
      azione={accesi.length ? <button className="p-btn">Continua</button> : <><button className="p-btn secondario">Nessun pericolo</button><button className="p-btn testo">Non lo so</button></>}
    >
      <div className="p-tre">
        {[['persone', 'Persone', 'directions_walk'], ['strada', 'Strade', 'add_road'], ['edifici', 'Case', 'home']].map(([k, e, i]) => (
          <button key={k} className={`p-pericolo ${accesi.includes(k) ? 'acceso' : ''}`} onClick={() => tocca(k)} aria-pressed={accesi.includes(k)}>
            <Icona n={i} piena={accesi.includes(k)} />
            <strong>{e}</strong>
          </button>
        ))}
      </div>
    </Cornice>
  )
}

function Finestra() {
  return (
    <>
      <DomandaPericolo />
      <div className="p-velo">
        <div className="p-dialogo" role="alertdialog" aria-modal="true">
          <span className="p-tondo rosso"><Icona n="warning" piena /></span>
          <h2>Chiama subito</h2>
          <a className="p-btn rosso" href={TEL_NUMERO_VERDE}><Icona n="call" piena /> {NUMERO_VERDE}</a>
          <button className="p-btn testo">Continuo la segnalazione</button>
        </div>
      </div>
    </>
  )
}

function DomandaCategoria() {
  const { Cornice } = useProto().variante
  const [scelta, setScelta] = useState<string>('acqua_che_affiora')
  return (
    <Cornice titolo="Cosa hai visto?" occhiello="Domanda 2 di 5" passo={3} azione={<button className="p-btn">Continua</button>}>
      <div className="p-lista">
        {CATEGORIE.map((c) => (
          <button key={c.valore} className={`p-voce ${scelta === c.valore ? 'scelta' : ''}`} onClick={() => setScelta(c.valore)}>
            <span className="p-voce-icona"><Icona n={c.icona} /></span>
            <span>{c.etichetta}</span>
            {c.valore === 'acqua_che_affiora' && <Icona n="photo_camera" className="p-dalla-foto" />}
          </button>
        ))}
      </div>
    </Cornice>
  )
}

function DomandaDescrizione() {
  const { Cornice } = useProto().variante
  return (
    <Cornice titolo="Descrivilo in breve" occhiello="Domanda 3 di 5" passo={3} azione={<button className="p-btn" disabled>Continua</button>}>
      <textarea className="p-casella" rows={4} placeholder="Esce acqua dal prato vicino alla strada" />
      <small className="p-contatore">Almeno 10 caratteri</small>
    </Cornice>
  )
}

function DomandaDurata() {
  const { Cornice } = useProto().variante
  return (
    <Cornice
      titolo="Da quanto tempo?"
      occhiello="Domanda 4 di 5"
      passo={3}
      azione={<><button className="p-btn" disabled>Continua</button><button className="p-btn testo">Salta</button></>}
    >
      <Opzioni opzioni={['Adesso', 'Meno di un’ora', 'Alcune ore', 'Più di un giorno', 'Non so']} />
    </Cornice>
  )
}

function Contatto() {
  const { Cornice } = useProto().variante
  return (
    <Cornice titolo="Il tuo cellulare" passo={4} azione={<button className="p-btn">Continua</button>}>
      <label className="p-telefono">
        <span>+39</span>
        <input type="tel" inputMode="tel" placeholder="333 123 4567" defaultValue="347 812 0934" />
      </label>
      <p className="p-nota"><Icona n="lock" /> Lo vede solo il Consorzio.</p>
    </Cornice>
  )
}

function Riepilogo() {
  const { Cornice } = useProto().variante
  const righe: [string, string, string][] = [
    ['location_on', 'Castiglione delle Stiviere', 'Canale Seriola · 45.41120, 10.50180'],
    ['water_drop', 'Acqua che affiora o perdita', 'Esce acqua dal prato vicino al canale'],
    ['schedule', 'Da alcune ore', 'Piccolo flusso · nessun pericolo'],
    ['call', '+39 347 812 0934', 'Ti chiamiamo solo se serve'],
  ]
  return (
    <Cornice
      titolo="Tutto giusto?"
      passo={5}
      azione={<button className="p-btn verde"><Icona n="send" /> Invia la segnalazione</button>}
    >
      <div className="p-gruppo">
        <button className="p-riga-info"><img src={FOTO} alt="" className="p-miniatura" /><span><strong>Foto</strong><small>Tocca per cambiarla</small></span><Icona n="chevron_right" /></button>
        {righe.map(([i, t, s]) => (
          <button key={t} className="p-riga-info"><Icona n={i} /><span><strong>{t}</strong><small>{s}</small></span><Icona n="chevron_right" /></button>
        ))}
      </div>
      <p className="p-legale">Inviando accetti che il Consorzio usi questi dati solo per questa segnalazione.</p>
    </Cornice>
  )
}

function Conferma() {
  const { variante: { Cornice }, pericolo } = useProto()
  return (
    <Cornice
      indietro={false}
      senzaTastone
      azione={
        <>
          <button className="p-btn secondario"><Icona n="share" /> Salva il link</button>
          <button className="p-btn testo">Apri la pagina di stato</button>
        </>
      }
    >
      <div className="p-fatto">
        <span className="p-tondo verde grande"><Icona n="check" /></span>
        <h1>Segnalazione inviata</h1>
      </div>
      {pericolo && (
        <a className="p-chiama-grande" href={TEL_NUMERO_VERDE}>
          <span className="p-chiama-icona"><Icona n="call" piena /></span>
          <span><small>Hai indicato un pericolo</small><strong>Chiama adesso</strong><b>{NUMERO_VERDE}</b></span>
        </a>
      )}
      <div className="p-codice">
        <small>Codice</small>
        <strong>GCH-9K2M</strong>
      </div>
      <div className="p-link">
        <span>gardachiese.it/stato/5f1c…a93e</span>
        <button aria-label="Copia il link"><Icona n="content_copy" /></button>
      </div>
      <p className="p-nota centrata">Con questo link vedi a che punto è.</p>
    </Cornice>
  )
}

function PaginaStato() {
  const tappe: [string, string, 'fatta' | 'attuale' | 'futura'][] = [
    ['Ricevuta', '24 set, 09:12', 'fatta'],
    ['In verifica', '24 set, 09:40', 'attuale'],
    ['Assegnata', '', 'futura'],
    ['In intervento', '', 'futura'],
    ['Chiusa', '', 'futura'],
  ]
  return (
    <div className="p-app p-stato">
      <header className="p-inizio-logo"><Logo /></header>
      <main className="p-corpo">
        <p className="p-occhiello">GCH-9K2M</p>
        <h1 className="p-stato-attuale">In verifica</h1>
        <div className="p-messaggio"><small>Dal Consorzio</small><p>Abbiamo mandato l’acquaiolo a vedere. Grazie!</p></div>
        <ol className="p-tappe">
          {tappe.map(([e, d, q]) => (
            <li key={e} className={q}><span className="p-tappa-punto">{q === 'fatta' && <Icona n="check" />}</span><span><strong>{e}</strong>{d && <small>{d}</small>}</span></li>
          ))}
        </ol>
      </main>
      <footer className="p-piede">
        <button className="p-btn secondario"><Icona n="refresh" /> Aggiorna</button>
        <a className="p-btn testo" href="?prototipo">Nuova segnalazione</a>
      </footer>
    </div>
  )
}

function Inizio() {
  const { Inizio } = useProto().variante
  return <Inizio />
}

export const SCHERMATE = [
  { chiave: 'inizio', nome: 'Inizio', Componente: Inizio },
  { chiave: 'posizione-chiedi', nome: 'Posizione · permesso', Componente: PosizioneChiedi },
  { chiave: 'posizione', nome: 'Posizione · mappa', Componente: Posizione },
  { chiave: 'fuori', nome: 'Fuori perimetro', Componente: FuoriPerimetro },
  { chiave: 'foto', nome: 'Foto · vuota', Componente: Foto },
  { chiave: 'foto-fatta', nome: 'Foto · scattata', Componente: FotoFatta },
  { chiave: 'voce', nome: 'Descrizione · a voce', Componente: Voce },
  { chiave: 'voce-capito', nome: 'Descrizione · a voce, capito', Componente: VoceCapito },
  { chiave: 'domanda-pericolo', nome: 'Domande · 1 pericolo', Componente: DomandaPericolo },
  { chiave: 'finestra', nome: 'Domande · finestra numero verde', Componente: Finestra, pericolo: true },
  { chiave: 'domanda-categoria', nome: 'Domande · 2 cosa hai visto', Componente: DomandaCategoria },
  { chiave: 'domanda-descrizione', nome: 'Domande · 3 descrizione', Componente: DomandaDescrizione },
  { chiave: 'domanda-durata', nome: 'Domande · 4 da quanto', Componente: DomandaDurata },
  { chiave: 'contatto', nome: 'Contatto', Componente: Contatto },
  { chiave: 'riepilogo', nome: 'Riepilogo', Componente: Riepilogo },
  { chiave: 'conferma', nome: 'Conferma', Componente: Conferma },
  { chiave: 'stato', nome: 'Pagina di stato', Componente: PaginaStato },
] as const satisfies readonly { chiave: string; nome: string; Componente: FC; pericolo?: boolean }[]

export type Chiave = (typeof SCHERMATE)[number]['chiave']
