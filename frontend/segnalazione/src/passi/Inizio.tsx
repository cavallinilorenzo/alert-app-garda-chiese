import { useBozza, type Modalita } from '../bozza'
import { Icona, NUMERO_VERDE, TEL_NUMERO_VERDE } from '../comuni'
import { Schermata, useProcedura } from '../procedura'

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
        <span className="tondo">
          <Icona n="water_drop" piena />
        </span>
        <h1>Segnala un problema su canali e condotte</h1>
        <p className="lead">
          Acqua che esce dal terreno, un canale che tracima, un argine franato: avvisa il Consorzio in pochi minuti.
        </p>
        <div className="card">
          <p className="card-titolo">Ti chiederemo</p>
          <ul className="elenco">
            <li><Icona n="location_on" /> La posizione del problema</li>
            <li><Icona n="photo_camera" /> Una foto</li>
            <li><Icona n="chat" /> Cosa hai visto</li>
            <li><Icona n="call" /> Il tuo numero di cellulare</li>
          </ul>
        </div>
        <p className="card-titolo">Come preferisci raccontarlo?</p>
        <button className="scelta" onClick={() => scegli('voce')}>
          <span className="riga-icona forte"><Icona n="mic" piena /></span>
          <span className="scelta-testo">
            <strong>A voce</strong>
            <span>Parli come al telefono, al resto pensiamo noi</span>
          </span>
          <Icona n="chevron_right" />
        </button>
        <button className="scelta" onClick={() => scegli('domande')}>
          <span className="riga-icona"><Icona n="edit_note" /></span>
          <span className="scelta-testo">
            <strong>Rispondendo alle domande</strong>
            <span>Scegli tra poche risposte già pronte</span>
          </span>
          <Icona n="chevron_right" />
        </button>
        <p className="avviso-emergenza">
          <Icona n="emergency" />
          <span>
            Se qualcuno è in pericolo chiama il numero verde <a href={TEL_NUMERO_VERDE}>{NUMERO_VERDE}</a>.
          </span>
        </p>
      </div>
    </Schermata>
  )
}
