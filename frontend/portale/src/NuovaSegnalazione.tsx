// Inserimento manuale (#122): l'Operatore scrive una Segnalazione arrivata per numero verde, email o di persona.
// Il punto si sceglie sulla mappa; se è Fuori perimetro il Portale avvisa ma lascia inserire.
// La priorità la calcola il backend con le stesse regole dell'App; poi si cambia dalla scheda.
import { useEffect, useState } from 'react'
import { api } from 'shared/api'
import { Icona, Mappa } from './comuni'
import { usePortale, type CorpoManuale } from './dati'
import { CANALI_MANUALI, CATEGORIE, PERICOLI, type Categoria, type Segnalazione } from './dominio'

type Canale = CorpoManuale['canale_ingresso']
type Risposta = 'si' | 'no' | 'non_so'
type Perimetro = { accettato: boolean; messaggio: string } | null

// La quantità d'acqua si chiede solo per queste categorie, come nell'App di segnalazione.
const CON_QUANTITA: Categoria[] = ['acqua_che_affiora', 'perdita_dal_canale', 'canale_che_tracima', 'argine_danneggiato']
const QUANTITA = [
  { valore: 'gocce', etichetta: 'Gocciola' },
  { valore: 'piccolo_flusso', etichetta: 'Un filo, come un rubinetto' },
  { valore: 'molta_acqua', etichetta: 'Tanta, scorre forte' },
  { valore: 'getto', etichetta: 'Zampilla con forza' },
  { valore: 'non_so', etichetta: 'Non so' },
] as const
const DURATE = [
  { valore: 'adesso', etichetta: 'Appena notato' },
  { valore: 'alcune_ore', etichetta: 'Da qualche ora' },
  { valore: 'piu_di_un_giorno', etichetta: 'Da qualche giorno' },
  { valore: 'da_settimane', etichetta: 'Da settimane' },
  { valore: 'non_so', etichetta: 'Non so' },
] as const
const RISPOSTE: { valore: Risposta; etichetta: string }[] = [
  { valore: 'si', etichetta: 'Sì' },
  { valore: 'no', etichetta: 'No' },
  { valore: 'non_so', etichetta: 'Non so' },
]

export function NuovaSegnalazione({ onInserita, onAnnulla }: { onInserita: (s: Segnalazione) => void; onAnnulla: () => void }) {
  const { inserisci } = usePortale()
  const [canale, setCanale] = useState<Canale | null>(null)
  const [punto, setPunto] = useState<[number, number] | null>(null)
  const [perimetro, setPerimetro] = useState<Perimetro>(null)
  const [categoria, setCategoria] = useState<Categoria | ''>('')
  const [descrizione, setDescrizione] = useState('')
  const [pericoli, setPericoli] = useState<Record<string, Risposta | ''>>({})
  const [quantita, setQuantita] = useState('')
  const [durata, setDurata] = useState('')
  const [cellulare, setCellulare] = useState('')
  const [foto, setFoto] = useState<File | null>(null)
  const [invio, setInvio] = useState(false)

  // a ogni punto il controllo del perimetro: solo un avviso, non blocca
  useEffect(() => {
    if (!punto) return
    let vivo = true
    setPerimetro(null)
    api.POST('/perimetro/check', { body: { lat: punto[0], lng: punto[1] } }).then(({ data }) => {
      if (vivo && data) setPerimetro({ accettato: data.accettato, messaggio: data.messaggio })
    })
    return () => {
      vivo = false
    }
  }, [punto])

  const conQuantita = !!categoria && CON_QUANTITA.includes(categoria)
  const mancano = [
    !canale && 'il canale',
    !punto && 'il punto sulla mappa',
    descrizione.trim().length < 10 && 'una descrizione di almeno 10 caratteri',
  ].filter(Boolean)

  const invia = async () => {
    if (!canale || !punto || mancano.length || invio) return
    setInvio(true)
    const s = await inserisci(
      {
        canale_ingresso: canale,
        lat: punto[0],
        lng: punto[1],
        descrizione: descrizione.trim(),
        cellulare: cellulare.trim() || undefined,
        categoria: categoria || undefined,
        durata: (durata || undefined) as CorpoManuale['durata'],
        quantita_acqua: (categoria ? (conQuantita ? quantita || undefined : 'non_applicabile') : undefined) as CorpoManuale['quantita_acqua'],
        pericolo_persone: pericoli.pericolo_persone || undefined,
        pericolo_strada: pericoli.pericolo_strada || undefined,
        pericolo_edifici: pericoli.pericolo_edifici || undefined,
      },
      foto,
    )
    setInvio(false)
    if (s) onInserita(s)
  }

  return (
    <div className="pagina pagina-nuova">
      <div className="nuova-modulo">
        <header className="nuova-testa">
          <h1>Nuova segnalazione</h1>
          <p className="muto">Per le segnalazioni arrivate al telefono, per email o di persona. La priorità si calcola come nell’App.</p>
        </header>

        <section className="nuova-campo">
          <div className="etichetta">Da dove arriva</div>
          <div className="scelte">
            {CANALI_MANUALI.map((c) => (
              <button key={c.valore} className={`scelta ${canale === c.valore ? 'on' : ''}`} onClick={() => setCanale(c.valore)}>
                <Icona nome={c.icona} piena={canale === c.valore} /> {c.etichetta}
              </button>
            ))}
          </div>
        </section>

        <section className="nuova-campo">
          <div className="etichetta">Cosa succede</div>
          <div className="scelte categorie">
            {CATEGORIE.map((c) => (
              <button key={c.valore} className={`scelta ${categoria === c.valore ? 'on' : ''}`} onClick={() => setCategoria(categoria === c.valore ? '' : c.valore)}>
                <Icona nome={c.icona} /> {c.etichetta}
              </button>
            ))}
          </div>
          <textarea
            rows={3}
            placeholder="Cosa ha riferito il segnalante (almeno 10 caratteri)"
            maxLength={500}
            value={descrizione}
            onChange={(e) => setDescrizione(e.target.value)}
          />
        </section>

        <section className="nuova-campo">
          <div className="etichetta">Pericoli</div>
          {PERICOLI.map((p) => (
            <div key={p.campo} className="nuova-riga">
              <span>{p.nome}</span>
              <div className="segmenti">
                {RISPOSTE.map((r) => (
                  <button
                    key={r.valore}
                    className={`${pericoli[p.campo] === r.valore ? 'on' : ''} ${r.valore === 'si' ? 'si' : ''}`}
                    onClick={() => setPericoli({ ...pericoli, [p.campo]: pericoli[p.campo] === r.valore ? '' : r.valore })}
                  >
                    {r.etichetta}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </section>

        <section className="nuova-campo nuova-coppia">
          {conQuantita && (
            <label>
              <span className="etichetta">Quanta acqua</span>
              <select value={quantita} onChange={(e) => setQuantita(e.target.value)}>
                <option value="">—</option>
                {QUANTITA.map((q) => (
                  <option key={q.valore} value={q.valore}>
                    {q.etichetta}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            <span className="etichetta">Da quanto</span>
            <select value={durata} onChange={(e) => setDurata(e.target.value)}>
              <option value="">—</option>
              {DURATE.map((d) => (
                <option key={d.valore} value={d.valore}>
                  {d.etichetta}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="nuova-campo nuova-coppia">
          <label>
            <span className="etichetta">Recapito del segnalante</span>
            <input type="tel" placeholder="Facoltativo" value={cellulare} onChange={(e) => setCellulare(e.target.value)} />
          </label>
          <label>
            <span className="etichetta">Foto</span>
            <span className="file">
              <Icona nome={foto ? 'image' : 'add_photo_alternate'} />
              <span className="taglia">{foto ? foto.name : 'Facoltativa'}</span>
              <input type="file" accept="image/*" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} />
            </span>
          </label>
        </section>

        <footer className="nuova-piede">
          <span className="muto">{mancano.length ? `Manca ${mancano.join(', ')}.` : 'Pronta da inserire.'}</span>
          <button className="btn-link" onClick={onAnnulla}>
            Annulla
          </button>
          <button className="btn btn-primario" disabled={mancano.length > 0 || invio} onClick={invia}>
            <Icona nome="add" /> Inserisci segnalazione
          </button>
        </footer>
      </div>

      <div className="nuova-mappa">
        <Mappa segnalazioni={[]} punto={punto} onPunto={setPunto} strati={['zona_acquaiolo', 'reticolo_principale', 'canale', 'condotta']} conLegenda={false} />
        <div className={`nuova-perimetro ${perimetro && !perimetro.accettato ? 'fuori' : ''}`}>
          <Icona nome={!punto ? 'touch_app' : !perimetro ? 'progress_activity' : perimetro.accettato ? 'check_circle' : 'warning'} />
          <span>
            {!punto
              ? 'Clicca sulla mappa il punto della segnalazione'
              : !perimetro
                ? 'Controllo il perimetro…'
                : perimetro.accettato
                  ? perimetro.messaggio || 'Il punto riguarda il reticolo consortile'
                  : `Fuori perimetro: ${perimetro.messaggio} Puoi inserirla lo stesso.`}
          </span>
        </div>
      </div>
    </div>
  )
}
