// PROTOTIPO, da buttare (ticket #102). Le tre varianti non condividono cornice né Inizio: è lì
// che il ticket deve decidere. I contenuti dei passi sono in schermate.tsx, uguali per tutte.

import type { FC, ReactNode } from 'react'
import { Icona, NUMERO_VERDE, TEL_NUMERO_VERDE } from '../comuni'
import { Logo, Simbolo, useProto } from './contesto'

export const PASSI = ['Posizione', 'Foto', 'Descrizione', 'Contatto', 'Invio']

export type PropsCornice = {
  titolo?: string
  /** Riga piccola sopra il titolo, per esempio "Domanda 1 di 5". */
  occhiello?: string
  /** 1..5 per i passi numerati; assente per Fuori perimetro, Conferma, Pagina di stato. */
  passo?: number
  indietro?: boolean
  /** Azione principale e, sotto, quella secondaria: fisse in basso. */
  azione?: ReactNode
  /** Conferma e Pagina di stato non hanno il tastone fisso. */
  senzaTastone?: boolean
  children?: ReactNode
}

export type Variante = {
  chiave: 'A' | 'B' | 'C'
  nome: string
  idea: string
  Cornice: FC<PropsCornice>
  Inizio: FC
}

/** Il tastone rosso che compare in cima dal primo segnale di pericolo fino alla Conferma. */
function Tastone({ corto }: { corto?: boolean }) {
  const { pericolo } = useProto()
  if (!pericolo) return null
  return (
    <a className="p-tastone" href={TEL_NUMERO_VERDE}>
      <Icona n="call" piena />
      <span>{corto ? NUMERO_VERDE : <>Numero verde <b>{NUMERO_VERDE}</b></>}</span>
    </a>
  )
}

function Indietro({ testo }: { testo?: boolean }) {
  const { indietro } = useProto()
  return (
    <button className={testo ? 'p-indietro-testo' : 'p-indietro'} aria-label="Indietro" onClick={indietro}>
      <Icona n={testo ? 'chevron_left' : 'arrow_back'} />
      {testo && 'Indietro'}
    </button>
  )
}

// ---------- A: tastone in cima ----------
// Inizio: il numero verde è la cosa più grande, sopra le due scelte affiancate.
// Passi: barra fissa con indietro, logo ridotto al centro e segmenti; pulsanti da 60px.

function CorniceA({ titolo, occhiello, passo, indietro = true, azione, senzaTastone, children }: PropsCornice) {
  return (
    <div className="p-app">
      <header className="p-testa">
        <div className="p-testa-riga">
          {indietro ? <Indietro /> : <span className="p-vuoto" />}
          <Logo piccolo />
          <span className="p-vuoto">{passo && <small>{passo}/5</small>}</span>
        </div>
        {passo && (
          <div className="p-segmenti">
            {PASSI.map((n, i) => <span key={n} className={i < passo ? 'fatto' : ''} />)}
          </div>
        )}
        {!senzaTastone && <Tastone />}
      </header>
      <main className="p-corpo">
        {occhiello && <p className="p-occhiello">{occhiello}</p>}
        {titolo && <h1>{titolo}</h1>}
        {children}
      </main>
      {azione && <footer className="p-piede">{azione}</footer>}
    </div>
  )
}

function InizioA() {
  const { vai } = useProto()
  return (
    <div className="p-app p-inizio">
      <header className="p-inizio-logo"><Logo /></header>
      <main className="p-corpo">
        <h1>Segnala un problema</h1>
        <a className="p-chiama-grande" href={TEL_NUMERO_VERDE}>
          <span className="p-chiama-icona"><Icona n="call" piena /></span>
          <span>
            <small>Qualcuno è in pericolo?</small>
            <strong>Chiama il numero verde</strong>
            <b>{NUMERO_VERDE}</b>
          </span>
        </a>
        <p className="p-etichetta">Come vuoi raccontarlo?</p>
        <div className="p-due">
          <button className="p-tessera primaria" onClick={() => vai('posizione-chiedi')}>
            <Icona n="mic" piena />
            <strong>A voce</strong>
          </button>
          <button className="p-tessera" onClick={() => vai('posizione-chiedi')}>
            <Icona n="checklist" />
            <strong>Con domande</strong>
          </button>
        </div>
      </main>
    </div>
  )
}

// ---------- B: pollice ----------
// Inizio: la segnalazione è la cosa più grande, il numero verde è un tastone fisso in fondo.
// Passi: niente barra in alto; logo piccolo e pallini; indietro e continua affiancati in basso,
// dove arriva il pollice; pulsanti da 72px.

function CorniceB({ titolo, occhiello, passo, indietro = true, azione, senzaTastone, children }: PropsCornice) {
  return (
    <div className="p-app">
      {!senzaTastone && <div className="p-tastone-sticky"><Tastone /></div>}
      <header className="p-testa-b">
        <Logo piccolo />
        {passo && (
          <div className="p-pallini" aria-label={`Passo ${passo} di 5`}>
            {PASSI.map((n, i) => <span key={n} className={i < passo ? 'fatto' : i === passo - 1 ? 'ora' : ''} />)}
            <small>{PASSI[passo - 1]}</small>
          </div>
        )}
      </header>
      <main className="p-corpo">
        {occhiello && <p className="p-occhiello">{occhiello}</p>}
        {titolo && <h1>{titolo}</h1>}
        {children}
      </main>
      {(azione || indietro) && (
        <footer className="p-piede">
          <div className="p-piede-riga">
            {indietro && <Indietro />}
            <div className="p-piede-azioni">{azione}</div>
          </div>
        </footer>
      )}
    </div>
  )
}

function InizioB() {
  const { vai } = useProto()
  return (
    <div className="p-app p-inizio">
      <header className="p-inizio-logo"><Logo /></header>
      <main className="p-corpo">
        <h1>Segnala un problema</h1>
        <div className="p-colonna">
          <button className="p-grande primaria" onClick={() => vai('posizione-chiedi')}>
            <Icona n="mic" piena />
            <span><strong>Raccontalo a voce</strong></span>
            <Icona n="arrow_forward" />
          </button>
          <button className="p-grande" onClick={() => vai('posizione-chiedi')}>
            <Icona n="checklist" />
            <span><strong>Rispondi a domande</strong></span>
            <Icona n="arrow_forward" />
          </button>
        </div>
      </main>
      <footer className="p-piede">
        <a className="p-btn rosso" href={TEL_NUMERO_VERDE}>
          <Icona n="call" piena /> Pericolo? {NUMERO_VERDE}
        </a>
      </footer>
    </div>
  )
}

// ---------- C: tre tastoni uguali ----------
// Inizio: tre pulsanti della stessa altezza, il rosso per primo, niente etichette di sezione.
// Passi: fascia rossa a tutta larghezza sopra tutto; "‹ Indietro" testuale e simbolo del
// Consorzio al posto del logo; titoli grandi; pulsante a tutta larghezza da 76px incollato al fondo.

function CorniceC({ titolo, occhiello, passo, indietro = true, azione, senzaTastone, children }: PropsCornice) {
  return (
    <div className="p-app">
      <header className="p-testa">
        {!senzaTastone && <Tastone corto />}
        <div className="p-testa-riga">
          {indietro ? <Indietro testo /> : <span className="p-vuoto" />}
          <Simbolo />
          <span className="p-vuoto">{passo && <small>{passo} di 5</small>}</span>
        </div>
      </header>
      <main className="p-corpo">
        {(occhiello || passo) && (
          <p className="p-occhiello">{occhiello ?? PASSI[passo! - 1]}</p>
        )}
        {titolo && <h1>{titolo}</h1>}
        {children}
      </main>
      {azione && <footer className="p-piede">{azione}</footer>}
    </div>
  )
}

function InizioC() {
  const { vai } = useProto()
  return (
    <div className="p-app p-inizio">
      <header className="p-inizio-logo"><Logo /></header>
      <main className="p-corpo">
        <h1>Segnala un problema</h1>
        <div className="p-colonna">
          <a className="p-grande rosso" href={TEL_NUMERO_VERDE}>
            <Icona n="call" piena />
            <span><strong>Chiama il numero verde</strong><small>{NUMERO_VERDE} · pericolo per le persone</small></span>
          </a>
          <button className="p-grande primaria" onClick={() => vai('posizione-chiedi')}>
            <Icona n="mic" piena />
            <span><strong>Segnala a voce</strong></span>
          </button>
          <button className="p-grande" onClick={() => vai('posizione-chiedi')}>
            <Icona n="checklist" />
            <span><strong>Segnala con domande</strong></span>
          </button>
        </div>
      </main>
    </div>
  )
}

export const VARIANTI: Variante[] = [
  {
    chiave: 'A',
    nome: 'Tastone in cima',
    idea: 'Inizio: il numero verde è la cosa più grande, sopra le due scelte affiancate. Passi: barra in alto con indietro, logo ridotto e segmenti. Pulsanti da 60px. Scuro: grafite neutra.',
    Cornice: CorniceA,
    Inizio: InizioA,
  },
  {
    chiave: 'B',
    nome: 'Pollice',
    idea: 'Inizio: le due scelte sono la cosa più grande, il numero verde è fisso in fondo. Passi: niente barra, indietro e continua affiancati in basso. Pulsanti da 72px. Scuro: blu notte del marchio.',
    Cornice: CorniceB,
    Inizio: InizioB,
  },
  {
    chiave: 'C',
    nome: 'Tre tastoni',
    idea: 'Inizio: tre pulsanti uguali, il rosso per primo. Passi: fascia rossa a tutta larghezza, "‹ Indietro" e simbolo, titoli grandi, pulsante incollato al fondo. Pulsanti da 76px. Scuro: nero pieno (OLED).',
    Cornice: CorniceC,
    Inizio: InizioC,
  },
]
