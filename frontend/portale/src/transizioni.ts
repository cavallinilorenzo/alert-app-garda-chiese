// Transizioni del Portale con la View Transitions API.
// Ogni transizione ha un tipo, scritto in <html data-vt="...">: il CSS dà i view-transition-name solo agli
// elementi di quella coreografia (lista e scheda per aprire, la mappa per Mappa → scheda), così le altre
// transizioni, come l'onda del tema, fotografano la pagina intera.
import { flushSync } from 'react-dom'

export type TipoTransizione = 'apri' | 'chiudi' | 'mappa' | 'tema'

export const movimentoRidotto = () => matchMedia('(prefers-reduced-motion: reduce)').matches

let ultima = 0

/** Applica `aggiorna` dentro una View Transition di tipo `tipo`; senza supporto o con movimento ridotto cambia e basta. */
export function transizione(tipo: TipoTransizione, aggiorna: () => void, prima?: () => Promise<unknown>) {
  if (!('startViewTransition' in document) || movimentoRidotto()) {
    aggiorna()
    return null
  }
  const html = document.documentElement
  const n = ++ultima
  html.dataset.vt = tipo
  const t = document.startViewTransition(async () => {
    flushSync(aggiorna)
    await prima?.()
  })
  t.finished.finally(() => {
    if (n === ultima) delete html.dataset.vt
  })
  return t
}

// ---------- onda del tema

const DURATA_ONDA = 2000

// Avanzata del fronte: l'impatto è veloce, poi l'acqua riempie la pagina piano piano.
const avanzata = (t: number) => 0.45 * (1 - (1 - t) ** 3) + 0.55 * t * t * (3 - 2 * t)

/**
 * Fotogrammi del fronte d'onda che attraversa lo schermo da destra a sinistra.
 * Per ogni fotogramma dà due poligoni: il nuovo tema a destra del fronte, il vecchio a sinistra della cresta.
 * Tra i due resta una striscia d'acqua dello sfondo del gruppo, la cresta.
 */
function fotogrammiOnda(W: number, H: number, fotogrammi = 90, punti = 48) {
  const alta = Math.min(Math.max(W * 0.05, 48), 110) // quanto il fronte si increspa
  const margine = alta * 2.2 + 30 // il fronte parte tutto fuori a destra e finisce tutto fuori a sinistra
  const nuovo: string[] = []
  const vecchio: string[] = []
  for (let f = 0; f <= fotogrammi; f++) {
    const t = f / fotogrammi
    const base = W + margine - avanzata(t) * (W + 2 * margine)
    const ampiezza = alta * (1 - 0.5 * t) // all'impatto l'acqua è agitata, poi si calma
    const muro = 0.2 + 0.6 * t // la parte più alta dell'onda scorre dall'alto verso il basso
    const fronte: [number, number, number][] = []
    for (let i = 0; i <= punti; i++) {
      const v = i / punti
      const y = v * H
      const increspatura =
        0.45 * Math.sin(v * Math.PI * 2.6 + t * 9) + 0.3 * Math.sin(v * Math.PI * 6.2 - t * 15) + 0.25 * Math.sin(v * Math.PI * 1.1 + t * 4)
      const cresta = Math.exp(-(((v - muro) / 0.22) ** 2)) // l'onda più alta avanza davanti al resto
      const x = base + ampiezza * (0.55 * increspatura - 0.8 * cresta)
      const schiuma = 5 + 9 * cresta + 3 * (1 + Math.sin(v * Math.PI * 9 + t * 20)) * (1 - t)
      fronte.push([x, y, schiuma])
    }
    const lontano = W + margine * 3
    nuovo.push(`polygon(${lontano}px 0px, ${fronte.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(', ')}, ${lontano}px ${H}px)`)
    vecchio.push(`polygon(${-margine * 3}px 0px, ${fronte.map(([x, y, s]) => `${(x - s).toFixed(1)}px ${y.toFixed(1)}px`).join(', ')}, ${-margine * 3}px ${H}px)`)
  }
  return { nuovo, vecchio }
}

/** Cambia tema con un'onda che entra da destra e porta il nuovo tema su tutta la pagina. */
export function ondaTema(cambia: () => void) {
  const t = transizione('tema', cambia)
  if (!t) return
  t.ready.then(() => {
    const { nuovo, vecchio } = fotogrammiOnda(innerWidth, innerHeight)
    const opzioni = { duration: DURATA_ONDA, easing: 'linear', fill: 'both' } as const
    const html = document.documentElement
    html.animate({ clipPath: nuovo }, { ...opzioni, pseudoElement: '::view-transition-new(root)' })
    html.animate({ clipPath: vecchio }, { ...opzioni, pseudoElement: '::view-transition-old(root)' })
  })
}
