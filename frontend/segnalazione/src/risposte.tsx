import { useState } from 'react'
import { useBozza } from './bozza'
import { Icona, NUMERO_VERDE, TEL_NUMERO_VERDE } from './comuni'
import { DESCRIZIONE_MAX, DESCRIZIONE_MIN, type Campi, type Domanda } from './tassonomia'

// Le risposte del passo Descrizione, a voce o a mano: i controlli di ogni campo e la
// finestra del numero verde quando c'è pericolo per le persone.

/** Aggiorna le risposte nella bozza e apre la finestra del numero verde quando il pericolo per le persone diventa "sì". */
export function useRisposte() {
  const { bozza, aggiorna } = useBozza()
  const [emergenza, setEmergenza] = useState(false)

  function rispondi(nuove: Campi) {
    if (nuove.pericolo_persone === 'si' && bozza.campi.pericolo_persone !== 'si') setEmergenza(true)
    aggiorna({ campi: { ...bozza.campi, ...nuove } })
  }

  const finestra = emergenza ? <Emergenza onContinua={() => setEmergenza(false)} /> : null
  return { campi: bozza.campi, rispondi, finestra }
}

type PropsControllo = { domanda: Domanda; valore: string | undefined; onChange: (valore: string) => void }

/** Il controllo di un campo: la lista delle categorie, la casella della descrizione o le opzioni. */
export function Controllo({ domanda, valore, onChange }: PropsControllo) {
  if (!domanda.opzioni) return <CasellaDescrizione valore={valore ?? ''} onChange={onChange} />

  const conIcone = domanda.opzioni.some((o) => o.icona)
  const classe = conIcone ? 'lista' : domanda.opzioni.length <= 3 ? 'segmenti' : 'griglia'
  return (
    <div className={classe} role="radiogroup" aria-label={domanda.testo}>
      {domanda.opzioni.map((o) => (
        <button
          key={o.valore}
          role="radio"
          aria-checked={valore === o.valore}
          className={`riga ${valore === o.valore ? 'scelta' : ''}`}
          onClick={() => onChange(o.valore)}
        >
          {o.icona && <span className="riga-icona"><Icona n={o.icona} /></span>}
          <span className="riga-testo">{o.etichetta}</span>
          {conIcone && (
            <Icona n={valore === o.valore ? 'radio_button_checked' : 'radio_button_unchecked'} className="radio" />
          )}
        </button>
      ))}
    </div>
  )
}

function CasellaDescrizione({ valore, onChange }: { valore: string; onChange: (v: string) => void }) {
  const corta = valore.trim().length < DESCRIZIONE_MIN
  return (
    <label className="campo">
      <textarea
        rows={4}
        maxLength={DESCRIZIONE_MAX}
        placeholder="Ad esempio: esce acqua dal terreno vicino alla strada"
        value={valore}
        onChange={(e) => onChange(e.target.value)}
      />
      <span className={`contatore ${valore.length > 0 && corta ? 'errore' : ''}`}>
        {corta ? `Almeno ${DESCRIZIONE_MIN} caratteri` : `${valore.length}/${DESCRIZIONE_MAX}`}
      </span>
    </label>
  )
}

function Emergenza({ onContinua }: { onContinua: () => void }) {
  return (
    <div className="velo">
      <div className="dialogo" role="alertdialog" aria-modal="true" aria-labelledby="emergenza-titolo">
        <span className="tondo rosso"><Icona n="warning" piena /></span>
        <h2 id="emergenza-titolo">Qualcuno è in pericolo?</h2>
        <p>
          Se c’è un pericolo immediato per le persone chiama subito il numero verde emergenze del Consorzio. La
          chiamata è gratuita.
        </p>
        <a className="btn rosso" href={TEL_NUMERO_VERDE}>
          <Icona n="call" piena /> Chiama {NUMERO_VERDE}
        </a>
        <button className="btn secondario" onClick={onContinua}>
          Continua la segnalazione
        </button>
      </div>
    </div>
  )
}
