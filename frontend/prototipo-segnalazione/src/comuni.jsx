// PROTOTIPO. Pezzi condivisi tra le varianti (non il layout: quello è di ogni variante).
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CATEGORIE, DOMANDE, categoria, descrizioneValida } from './dati.js'

export const NUMERO_EMERGENZA = '112'

export function Mappa({ pos, onMove, altezza = 220 }) {
  const el = useRef(null)
  const mappa = useRef(null)
  const pin = useRef(null)

  useEffect(() => {
    mappa.current = L.map(el.current, { zoomControl: false, attributionControl: false }).setView([pos.lat, pos.lng], 16)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mappa.current)
    const icona = L.divIcon({ html: '<div class="pin">📍</div>', className: '', iconSize: [40, 40], iconAnchor: [20, 38] })
    pin.current = L.marker([pos.lat, pos.lng], { draggable: true, icon: icona }).addTo(mappa.current)
    pin.current.on('dragend', () => {
      const { lat, lng } = pin.current.getLatLng()
      onMove?.({ lat, lng, fonte: 'pin' })
    })
    mappa.current.on('click', (e) => {
      pin.current.setLatLng(e.latlng)
      onMove?.({ lat: e.latlng.lat, lng: e.latlng.lng, fonte: 'pin' })
    })
    return () => mappa.current.remove()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    pin.current?.setLatLng([pos.lat, pos.lng])
  }, [pos.lat, pos.lng])

  return (
    <div className="mappa-box">
      <div ref={el} style={{ height: altezza }} />
      <p className="aiuto">Tocca la mappa o trascina 📍 per correggere il punto.</p>
    </div>
  )
}

export function ScattaFoto({ foto, onFoto, grande }) {
  const input = useRef(null)
  return (
    <div className={grande ? 'foto foto-grande' : 'foto'}>
      {foto ? (
        <img src={foto} alt="La tua foto" />
      ) : (
        <button className="btn-foto" onClick={() => input.current.click()}>
          <span className="icona-xl">📷</span>
          <span>Scatta una foto</span>
        </button>
      )}
      {foto && (
        <button className="btn-link" onClick={() => input.current.click()}>
          Rifai la foto
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => e.target.files[0] && onFoto(URL.createObjectURL(e.target.files[0]))}
      />
    </div>
  )
}

// Registrazione finta: tocca per iniziare, tocca per finire.
export function Registratore({ onFine, etichetta = 'Parla', piccolo }) {
  const [attivo, setAttivo] = useState(false)
  const [sec, setSec] = useState(0)
  useEffect(() => {
    if (!attivo) return
    const t = setInterval(() => setSec((s) => s + 1), 1000)
    return () => clearInterval(t)
  }, [attivo])
  return (
    <div className={piccolo ? 'registratore piccolo' : 'registratore'}>
      <button
        className={attivo ? 'btn-mic attivo' : 'btn-mic'}
        onClick={() => {
          if (attivo) {
            setAttivo(false)
            onFine(sec)
          } else {
            setSec(0)
            setAttivo(true)
          }
        }}
        aria-label={attivo ? 'Ho finito' : etichetta}
      >
        {attivo ? '⏹' : '🎤'}
      </button>
      <div className="mic-testo">{attivo ? `Ti ascolto… ${sec}s — tocca quando hai finito` : etichetta}</div>
    </div>
  )
}

export function Checklist({ campi, compatta }) {
  return (
    <ul className={compatta ? 'checklist compatta' : 'checklist'}>
      {DOMANDE.map((d) => {
        const fatto = campi && campi[d.campo] != null
        return (
          <li key={d.campo} className={fatto ? 'fatto' : ''}>
            <span className="spunta">{fatto ? '✅' : '⬜'}</span>
            <span>
              {d.testo}
              {!d.obbligatorio && <em className="facolt"> (se lo sai)</em>}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

export function SceltaCategoria({ valore, onChange }) {
  return (
    <div className="griglia-cat">
      {CATEGORIE.map((c) => (
        <button key={c.id} className={valore === c.id ? 'cat scelta' : 'cat'} onClick={() => onChange(c.id)}>
          <span className="icona-l">{c.icona}</span>
          <span>{c.label}</span>
        </button>
      ))}
    </div>
  )
}

export function Descrizione({ valore, onChange }) {
  const v = valore ?? ''
  return (
    <div>
      <textarea
        className="descrizione"
        rows={3}
        maxLength={500}
        placeholder="Es. esce acqua dal terreno vicino alla strada"
        value={v}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className={descrizioneValida(v) || v.length === 0 ? 'contatore' : 'contatore errore'}>
        {v.length < 10 ? `Scrivi almeno 10 caratteri (${v.length}/10)` : `${v.length}/500`}
      </div>
    </div>
  )
}

export function Opzioni({ opzioni, valore, onChange }) {
  return (
    <div className="chips">
      {opzioni.map((o) => (
        <button key={o} className={valore === o ? 'chip scelta' : 'chip'} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  )
}

// Controllo di un campo qualunque, scelto dalla domanda.
export function Campo({ domanda, valore, onChange }) {
  if (domanda.campo === 'categoria') return <SceltaCategoria valore={valore} onChange={onChange} />
  if (domanda.campo === 'descrizione') return <Descrizione valore={valore} onChange={onChange} />
  return <Opzioni opzioni={domanda.opzioni} valore={valore} onChange={onChange} />
}

export function Emergenza({ onContinua }) {
  return (
    <div className="overlay">
      <div className="modale emergenza">
        <div className="icona-xl">⚠️</div>
        <h2>C’è pericolo per le persone?</h2>
        <p>Se qualcuno è in pericolo adesso, chiama subito il numero di emergenza. La segnalazione al Consorzio non è un servizio di emergenza.</p>
        <a className="btn btn-rosso" href={`tel:${NUMERO_EMERGENZA}`}>
          📞 Chiama il {NUMERO_EMERGENZA}
        </a>
        <button className="btn btn-secondario" onClick={onContinua}>
          Continua la segnalazione
        </button>
      </div>
    </div>
  )
}

export function FuoriPerimetro({ onSposta, onChiudi }) {
  return (
    <div className="fuori">
      <div className="icona-xl">🚫</div>
      <h2>Qui il Consorzio non può intervenire</h2>
      <p>Questo punto non è vicino a canali o condotte del Consorzio di bonifica Garda Chiese, quindi la segnalazione non verrà inviata.</p>
      <p><strong>A chi rivolgerti:</strong></p>
      <ul>
        <li>Acqua del rubinetto, fogne, tombini: il gestore dell’acquedotto del tuo Comune.</li>
        <li>Strade, fossi privati, rifiuti: il tuo Comune.</li>
        <li>Pericolo per le persone: <a href={`tel:${NUMERO_EMERGENZA}`}>{NUMERO_EMERGENZA}</a>.</li>
      </ul>
      <button className="btn" onClick={onSposta}>
        📍 Il punto è sbagliato, lo sposto
      </button>
      {onChiudi && (
        <button className="btn btn-secondario" onClick={onChiudi}>
          Ho capito
        </button>
      )}
    </div>
  )
}

export function CampoCellulare({ valore, onChange }) {
  return (
    <div>
      <input
        className="input-grande"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="333 123 4567"
        value={valore ?? ''}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="aiuto">Ti chiamiamo solo se serve per trovare il problema. Non lo usiamo per altro.</p>
    </div>
  )
}

export const cellulareValido = (v) => (v ?? '').replace(/\D/g, '').length >= 9

export function Riepilogo({ bozza, onModifica }) {
  const c = bozza.campi
  const cat = categoria(c.categoria)
  const righe = [
    ['foto', 'Foto', bozza.foto ? <img className="mini" src={bozza.foto} alt="" /> : '—'],
    ['posizione', 'Dove', bozza.perimetro?.tracciato ?? '—'],
    ['categoria', 'Cosa', cat ? `${cat.icona} ${cat.label}` : '—'],
    ['descrizione', 'Descrizione', c.descrizione ?? '—'],
    ['durata', 'Da quanto', c.durata ?? 'non detto'],
    ['quantita', 'Quanta acqua', c.quantita ?? 'non detto'],
    ['pericolo', 'Pericolo', `persone: ${c.pericolo_persone ?? '?'} · strada: ${c.pericolo_strada ?? '?'} · case: ${c.pericolo_edifici ?? '?'}`],
    ['cellulare', 'Cellulare', bozza.cellulare ?? '—'],
  ]
  return (
    <dl className="riepilogo">
      {righe.map(([k, t, v]) => (
        <div key={k} className="riga">
          <dt>{t}</dt>
          <dd>{v}</dd>
          {onModifica && (
            <button className="btn-link" onClick={() => onModifica(k)}>
              Modifica
            </button>
          )}
        </div>
      ))}
    </dl>
  )
}

export function Conferma() {
  const link = 'https://garda-chiese.simonetrentin.me/s/7kQ2-xa9P'
  return (
    <div className="conferma">
      <div className="icona-xl">✅</div>
      <h1>Grazie, segnalazione inviata</h1>
      <p>Il Consorzio l’ha ricevuta. Se serve, ti chiamiamo al numero che ci hai dato.</p>
      <div className="box-link">
        <p><strong>Segui la tua segnalazione</strong></p>
        <code>{link}</code>
        <button className="btn btn-secondario" onClick={() => navigator.clipboard?.writeText(link)}>
          Copia il link
        </button>
        <p className="aiuto">Salvalo: è l’unico modo per vedere a che punto è.</p>
      </div>
      <p className="aiuto">
        Se c’è pericolo per le persone chiama il <a href={`tel:${NUMERO_EMERGENZA}`}>{NUMERO_EMERGENZA}</a>.
      </p>
    </div>
  )
}

export function Caricamento({ testo }) {
  return (
    <div className="caricamento">
      <div className="spinner" />
      <p>{testo}</p>
    </div>
  )
}
