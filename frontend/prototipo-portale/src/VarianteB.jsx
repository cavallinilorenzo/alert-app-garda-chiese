// Variante B: coda di lavoro. Tabella densa come schermata principale, scheda affiancata su due colonne,
// mappa come pagina a parte (e mini-mappa dentro la scheda).
// Ipotesi: l'operatore smaltisce una coda in ordine di priorità, il territorio serve solo per la singola segnalazione.
import { useState } from 'react'
import { FILTRI_INIZIALI, filtra, ordina, eta, etichettaCategoria } from './dati.js'
import { AzioniStato, Blocco, Contatti, Cosa, Duplicati, Filtri, Foto, Infrastruttura, Ingresso, Mappa, PrioritaDettaglio, Priorita, Registro, Rubrica, Stato, Transcript, usePortale } from './comuni.jsx'

export const nome = 'Coda di lavoro'

export default function VarianteB({ sel, setSel }) {
  const { st } = usePortale()
  const [pagina, setPagina] = useState('coda')
  const [f, setF] = useState(FILTRI_INIZIALI)
  const lista = ordina(filtra(st.segnalazioni, f))
  const s = st.segnalazioni.find((x) => x.id === sel)
  const conta = (stato) => st.segnalazioni.filter((x) => x.stato === stato).length

  return (
    <div className="vb">
      <nav className="vb-nav">
        <div className="vb-logo">
          Garda Chiese
          <small>Portale operatore</small>
        </div>
        <button className={pagina === 'coda' ? 'on' : ''} onClick={() => setPagina('coda')}>
          📋 Segnalazioni <span className="num">{conta('Ricevuta')} nuove</span>
        </button>
        <button className={pagina === 'mappa' ? 'on' : ''} onClick={() => setPagina('mappa')}>
          🗺️ Mappa
        </button>
        <button className={pagina === 'rubrica' ? 'on' : ''} onClick={() => setPagina('rubrica')}>
          📒 Rubrica acquaioli
        </button>
        <span className="spazio" />
        <div className="utente">Lorenzo<br /><small>Operatore centrale</small></div>
      </nav>

      <main className="vb-main">
        {pagina === 'coda' && (
          <>
            <Filtri f={f} set={setF} conteggio={lista.length} />
            <div className={s ? 'vb-split aperta' : 'vb-split'}>
              <div className="vb-tabella">
                <table className="tabella cliccabile">
                  <thead>
                    <tr>
                      <th>Priorità</th>
                      <th>Codice</th>
                      {!s && <th>Cosa</th>}
                      <th>Stato</th>
                      {!s && <th>Infrastruttura</th>}
                      {!s && <th>Zona · acquaiolo</th>}
                      {!s && <th>Ingresso</th>}
                      <th>Ricevuta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((x) => (
                      <tr key={x.id} className={x.id === sel ? 'sel' : ''} onClick={() => setSel(x.id)}>
                        <td title={x.fattori.join(', ')}>
                          <Priorita s={x} />
                        </td>
                        <td>{x.codice}</td>
                        {!s && <td>{etichettaCategoria(x.categoria)}</td>}
                        <td>
                          <Stato s={x} />
                        </td>
                        {!s && (
                          <td>
                            {x.infrastruttura.layer} {x.infrastruttura.codice} <span className="muto">· {x.infrastruttura.distanza_m} m</span>
                          </td>
                        )}
                        {!s && (
                          <td>
                            {x.zona ?? '—'} · {x.acquaiolo ?? <span className="muto">{x.acquaiolo_zona ?? 'non servita'}</span>}
                          </td>
                        )}
                        {!s && (
                          <td>
                            <Ingresso s={x} />
                          </td>
                        )}
                        <td className="muto">{eta(x.ricevuta_il)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {s && (
                <section className="vb-scheda">
                  <div className="vb-scheda-testa">
                    <div>
                      <h2>
                        {s.codice} · {etichettaCategoria(s.categoria)}
                      </h2>
                      <div className="muto">
                        <Ingresso s={s} /> · ricevuta {eta(s.ricevuta_il)} · operatore di riferimento: {s.operatore_riferimento ?? '—'}
                      </div>
                    </div>
                    <button className="btn-x" onClick={() => setSel(null)}>
                      ✕
                    </button>
                  </div>
                  <AzioniStato s={s} />
                  <Duplicati s={s} onApri={setSel} />
                  <div className="vb-colonne">
                    <div>
                      <Foto s={s} alta={240} />
                      <Blocco titolo="Segnalazione">
                        <Transcript s={s} />
                        <Cosa s={s} />
                      </Blocco>
                      <Blocco titolo="Priorità">
                        <PrioritaDettaglio s={s} />
                      </Blocco>
                    </div>
                    <div>
                      <div className="vb-minimappa">
                        <Mappa key={s.id} segnalazioni={[s]} selezionata={s.id} centro={[s.lat, s.lng]} zoom={15} strati={['canali', 'condotte', 'rip']} conLegenda={false} />
                      </div>
                      <Blocco titolo="Infrastruttura identificata">
                        <Infrastruttura s={s} />
                      </Blocco>
                      <Blocco titolo="Contatti">
                        <Contatti s={s} compatto />
                      </Blocco>
                      <Blocco titolo="Registro">
                        <Registro s={s} />
                      </Blocco>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </>
        )}

        {pagina === 'mappa' && (
          <div className="vb-pagina-mappa">
            <Filtri f={f} set={setF} verticale conteggio={lista.length} />
            <Mappa
              segnalazioni={lista}
              selezionata={sel}
              onSeleziona={(id) => {
                setSel(id)
                setPagina('coda')
              }}
            />
          </div>
        )}

        {pagina === 'rubrica' && (
          <div className="vb-pagina">
            <h1>Rubrica acquaioli</h1>
            <Rubrica />
          </div>
        )}
      </main>
    </div>
  )
}
