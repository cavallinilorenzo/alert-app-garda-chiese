// PROTOTIPO. Pezzi del Portale operatore: mappa, blocchi della scheda, rubrica.
// Icone: Material Symbols (rounded), niente emoji.
import { createContext, useContext, useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import 'material-symbols/rounded.css'
import { AVANZA, CATEGORIE, COLORI, ESITI, LIVELLI, STATI, TEMPI, dataOra, eta } from './dati.js'

// { st, fai } : stato in memoria e dispatch delle azioni dell'operatore.
export const Portale = createContext(null)
export const usePortale = () => useContext(Portale)

// ---------- piccoli pezzi

// Nome dell'icona da https://fonts.google.com/icons
export const Icona = ({ nome, piena, className = '' }) => (
  <span className={`material-symbols-rounded icona ${piena ? 'piena' : ''} ${className}`} aria-hidden="true">
    {nome}
  </span>
)

export const Pallino = ({ livello, grande }) => (
  <span className={`pallino-inline ${livello === 'Critica' ? 'critica' : ''} ${grande ? 'grande' : ''}`} style={{ background: COLORI[livello] }} />
)

export const Copia = ({ testo }) => {
  const [ok, setOk] = useState(false)
  return (
    <button
      className="btn-icona"
      title={ok ? 'Copiato' : 'Copia il numero'}
      onClick={() => {
        navigator.clipboard?.writeText(testo)
        setOk(true)
        setTimeout(() => setOk(false), 1200)
      }}
    >
      <Icona nome={ok ? 'check' : 'content_copy'} />
    </button>
  )
}

// ---------- mappa

const cacheGeo = {}
const carica = (nome) => (cacheGeo[nome] ??= fetch(`/${nome}.geojson`).then((r) => r.json()))

const STILI_STRATI = {
  zone: { nome: 'Zone acquaiolo', stile: { color: '#777', weight: 1, dashArray: '4 4', fillOpacity: 0.03 } },
  rip: { nome: 'Reticolo principale', stile: { color: '#0a5c5c', weight: 3, opacity: 0.7 } },
  canali: { nome: 'Canali', stile: { color: '#1f77d0', weight: 2, opacity: 0.7 } },
  condotte: { nome: 'Condotte', stile: { color: '#8e44ad', weight: 1.2, dashArray: '5 4', opacity: 0.4 } },
}

const icona = (s, sel) =>
  L.divIcon({
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<div class="pallino ${s.priorita === 'Critica' ? 'critica' : ''} ${sel ? 'sel' : ''} ${s.stato === 'Chiusa' ? 'chiusa' : ''}" style="background:${COLORI[s.priorita]}"></div>`,
  })

const popup = (s) =>
  `<b>${s.codice}</b> · ${s.priorita}<br>${CATEGORIE[s.categoria]}<br><small>${s.fattori.join(', ')} · ${s.stato} · ${eta(s.ricevuta_il)}</small>`

export function Mappa({ segnalazioni, selezionata, onSeleziona, strati = ['zone', 'rip', 'canali', 'condotte'], centro, zoom, conLegenda = true }) {
  const el = useRef(null)
  const mappa = useRef(null)
  const gruppo = useRef(null)
  const adattata = useRef(false)
  const onSel = useRef(onSeleziona)
  onSel.current = onSeleziona

  useEffect(() => {
    const m = L.map(el.current, { zoomControl: true, attributionControl: false })
    mappa.current = m
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, opacity: 0.8 }).addTo(m)
    const overlay = {}
    Object.entries(STILI_STRATI).forEach(([k, { nome, stile }]) => {
      const g = L.layerGroup()
      overlay[nome] = g
      if (strati.includes(k)) g.addTo(m)
      carica(k).then((dati) =>
        L.geoJSON(dati, {
          style: stile,
          onEachFeature: (f, l) =>
            l.bindTooltip(k === 'zone' ? `${f.properties.NOME} · ${f.properties.ZONA}` : f.properties.NOME_COMPL + (f.properties.CODICE_CAN ? ` (${f.properties.CODICE_CAN})` : ''), { sticky: true }),
        }).addTo(g),
      )
    })
    L.control.layers(null, overlay, { collapsed: true, position: 'topright' }).addTo(m)
    gruppo.current = L.layerGroup().addTo(m)
    if (centro) m.setView(centro, zoom ?? 15)
    else m.setView([45.38, 10.5], 11)
    const ro = new ResizeObserver(() => m.invalidateSize())
    ro.observe(el.current)
    return () => {
      ro.disconnect()
      m.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const g = gruppo.current
    g.clearLayers()
    // le Critiche per ultime, così stanno sopra
    ;[...segnalazioni]
      .sort((a, b) => LIVELLI.indexOf(b.priorita) - LIVELLI.indexOf(a.priorita))
      .forEach((s) => {
        const mk = L.marker([s.lat, s.lng], { icon: icona(s, s.id === selezionata), zIndexOffset: s.id === selezionata ? 1000 : 0 })
        mk.bindTooltip(popup(s), { direction: 'top', offset: [0, -8] })
        mk.on('click', () => onSel.current?.(s.id))
        mk.addTo(g)
      })
    // la prima volta, senza un centro imposto, inquadra tutti i pallini
    if (!centro && !adattata.current && segnalazioni.length > 1) {
      mappa.current.fitBounds(L.latLngBounds(segnalazioni.map((s) => [s.lat, s.lng])), { padding: [40, 40] })
      adattata.current = true
    }
  }, [segnalazioni, selezionata])

  useEffect(() => {
    if (centro) mappa.current.setView(centro, Math.max(mappa.current.getZoom(), zoom ?? 15))
  }, [centro?.[0], centro?.[1]])

  return (
    <div className="mappa-wrap">
      <div ref={el} className="mappa" />
      {conLegenda && (
        <div className="legenda">
          {LIVELLI.map((l) => (
            <span key={l}>
              <Pallino livello={l} /> {l}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- blocchi della scheda

export function PrioritaDettaglio({ s }) {
  const { fai } = usePortale()
  const [apri, setApri] = useState(false)
  const [livello, setLivello] = useState(s.priorita)
  const [motivo, setMotivo] = useState('')
  return (
    <div className="prio-dettaglio" style={{ borderLeftColor: COLORI[s.priorita] }}>
      <div>
        <strong>{s.priorita}</strong> <span className="muto">· {TEMPI[s.priorita]}</span>
      </div>
      <div className="muto">
        Perché: {s.fattori.join(', ')}
        {s.override && ` · calcolata: ${s.priorita_calcolata} · corretta: “${s.override.motivo}”`}
      </div>
      {!apri ? (
        <button className="btn-link" onClick={() => setApri(true)}>
          <Icona nome="edit" /> Correggi priorità
        </button>
      ) : (
        <div className="riga-form">
          <select value={livello} onChange={(e) => setLivello(e.target.value)}>
            {LIVELLI.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
          <input placeholder="Motivazione (obbligatoria)" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          <button
            className="btn"
            disabled={!motivo.trim() || livello === s.priorita}
            onClick={() => {
              fai({ tipo: 'override', id: s.id, livello, motivo })
              setApri(false)
              setMotivo('')
            }}
          >
            Salva
          </button>
          <button className="btn-link" onClick={() => setApri(false)}>
            Annulla
          </button>
        </div>
      )}
    </div>
  )
}

export function Contatti({ s }) {
  const { st } = usePortale()
  const nomeAcq = s.acquaiolo ?? s.acquaiolo_zona
  const acq = st.rubrica.find((r) => r.nome === nomeAcq)
  return (
    <div className="contatti">
      <div className="contatto">
        <div>
          <div className="etichetta">{s.acquaiolo ? 'Acquaiolo assegnato' : 'Acquaiolo di zona (proposto)'}</div>
          <strong>{nomeAcq ?? 'Nessuno: zona non servita'}</strong>
          {acq && <div className="numero">{acq.telefono}</div>}
        </div>
        {acq && (
          <div className="bottoni">
            <a className="btn btn-chiama" href={`tel:${acq.telefono.replace(/\s/g, '')}`}>
              <Icona nome="call" piena /> Chiama acquaiolo
            </a>
            <Copia testo={acq.telefono} />
          </div>
        )}
      </div>
      <div className="contatto">
        <div>
          <div className="etichetta">Segnalante</div>
          <div className="numero">{s.segnalante_cellulare}</div>
        </div>
        <div className="bottoni">
          <a className="btn btn-chiama secondario" href={`tel:${s.segnalante_cellulare.replace(/\s/g, '')}`}>
            <Icona nome="call" /> Chiama segnalante
          </a>
          <Copia testo={s.segnalante_cellulare} />
        </div>
      </div>
    </div>
  )
}

// Tasti del ciclo di vita (ticket #6): un passo avanti, Chiudi da ogni stato, indietro/riapri con nota.
export function AzioniStato({ s }) {
  const { st, fai } = usePortale()
  const [modo, setModo] = useState(null)
  const [acq, setAcq] = useState(s.acquaiolo_zona ?? '')
  const [esito, setEsito] = useState('')
  const [orig, setOrig] = useState('')
  const [nota, setNota] = useState('')
  useEffect(() => {
    setModo(null)
    setNota('')
    setEsito('')
    setAcq(s.acquaiolo_zona ?? '')
  }, [s.id, s.stato])

  const i = STATI.indexOf(s.stato)
  const avanti = AVANZA[s.stato]
  return (
    <div className="azioni">
      {!modo && (
        <div className="bottoni">
          {s.stato === 'Chiusa' ? (
            <button className="btn" onClick={() => setModo('riapri')}>
              <Icona nome="replay" /> Riapri
            </button>
          ) : (
            <>
              {avanti && (
                <button className="btn btn-primario" onClick={() => (s.stato === 'In verifica' ? setModo('assegna') : fai({ tipo: 'avanza', id: s.id }))}>
                  {avanti}
                  <Icona nome="arrow_forward" />
                </button>
              )}
              <button className="btn" onClick={() => setModo('chiudi')}>
                <Icona nome="task_alt" /> Chiudi…
              </button>
              {i > 0 && (
                <button className="btn-link" onClick={() => setModo('indietro')}>
                  <Icona nome="undo" /> Torna a {STATI[i - 1]}
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
            {st.rubrica.map((r) => (
              <option key={r.id} value={r.nome}>
                {r.nome} · {r.zona}
                {r.nome === s.acquaiolo_zona ? ' (di zona)' : ''}
              </option>
            ))}
          </select>
          <button className="btn btn-primario" disabled={!acq} onClick={() => fai({ tipo: 'avanza', id: s.id, acquaiolo: acq })}>
            Assegna
          </button>
          <button className="btn-link" onClick={() => setModo(null)}>
            Annulla
          </button>
        </div>
      )}
      {modo === 'chiudi' && (
        <div className="riga-form">
          <select value={esito} onChange={(e) => setEsito(e.target.value)}>
            <option value="">Esito (obbligatorio)…</option>
            {ESITI.map((e) => (
              <option key={e}>{e}</option>
            ))}
          </select>
          {esito === 'duplicata' && (
            <select value={orig} onChange={(e) => setOrig(e.target.value)}>
              <option value="">Duplicato di…</option>
              {st.segnalazioni
                .filter((x) => x.id !== s.id && x.stato !== 'Chiusa')
                .map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.codice} · {CATEGORIE[x.categoria]}
                  </option>
                ))}
            </select>
          )}
          <input placeholder="Nota (facoltativa)" value={nota} onChange={(e) => setNota(e.target.value)} />
          <button
            className="btn btn-primario"
            disabled={!esito || (esito === 'duplicata' && !orig)}
            onClick={() => fai({ tipo: 'chiudi', id: s.id, esito, nota, duplicato_di: orig ? +orig : null })}
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
          <button className="btn btn-primario" disabled={!nota.trim()} onClick={() => fai({ tipo: modo, id: s.id, nota })}>
            {modo === 'riapri' ? 'Riapri' : `Torna a ${STATI[i - 1]}`}
          </button>
          <button className="btn-link" onClick={() => setModo(null)}>
            Annulla
          </button>
        </div>
      )}
    </div>
  )
}

const ICONE_EVENTO = { cambio_stato: 'swap_horiz', nota: 'sticky_note_2', correzione_campo: 'edit', duplicato_collegato: 'link' }

export function Registro({ s }) {
  const { fai } = usePortale()
  const [nota, setNota] = useState('')
  const ev = [...s.registro].reverse()
  return (
    <div className="registro">
      <div className="riga-form">
        <input placeholder="Aggiungi una nota interna (es. telefonata)…" value={nota} onChange={(e) => setNota(e.target.value)} />
        <button
          className="btn"
          disabled={!nota.trim()}
          onClick={() => {
            fai({ tipo: 'nota', id: s.id, nota })
            setNota('')
          }}
        >
          Aggiungi
        </button>
      </div>
      <ol>
        {ev.map((e, j) => (
          <li key={j} className={`ev-${e.tipo}`}>
            <span className="quando">{dataOra(e.quando)}</span>
            <span className="cosa">
              <Icona nome={ICONE_EVENTO[e.tipo]} />
              {e.tipo === 'cambio_stato' && <strong>{e.a}</strong>} {e.nota}
            </span>
            <span className="chi">{e.chi}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

export function Duplicati({ s, onApri }) {
  const { st } = usePortale()
  if (s.duplicato_di) {
    const o = st.segnalazioni.find((x) => x.id === s.duplicato_di)
    return (
      <div className="avviso">
        <Icona nome="link" /> Duplicato di <button className="btn-link" onClick={() => onApri?.(o.id)}>{o?.codice}</button>
      </div>
    )
  }
  if (!s.duplicati.length) return null
  const dup = st.segnalazioni.filter((x) => s.duplicati.includes(x.id))
  return (
    <div className="avviso">
      <strong>
        <Icona nome="group" /> Segnalata anche da {dup.length} persone
      </strong>
      <div className="dup-lista">
        {dup.map((d) => (
          <div key={d.id} className="dup">
            <img src={d.foto} alt="" />
            <button className="btn-link" onClick={() => onApri?.(d.id)}>{d.codice}</button>
            <span>{d.segnalante_cellulare}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------- rubrica acquaioli

export function Rubrica() {
  const { st, fai } = usePortale()
  const [modifica, setModifica] = useState(null)
  const [cerca, setCerca] = useState('')
  const lista = st.rubrica.filter((r) => `${r.nome} ${r.zona}`.toLowerCase().includes(cerca.toLowerCase()))
  const riga = (r) =>
    modifica?.id === r.id ? (
      <tr key={r.id} className="in-modifica">
        <td><input value={modifica.nome} onChange={(e) => setModifica({ ...modifica, nome: e.target.value })} /></td>
        <td><input value={modifica.zona} onChange={(e) => setModifica({ ...modifica, zona: e.target.value })} /></td>
        <td><input value={modifica.telefono} onChange={(e) => setModifica({ ...modifica, telefono: e.target.value })} /></td>
        <td><input value={modifica.note} onChange={(e) => setModifica({ ...modifica, note: e.target.value })} /></td>
        <td className="azioni-riga">
          <button className="btn-icona" title="Salva" onClick={() => { fai({ tipo: 'rubrica_salva', voce: modifica }); setModifica(null) }}><Icona nome="check" /></button>
          <button className="btn-icona" title="Annulla" onClick={() => setModifica(null)}><Icona nome="close" /></button>
        </td>
      </tr>
    ) : (
      <tr key={r.id}>
        <td><strong>{r.nome}</strong></td>
        <td>{r.zona}</td>
        <td className="telefono">
          <a href={`tel:${r.telefono.replace(/\s/g, '')}`}><Icona nome="call" /> {r.telefono}</a> <Copia testo={r.telefono} />
        </td>
        <td className="muto">{r.note}</td>
        <td className="azioni-riga">
          <button className="btn-icona" title="Modifica" onClick={() => setModifica(r)}><Icona nome="edit" /></button>
          <button className="btn-icona" title="Elimina" onClick={() => confirm(`Eliminare ${r.nome}?`) && fai({ tipo: 'rubrica_elimina', id: r.id })}><Icona nome="delete" /></button>
        </td>
      </tr>
    )
  return (
    <div className="rubrica">
      <div className="riga-form">
        <label className="b2-cerca">
          <Icona nome="search" />
          <input placeholder="Cerca acquaiolo o zona" value={cerca} onChange={(e) => setCerca(e.target.value)} />
        </label>
        <button className="btn btn-primario" onClick={() => setModifica({ id: 0, nome: '', zona: '', telefono: '+39 ', note: '' })}>
          <Icona nome="person_add" /> Nuovo acquaiolo
        </button>
      </div>
      <table className="tabella">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Zona</th>
            <th>Telefono</th>
            <th>Note</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {modifica?.id === 0 && riga({ id: 0 })}
          {lista.map(riga)}
        </tbody>
      </table>
    </div>
  )
}
