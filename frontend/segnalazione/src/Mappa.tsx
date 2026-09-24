import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { api } from 'shared/api'
import type { Posizione } from './bozza'

// Centro del Comprensorio, per chi sceglie il punto senza GPS.
export const CENTRO_COMPRENSORIO = { lat: 45.3906, lng: 10.4868 }

// Un punto sul Fosso Gerra e San Vigilio, in una zona con acquaiolo: dentro il perimetro. È dove
// si porta il segnaposto chi prova l'App lontano dal Comprensorio (ticket #139).
export const PUNTO_SUL_RETICOLO = { lat: 45.37939, lng: 10.5037 }

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
