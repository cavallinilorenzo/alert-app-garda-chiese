// PROTOTIPO usa-e-getta (ticket #9 "Flusso dell'app di segnalazione").
// Tre varianti del flusso mobile, switchabili con ?variant=A|B|C e la barra in basso.
// Scenario (GPS, perimetro, risposta AI) simulato dal pannello ⚙; il pannello {} mostra la segnalazione in corso.
import { useEffect, useState } from 'react'
import VarianteA, { nome as nomeA } from './VarianteA.jsx'
import VarianteB, { nome as nomeB } from './VarianteB.jsx'
import VarianteC, { nome as nomeC } from './VarianteC.jsx'
import { OPZIONI_SCENARIO, SCENARIO_INIZIALE } from './dati.js'

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
  const [scenario, setScenario] = useState(SCENARIO_INIZIALE)
  const [giro, setGiro] = useState(0)
  const [pannello, setPannello] = useState(null)
  const [stato, setStato] = useState(null)

  const vai = (v) => {
    const url = new URL(location.href)
    url.searchParams.set('variant', v)
    history.replaceState(null, '', url)
    setVariante(v)
    window.scrollTo(0, 0)
  }
  const sposta = (d) => vai(CHIAVI[(CHIAVI.indexOf(variante) + d + CHIAVI.length) % CHIAVI.length])

  useEffect(() => {
    const tasto = (e) => {
      const t = e.target
      if (t.closest?.('input, textarea, [contenteditable]')) return
      if (e.key === 'ArrowLeft') sposta(-1)
      if (e.key === 'ArrowRight') sposta(1)
    }
    window.addEventListener('keydown', tasto)
    return () => window.removeEventListener('keydown', tasto)
  })

  const [Componente, nome] = VARIANTI[variante]

  return (
    <>
      <Componente key={`${variante}-${giro}`} scenario={scenario} onStato={setStato} />

      {import.meta.env.DEV && (
        <div className="proto">
          {pannello === 'scenario' && (
            <div className="proto-pannello">
              <strong>Scenario simulato</strong>
              {Object.entries(OPZIONI_SCENARIO).map(([k, opz]) => (
                <div key={k} className="proto-riga">
                  {opz.map(([v, t]) => (
                    <button key={v} className={scenario[k] === v ? 'on' : ''} onClick={() => setScenario({ ...scenario, [k]: v })}>
                      {t}
                    </button>
                  ))}
                </div>
              ))}
              <p>Cambia lo scenario e premi ↺ per rifare il flusso.</p>
            </div>
          )}
          {pannello === 'stato' && (
            <pre className="proto-pannello">{JSON.stringify({ ...stato, foto: stato?.foto ? '(foto)' : null }, null, 2)}</pre>
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
            <button onClick={() => setGiro(giro + 1)} title="Ricomincia">
              ↺
            </button>
            <button className={pannello === 'scenario' ? 'on' : ''} onClick={() => setPannello(pannello === 'scenario' ? null : 'scenario')} title="Scenario">
              ⚙
            </button>
            <button className={pannello === 'stato' ? 'on' : ''} onClick={() => setPannello(pannello === 'stato' ? null : 'stato')} title="Stato">
              {'{}'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
