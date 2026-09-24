import { useBozza, type Modalita } from '../bozza'
import { Icona, NUMERO_VERDE, TEL_NUMERO_VERDE } from '../comuni'
import { Schermata, useProcedura } from '../procedura'

// Variante A del prototipo del ticket #102: il numero verde è la cosa più grande della schermata,
// sopra i due modi di raccontare. Tutto deve stare senza scorrere su un telefono da 667px.
export function Inizio() {
  const { aggiorna } = useBozza()
  const { vai } = useProcedura()

  const scegli = (modalita: Modalita) => {
    aggiorna({ modalita })
    vai('posizione')
  }

  return (
    <Schermata>
      <div className="inizio">
        <h1>Segnala un problema</h1>
        <a className="chiama-grande" href={TEL_NUMERO_VERDE}>
          <span className="chiama-icona">
            <Icona n="call" piena />
          </span>
          <span>
            <small>Qualcuno è in pericolo?</small>
            <strong>Chiama il numero verde</strong>
            <b>{NUMERO_VERDE}</b>
          </span>
        </a>
        <p className="etichetta">Come vuoi raccontarlo?</p>
        <div className="due">
          <button className="tessera primaria" onClick={() => scegli('voce')}>
            <Icona n="mic" piena />
            <strong>A voce</strong>
          </button>
          <button className="tessera" onClick={() => scegli('domande')}>
            <Icona n="checklist" />
            <strong>Con domande</strong>
          </button>
        </div>
      </div>
    </Schermata>
  )
}
