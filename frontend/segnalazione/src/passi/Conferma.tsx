import { useState } from 'react'
import { useBozza } from '../bozza'
import { Icona, NUMERO_EMERGENZA } from '../comuni'
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
              <Icona n="share" /> Salva o condividi il link
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
        <p className="lead">
          Grazie. Il Consorzio l’ha ricevuta e la prenderà in carico. Se serve, ti chiameremo al numero che ci hai dato.
        </p>
        {ricevuta.pericolo_immediato && (
          <div className="card rossa" role="alert">
            <p>
              <strong>Hai indicato un pericolo.</strong> Se qualcuno è in pericolo adesso, chiama il numero unico di
              emergenza: il Consorzio non è un servizio di pronto intervento.
            </p>
            <a className="btn rosso" href={`tel:${NUMERO_EMERGENZA}`}>
              <Icona n="call" piena /> Chiama il {NUMERO_EMERGENZA}
            </a>
          </div>
        )}
        <div className="card">
          <p className="card-titolo">Codice della segnalazione</p>
          <p className="codice">{ricevuta.codice_pratica}</p>
          <p className="nota">Se chiami il Consorzio, comunica questo codice.</p>
          <p className="card-titolo">Segui lo stato della tua segnalazione</p>
          <div className="link">
            <span>{link}</span>
            <button onClick={copia} aria-label="Copia il link">
              <Icona n={copiato ? 'check' : 'content_copy'} />
            </button>
          </div>
          <p className="nota">
            {copiato ? 'Link copiato.' : 'Salva questo link: è l’unico modo per vedere a che punto è la segnalazione.'}
          </p>
        </div>
      </div>
    </Schermata>
  )
}
