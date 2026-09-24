import { useRef, useState } from 'react'
import { useBozza } from '../bozza'
import { Icona, Spinner } from '../comuni'
import { completaConFoto, dallaFoto } from '../foto'
import { Schermata, useProcedura } from '../procedura'
import { Controllo, useRisposte } from '../risposte'
import {
  DOMANDE,
  domandeDa,
  etichettaValore,
  obbligatoriCompleti,
  risposto,
  type Campo,
  type Domanda,
  type Estrazione,
} from '../tassonomia'
import {
  REGISTRAZIONE_MAX_S,
  estrai,
  registrazioneSupportata,
  useRegistrazione,
  type ErroreEstrazione,
} from '../voce'

export function Descrizione() {
  const { bozza } = useBozza()
  return bozza.modalita === 'voce' ? <AVoce /> : <Domande />
}

// ---------- Rispondendo alle domande: una domanda per schermata ----------

function Domande() {
  const { bozza } = useBozza()
  const { vai } = useProcedura()
  const { campi, rispondi, controlla } = useRisposte()
  const [indice, setIndice] = useState(0)
  // La categoria è la prima domanda: quando si arriva alla quantità d'acqua è già scelta.
  const domande = domandeDa(campi)
  const domanda = domande[indice]
  const ok = risposto(campi, domanda.campo)

  function vaiA(i: number) {
    setIndice(i)
    window.scrollTo(0, 0)
  }
  function avanti() {
    controlla()
    if (indice < domande.length - 1) vaiA(indice + 1)
    else vai('contatto')
  }

  return (
    <Schermata
      titolo={domanda.testo}
      sotto={domanda.obbligatorio ? undefined : 'Se non lo sai, puoi saltare questa domanda.'}
      onIndietro={indice > 0 ? () => vaiA(indice - 1) : undefined}
      azione={
        <>
          <button className="btn" disabled={!ok} onClick={avanti}>
            Continua
          </button>
          {!domanda.obbligatorio && !ok && (
            <button className="btn testo" onClick={avanti}>
              Salta
            </button>
          )}
        </>
      }
    >
      <p className="contadomande">
        Domanda {indice + 1} di {domande.length}
      </p>
      <Controllo
        key={domanda.campo}
        domanda={domanda}
        valore={campi[domanda.campo]}
        onChange={(v) => rispondi({ [domanda.campo]: v })}
        onBlur={() => controlla()}
      />
      {dallaFoto(campi, bozza.campiFoto, domanda.campo) && (
        <p className="nota">
          <Icona n="photo_camera" />
          <span>Risposta presa dalla foto. Cambiala se non è giusta.</span>
        </p>
      )}
    </Schermata>
  )
}

// ---------- A voce: si parla una volta, poi si completa a mano ----------

type Problema = ErroreEstrazione | 'microfono'

const MESSAGGI: Record<Problema, string> = {
  microfono: 'Non possiamo usare il microfono. Puoi rispondere alle domande.',
  audio_non_valido: 'Non siamo riusciti ad ascoltare il messaggio. Riprova, oppure rispondi alle domande.',
  audio_troppo_grande: 'Il messaggio è troppo lungo. Riprova in meno di un minuto, oppure rispondi alle domande.',
  non_disponibile: 'L’assistente vocale non è disponibile in questo momento. Rispondi alle domande: ci vuole un minuto.',
  rete: 'Non riusciamo a inviare il messaggio. Verifica la connessione e riprova.',
}

// Gli argomenti da dire. I tre pericoli sono un argomento solo, per tenere corta la lista.
const ARGOMENTI = [
  ...DOMANDE.filter((d) => !d.campo.startsWith('pericolo_')).map((d) => d.testo),
  'C’è pericolo per persone, strade o case?',
]

function AVoce() {
  const { bozza, aggiorna } = useBozza()
  const { rispondi, controlla } = useRisposte()
  const [analizzo, setAnalizzo] = useState(false)
  const [problema, setProblema] = useState<Problema | null>(registrazioneSupportata() ? null : 'microfono')
  const ultimoAudio = useRef<Blob | null>(null)

  async function invia(audio: Blob) {
    ultimoAudio.current = audio
    setAnalizzo(true)
    setProblema(null)
    const esito = await estrai(audio)
    setAnalizzo(false)
    if ('errore' in esito) return setProblema(esito.errore)
    // Quello che non ha detto ma si vede nella foto è già nelle risposte, dal passo Foto.
    aggiorna({ estrazione: completaConFoto(esito.estrazione, bozza.campiFoto) })
    rispondi(esito.estrazione.campi)
    // Rete di sicurezza: le parole chiave contano anche se l'estrazione non ha messo un pericolo a "sì".
    controlla(esito.estrazione.campi)
  }

  const registrazione = useRegistrazione(invia)
  const registro = registrazione.secondi !== null

  async function tocca() {
    if (registro) return registrazione.ferma()
    setProblema(null)
    try {
      await registrazione.avvia()
    } catch {
      setProblema('microfono')
    }
  }

  const aMano = () => aggiorna({ modalita: 'domande' })

  if (bozza.estrazione) return <Completa estrazione={bozza.estrazione} />

  const senzaVoce = problema === 'microfono' || problema === 'non_disponibile'
  return (
    <Schermata
      titolo="Raccontaci cosa vedi"
      sotto={senzaVoce ? undefined : 'Tocca il microfono e parla con calma. Prova a dire:'}
      azione={
        senzaVoce ? (
          <button className="btn" onClick={aMano}>
            <Icona n="edit_note" /> Rispondi alle domande
          </button>
        ) : (
          <>
            {problema === 'rete' && ultimoAudio.current && (
              <button className="btn" onClick={() => invia(ultimoAudio.current!)} disabled={analizzo}>
                <Icona n="refresh" /> Invia di nuovo
              </button>
            )}
            <button className="btn testo" onClick={aMano} disabled={registro || analizzo}>
              <Icona n="keyboard" /> Rispondo alle domande
            </button>
          </>
        )
      }
    >
      {problema && (
        <div className="banner giallo" role="alert">
          <Icona n={senzaVoce ? 'mic_off' : 'error'} />
          <span>{MESSAGGI[problema]}</span>
        </div>
      )}
      {!senzaVoce && (
        <>
          <ul className="temi">
            {ARGOMENTI.map((a) => (
              <li key={a}>
                <Icona n="chat_bubble" />
                <span>{a}</span>
              </li>
            ))}
          </ul>
          <div className="registratore">
            <button
              className={`microfono ${registro ? 'ascolto' : ''} ${analizzo ? 'analizzo' : ''}`}
              onClick={tocca}
              disabled={analizzo}
              aria-label={registro ? 'Ho finito' : 'Tocca per parlare'}
            >
              {analizzo ? <Spinner chiaro /> : <Icona n={registro ? 'stop' : 'mic'} piena />}
            </button>
            <div className="registratore-testo">
              {analizzo ? (
                'Stiamo analizzando il messaggio…'
              ) : registro ? (
                <>
                  <span className="in-onda" /> In ascolto · {minuti(registrazione.secondi!)}
                  <span className="registratore-sotto">
                    Tocca di nuovo quando hai finito. Si ferma da sola dopo {minuti(REGISTRAZIONE_MAX_S)}.
                  </span>
                </>
              ) : (
                'Tocca per parlare'
              )}
            </div>
          </div>
        </>
      )}
    </Schermata>
  )
}

const minuti = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

// Dopo l'ascolto: i campi capiti chiusi in una riga e correggibili, i mancanti da scegliere a mano.
// L'estrazione non è iterativa: niente secondo messaggio vocale.
function Completa({ estrazione }: { estrazione: Estrazione }) {
  const { bozza } = useBozza()
  const { vai } = useProcedura()
  const { campi, rispondi, controlla } = useRisposte()
  const [inCorrezione, setInCorrezione] = useState<Campo | null>(null)

  // Si calcolano dall'estrazione e non dalle risposte attuali, così una domanda non cambia
  // gruppo mentre la si compila. Un obbligatorio capito male (descrizione corta) va completato.
  // La quantità d'acqua invece segue la categoria attuale: compare o sparisce quando cambia.
  const domande = domandeDa(campi)
  const daCompletare = domande.filter(
    (d) => estrazione.mancanti.includes(d.campo) || (d.obbligatorio && !risposto(estrazione.campi, d.campo)),
  )
  const capiti = domande.filter((d) => !daCompletare.includes(d))
  const completa = obbligatoriCompleti(campi)

  const correggi = (d: Domanda, v: string) => {
    rispondi({ [d.campo]: v })
    if (d.opzioni) setInCorrezione(null)
  }

  const righeCapite = capiti.map((d) => (
    <div key={d.campo}>
      <button
        className="capito-riga"
        onClick={() => setInCorrezione(inCorrezione === d.campo ? null : d.campo)}
        aria-expanded={inCorrezione === d.campo}
      >
        {dallaFoto(campi, bozza.campiFoto, d.campo) ? (
          <span role="img" aria-label="Dalla foto">
            <Icona n="photo_camera" piena className="verde" />
          </span>
        ) : (
          <Icona n="check_circle" piena className="verde" />
        )}
        <span className="capito-etichetta">{d.etichetta}</span>
        <span className="capito-valore">{campi[d.campo] ? etichettaValore(d, campi[d.campo]!) : '—'}</span>
        <Icona n={inCorrezione === d.campo ? 'close' : 'edit'} className="grigio" />
      </button>
      {inCorrezione === d.campo && (
        <div className="capito-correzione">
          <Controllo domanda={d} valore={campi[d.campo]} onChange={(v) => correggi(d, v)} onBlur={() => controlla()} />
        </div>
      )}
    </div>
  ))

  return (
    <Schermata
      titolo={daCompletare.length ? 'Ci manca qualche dettaglio' : 'Abbiamo capito tutto'}
      sotto={
        daCompletare.length
          ? 'Scegli le risposte qui sotto. Quelle facoltative puoi lasciarle vuote.'
          : 'Controlla le risposte. Toccane una per cambiarla.'
      }
      azione={
        <>
          {!completa && <p className="azione-nota">Per continuare servono “Cosa hai visto” e una descrizione.</p>}
          <button
            className="btn"
            disabled={!completa}
            onClick={() => {
              controlla()
              vai('contatto')
            }}
          >
            Continua
          </button>
        </>
      }
    >
      {capiti.length > 0 &&
        (daCompletare.length ? (
          <details className="capito">
            <summary>
              <Icona n="check_circle" piena className="verde" /> Abbiamo capito {capiti.length} cose su{' '}
              {domande.length}
              <Icona n="keyboard_arrow_down" className="grigio freccia" />
            </summary>
            {righeCapite}
          </details>
        ) : (
          <div className="capito aperto">{righeCapite}</div>
        ))}
      {daCompletare.map((d) => (
        <div key={d.campo} className="domanda">
          <h2>
            {d.testo}
            {!d.obbligatorio && <span className="facoltativo"> · facoltativo</span>}
          </h2>
          <Controllo
            domanda={d}
            valore={campi[d.campo]}
            onChange={(v) => rispondi({ [d.campo]: v })}
            onBlur={() => controlla()}
          />
        </div>
      ))}
    </Schermata>
  )
}
