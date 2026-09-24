import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { api } from './api/client'

// Pagina provvisoria dello scheletro: dimostra che client generato, proxy /api e
// Leaflet funzionano insieme. Si butta quando arrivano le schermate vere.
export function ProvaCollegamento({ titolo }: { titolo: string }) {
  const contenitore = useRef<HTMLDivElement>(null)
  const [esito, setEsito] = useState('Chiamo /api/layer/zona_acquaiolo.geojson…')

  useEffect(() => {
    if (!contenitore.current) return
    const mappa = L.map(contenitore.current).setView([45.35, 10.55], 10)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(mappa)

    let annullata = false
    api
      .GET('/layer/{layer}.geojson', { params: { path: { layer: 'zona_acquaiolo' } } })
      .then(({ data, response }) => {
        if (annullata) return
        if (!data) {
          setEsito(`Errore ${response.status}`)
          return
        }
        const layer = L.geoJSON(data as GeoJSON.FeatureCollection).addTo(mappa)
        const confini = layer.getBounds()
        if (confini.isValid()) mappa.fitBounds(confini)
        setEsito(`OK: ${data.features.length} feature ricevute`)
      })
      .catch((errore: unknown) => {
        if (!annullata) setEsito(`Backend non raggiungibile: ${String(errore)}`)
      })

    return () => {
      annullata = true
      mappa.remove()
    }
  }, [])

  return (
    <main style={{ display: 'flex', flexDirection: 'column', height: '100dvh', margin: 0 }}>
      <header style={{ padding: '12px 16px', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: 20, margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined">water_drop</span>
          {titolo}
        </h1>
        <p style={{ margin: '4px 0 0' }}>{esito}</p>
      </header>
      <div ref={contenitore} style={{ flex: 1 }} />
    </main>
  )
}
