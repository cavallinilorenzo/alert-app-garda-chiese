// PROTOTIPO usa-e-getta (ticket #10 "Layout del portale operatore").
// Al primo giro c'erano tre varianti (A mappa prima, B coda di lavoro, C tabellone per stato): è stata
// scelta B, e qui resta solo la sua rifinitura. Le altre sono nella storia del branch (commit 43532be).
// Dati finti in memoria; nella barra del prototipo "ricomincia" li riporta all'inizio, {} mostra la segnalazione aperta.
import { useEffect, useReducer, useState } from 'react'
import PortaleOperatore from './PortaleOperatore.jsx'
import { Icona, Portale } from './comuni.jsx'
import { riduttore, statoIniziale } from './dati.js'

export default function App() {
  const [st, fai] = useReducer(riduttore, null, statoIniziale)
  const [sel, setSel] = useState(null)
  const [pannello, setPannello] = useState(false)

  // un vecchio ?variant= nell'URL non serve più
  useEffect(() => {
    if (location.search) history.replaceState(null, '', location.pathname)
  }, [])

  useEffect(() => {
    const tasto = (e) => e.key === 'Escape' && !e.target.closest?.('input, textarea, select') && setSel(null)
    window.addEventListener('keydown', tasto)
    return () => window.removeEventListener('keydown', tasto)
  }, [])

  const aperta = st.segnalazioni.find((s) => s.id === sel)

  return (
    <Portale.Provider value={{ st, fai }}>
      <PortaleOperatore sel={sel} setSel={setSel} />

      {import.meta.env.DEV && (
        <div className="proto">
          {pannello && (
            <pre className="proto-pannello">{aperta ? JSON.stringify(aperta, null, 2) : 'Apri una segnalazione per vederne lo stato.'}</pre>
          )}
          <div className="proto-barra">
            <span>PROTOTIPO</span>
            <button
              onClick={() => {
                fai({ tipo: 'reset' })
                setSel(null)
              }}
              title="Ricomincia con i dati iniziali"
            >
              <Icona nome="restart_alt" />
            </button>
            <button className={pannello ? 'on' : ''} onClick={() => setPannello(!pannello)} title="Stato della segnalazione aperta">
              <Icona nome="data_object" />
            </button>
          </div>
        </div>
      )}
    </Portale.Provider>
  )
}
