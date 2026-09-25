// La scheda della Segnalazione, in ordine di lettura e senza vuoti (ticket #10):
// intestazione con assegnatario → pericolo → duplicati → foto e mappa → avanzamento e azioni →
// cosa è successo | contatti e infrastruttura → registro (chiuso di default).
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Avatar, Copia, Icona, Mappa, Pallino, titoloNome } from './comuni'
import { usePortale } from './dati'
import {
  AVANZA,
  CATEGORIE,
  COLORI,
  ESITI,
  LIVELLI,
  NOME_LAYER,
  NOME_CANALE,
  NOME_LIVELLO,
  NOME_STATO,
  PERICOLI,
  STATI,
  TEMPI,
  assegnata,
  dataOra,
  eta,
  inRitardo,
  nomeCategoria,
  nomeEsito,
  pericoliSi,
  titolo,
  valore,
  type Categoria,
  type Esito,
  type Priorita,
  type Segnalazione,
} from './dominio'

export const StatoPill = ({ s, senzaEsito }: { s: Segnalazione; senzaEsito?: boolean }) => (
  <span className={`stato st-${STATI.indexOf(s.stato_corrente)}`}>
    {NOME_STATO[s.stato_corrente]}
    {s.esito && !senzaEsito ? ` · ${nomeEsito(s.esito)}` : ''}
  </span>
)

// La priorità in testa alla scheda, grande perché è la prima cosa da capire. La matita accanto apre la scelta
// a colori: si clicca il livello, si scrive il perché e Invio salva, senza altri tasti.
function PrioritaChip({ s }: { s: Segnalazione }) {
  const { correggi } = usePortale()
  const [apri, setApri] = useState(false)
  const [livello, setLivello] = useState<Priorita | null>(null)
  const [motivo, setMotivo] = useState('')
  const [invio, setInvio] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  const chiudi = () => {
    setApri(false)
    setLivello(null)
    setMotivo('')
  }
  // clic fuori dalla scelta: si chiude senza salvare
  useEffect(() => {
    if (!apri) return
    const fuori = (e: MouseEvent) => !box.current?.contains(e.target as Node) && chiudi()
    document.addEventListener('mousedown', fuori)
    return () => document.removeEventListener('mousedown', fuori)
  }, [apri])

  const salva = async () => {
    if (!livello || !motivo.trim() || invio) return
    setInvio(true)
    const ok = await correggi(s.id, { priorita: livello, override_motivazione: motivo.trim() })
    setInvio(false)
    if (ok) chiudi()
  }

  return (
    <div
      className="prio-box"
      ref={box}
      // Esc chiude la scelta, non la scheda
      onKeyDown={(e) => e.key === 'Escape' && apri && (e.stopPropagation(), chiudi())}
    >
      <button
        className="prio-chip grande"
        style={{ '--c': COLORI[s.priorita] } as React.CSSProperties}
        onClick={() => (apri ? chiudi() : setApri(true))}
        title="Cambia priorità"
      >
        <Pallino livello={s.priorita} grande /> Priorità {NOME_LIVELLO[s.priorita].toLowerCase()}
        <Icona nome="edit" className="matita" />
      </button>
      {apri && (
        <div className="popover prio-scelta" role="dialog" aria-label="Cambia priorità">
          <div className="etichetta">Cambia priorità</div>
          <div className="prio-livelli">
            {LIVELLI.map((l) => (
              <button
                key={l}
                className={`prio-livello ${l === s.priorita ? 'attuale' : ''} ${l === livello ? 'on' : ''}`}
                style={{ '--c': COLORI[l] } as React.CSSProperties}
                disabled={l === s.priorita}
                onClick={() => setLivello(l)}
              >
                <strong>
                  <Pallino livello={l} /> {NOME_LIVELLO[l]}
                </strong>
                <small>{l === s.priorita ? 'attuale' : l === s.priorita_calcolata ? 'calcolata' : TEMPI[l]}</small>
              </button>
            ))}
          </div>
          {livello && (
            <label className="prio-motivo">
              <input
                autoFocus
                placeholder={`Perché ${NOME_LIVELLO[livello].toLowerCase()}? (obbligatorio)`}
                value={motivo}
                disabled={invio}
                onChange={(e) => setMotivo(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && salva()}
              />
              <small className="muto">Invio per confermare · Esc per annullare</small>
            </label>
          )}
        </div>
      )}
    </div>
  )
}

// Sotto il titolo: entro quando va presa in carico e, se un Operatore l'ha cambiata, chi e perché.
function PrioritaDettaglio({ s }: { s: Segnalazione }) {
  const cambio = [...s.registro].reverse().find((e) => e.tipo_evento === 'correzione_campo' && e.nota?.includes('priorità'))
  return (
    <div className="prio-dettaglio">
      <span>{TEMPI[s.priorita][0].toUpperCase() + TEMPI[s.priorita].slice(1)}</span>
      {s.override_motivazione && (
        <span className="prio-motivazione">
          <Icona nome="edit_note" />
          <span>
            Cambiata{cambio?.operatore ? ` da ${cambio.operatore.nome_completo}` : ''}
            {s.priorita !== s.priorita_calcolata && ` (calcolata ${NOME_LIVELLO[s.priorita_calcolata].toLowerCase()})`}: “
            {s.override_motivazione}”
          </span>
        </span>
      )}
    </div>
  )
}

function Contatti({ s }: { s: Segnalazione }) {
  const { acquaiolo } = usePortale()
  const acq = acquaiolo(s.acquaiolo_competente_id)
  const riga = (etichetta: string, nome: string | null, tel: string | undefined, primario: boolean) => (
    <div className="contatto">
      <div className="contatto-testo">
        <div className="etichetta">{etichetta}</div>
        {nome && <strong>{nome}</strong>}
        {tel && <div className="numero">{tel}</div>}
      </div>
      {tel && (
        <div className="bottoni">
          <a className={`btn btn-chiama ${primario ? '' : 'secondario'}`} href={`tel:${tel.replace(/\s/g, '')}`}>
            <Icona nome="call" piena={primario} /> Chiama
          </a>
          <Copia testo={tel} />
        </div>
      )}
    </div>
  )
  return (
    <div className="contatti">
      {riga(
        assegnata(s) ? 'Acquaiolo assegnato' : 'Acquaiolo di zona, proposto',
        acq ? titoloNome(acq.nome) : 'Nessuno: zona non servita',
        acq?.telefono,
        true,
      )}
      {riga('Segnalante', null, s.cellulare || undefined, false)}
    </div>
  )
}

type Modo = null | 'assegna' | 'chiudi' | 'indietro' | 'riapri'

// Tasti del ciclo di vita (ticket #6): un passo avanti, Chiudi da ogni stato, indietro/riapri con nota.
function AzioniStato({ s }: { s: Segnalazione }) {
  const { azione, rubrica, zona, segnalazioni } = usePortale()
  const [modo, setModo] = useState<Modo>(null)
  const [acq, setAcq] = useState('')
  const [esito, setEsito] = useState<Esito | ''>('')
  const [orig, setOrig] = useState('')
  const [nota, setNota] = useState('')
  const [invio, setInvio] = useState(false)
  useEffect(() => {
    setModo(null)
    setNota('')
    setEsito('')
    setOrig('')
    setAcq(s.acquaiolo_competente_id ? String(s.acquaiolo_competente_id) : '')
  }, [s.id, s.stato_corrente, s.acquaiolo_competente_id])

  const fai = async (corpo: Parameters<typeof azione>[1]) => {
    setInvio(true)
    await azione(s.id, corpo)
    setInvio(false)
  }

  const i = STATI.indexOf(s.stato_corrente)
  const avanti = AVANZA[s.stato_corrente]
  return (
    <div className="azioni">
      {!modo && (
        <div className="bottoni">
          {s.stato_corrente === 'chiusa' ? (
            <button className="btn" onClick={() => setModo('riapri')}>
              <Icona nome="replay" /> Riapri
            </button>
          ) : (
            <>
              {avanti && (
                <button
                  className="btn btn-primario"
                  disabled={invio}
                  onClick={() => (avanti.azione === 'assegna' ? setModo('assegna') : fai({ azione: avanti.azione }))}
                >
                  {avanti.etichetta}
                  <Icona nome="arrow_forward" />
                </button>
              )}
              <button className="btn" onClick={() => setModo('chiudi')}>
                <Icona nome="task_alt" /> Chiudi…
              </button>
              {i > 0 && (
                <button className="btn-link" onClick={() => setModo('indietro')}>
                  <Icona nome="undo" /> Torna a {NOME_STATO[STATI[i - 1]]}
                </button>
              )}
            </>
          )}
        </div>
      )}
      {modo === 'assegna' && (
        <div className="riga-form">
          <select value={acq} onChange={(e) => setAcq(e.target.value)}>
            <option value="">Scegli acquaiolo…</option>
            {rubrica.map((r) => (
              <option key={r.id} value={r.id}>
                {titoloNome(r.nome)}
                {zona(r.zona_id) ? ` · ${zona(r.zona_id)}` : ''}
                {r.id === s.acquaiolo_competente_id ? ' (di zona)' : ''}
              </option>
            ))}
          </select>
          <input placeholder="Nota (facoltativa)" value={nota} onChange={(e) => setNota(e.target.value)} />
          <button className="btn btn-primario" disabled={!acq || invio} onClick={() => fai({ azione: 'assegna', acquaiolo_id: +acq, nota: nota || undefined })}>
            Assegna
          </button>
          <button className="btn-link" onClick={() => setModo(null)}>
            Annulla
          </button>
        </div>
      )}
      {modo === 'chiudi' && (
        <div className="riga-form">
          <select value={esito} onChange={(e) => setEsito(e.target.value as Esito)}>
            <option value="">Esito (obbligatorio)…</option>
            {ESITI.map((e) => (
              <option key={e.valore} value={e.valore}>
                {e.etichetta}
              </option>
            ))}
          </select>
          {esito === 'duplicata' && (
            <select value={orig} onChange={(e) => setOrig(e.target.value)}>
              <option value="">Duplicato di…</option>
              {segnalazioni
                .filter((x) => x.id !== s.id && x.stato_corrente !== 'chiusa')
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.codice_pratica} · {titolo(x)}
                  </option>
                ))}
            </select>
          )}
          <input placeholder="Nota (facoltativa)" value={nota} onChange={(e) => setNota(e.target.value)} />
          <button
            className="btn btn-primario"
            disabled={!esito || (esito === 'duplicata' && !orig) || invio}
            onClick={() =>
              esito && fai({ azione: 'chiudi', esito, nota: nota || undefined, duplicato_di: esito === 'duplicata' ? +orig : undefined })
            }
          >
            Chiudi
          </button>
          <button className="btn-link" onClick={() => setModo(null)}>
            Annulla
          </button>
        </div>
      )}
      {(modo === 'indietro' || modo === 'riapri') && (
        <div className="riga-form">
          <input placeholder="Nota (obbligatoria)" value={nota} onChange={(e) => setNota(e.target.value)} autoFocus />
          <button className="btn btn-primario" disabled={!nota.trim() || invio} onClick={() => fai({ azione: modo, nota })}>
            {modo === 'riapri' ? 'Riapri' : `Torna a ${NOME_STATO[STATI[i - 1]]}`}
          </button>
          <button className="btn-link" onClick={() => setModo(null)}>
            Annulla
          </button>
        </div>
      )}
    </div>
  )
}

function Avanzamento({ s }: { s: Segnalazione }) {
  const i = STATI.indexOf(s.stato_corrente)
  return (
    <div className="card avanzamento">
      <div className="stepper" style={{ '--p': i / (STATI.length - 1) } as React.CSSProperties}>
        <div className="traccia" />
        {STATI.map((x, j) => (
          <div key={x} className={`passo ${j < i ? 'fatto' : ''} ${j === i ? 'qui' : ''}`}>
            <span className="nodo">{j < i && <Icona nome="check" />}</span>
            <span className="nome">{NOME_STATO[x]}</span>
          </div>
        ))}
      </div>
      <AzioniStato s={s} />
    </div>
  )
}

const Fatto = ({ nome, valore, conf, forte, children }: { nome: string; valore: string; conf?: number; forte?: boolean; children?: ReactNode }) => (
  <div className={`dato ${forte ? 'forte' : ''}`}>
    <dt>{nome}</dt>
    <dd>
      {valore}
      {conf != null && conf < 0.7 && (
        <span className="da-verificare" title={`confidenza dell'AI ${Math.round(conf * 100)}%`}>
          da verificare
        </span>
      )}
      {children}
    </dd>
  </div>
)

// Cosa ha detto il Segnalante. La categoria si corregge qui: alla prima correzione il backend conserva
// quella inviata in `categoria_originale`, e la priorità non si ricalcola.
function CosaESuccesso({ s }: { s: Segnalazione }) {
  const { correggi } = usePortale()
  const [apri, setApri] = useState(false)
  const [categoria, setCategoria] = useState(s.categoria)
  const conf = s.estratti_confidenza ?? {}
  const corretta = !!s.categoria_originale && s.categoria_originale !== s.categoria
  return (
    <>
      <p className="descrizione">{s.descrizione}</p>
      <dl className="fatti">
        {PERICOLI.map((p) => (
          <Fatto key={p.campo} nome={p.nome} valore={valore(s[p.campo])} conf={conf[p.campo]} forte={s[p.campo] === 'si'} />
        ))}
        <Fatto nome="Quanta acqua" valore={valore(s.quantita_acqua)} conf={conf.quantita_acqua} />
        <Fatto nome="Da quanto" valore={valore(s.durata)} conf={conf.durata} />
        <Fatto nome="Categoria" valore={titolo(s)} conf={s.categoria_originale ? undefined : conf.categoria}>
          {corretta && <span className="inviata">inviata: {nomeCategoria(s.categoria_originale)}</span>}
          {!apri && (
            <button className="btn-link" onClick={() => setApri(true)}>
              <Icona nome="edit" /> Correggi
            </button>
          )}
        </Fatto>
      </dl>
      {apri && (
        <div className="riga-form correggi-categoria">
          <select value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)}>
            {!s.categoria && <option value="">Scegli la categoria…</option>}
            {CATEGORIE.map((c) => (
              <option key={c.valore} value={c.valore}>
                {c.etichetta}
              </option>
            ))}
          </select>
          <button
            className="btn"
            disabled={!categoria || categoria === s.categoria}
            onClick={async () => {
              if (categoria && (await correggi(s.id, { categoria }))) setApri(false)
            }}
          >
            Salva
          </button>
          <button
            className="btn-link"
            onClick={() => {
              setApri(false)
              setCategoria(s.categoria)
            }}
          >
            Annulla
          </button>
        </div>
      )}
      <Trascrizione s={s} />
    </>
  )
}

function Trascrizione({ s }: { s: Segnalazione }) {
  const [aperta, setAperta] = useState(false)
  if (!s.transcript_ai) return <p className="muto trascrizione">Nessun vocale: descrizione scritta a mano.</p>
  return (
    <div className={aperta ? 'trascrizione aperta' : 'trascrizione'}>
      <div className="etichetta">Trascrizione del vocale</div>
      <p>“{s.transcript_ai}”</p>
      <div className="trascrizione-azioni">
        <button className="btn-link" onClick={() => setAperta(!aperta)}>
          {aperta ? 'Riduci' : 'Mostra tutto'}
        </button>
      </div>
    </div>
  )
}

// Contenuto che si apre e si chiude con un'altezza animata (grid 0fr → 1fr).
function Richiudibile({ titolo, riassunto, children }: { titolo: string; riassunto: string; children: ReactNode }) {
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

const ICONE_EVENTO: Record<string, string> = { cambio_stato: 'swap_horiz', nota: 'sticky_note_2', correzione_campo: 'edit', duplicato_collegato: 'link' }

function Registro({ s }: { s: Segnalazione }) {
  const { azione } = usePortale()
  const [nota, setNota] = useState('')
  const ev = [...s.registro].reverse()
  return (
    <div className="registro">
      <div className="riga-form">
        <input placeholder="Aggiungi una nota interna (es. telefonata)…" value={nota} onChange={(e) => setNota(e.target.value)} />
        <button
          className="btn"
          disabled={!nota.trim()}
          onClick={async () => {
            if (await azione(s.id, { azione: 'nota', nota })) setNota('')
          }}
        >
          Aggiungi
        </button>
      </div>
      <ol>
        {ev.map((e) => (
          <li key={e.id} className={`ev-${e.tipo_evento}`}>
            <span className="quando">{dataOra(e.created_at)}</span>
            <span className="cosa">
              <Icona nome={ICONE_EVENTO[e.tipo_evento]} />
              <span>
                {e.tipo_evento === 'cambio_stato' && <strong>{NOME_STATO[e.stato]}</strong>}{' '}
                {e.tipo_evento === 'duplicato_collegato' && 'Duplicato collegato: '}
                {e.nota}
              </span>
            </span>
            <span className="chi">{e.operatore?.nome_completo ?? 'Segnalante'}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function Duplicati({ s, onApri }: { s: Segnalazione; onApri: (id: number) => void }) {
  const { segnalazioni } = usePortale()
  if (s.duplicato_di) {
    const o = segnalazioni.find((x) => x.id === s.duplicato_di)
    return (
      <div className="avviso">
        <Icona nome="link" /> Duplicato di{' '}
        <button className="btn-link" onClick={() => onApri(s.duplicato_di!)}>
          {o?.codice_pratica ?? `#${s.duplicato_di}`}
        </button>
      </div>
    )
  }
  return (
    <div className="avviso">
      <strong>
        <Icona nome="group" /> Segnalata anche da {s.duplicati.length} {s.duplicati.length === 1 ? 'persona' : 'persone'}
      </strong>
      <div className="dup-lista">
        {s.duplicati.map((d) => (
          <div key={d.id} className="dup">
            {d.foto[0] && <img src={d.foto[0]} alt="" />}
            <button className="btn-link" onClick={() => onApri(d.id)}>
              {d.codice_pratica}
            </button>
            <span>{d.cellulare}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function Foto({ src }: { src?: string }) {
  const [rotta, setRotta] = useState(false)
  const [grande, setGrande] = useState(false)
  if (!src || rotta)
    return (
      <div className="foto-vuota">
        <Icona nome="no_photography" />
        <span>{src ? 'Foto non disponibile' : 'Nessuna foto'}</span>
      </div>
    )
  return (
    <>
      <button className="foto" onClick={() => setGrande(true)} title="Ingrandisci la foto">
        <img src={src} alt="Foto della segnalazione" onError={() => setRotta(true)} />
      </button>
      {grande && <FotoGrande src={src} onChiudi={() => setGrande(false)} />}
    </>
  )
}

// La foto ingrandita sopra il Portale, con lo sfondo sfocato e scurito. Si chiude con la X, cliccando fuori o con Esc.
function FotoGrande({ src, onChiudi }: { src: string; onChiudi: () => void }) {
  useEffect(() => {
    // in cattura, così Esc chiude la foto e non anche la scheda
    const tasto = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      onChiudi()
    }
    window.addEventListener('keydown', tasto, true)
    return () => window.removeEventListener('keydown', tasto, true)
  }, [onChiudi])
  return createPortal(
    <div className="foto-grande" role="dialog" aria-modal="true" aria-label="Foto della segnalazione" onClick={onChiudi}>
      <img src={src} alt="Foto della segnalazione" onClick={(e) => e.stopPropagation()} />
      <button className="btn-icona foto-grande-chiudi" onClick={onChiudi} aria-label="Chiudi la foto" autoFocus>
        <Icona nome="close" />
      </button>
    </div>,
    document.body,
  )
}

type PropsScheda = {
  s: Segnalazione
  onChiudi: () => void
  onApri: (id: number) => void
  daMappa: boolean
  /** Dopo quanti ms entra il primo blocco (per aspettare la transizione della pagina). */
  ritardo: number
}

export function Scheda({ s, onChiudi, onApri, daMappa, ritardo }: PropsScheda) {
  const { acquaiolo, zona } = usePortale()
  const per = pericoliSi(s)
  const rottura = s.layer === 'condotta' && s.categoria === 'acqua_che_affiora'
  const acq = acquaiolo(s.acquaiolo_competente_id)
  const ultimo = s.registro[s.registro.length - 1]
  let n = 0
  // ogni blocco entra dopo il precedente
  const entra = (extra = '') => ({ className: `entra ${extra}`, style: { '--i': n++ } as React.CSSProperties })

  return (
    <section className="scheda" style={{ '--ritardo': `${ritardo}ms` } as React.CSSProperties}>
      <header {...entra('scheda-testa')}>
        <div className="scheda-titolo">
          <div className="sopra">
            <PrioritaChip key={s.id} s={s} />
            <StatoPill s={s} />
            <span className="codice">{s.codice_pratica}</span>
            <a
              href={`/stato/${s.token_stato}`}
              target="_blank"
              rel="noreferrer"
              className="btn"
              title="Apri pagina di stato"
              style={{ marginLeft: '8px', padding: '4px 8px', fontSize: '12px' }}
            >
              <Icona nome="open_in_new" /> Pagina pubblica
            </a>
          </div>
          <h1>{titolo(s)}</h1>
          <div className="quando">
            <strong className={inRitardo(s) ? 'ritardo' : ''}>Ricevuta {eta(s.created_at)}</strong>
            <span>{dataOra(s.created_at)}</span>
            <span className="muto">via {NOME_CANALE[s.canale_ingresso]}</span>
          </div>
          <PrioritaDettaglio s={s} />
        </div>
        <div className="assegnatario">
          <Avatar nome={assegnata(s) ? acq?.nome : null} />
          <div>
            <div className="etichetta">{assegnata(s) ? 'Assegnata a' : 'Non ancora assegnata'}</div>
            <strong>
              {assegnata(s)
                ? acq
                  ? titoloNome(acq.nome)
                  : 'Acquaiolo'
                : acq
                  ? `Proposto: ${titoloNome(acq.nome)}`
                  : 'Zona non servita'}
            </strong>
            <div className="muto">
              {s.operatore_riferimento ? `In carico a ${s.operatore_riferimento.nome_completo}` : 'Nessun operatore di riferimento'}
            </div>
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
            <span>Acqua che affiora a {s.distanza_m != null ? Math.round(s.distanza_m) : '?'} m da una condotta in pressione.</span>
          </div>
        </div>
      )}
      {(s.duplicato_di || s.duplicati.length > 0) && (
        <div {...entra()}>
          <Duplicati s={s} onApri={onApri} />
        </div>
      )}

      {/* dalla Mappa la pagina si allontana partendo da questa mappa: deve esserci subito */}
      <div {...entra(`media ${daMappa ? 'fermo' : ''}`)}>
        <Foto key={s.id} src={s.foto[0]} />
        <div className="media-mappa">
          <Mappa
            key={s.id}
            segnalazioni={[s]}
            selezionata={s.id}
            centro={[s.lat, s.lng]}
            zoom={16}
            strati={['canale', 'condotta', 'reticolo_principale']}
            conLegenda={false}
          />
        </div>
      </div>

      <div {...entra()}>
        <Avanzamento s={s} />
      </div>

      <div {...entra('griglia')}>
        <div className="card">
          <h2>Cosa è successo</h2>
          <CosaESuccesso s={s} />
        </div>
        <div className="card colonna">
          <h2>Contatti</h2>
          <Contatti s={s} />
          <h2 className="separa">Infrastruttura</h2>
          <div className="infra-nome">{s.nome_completo_tracciato || 'Nessun tracciato vicino'}</div>
          <div className="muto">
            {[NOME_LAYER[s.layer], s.tipo_tracciato, s.distanza_m != null ? `a ${Math.round(s.distanza_m)} m` : null].filter(Boolean).join(' · ')}
          </div>
          <div className="muto">
            Zona {zona(s.zona_id) ?? '—'} · {s.lat.toFixed(5)}, {s.lng.toFixed(5)}
          </div>
        </div>
      </div>

      <div {...entra()}>
        <Richiudibile titolo="Registro" riassunto={`${s.registro.length} eventi${ultimo ? ` · ultimo ${dataOra(ultimo.created_at)}` : ''}`}>
          <Registro s={s} />
        </Richiudibile>
      </div>
    </section>
  )
}
