import { Icona } from '../comuni'
import { Schermata } from '../procedura'

// Segnaposto per i passi non ancora implementati (foto, descrizione, contatto, invio).
export function InArrivo() {
  return (
    <Schermata titolo="In costruzione">
      <div className="centro">
        <span className="tondo grande"><Icona n="construction" /></span>
        <p className="nota">Questo passo arriva con i prossimi rilasci dell’App di segnalazione.</p>
      </div>
    </Schermata>
  )
}
