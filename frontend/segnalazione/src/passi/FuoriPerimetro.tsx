import { Icona, NUMERO_UNICO_EMERGENZA } from '../comuni'
import { Schermata, useProcedura } from '../procedura'

// Il punto non è sul Reticolo consortile: nessun invio, solo a chi rivolgersi.
export function FuoriPerimetro() {
  const { vai } = useProcedura()

  return (
    <Schermata
      azione={
        <button className="btn secondario" onClick={() => vai('posizione')}>
          <Icona n="edit_location_alt" /> Il punto è sbagliato, lo correggo
        </button>
      }
    >
      <div className="fuori">
        <span className="tondo rosso">
          <Icona n="wrong_location" />
        </span>
        <h1>Questo punto non è di competenza del Consorzio</h1>
        <p className="lead">
          Qui non ci sono canali o condotte del Consorzio di bonifica Garda Chiese, quindi la segnalazione non verrà
          inviata.
        </p>
        <div className="card">
          <p className="card-titolo">A chi puoi rivolgerti</p>
          <ul className="elenco">
            <li>
              <Icona n="water_drop" />
              <span><strong>Acqua di casa, fogne, tombini</strong><br />Il gestore dell’acquedotto del tuo Comune</span>
            </li>
            <li>
              <Icona n="account_balance" />
              <span><strong>Strade, fossi privati, rifiuti</strong><br />L’ufficio tecnico del tuo Comune</span>
            </li>
            <li>
              <Icona n="emergency" />
              <span>
                <strong>Persone in pericolo</strong><br />Numero unico di emergenza{' '}
                <a href={`tel:${NUMERO_UNICO_EMERGENZA}`}>{NUMERO_UNICO_EMERGENZA}</a>
              </span>
            </li>
          </ul>
        </div>
      </div>
    </Schermata>
  )
}
