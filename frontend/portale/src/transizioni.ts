// Transizioni del Portale con la View Transitions API.
// Ogni transizione ha un tipo, scritto in <html data-vt="...">: il CSS dà i view-transition-name solo agli
// elementi di quella coreografia (la lista per aprire e chiudere la scheda), così le altre transizioni,
// come l'onda del tema, fotografano la pagina intera.
import { flushSync } from 'react-dom'

export type TipoTransizione = 'apri' | 'chiudi' | 'mappa' | 'tema'

export const movimentoRidotto = () => matchMedia('(prefers-reduced-motion: reduce)').matches

let ultima = 0

// Le animazioni fatte con element.animate() sugli pseudo-elementi ::view-transition-* restano attaccate al documento
// anche a transizione finita. Alla transizione dopo si sommerebbero alle nuove: con due clip-path sullo stesso
// livello Chrome non anima più sulla GPU ma sul main thread, e l'onda va a scatti dalla seconda volta in poi.
const togliAnimazioniRimaste = () =>
  document.getAnimations().forEach((a) => {
    if ((a.effect as KeyframeEffect | null)?.pseudoElement?.startsWith('::view-transition')) a.cancel()
  })

/** Applica `aggiorna` dentro una View Transition di tipo `tipo`; senza supporto o con movimento ridotto cambia e basta. */
export function transizione(tipo: TipoTransizione, aggiorna: () => void, dopo?: () => Promise<unknown>) {
  if (!('startViewTransition' in document) || movimentoRidotto()) {
    aggiorna()
    return null
  }
  const html = document.documentElement
  const n = ++ultima
  togliAnimazioniRimaste()
  html.dataset.vt = tipo
  const t = document.startViewTransition(async () => {
    flushSync(aggiorna)
    await dopo?.()
  })
  t.finished.finally(() => {
    if (n !== ultima) return
    delete html.dataset.vt
    togliAnimazioniRimaste()
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
 * Le increspature scorrono lente e la cresta ha uno spessore stabile: così il fronte non trema.
 */
function fotogrammiOnda(W: number, H: number, fotogrammi = 60, punti = 30) {
  const alta = Math.min(Math.max(W * 0.05, 48), 110) // quanto il fronte si increspa
  const margine = alta * 2 + 30 // il fronte parte tutto fuori a destra e finisce tutto fuori a sinistra
  const lontano = W + margine * 3
  const nuovo: string[] = []
  const vecchio: string[] = []
  for (let f = 0; f <= fotogrammi; f++) {
    const t = f / fotogrammi
    const base = W + margine - avanzata(t) * (W + 2 * margine)
    const ampiezza = alta * (1 - 0.45 * t) // all'impatto l'acqua è agitata, poi si calma
    const muro = 0.25 + 0.5 * t // la parte più alta dell'onda scorre dall'alto verso il basso
    const fronte: string[] = []
    const cresta: string[] = []
    for (let i = 0; i <= punti; i++) {
      const v = i / punti
      const y = (v * H).toFixed(1)
      const increspatura = 0.6 * Math.sin(v * Math.PI * 2.4 + t * 5) + 0.4 * Math.sin(v * Math.PI * 5.2 - t * 7)
      const alto = Math.exp(-(((v - muro) / 0.25) ** 2)) // l'onda più alta avanza davanti al resto
      const x = base + ampiezza * (0.5 * increspatura - 0.8 * alto)
      fronte.push(`${x.toFixed(1)}px ${y}px`)
      cresta.push(`${(x - 7 - 9 * alto).toFixed(1)}px ${y}px`)
    }
    nuovo.push(`polygon(${lontano}px 0px, ${fronte.join(', ')}, ${lontano}px ${H}px)`)
    vecchio.push(`polygon(${-margine * 3}px 0px, ${cresta.join(', ')}, ${-margine * 3}px ${H}px)`)
  }
  return { nuovo, vecchio }
}

/** Cambia tema con un'onda che entra da destra e porta il nuovo tema su tutta la pagina. */
export function ondaTema(cambia: () => void) {
  const { nuovo, vecchio } = fotogrammiOnda(innerWidth, innerHeight) // pronti prima della foto della pagina
  const t = transizione('tema', cambia)
  if (!t) return
  t.ready.then(() => {
    const opzioni = { duration: DURATA_ONDA, easing: 'linear', fill: 'both' } as const
    const html = document.documentElement
    html.animate({ clipPath: nuovo }, { ...opzioni, pseudoElement: '::view-transition-new(root)' })
    html.animate({ clipPath: vecchio }, { ...opzioni, pseudoElement: '::view-transition-old(root)' })
  })
}

// ---------- Mappa → scheda

/**
 * La nuova pagina parte ingrandita di `scala`, con la mini-mappa della scheda sopra la mappa grande,
 * e si allontana piano fino a mostrare il Portale intero.
 * La mappa grande ha già volato a uno zoom più alto di log2(scala): all'inizio le due mappe coincidono.
 */
export function allontana(grande: DOMRect, piccola: DOMRect, scala: number) {
  const x = grande.left + grande.width / 2 - scala * (piccola.left + piccola.width / 2)
  const y = grande.top + grande.height / 2 - scala * (piccola.top + piccola.height / 2)
  const html = document.documentElement
  html.animate(
    { transform: [`translate(${x}px, ${y}px) scale(${scala})`, 'none'] },
    { duration: 1300, easing: 'cubic-bezier(.45, 0, .12, 1)', fill: 'both', pseudoElement: '::view-transition-new(root)' },
  )
  html.animate({ opacity: [0, 1] }, { duration: 280, easing: 'ease-out', fill: 'both', pseudoElement: '::view-transition-new(root)' })
}
