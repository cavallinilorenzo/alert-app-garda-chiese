import { useState } from 'react'
import { useBozza } from '../bozza'
import { Icona, NUMERO_VERDE, TEL_NUMERO_VERDE } from '../comuni'
import { Schermata } from '../procedura'
import { linkStato } from '../stato'

export function Conferma() {
  const { bozza } = useBozza()
  const [copiato, setCopiato] = useState(false)
  const ricevuta = bozza.ricevuta
  if (!ricevuta) return null

  const link = linkStato(ricevuta.token_stato)
  const puoCondividere = typeof navigator.share === 'function'

  async function copia() {
    try {
      await navigator.clipboard.writeText(link)
      setCopiato(true)
    } catch {
      // Senza permesso per gli appunti il link resta lì da selezionare a mano.
    }
  }

  const condividi = () =>
    navigator.share({ title: `Segnalazione ${ricevuta.codice_pratica}`, url: link }).catch(() => {})

  return (
    <Schermata
      azione={
        <>
          {puoCondividere && (
            <button className="btn secondario" onClick={condividi}>
              <Icona n="share" /> Salva il link
            </button>
          )}
          <a className="btn testo" href={link}>
            Apri la pagina di stato
          </a>
        </>
      }
    >
      <div className="conferma">
        <span className="tondo verde grande"><Icona n="check" /></span>
        <h1>Segnalazione inviata</h1>
      </div>
      {ricevuta.pericolo_immediato && (
        <a className="chiama-grande" href={TEL_NUMERO_VERDE}>
          <span className="chiama-icona"><Icona n="call" piena /></span>
          <span>
            <small>Hai indicato un pericolo</small>
            <strong>Chiama adesso</strong>
            <b>{NUMERO_VERDE}</b>
          </span>
        </a>
      )}
      <div className="codice">
        <small>Codice</small>
        <strong>{ricevuta.codice_pratica}</strong>
      </div>
      <div className="link">
        <span>{link}</span>
        <button onClick={copia} aria-label="Copia il link">
          <Icona n={copiato ? 'check' : 'content_copy'} />
        </button>
      </div>
      <p className="nota centrata">{copiato ? 'Link copiato.' : 'Con questo link vedi a che punto è.'}</p>
    </Schermata>
  )
}
