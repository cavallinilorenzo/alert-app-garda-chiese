import { useRef, useState, type ReactNode } from 'react'
import { useBozza } from '../bozza'
import { Icona, Spinner } from '../comuni'
import { completaConFoto, dallaFoto } from '../foto'
import { Schermata, useProcedura } from '../procedura'
import { Controllo, Pericoli, useRisposte } from '../risposte'
import {
  DOMANDA_PERICOLI,
  PERICOLI,
  campiPericoli,
  domandeDa,
  etichettaValore,
  isPericolo,
  obbligatoriCompleti,
  riassuntoPericoli,
  rispostaPericoli,
  risposto,
  type Campo,
  type Domanda,
  type Estrazione,
} from '../tassonomia'
import { estrai, registrazioneSupportata, useRegistrazione, type ErroreEstrazione } from '../voce'

export function Descrizione() {
  const { bozza } = useBozza()
  return bozza.modalita === 'voce' ? <AVoce /> : <Domande />
}

// ---------- Rispondendo alle domande: una domanda per schermata ----------

// Il pericolo è la prima domanda, con i tre pericoli insieme; poi le altre in ordine.
type PassoDomande = 'pericoli' | Domanda

function Domande() {
  const { bozza } = useBozza()
  const { vai } = useProcedura()
  const { campi, rispondi, controlla } = useRisposte()
  const [indice, setIndice] = useState(0)
  // La categoria viene prima della quantità d'acqua: quando ci si arriva è già scelta.
  const passi: PassoDomande[] = ['pericoli', ...domandeDa(campi).filter((d) => !isPericolo(d.campo))]
  const passo = passi[indice]
  const occhiello = `Domanda ${indice + 1} di ${passi.length}`

  function vaiA(i: number) {
    setIndice(i)
    window.scrollTo(0, 0)
  }
  function avanti() {
    controlla()
    if (indice < passi.length - 1) vaiA(indice + 1)
    else vai('contatto')
  }
  const indietro = indice > 0 ? () => vaiA(indice - 1) : undefined

  if (passo === 'pericoli') {
    const acceso = Array.isArray(rispostaPericoli(campi))
    return (
      <Schermata
        occhiello={occhiello}
        titolo={DOMANDA_PERICOLI}
        azione={
          acceso ? (
            <button className="btn" onClick={avanti}>
              Continua
            </button>
          ) : (
            <>
              <button
                className="btn secondario"
                onClick={() => {
                  rispondi(campiPericoli('no'))
                  avanti()
                }}
              >
                Nessun pericolo
              </button>
              <button
                className="btn testo"
                onClick={() => {
                  rispondi(campiPericoli('non_so'))
                  avanti()
                }}
              >
                Non lo so
              </button>
            </>
          )
        }
      >
        <Pericoli campi={campi} onChange={rispondi} />
      </Schermata>
    )
  }

  const ok = risposto(campi, passo.campo)
  return (
    <Schermata
      occhiello={occhiello}
      titolo={passo.testo}
      onIndietro={indietro}
      azione={
        <>
          <button className="btn" disabled={!ok} onClick={avanti}>
            Continua
          </button>
          {!passo.obbligatorio && !ok && (
            <button className="btn testo" onClick={avanti}>
              Salta
            </button>
          )}
        </>
      }
    >
      <Controllo
        key={passo.campo}
        domanda={passo}
        valore={campi[passo.campo]}
        onChange={(v) => rispondi({ [passo.campo]: v })}
        onBlur={() => controlla()}
      />
      {dallaFoto(campi, bozza.campiFoto, passo.campo) && (
        <p className="nota">
          <Icona n="photo_camera" />
          <span>Presa dalla foto. Cambiala se non va.</span>
        </p>
      )}
    </Schermata>
  )
}

// ---------- A voce: si parla una volta, poi si completa a mano ----------

type Problema = ErroreEstrazione | 'microfono'

const MESSAGGI: Record<Problema, string> = {
  microfono: 'Il microfono non è disponibile. Rispondi alle domande.',
  audio_non_valido: 'Non abbiamo sentito bene. Riprova, oppure rispondi alle domande.',
  audio_troppo_grande: 'È troppo lungo. Riprova in meno di un minuto.',
  non_disponibile: 'L’ascolto non è disponibile adesso. Rispondi alle domande.',
  rete: 'Invio non riuscito. Verifica la connessione e riprova.',
}

// Di cosa parlare, in breve.
const TEMI = ['Cosa vedi', 'Da quando', 'Quanta acqua', 'Pericoli']

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
      titolo="Racconta cosa vedi"
      azione={
        senzaVoce ? (
          <button className="btn" onClick={aMano}>
            <Icona n="checklist" /> Rispondi alle domande
          </button>
        ) : (
          <>
            {problema === 'rete' && ultimoAudio.current && (
              <button className="btn" onClick={() => invia(ultimoAudio.current!)} disabled={analizzo}>
                <Icona n="refresh" /> Invia di nuovo
              </button>
            )}
            <button className="btn testo" onClick={aMano} disabled={registro || analizzo}>
              <Icona n="checklist" /> Preferisco le domande
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
          <div className="temi">
            {TEMI.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <div className="registratore">
            <button
              className={`microfono ${registro ? 'ascolto' : ''} ${analizzo ? 'analizzo' : ''}`}
              onClick={tocca}
              disabled={analizzo}
              aria-label={registro ? 'Ho finito' : 'Tocca e parla'}
            >
              {analizzo ? <Spinner chiaro /> : <Icona n={registro ? 'stop' : 'mic'} piena />}
            </button>
            <div className="registratore-testo">
              {analizzo ? (
                'Sto ascoltando il messaggio…'
              ) : registro ? (
                <>
                  <span className="in-onda" /> In ascolto · {minuti(registrazione.secondi!)}
                  <span className="registratore-sotto">Tocca quando hai finito</span>
                </>
              ) : (
                'Tocca e parla'
              )}
            </div>
          </div>
        </>
      )}
    </Schermata>
  )
}

const minuti = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

type PropsRigaCapita = {
  etichetta: string
  valore: string
  dallaFoto: boolean
  aperta: boolean
  onTocca: () => void
  children: ReactNode
}

/** Un campo capito: chiuso in una riga, si apre per correggerlo. */
function RigaCapita({ etichetta, valore, dallaFoto, aperta, onTocca, children }: PropsRigaCapita) {
  return (
    <div>
      <button className="capito-riga" onClick={onTocca} aria-expanded={aperta}>
        {dallaFoto ? (
          <span role="img" aria-label="Dalla foto">
            <Icona n="photo_camera" piena className="verde" />
          </span>
        ) : (
          <Icona n="check_circle" piena className="verde" />
        )}
        <span className="capito-etichetta">{etichetta}</span>
        <span className="capito-valore">{valore}</span>
        <Icona n={aperta ? 'close' : 'edit'} className="grigio" />
      </button>
      {aperta && <div className="capito-correzione">{children}</div>}
    </div>
  )
}

// Dopo l'ascolto: i campi capiti chiusi in una riga e correggibili, i mancanti da scegliere a mano.
// L'estrazione non è iterativa: niente secondo messaggio vocale. I tre pericoli stanno insieme.
function Completa({ estrazione }: { estrazione: Estrazione }) {
  const { bozza } = useBozza()
  const { vai } = useProcedura()
  const { campi, rispondi, controlla } = useRisposte()
  const [inCorrezione, setInCorrezione] = useState<Campo | 'pericoli' | null>(null)
  const apri = (c: Campo | 'pericoli') => setInCorrezione(inCorrezione === c ? null : c)

  // Si calcolano dall'estrazione e non dalle risposte attuali, così una domanda non cambia
  // gruppo mentre la si compila. Un obbligatorio capito male (descrizione corta) va completato.
  // La quantità d'acqua invece segue la categoria attuale: compare o sparisce quando cambia.
  const domande = domandeDa(campi).filter((d) => !isPericolo(d.campo))
  const daCompletare = domande.filter(
    (d) => estrazione.mancanti.includes(d.campo) || (d.obbligatorio && !risposto(estrazione.campi, d.campo)),
  )
  const capiti = domande.filter((d) => !daCompletare.includes(d))
  const pericoliMancanti = PERICOLI.some((p) => estrazione.mancanti.includes(p.campo))
  const manca = pericoliMancanti || daCompletare.length > 0
  const completa = obbligatoriCompleti(campi)

  const correggi = (d: Domanda, v: string) => {
    rispondi({ [d.campo]: v })
    if (d.opzioni) setInCorrezione(null)
  }

  const righeCapite = [
    ...(pericoliMancanti
      ? []
      : [
          <RigaCapita
            key="pericoli"
            etichetta="Pericoli"
            valore={riassuntoPericoli(campi) ?? '—'}
            dallaFoto={PERICOLI.some((p) => dallaFoto(campi, bozza.campiFoto, p.campo))}
            aperta={inCorrezione === 'pericoli'}
            onTocca={() => apri('pericoli')}
          >
            <Pericoli campi={campi} onChange={rispondi} alternative />
          </RigaCapita>,
        ]),
    ...capiti.map((d) => (
      <RigaCapita
        key={d.campo}
        etichetta={d.etichetta}
        valore={campi[d.campo] ? etichettaValore(d, campi[d.campo]!) : '—'}
        dallaFoto={dallaFoto(campi, bozza.campiFoto, d.campo)}
        aperta={inCorrezione === d.campo}
        onTocca={() => apri(d.campo)}
      >
        <Controllo domanda={d} valore={campi[d.campo]} onChange={(v) => correggi(d, v)} onBlur={() => controlla()} />
      </RigaCapita>
    )),
  ]

  return (
    <Schermata
      titolo={manca ? 'Manca solo questo' : 'Ho capito bene?'}
      azione={
        <>
          {!completa && <p className="azione-nota">Servono “Cosa hai visto” e la descrizione.</p>}
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
      {pericoliMancanti && (
        <div className="domanda">
          <h2>{DOMANDA_PERICOLI}</h2>
          <Pericoli campi={campi} onChange={rispondi} alternative />
        </div>
      )}
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
      {righeCapite.length > 0 &&
        (manca ? (
          <details className="capito">
            <summary>
              <Icona n="check_circle" piena className="verde" /> Capito {righeCapite.length} cose su {domande.length + 1}
              <Icona n="keyboard_arrow_down" className="grigio freccia" />
            </summary>
            {righeCapite}
          </details>
        ) : (
          <div className="capito aperto">{righeCapite}</div>
        ))}
    </Schermata>
  )
}
