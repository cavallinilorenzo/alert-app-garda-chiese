import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { api } from 'shared/api'
import type { Posizione } from './bozza'

// Centro del Comprensorio, per chi sceglie il punto senza GPS.
export const CENTRO_COMPRENSORIO = { lat: 45.3906, lng: 10.4868 }

// Fallback per chi prova l'App lontano dal Comprensorio, usato solo se il GeoJSON non è
// ancora disponibile (errore di rete). In condizioni normali non viene mai usato.
const FALLBACK_SUL_RETICOLO = { lat: 45.37939, lng: 10.5037 }

// Il Reticolo consortile disegnato sotto il segnaposto, per aiutare a trovare il canale giusto.
const LAYER_RETICOLO = ['reticolo_principale', 'canale', 'condotta'] as const
type LayerReticolo = (typeof LAYER_RETICOLO)[number]

const STILE: Record<LayerReticolo, L.PathOptions> = {
  reticolo_principale: { color: '#005a8c', weight: 3, opacity: 0.8 },
  canale: { color: '#00a3e8', weight: 2, opacity: 0.8 },
  condotta: { color: '#00a3e8', weight: 2, opacity: 0.8, dashArray: '4 5' },
}

// Un solo download per sessione: tornare sul passo non rifà le chiamate.
let reticolo: Promise<[LayerReticolo, GeoJSON.FeatureCollection][]> | null = null

function caricaReticolo() {
  reticolo ??= Promise.all(
    LAYER_RETICOLO.map(async (layer) => {
      const { data } = await api.GET('/layer/{layer}.geojson', { params: { path: { layer } } })
      if (!data) throw new Error(`Layer ${layer} non disponibile`)
      return [layer, data as GeoJSON.FeatureCollection] as [LayerReticolo, GeoJSON.FeatureCollection]
    }),
  ).catch((errore: unknown) => {
    reticolo = null // si riprova la prossima volta
    throw errore
  })
  return reticolo
}

// --- Punto più vicino sul reticolo -------------------------------------------
// Proietta il punto P sul segmento AB e restituisce il punto più vicino sul segmento
// e la distanza al quadrato (in coordinate piane, basta per il confronto).

function proiettaSuSegmento(
  pLat: number, pLng: number,
  aLat: number, aLng: number,
  bLat: number, bLng: number,
) {
  const dx = bLng - aLng
  const dy = bLat - aLat
  const len2 = dx * dx + dy * dy
  // Segmento degenere (punto): restituisci A.
  if (len2 === 0) {
    const d = (pLng - aLng) ** 2 + (pLat - aLat) ** 2
    return { lat: aLat, lng: aLng, d2: d }
  }
  // t è la posizione della proiezione lungo il segmento, clampata in [0, 1].
  const t = Math.max(0, Math.min(1, ((pLng - aLng) * dx + (pLat - aLat) * dy) / len2))
  const projLng = aLng + t * dx
  const projLat = aLat + t * dy
  const d2 = (pLng - projLng) ** 2 + (pLat - projLat) ** 2
  return { lat: projLat, lng: projLng, d2 }
}

function cercaNellaLinea(
  coords: number[][],
  pLat: number, pLng: number,
  best: { lat: number; lng: number; d2: number },
) {
  for (let i = 0; i < coords.length - 1; i++) {
    const [aLng, aLat] = coords[i]
    const [bLng, bLat] = coords[i + 1]
    const proj = proiettaSuSegmento(pLat, pLng, aLat, aLng, bLat, bLng)
    if (proj.d2 < best.d2) {
      best.lat = proj.lat
      best.lng = proj.lng
      best.d2 = proj.d2
    }
  }
}

export async function puntoPiuVicinoSulReticolo(posizione: { lat: number; lng: number }) {
  const data = await caricaReticolo()
  const best = { lat: FALLBACK_SUL_RETICOLO.lat, lng: FALLBACK_SUL_RETICOLO.lng, d2: Infinity }

  for (const [, fc] of data) {
    for (const f of fc.features) {
      const g = f.geometry
      if (!g) continue
      if (g.type === 'LineString') {
        cercaNellaLinea(g.coordinates as number[][], posizione.lat, posizione.lng, best)
      } else if (g.type === 'MultiLineString') {
        for (const line of g.coordinates as number[][][]) {
          cercaNellaLinea(line, posizione.lat, posizione.lng, best)
        }
      }
    }
  }
  return { lat: best.lat, lng: best.lng }
}

const ICONA_SEGNAPOSTO = L.divIcon({
  html: '<span class="msym piena segnaposto">location_on</span>',
  className: '',
  iconSize: [48, 48],
  iconAnchor: [24, 46],
})

type Props = {
  posizione: Posizione
  /** Il segnaposto è stato trascinato o la mappa toccata. */
  onSposta: (lat: number, lng: number) => void
}

/**
 * Mappa con il segnaposto trascinabile. Si centra sulla posizione quando arriva dal GPS o quando
 * il punto finisce fuori dalla vista.
 */
export function Mappa({ posizione, onSposta }: Props) {
  const contenitore = useRef<HTMLDivElement>(null)
  const mappa = useRef<L.Map | null>(null)
  const segnaposto = useRef<L.Marker | null>(null)
  const sposta = useRef(onSposta)
  sposta.current = onSposta

  useEffect(() => {
    const m = L.map(contenitore.current!, { zoomControl: false, preferCanvas: true }).setView(
      [posizione.lat, posizione.lng],
      posizione.fonte === 'gps' ? 17 : 12,
    )
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(m)
    m.attributionControl.setPrefix(false)

    const pin = L.marker([posizione.lat, posizione.lng], { draggable: true, icon: ICONA_SEGNAPOSTO }).addTo(m)
    pin.on('dragend', () => {
      const { lat, lng } = pin.getLatLng()
      sposta.current(lat, lng)
    })
    m.on('click', (e: L.LeafletMouseEvent) => {
      pin.setLatLng(e.latlng)
      sposta.current(e.latlng.lat, e.latlng.lng)
    })
    mappa.current = m
    segnaposto.current = pin

    let smontata = false
    caricaReticolo()
      .then((layer) => {
        if (smontata) return
        // Sotto il segnaposto e senza intercettare i tocchi, che spostano il punto.
        for (const [nome, dati] of layer) L.geoJSON(dati, { style: STILE[nome], interactive: false }).addTo(m)
      })
      .catch(() => {
        // Senza reticolo la mappa resta usabile: il perimetro lo controlla comunque il backend.
      })

    return () => {
      smontata = true
      m.remove()
    }
    // La mappa si crea una volta sola; gli spostamenti successivi li gestisce l'effetto sotto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const m = mappa.current
    const punto = L.latLng(posizione.lat, posizione.lng)
    segnaposto.current?.setLatLng(punto)
    if (posizione.fonte === 'gps') m?.setView(punto, 17)
    else if (m && !m.getBounds().contains(punto)) m.setView(punto, Math.max(m.getZoom(), 15))
  }, [posizione.lat, posizione.lng, posizione.fonte])

  return <div ref={contenitore} className="mappa" />
}
