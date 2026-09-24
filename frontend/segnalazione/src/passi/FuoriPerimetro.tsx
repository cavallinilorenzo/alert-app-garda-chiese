import { Icona, NUMERO_UNICO_EMERGENZA } from '../comuni'
import { Schermata, useProcedura } from '../procedura'

// Il punto non è sul Reticolo consortile: nessun invio, solo a chi rivolgersi.
export function FuoriPerimetro() {
  const { vai } = useProcedura()

  return (
    <Schermata
      titolo="Qui non interviene il Consorzio"
      azione={
        <button className="btn secondario" onClick={() => vai('posizione')}>
          <Icona n="edit_location_alt" /> Correggo il punto
        </button>
      }
    >
      <div className="gruppo">
        <div className="riga-info">
          <Icona n="water_drop" />
          <span>
            <strong>Acqua di casa, fogne</strong>
            <small>Acquedotto del Comune</small>
          </span>
        </div>
        <div className="riga-info">
          <Icona n="account_balance" />
          <span>
            <strong>Strade, fossi privati</strong>
            <small>Ufficio tecnico del Comune</small>
          </span>
        </div>
        <a className="riga-info rossa" href={`tel:${NUMERO_UNICO_EMERGENZA}`}>
          <Icona n="emergency" />
          <span>
            <strong>Persone in pericolo</strong>
            <small>Chiama il {NUMERO_UNICO_EMERGENZA}</small>
          </span>
          <Icona n="call" />
        </a>
      </div>
    </Schermata>
  )
}
