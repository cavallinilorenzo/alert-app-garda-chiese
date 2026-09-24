import { useBozza } from './bozza'
import { Icona } from './comuni'
import { pericoloDichiarato, segnaleDiPericolo } from './pericolo'
import {
  DESCRIZIONE_MAX,
  DESCRIZIONE_MIN,
  DOMANDA_PERICOLI,
  PERICOLI,
  campiPericoli,
  rispostaPericoli,
  type Campi,
  type Domanda,
} from './tassonomia'

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
        placeholder="Esce acqua dal prato vicino alla strada"
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

type PropsPericoli = {
  campi: Campi
  onChange: (campi: Campi) => void
  /** Mostra anche "Nessun pericolo" e "Non lo so" sotto le tessere, per quando non sono nelle azioni. */
  alternative?: boolean
}

/** La domanda dei pericoli: tre tessere da accendere, una o più. La prima accesa apre la finestra. */
export function Pericoli({ campi, onChange, alternative }: PropsPericoli) {
  const risposta = rispostaPericoli(campi)
  const accesi = Array.isArray(risposta) ? risposta : []
  const tocca = (campo: (typeof accesi)[number]) =>
    onChange(campiPericoli(accesi.includes(campo) ? accesi.filter((c) => c !== campo) : [...accesi, campo]))

  return (
    <>
      <div className="pericoli" role="group" aria-label={DOMANDA_PERICOLI}>
        {PERICOLI.map((p) => {
          const acceso = accesi.includes(p.campo)
          return (
            <button key={p.campo} className={`pericolo ${acceso ? 'acceso' : ''}`} aria-pressed={acceso} onClick={() => tocca(p.campo)}>
              <Icona n={p.icona} piena={acceso} />
              <strong>{p.etichetta}</strong>
            </button>
          )
        })}
      </div>
      {alternative && (
        <div className="griglia alternative" role="radiogroup" aria-label="Oppure">
          {(
            [
              ['no', 'Nessun pericolo'],
              ['non_so', 'Non lo so'],
            ] as const
          ).map(([valore, etichetta]) => (
            <button
              key={valore}
              role="radio"
              aria-checked={risposta === valore}
              className={`riga ${risposta === valore ? 'attiva' : ''}`}
              onClick={() => onChange(campiPericoli(valore))}
            >
              <span className="riga-testo">{etichetta}</span>
            </button>
          ))}
        </div>
      )}
    </>
  )
}
