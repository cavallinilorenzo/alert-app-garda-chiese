import { useState } from 'react'
import { useBozza } from '../bozza'
import { Icona } from '../comuni'
import { cellulareValido } from '../invio'
import { Schermata, useProcedura } from '../procedura'

export function Contatto() {
  const { bozza, aggiorna } = useBozza()
  const { vai } = useProcedura()
  // L'errore si mostra solo dopo che il Segnalante ha lasciato la casella, non mentre scrive.
  const [toccato, setToccato] = useState(false)
  const valido = cellulareValido(bozza.cellulare)

  return (
    <Schermata
      titolo="Il tuo cellulare"
      azione={
        <button className="btn" disabled={!valido} onClick={() => vai('riepilogo')}>
          Continua
        </button>
      }
    >
      <label className={`telefono ${toccato && !valido ? 'errore' : ''}`}>
        <span className="prefisso">+39</span>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          placeholder="333 123 4567"
          aria-label="Numero di cellulare"
          value={bozza.cellulare}
          onChange={(e) => aggiorna({ cellulare: e.target.value })}
          onBlur={() => setToccato(true)}
        />
      </label>
      {toccato && !valido && (
        <p className="errore-campo" role="alert">
          Scrivi un cellulare italiano, per esempio 333 123 4567.
        </p>
      )}
      <p className="nota">
        <Icona n="lock" /> Lo vede solo il Consorzio.
      </p>
    </Schermata>
  )
}
