// PROTOTIPO, da buttare (ticket #102). Tre varianti del nuovo layout dell'App di segnalazione,
// tutte le schermate, tema chiaro e scuro. Si apre solo in sviluppo:
//   https://localhost:5173/?prototipo            una schermata alla volta, barra in basso per cambiare
//   https://localhost:5173/?prototipo&galleria   tutte le schermate della variante, chiaro e scuro affiancati
// Parametri: v=A|B|C, s=<schermata>, tema=auto|chiaro|scuro, pericolo=1. Tasti: ← → variante, ↑ ↓ schermata.

import { useEffect, useState, type ReactNode } from 'react'
import { Ctx, type Contesto, type Tema } from './contesto'
import { SCHERMATE, type Chiave } from './schermate'
import { VARIANTI, type Variante } from './varianti'
import './prototipo.css'

function leggi() {
  const q = new URLSearchParams(window.location.search)
  return {
    v: (q.get('v') ?? 'A') as Variante['chiave'],
    s: (q.get('s') ?? 'inizio') as Chiave,
    tema: (q.get('tema') ?? 'auto') as Tema | 'auto',
    pericolo: q.get('pericolo') === '1',
    galleria: q.has('galleria'),
    nudo: q.has('nudo'),
  }
}

function scrivi(p: Partial<ReturnType<typeof leggi>>) {
  const q = new URLSearchParams(window.location.search)
  for (const [k, val] of Object.entries(p)) {
    if (val === false || val == null) q.delete(k)
    else q.set(k, val === true ? '1' : String(val))
  }
  q.delete('prototipo')
  const resto = q.toString().replace(/=(&|$)/g, '$1')
  history.replaceState(null, '', `?prototipo${resto ? `&${resto}` : ''}`)
}

function useTemaSistema(): Tema {
  const mq = window.matchMedia('(prefers-color-scheme: dark)')
  const [scuro, setScuro] = useState(mq.matches)
  useEffect(() => {
    const f = (e: MediaQueryListEvent) => setScuro(e.matches)
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [mq])
  return scuro ? 'scuro' : 'chiaro'
}

export function Prototipo() {
  const [p, setP] = useState(leggi)
  const sistema = useTemaSistema()
  const tema = p.tema === 'auto' ? sistema : p.tema
  const variante = VARIANTI.find((x) => x.chiave === p.v) ?? VARIANTI[0]
  const chiavi = SCHERMATE.map((s) => s.chiave)

  const aggiorna = (nuovo: Partial<typeof p>) => {
    scrivi(nuovo)
    setP((vecchio) => ({ ...vecchio, ...nuovo }))
    window.scrollTo(0, 0)
  }
  const ciclaVariante = (d: number) => {
    const i = VARIANTI.findIndex((x) => x.chiave === variante.chiave)
    aggiorna({ v: VARIANTI[(i + d + VARIANTI.length) % VARIANTI.length].chiave })
  }
  const ciclaSchermata = (d: number) => {
    const i = chiavi.indexOf(p.s)
    aggiorna({ s: chiavi[(i + d + chiavi.length) % chiavi.length] })
  }

  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement
      if (t.closest('input, textarea, select, [contenteditable]')) return
      if (e.key === 'ArrowLeft') ciclaVariante(-1)
      if (e.key === 'ArrowRight') ciclaVariante(1)
      if (e.key === 'ArrowUp') { e.preventDefault(); ciclaSchermata(-1) }
      if (e.key === 'ArrowDown') { e.preventDefault(); ciclaSchermata(1) }
    }
    window.addEventListener('keydown', f)
    return () => window.removeEventListener('keydown', f)
  })

  // Sfondo di pagina e barre del browser dello stesso colore della schermata.
  useEffect(() => {
    document.documentElement.dataset.protoTema = tema
    document.documentElement.dataset.protoVariante = variante.chiave
  }, [tema, variante.chiave])

  if (p.galleria && !p.nudo) return <Galleria variante={variante} onVariante={(v) => aggiorna({ v })} />

  const schermata = SCHERMATE.find((s) => s.chiave === p.s) ?? SCHERMATE[0]
  const Corpo = schermata.Componente
  const ctx: Contesto = {
    variante,
    tema,
    pericolo: p.pericolo || 'pericolo' in schermata,
    vai: (s) => aggiorna({ s: s as Chiave }),
    indietro: () => ciclaSchermata(-1),
  }

  return (
    <Ctx.Provider value={ctx}>
      <div className={`proto v${variante.chiave} ${tema} ${p.nudo ? 'nudo' : ''}`}>
        <Corpo />
        {!p.nudo && (
          <Barra>
            <button onClick={() => ciclaVariante(-1)} aria-label="Variante precedente">‹</button>
            <span className="p-barra-nome">{variante.chiave} · {variante.nome}</span>
            <button onClick={() => ciclaVariante(1)} aria-label="Variante successiva">›</button>
            <select value={schermata.chiave} onChange={(e) => aggiorna({ s: e.target.value as Chiave })}>
              {SCHERMATE.map((s) => <option key={s.chiave} value={s.chiave}>{s.nome}</option>)}
            </select>
            <select value={p.tema} onChange={(e) => aggiorna({ tema: e.target.value as Tema | 'auto' })}>
              <option value="auto">auto ({sistema})</option>
              <option value="chiaro">chiaro</option>
              <option value="scuro">scuro</option>
            </select>
            <label><input type="checkbox" checked={p.pericolo} onChange={(e) => aggiorna({ pericolo: e.target.checked })} /> pericolo</label>
            <a href={`?prototipo&galleria&v=${variante.chiave}`}>galleria</a>
          </Barra>
        )}
      </div>
    </Ctx.Provider>
  )
}

function Barra({ children }: { children: ReactNode }) {
  const [chiusa, setChiusa] = useState(false)
  return (
    <div className={`p-barra ${chiusa ? 'chiusa' : ''}`}>
      <button onClick={() => setChiusa(!chiusa)} aria-label="Nascondi">{chiusa ? '▴ prototipo' : '▾'}</button>
      {!chiusa && children}
    </div>
  )
}

function Galleria({ variante, onVariante }: { variante: Variante; onVariante: (v: Variante['chiave']) => void }) {
  return (
    <div className="p-galleria">
      <header>
        <strong>Prototipo App di segnalazione · galleria</strong>
        {VARIANTI.map((v) => (
          <button key={v.chiave} className={v.chiave === variante.chiave ? 'attiva' : ''} onClick={() => onVariante(v.chiave)}>
            {v.chiave} · {v.nome}
          </button>
        ))}
        <a href={`?prototipo&v=${variante.chiave}`}>una alla volta →</a>
      </header>
      <p className="p-galleria-nota">{variante.idea}</p>
      <div className="p-galleria-griglia">
        {SCHERMATE.map((s) => (
          <figure key={s.chiave}>
            <figcaption>{s.nome}</figcaption>
            <div className="p-coppia">
              {(['chiaro', 'scuro'] as const).map((t) => (
                <iframe key={t} loading="lazy" title={`${s.nome} ${t}`} src={`?prototipo&nudo&v=${variante.chiave}&s=${s.chiave}&tema=${t}`} />
              ))}
            </div>
          </figure>
        ))}
      </div>
    </div>
  )
}
