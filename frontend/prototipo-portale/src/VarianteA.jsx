// Variante A: la mappa è la schermata. Lista flottante a sinistra, scheda a cassetto a destra.
// Ipotesi: l'operatore ragiona per territorio ("cosa succede dove"), la lista è un indice della mappa.
import { useState } from 'react'
import { FILTRI_INIZIALI, filtra, ordina, eta, etichettaCategoria } from './dati.js'
import { AzioniStato, Blocco, Contatti, Cosa, Duplicati, Filtri, Foto, Infrastruttura, Ingresso, Mappa, Pallino, PrioritaDettaglio, Registro, Rubrica, Stato, Transcript, usePortale } from './comuni.jsx'

export const nome = 'Mappa prima'

export default function VarianteA({ sel, setSel }) {
  const { st } = usePortale()
  const [f, setF] = useState(FILTRI_INIZIALI)
  const [filtriAperti, setFiltriAperti] = useState(false)
  const [rubrica, setRubrica] = useState(false)
  const lista = ordina(filtra(st.segnalazioni, f))
  const s = st.segnalazioni.find((x) => x.id === sel)

  return (
    <div className="va">
      <header className="testata">
        <strong>Portale operatore</strong>
        <span className="muto-chiaro">Consorzio di bonifica Garda Chiese</span>
        <span className="spazio" />
        <button className={filtriAperti ? 'on' : ''} onClick={() => setFiltriAperti(!filtriAperti)}>
          ⚲ Filtri
        </button>
        <button className={rubrica ? 'on' : ''} onClick={() => setRubrica(!rubrica)}>
          📒 Rubrica acquaioli
        </button>
        <span className="utente">Lorenzo · Operatore centrale</span>
      </header>
      {filtriAperti && (
        <div className="va-filtri">
          <Filtri f={f} set={setF} conteggio={lista.length} />
        </div>
      )}
      <div className="va-corpo">
        <Mappa segnalazioni={lista} selezionata={sel} onSeleziona={setSel} centro={s ? [s.lat, s.lng] : undefined} />

        <aside className="va-lista">
          <div className="va-lista-testa">
            {lista.length} aperte · {lista.filter((x) => x.priorita === 'Critica').length} critiche
          </div>
          {lista.map((x) => (
            <button key={x.id} className={x.id === sel ? 'va-voce sel' : 'va-voce'} onClick={() => setSel(x.id)}>
              <Pallino livello={x.priorita} />
              <span className="va-voce-testo">
                <strong>{etichettaCategoria(x.categoria)}</strong>
                <span className="muto">
                  {x.codice} · {x.stato} · {eta(x.ricevuta_il)}
                </span>
              </span>
            </button>
          ))}
        </aside>

        {s && (
          <aside className="va-scheda">
            <div className="va-scheda-testa">
              <div>
                <h2>
                  {s.codice} · {etichettaCategoria(s.categoria)}
                </h2>
                <div className="muto">
                  <Stato s={s} /> <Ingresso s={s} /> · ricevuta {eta(s.ricevuta_il)}
                </div>
              </div>
              <button className="btn-x" onClick={() => setSel(null)}>
                ✕
              </button>
            </div>
            <PrioritaDettaglio s={s} />
            <AzioniStato s={s} />
            <Contatti s={s} />
            <Duplicati s={s} onApri={setSel} />
            <Foto s={s} />
            <Blocco titolo="Cosa ha detto">
              <Transcript s={s} />
              <Cosa s={s} />
            </Blocco>
            <Blocco titolo="Infrastruttura identificata">
              <Infrastruttura s={s} />
            </Blocco>
            <Blocco titolo="Registro">
              <Registro s={s} />
            </Blocco>
          </aside>
        )}

        {rubrica && (
          <div className="overlay" onClick={() => setRubrica(false)}>
            <div className="modale" onClick={(e) => e.stopPropagation()}>
              <div className="va-scheda-testa">
                <h2>Rubrica acquaioli</h2>
                <button className="btn-x" onClick={() => setRubrica(false)}>
                  ✕
                </button>
              </div>
              <Rubrica />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
