// PROTOTIPO usa-e-getta (ticket #10 "Layout del portale operatore").
// Tre varianti del Portale operatore, switchabili con ?variant=A|B|C e la barra in basso.
// Dati finti in memoria, condivisi tra le varianti: un'azione fatta in A si vede anche in B e C.
// Il pannello {} mostra la segnalazione aperta; ↺ riporta i dati all'inizio.
import { useEffect, useReducer, useState } from 'react'
import VarianteA, { nome as nomeA } from './VarianteA.jsx'
import VarianteB, { nome as nomeB } from './VarianteB.jsx'
import VarianteC, { nome as nomeC } from './VarianteC.jsx'
import { Portale } from './comuni.jsx'
import { riduttore, statoIniziale } from './dati.js'

const VARIANTI = {
  A: [VarianteA, nomeA],
  B: [VarianteB, nomeB],
  C: [VarianteC, nomeC],
}
const CHIAVI = Object.keys(VARIANTI)

const leggiVariante = () => {
  const v = new URLSearchParams(location.search).get('variant')
  return CHIAVI.includes(v) ? v : 'A'
}

export default function App() {
  const [variante, setVariante] = useState(leggiVariante)
  const [st, fai] = useReducer(riduttore, null, statoIniziale)
  const [sel, setSel] = useState(null)
  const [pannello, setPannello] = useState(false)

  const vai = (v) => {
    const url = new URL(location.href)
    url.searchParams.set('variant', v)
    history.replaceState(null, '', url)
    setVariante(v)
  }
  const sposta = (d) => vai(CHIAVI[(CHIAVI.indexOf(variante) + d + CHIAVI.length) % CHIAVI.length])

  useEffect(() => {
    const tasto = (e) => {
      if (e.target.closest?.('input, textarea, select, [contenteditable]')) return
      if (e.key === 'ArrowLeft') sposta(-1)
      if (e.key === 'ArrowRight') sposta(1)
      if (e.key === 'Escape') setSel(null)
    }
    window.addEventListener('keydown', tasto)
    return () => window.removeEventListener('keydown', tasto)
  })

  const [Componente, nome] = VARIANTI[variante]
  const aperta = st.segnalazioni.find((s) => s.id === sel)

  return (
    <Portale.Provider value={{ st, fai }}>
      <Componente key={variante} sel={sel} setSel={setSel} />

      {import.meta.env.DEV && (
        <div className="proto">
          {pannello && (
            <pre className="proto-pannello">{aperta ? JSON.stringify(aperta, null, 2) : 'Apri una segnalazione per vederne lo stato.'}</pre>
          )}
          <div className="proto-barra">
            <button onClick={() => sposta(-1)} aria-label="Variante precedente">
              ◀
            </button>
            <span>
              {variante} · {nome}
            </span>
            <button onClick={() => sposta(1)} aria-label="Variante successiva">
              ▶
            </button>
            <button
              onClick={() => {
                fai({ tipo: 'reset' })
                setSel(null)
              }}
              title="Ricomincia con i dati iniziali"
            >
              ↺
            </button>
            <button className={pannello ? 'on' : ''} onClick={() => setPannello(!pannello)} title="Stato della segnalazione aperta">
              {'{}'}
            </button>
          </div>
        </div>
      )}
    </Portale.Provider>
  )
}
