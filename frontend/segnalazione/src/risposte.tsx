import { useBozza } from './bozza'
import { Icona } from './comuni'
import { pericoloDichiarato, segnaleDiPericolo } from './pericolo'
import { DESCRIZIONE_MAX, DESCRIZIONE_MIN, type Campi, type Domanda } from './tassonomia'

// Le risposte del passo Descrizione, a voce o a mano: i controlli di ogni campo e il segnale
// di pericolo che apre la finestra del numero verde.

/**
 * Aggiorna le risposte nella bozza. Un pericolo a "sì" si segnala subito; le parole chiave
 * della descrizione solo con `controlla`, all'uscita dal campo o al Continua, mai mentre si
 * scrive: su mobile la finestra ruberebbe il focus e chiuderebbe la tastiera.
 */
export function useRisposte() {
  const { bozza, aggiorna, segnalaPericolo } = useBozza()

  function rispondi(nuove: Campi) {
    aggiorna({ campi: { ...bozza.campi, ...nuove } })
    if (pericoloDichiarato(nuove)) segnalaPericolo()
  }

  /** Cerca un segnale di pericolo nelle risposte, parole chiave della descrizione comprese. */
  function controlla(campi: Campi = bozza.campi) {
    if (segnaleDiPericolo(campi)) segnalaPericolo()
  }

  return { campi: bozza.campi, rispondi, controlla }
}

type PropsControllo = {
  domanda: Domanda
  valore: string | undefined
  onChange: (valore: string) => void
  /** All'uscita dalla casella della descrizione. */
  onBlur?: () => void
}

/** Il controllo di un campo: la lista delle categorie, la casella della descrizione o le opzioni. */
export function Controllo({ domanda, valore, onChange, onBlur }: PropsControllo) {
  if (!domanda.opzioni) return <CasellaDescrizione valore={valore ?? ''} onChange={onChange} onBlur={onBlur} />

  const conIcone = domanda.opzioni.some((o) => o.icona)
  const classe = conIcone ? 'lista' : domanda.opzioni.length <= 3 ? 'segmenti' : 'griglia'
  return (
    <div className={classe} role="radiogroup" aria-label={domanda.testo}>
      {domanda.opzioni.map((o) => (
        <button
          key={o.valore}
          role="radio"
          aria-checked={valore === o.valore}
          className={`riga ${valore === o.valore ? 'attiva' : ''}`}
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

type PropsCasella = { valore: string; onChange: (v: string) => void; onBlur?: () => void }

function CasellaDescrizione({ valore, onChange, onBlur }: PropsCasella) {
  const corta = valore.trim().length < DESCRIZIONE_MIN
  return (
    <label className="campo">
      <textarea
        rows={4}
        maxLength={DESCRIZIONE_MAX}
        placeholder="Ad esempio: esce acqua dal terreno vicino alla strada"
        value={valore}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
      />
      <span className={`contatore ${valore.length > 0 && corta ? 'errore' : ''}`}>
        {corta ? `Almeno ${DESCRIZIONE_MIN} caratteri` : `${valore.length}/${DESCRIZIONE_MAX}`}
      </span>
    </label>
  )
}
