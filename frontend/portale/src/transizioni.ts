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

// Uno tsunami: un frangente entra dall'angolo in basso a destra, cresce correndo verso sinistra, si arriccia e si schianta
// sul bordo sinistro; poi l'acqua, cioè il nuovo tema, sale piano fino all'orlo.
// La fisica che segue: verso riva l'onda rallenta e si alza (shoaling), la cresta va più veloce della base e le passa
// davanti fino a fare il tubo (frangente a tuffo). Contro la parete l'acqua risale in un getto e ricade, l'onda riflessa
// torna indietro e la superficie sciaborda sempre meno mentre il livello sale.
const DURATA_ONDA = 2800
const SCHIANTO = 0.48 // frazione della durata in cui il labbro dell'onda tocca il bordo sinistro
const SCHIUMA = 9 // spessore della schiuma tra l'acqua e il vecchio tema, in px

type Punto = [number, number]

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const morbido = (a: number, b: number, t: number) => {
  const x = Math.min(Math.max((t - a) / (b - a), 0), 1)
  return x * x * (3 - 2 * x)
}
const campana = (x: number) => Math.exp(-x * x)

// Profilo del frangente in unità della sua altezza: u verso destra dalla cresta, v verso l'alto dal fondo.
// Si legge dal piede su per la parete concava del tubo, sotto il labbro fino alla punta, e indietro sopra la cresta.
// Stessi punti per l'onda ancora dritta (montante) e per il tubo, dove il labbro passa davanti al piede e cade.
const MONTANTE: Punto[] = [
  [-1.1, 0], [-0.95, 0.12], [-0.8, 0.28], [-0.68, 0.45], [-0.57, 0.6], [-0.47, 0.73], [-0.37, 0.84],
  [-0.27, 0.92], [-0.15, 0.98], [0, 1], [0.45, 0.9], [1, 0.6], [1.6, 0.38],
]
const TUBO: Punto[] = [
  [-0.15, 0], [0, 0.25], [0.05, 0.5], [-0.05, 0.72], [-0.28, 0.8], [-0.52, 0.72], [-0.66, 0.55],
  [-0.6, 0.78], [-0.35, 0.96], [0, 1], [0.45, 0.88], [1, 0.6], [1.6, 0.38],
]
const PUNTA = 6 // la punta del labbro

/** Catmull-Rom: `passi` punti per ogni tratto tra due punti di controllo, più l'ultimo. */
function spline(c: Punto[], passi: number): Punto[] {
  const out: Punto[] = []
  for (let i = 0; i < c.length - 1; i++) {
    const [p0, p1, p2, p3] = [c[Math.max(i - 1, 0)], c[i], c[i + 1], c[Math.min(i + 2, c.length - 1)]]
    for (let k = 0; k < passi; k++) {
      const t = k / passi
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t)
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])])
    }
  }
  out.push(c[c.length - 1])
  return out
}

/**
 * Fotogrammi dello tsunami. In ogni fotogramma la linea dell'acqua ha gli stessi punti, da fuori schermo in basso a
 * sinistra a fuori schermo a destra, con l'acqua sotto. Il nuovo tema sta nell'acqua, il vecchio sopra la schiuma;
 * nella striscia tra i due si vede lo sfondo del gruppo.
 */
function fotogrammiOnda(W: number, H: number, fotogrammi = 100) {
  const M = 60 // quanto la linea esce dallo schermo
  const hMax = Math.min(H * 0.72, W * 0.55)
  const altezza = (a: number) => hMax * (0.2 + 0.8 * a ** 1.3) // shoaling: più si avvicina alla riva più si alza
  const xFine = -TUBO[PUNTA][0] * altezza(1) - 0.01 * W // la cresta quando la punta del labbro tocca il bordo

  // Prima dello schianto, a da 0 a 1: il frangente corre verso sinistra e si arriccia.
  const frangente = (a: number): Punto[] => {
    const h = altezza(a)
    const arriccio = morbido(0.3, 1, a)
    const xc = lerp(W * 0.92, xFine, 0.6 * a + 0.4 * a * a * (3 - 2 * a))
    const affonda = (SCHIUMA + 4) * (1 - morbido(0, 0.08, a)) // all'inizio anche la schiuma è sotto il bordo
    const profilo = spline(
      MONTANTE.map(([u, v], i): Punto => [xc + lerp(u, TUBO[i][0], arriccio) * h, H - lerp(v, TUBO[i][1], arriccio) * h + affonda]),
      4,
    )
    const piede = Math.max(profilo[0][0], -M + 1)
    const fondo = Array.from({ length: 10 }, (_, j): Punto => [lerp(-M, piede, j / 10), H + M])
    const xs = profilo[profilo.length - 1][0]
    const xe = Math.max(xs + 50, W + M)
    const dietro = Array.from({ length: 20 }, (_, j): Punto => {
      const x = lerp(xs, xe, (j + 1) / 20)
      const seconda = 0.3 * h * campana((x - xc - 2.4 * h) / (0.5 * h)) // l'onda che segue la prima
      const increspa = 5 * Math.sin(x * 0.03 + a * 9) * Math.min(1, (x - xs) / (0.5 * h + 1))
      return [x, H - 0.35 * h - seconda - increspa + affonda]
    })
    return [...fondo, ...profilo, ...dietro]
  }

  // Dopo lo schianto, τ da 0 a 1: l'altezza della superficie in x.
  const superficie = (x: number, τ: number) => {
    const livello = lerp(0.3 * H, H + SCHIUMA + 50, τ * τ * (3 - 2 * τ)) // alla fine l'acqua passa l'orlo
    const getto = 0.32 * H * Math.sin(Math.PI * Math.min(τ / 0.4, 1)) * campana(x / (0.06 * W + 40)) // risale la parete e ricade
    const riflessa = 0.16 * H * (1 - τ) ** 1.5 * campana((x - xFine - 1.4 * W * τ ** 0.9) / (0.14 * W))
    const sciabordio = 0.04 * H * Math.exp(-2.5 * τ) * Math.sin(2 * Math.PI * 1.3 * τ) * Math.cos((Math.PI * x) / W)
    const increspa = (6 - 3 * τ) * (0.6 * Math.sin(x * 0.018 + τ * 8) + 0.4 * Math.sin(x * 0.041 - τ * 11))
    return H - livello - getto - riflessa - sciabordio - increspa
  }

  const schianto = frangente(1)
  const N = schianto.length
  // Il labbro cade in avanti: ogni punto scende sulla superficie alla x più a sinistra tra lui e quelli che lo seguono,
  // così il tubo si chiude contro la parete; intanto i punti si ridistribuiscono uniformi lungo la superficie.
  // L'aria chiusa nel tubo (i punti prima della punta) si stringe verso la punta che cade, come una bolla schiacciata.
  const xCaduta = schianto.map(([x]) => x)
  for (let i = N - 2; i >= 0; i--) xCaduta[i] = Math.min(xCaduta[i], xCaduta[i + 1])
  const punta = 10 + PUNTA * 4 // dopo i punti del fondo, 4 per tratto della spline
  const dopo = (τ: number) => {
    const crollo = morbido(0, 0.22, τ)
    const chiudi = morbido(0, 0.15, τ)
    const [xp, yp] = schianto[punta]
    return schianto.map(([x0, y0], i): Punto => {
      const x = lerp(xCaduta[Math.max(i, punta)], lerp(-M, W + M, i / (N - 1)), morbido(0, 0.6, τ))
      const [xi, yi] = i < punta ? [xp, yp] : [x0, y0]
      const bolla = i < punta ? 1 - chiudi : 0
      return [lerp(xi, x, crollo) + bolla * (x0 - xp), lerp(yi, superficie(x, τ), crollo) + bolla * (y0 - yp)]
    })
  }

  const px = ([x, y]: Punto) => `${x.toFixed(1)}px ${y.toFixed(1)}px`
  const nuovo: string[] = []
  const vecchio: string[] = []
  for (let f = 0; f <= fotogrammi; f++) {
    const t = f / fotogrammi
    const linea = t < SCHIANTO ? frangente(t / SCHIANTO) : dopo((t - SCHIANTO) / (1 - SCHIANTO))
    // la schiuma: la linea spostata perpendicolare all'acqua, verso il vecchio tema
    const schiuma = linea.map(([x, y], i): Punto => {
      const [xa, ya] = linea[Math.max(i - 1, 0)]
      const [xb, yb] = linea[Math.min(i + 1, N - 1)]
      const l = Math.hypot(xb - xa, yb - ya)
      return l < 1e-3 ? [x, y - SCHIUMA] : [x + ((yb - ya) / l) * SCHIUMA, y - ((xb - xa) / l) * SCHIUMA]
    })
    const destra = Math.max(linea[N - 1][0], W) + 3 * M
    const yFine = linea[N - 1][1]
    nuovo.push(`polygon(${linea.map(px).join(', ')}, ${px([destra, yFine])}, ${px([destra, H + 3 * M])}, ${px([-3 * M, H + 3 * M])})`)
    vecchio.push(
      `polygon(${px([-3 * M, -3 * M])}, ${px([-3 * M, H + 3 * M])}, ${schiuma.map(px).join(', ')}, ${px([destra, yFine - SCHIUMA])}, ${px([destra, -3 * M])})`,
    )
  }
  return { nuovo, vecchio }
}

/** Cambia tema con uno tsunami che entra in basso a destra, si schianta a sinistra e riempie la pagina del nuovo tema. */
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
