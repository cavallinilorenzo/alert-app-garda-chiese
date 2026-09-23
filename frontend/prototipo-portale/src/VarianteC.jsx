// Variante C: tabellone per stato. Colonne Ricevuta → In intervento (Chiusa ridotta), card con il tasto
// del prossimo passo, striscia di mappa richiudibile in alto, scheda come finestra grande a schede.
// Ipotesi: l'operatore ragiona per "a che punto è", e la maggior parte delle azioni si fa senza aprire la scheda.
import { useState } from 'react'
import { AVANZA, COLORI, FILTRI_INIZIALI, STATI, filtra, ordina, eta, etichettaCategoria } from './dati.js'
import { AzioniStato, Contatti, Cosa, Duplicati, Filtri, Foto, Infrastruttura, Ingresso, Mappa, PrioritaDettaglio, Priorita, Registro, Rubrica, Stato, Transcript, usePortale } from './comuni.jsx'

export const nome = 'Tabellone per stato'

function Card({ s, onApri }) {
  const { fai } = usePortale()
  const passo = AVANZA[s.stato]
  return (
    <div className={`vc-card ${s.priorita === 'Critica' ? 'critica' : ''}`} style={{ borderLeftColor: COLORI[s.priorita] }} onClick={onApri}>
      <div className="vc-card-testa">
        <Priorita s={s} />
        <span className="muto">{eta(s.ricevuta_il)}</span>
      </div>
      <strong>{etichettaCategoria(s.categoria)}</strong>
      <div className="muto">
        {s.codice} · {s.infrastruttura.layer} {s.infrastruttura.codice} · {s.zona ?? '—'}
      </div>
      <div className="muto">👷 {s.acquaiolo ?? `${s.acquaiolo_zona ?? 'non servita'} (di zona)`}</div>
      {s.duplicati.length > 0 && <div className="tag">+{s.duplicati.length} duplicati</div>}
      {passo && s.stato !== 'In verifica' && (
        <button
          className="btn-mini vc-passo"
          onClick={(e) => {
            e.stopPropagation()
            fai({ tipo: 'avanza', id: s.id })
          }}
        >
          {passo} →
        </button>
      )}
      {s.stato === 'In verifica' && s.acquaiolo_zona && (
        <button
          className="btn-mini vc-passo"
          onClick={(e) => {
            e.stopPropagation()
            fai({ tipo: 'avanza', id: s.id, acquaiolo: s.acquaiolo_zona })
          }}
        >
          Assegna a {s.acquaiolo_zona} →
        </button>
      )}
    </div>
  )
}

export default function VarianteC({ sel, setSel }) {
  const { st } = usePortale()
  const [f, setF] = useState({ ...FILTRI_INIZIALI, stati: STATI })
  const [mappa, setMappa] = useState(true)
  const [chiuse, setChiuse] = useState(false)
  const [rubrica, setRubrica] = useState(false)
  const [scheda, setScheda] = useState('dettagli')
  const lista = ordina(filtra(st.segnalazioni, f))
  const s = st.segnalazioni.find((x) => x.id === sel)

  return (
    <div className="vc">
      <header className="testata">
        <strong>Portale operatore</strong>
        <span className="spazio" />
        <button className={mappa ? 'on' : ''} onClick={() => setMappa(!mappa)}>
          🗺️ Mappa
        </button>
        <button className={rubrica ? 'on' : ''} onClick={() => setRubrica(!rubrica)}>
          📒 Rubrica
        </button>
        <span className="utente">Lorenzo · Operatore centrale</span>
      </header>
      <Filtri f={f} set={setF} senzaStato conteggio={lista.filter((x) => x.stato !== 'Chiusa').length} />
      {mappa && (
        <div className="vc-striscia">
          <Mappa segnalazioni={lista.filter((x) => x.stato !== 'Chiusa')} selezionata={sel} onSeleziona={setSel} />
        </div>
      )}
      <div className="vc-tabellone">
        {STATI.map((stato) => {
          const col = lista.filter((x) => x.stato === stato)
          if (stato === 'Chiusa' && !chiuse)
            return (
              <button key={stato} className="vc-col-ridotta" onClick={() => setChiuse(true)}>
                Chiusa ({col.length}) ›
              </button>
            )
          return (
            <div key={stato} className="vc-col">
              <h3>
                {stato} <span className="num">{col.length}</span>
                {stato === 'Chiusa' && (
                  <button className="btn-mini" onClick={() => setChiuse(false)}>
                    ‹
                  </button>
                )}
              </h3>
              {col.map((x) => (
                <Card key={x.id} s={x} onApri={() => setSel(x.id)} />
              ))}
            </div>
          )
        })}
      </div>

      {s && (
        <div className="overlay" onClick={() => setSel(null)}>
          <div className="modale vc-scheda" onClick={(e) => e.stopPropagation()}>
            <div className="vc-scheda-testa">
              <Foto s={s} alta={140} />
              <div className="vc-scheda-titolo">
                <h2>
                  {s.codice} · {etichettaCategoria(s.categoria)}
                </h2>
                <div className="muto">
                  <Stato s={s} /> <Ingresso s={s} /> · ricevuta {eta(s.ricevuta_il)}
                </div>
                <p>{s.descrizione}</p>
              </div>
              <button className="btn-x" onClick={() => setSel(null)}>
                ✕
              </button>
            </div>
            <div className="vc-schede">
              {[
                ['dettagli', 'Dettagli'],
                ['posizione', 'Posizione e infrastruttura'],
                ['contatti', 'Contatti'],
                ['registro', `Registro (${s.registro.length})`],
              ].map(([k, t]) => (
                <button key={k} className={scheda === k ? 'on' : ''} onClick={() => setScheda(k)}>
                  {t}
                </button>
              ))}
            </div>
            <div className="vc-scheda-corpo">
              <Duplicati s={s} onApri={setSel} />
              {scheda === 'dettagli' && (
                <>
                  <PrioritaDettaglio s={s} />
                  <Transcript s={s} />
                  <Cosa s={s} />
                </>
              )}
              {scheda === 'posizione' && (
                <>
                  <Infrastruttura s={s} />
                  <div className="vc-mappa-scheda">
                    <Mappa key={s.id} segnalazioni={[s]} selezionata={s.id} centro={[s.lat, s.lng]} zoom={16} conLegenda={false} />
                  </div>
                </>
              )}
              {scheda === 'contatti' && <Contatti s={s} />}
              {scheda === 'registro' && <Registro s={s} />}
            </div>
            <div className="vc-scheda-piede">
              <AzioniStato s={s} />
            </div>
          </div>
        </div>
      )}

      {rubrica && (
        <aside className="vc-rubrica">
          <div className="vc-scheda-testa">
            <h2>Rubrica acquaioli</h2>
            <button className="btn-x" onClick={() => setRubrica(false)}>
              ✕
            </button>
          </div>
          <Rubrica compatta />
        </aside>
      )}
    </div>
  )
}
