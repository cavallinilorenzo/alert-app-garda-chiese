// Pezzi piccoli del Portale operatore e la mappa. Icone: Material Symbols Rounded, niente emoji.
import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { api } from 'shared/api'
import simbolo from 'shared/marchio/simbolo.png'
import { COLORI, LIVELLI, NOME_LIVELLO, NOME_STATO, eta, titolo, type Priorita, type Segnalazione } from './dominio'

/** Nome dell'icona da https://fonts.google.com/icons */
export const Icona = ({ nome, piena, className = '' }: { nome: string; piena?: boolean; className?: string }) => (
  <span className={`material-symbols-rounded icona ${piena ? 'piena' : ''} ${className}`} aria-hidden="true">
    {nome}
  </span>
)

/** Simbolo del Consorzio Garda Chiese. */
export const Simbolo = ({ className = '' }: { className?: string }) => <img className={`simbolo ${className}`} src={simbolo} alt="" />

// I nomi nei KML sono in maiuscolo: "HALIUC & GORRIERI" → "Haliuc & Gorrieri".
export const titoloNome = (n: string) => n.toLowerCase().replace(/(^|[\s&'])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase())

// "Bertani" → "BE", "Sorio D" → "SD", "Haliuc & Gorrieri" → "HG"
const iniziali = (nome: string) => {
  const parti = nome.split(/[\s&]+/).filter(Boolean)
  return (parti.length > 1 ? parti[0][0] + parti[1][0] : parti[0].slice(0, 2)).toUpperCase()
}

export const Avatar = ({ nome, piccolo, accento }: { nome?: string | null; piccolo?: boolean; accento?: boolean }) =>
  nome ? (
    <span className={`avatar ${piccolo ? 'piccolo' : ''} ${accento ? 'accento' : ''}`} title={titoloNome(nome)}>
      {iniziali(nome)}
    </span>
  ) : (
    <span className={`avatar vuoto ${piccolo ? 'piccolo' : ''}`} title="Non assegnata">
      <Icona nome="person" />
    </span>
  )

export const Pallino = ({ livello }: { livello: Priorita }) => (
  <span className={`pallino-inline ${livello === 'critica' ? 'critica' : ''}`} style={{ background: COLORI[livello] }} />
)

export function Copia({ testo }: { testo: string }) {
  const [ok, setOk] = useState(false)
  return (
    <button
      className="btn-icona"
      title={ok ? 'Copiato' : 'Copia il numero'}
      onClick={() => {
        navigator.clipboard?.writeText(testo)
        setOk(true)
        setTimeout(() => setOk(false), 1200)
      }}
    >
      <Icona nome={ok ? 'check' : 'content_copy'} />
    </button>
  )
}

// ---------- mappa

type Strato = 'zona_acquaiolo' | 'reticolo_principale' | 'canale' | 'condotta'

const STRATI: Record<Strato, { nome: string; stile: L.PathOptions }> = {
  zona_acquaiolo: { nome: 'Zone acquaiolo', stile: { color: '#777', weight: 1, dashArray: '4 4', fillOpacity: 0.03 } },
  reticolo_principale: { nome: 'Reticolo principale', stile: { color: '#005a8c', weight: 3, opacity: 0.7 } },
  canale: { nome: 'Canali', stile: { color: '#00a3e8', weight: 2, opacity: 0.7 } },
  condotta: { nome: 'Condotte', stile: { color: '#8e44ad', weight: 1.2, dashArray: '5 4', opacity: 0.4 } },
}

// Un solo download per layer e per sessione.
const cache: Partial<Record<Strato, Promise<GeoJSON.FeatureCollection>>> = {}
export function caricaStrato(layer: Strato) {
  cache[layer] ??= api.GET('/layer/{layer}.geojson', { params: { path: { layer } } }).then(({ data }) => {
    if (!data) {
      delete cache[layer]
      throw new Error(`Layer ${layer} non disponibile`)
    }
    return data as GeoJSON.FeatureCollection
  })
  return cache[layer]
}

const tooltipStrato = (layer: Strato, p: Record<string, unknown>) =>
  layer === 'zona_acquaiolo'
    ? `${p.nome} · ${p.acquaiolo ? titoloNome(String(p.acquaiolo)) : 'non servita'}`
    : `${p.nome_completo}${p.codice ? ` (${p.codice})` : ''}`

const icona = (s: Segnalazione, sel: boolean) =>
  L.divIcon({
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    html: `<div class="pallino ${s.priorita === 'critica' ? 'critica' : ''} ${sel ? 'sel' : ''} ${s.stato_corrente === 'chiusa' ? 'chiusa' : ''}" style="background:${COLORI[s.priorita]}"></div>`,
  })

/** Aspetta che le tessere visibili sotto `radice` siano caricate, al massimo `max` ms: le transizioni fotografano una mappa completa. */
export function tessereCaricate(radice: ParentNode, max = 500) {
  const inAttesa = [...radice.querySelectorAll<HTMLImageElement>('img.leaflet-tile')].filter((img) => !img.complete)
  const caricate = inAttesa.map((img) => new Promise((ok) => ['load', 'error'].forEach((e) => img.addEventListener(e, ok, { once: true }))))
  return Promise.race([Promise.all(caricate), new Promise((ok) => setTimeout(ok, max))])
}

const tooltip = (s: Segnalazione) =>
  `<b>${s.codice_pratica}</b> · ${NOME_LIVELLO[s.priorita]}<br>${titolo(s)}<br><small>${NOME_STATO[s.stato_corrente]} · ${eta(s.created_at)}</small>`

type PropsMappa = {
  segnalazioni: Segnalazione[]
  selezionata?: number | null
  onSeleziona?: (id: number) => void
  strati?: Strato[]
  centro?: [number, number]
  zoom?: number
  conLegenda?: boolean
  /** Al clic su un pallino la mappa ci vola sopra, poi chiama onSeleziona (per la transizione verso la scheda). */
  volaPrima?: boolean
  /** Zoom del volo, anche frazionario; di base 16, lo zoom della mappa della scheda. */
  zoomVolo?: () => number
  /** Punto scelto a mano (Nuova segnalazione): un segnaposto; il clic sulla mappa chiama onPunto. */
  punto?: [number, number] | null
  onPunto?: (p: [number, number]) => void
  className?: string
}

const segnaposto = L.divIcon({
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 30],
  html: '<span class="material-symbols-rounded icona piena segnaposto">location_on</span>',
})

export function Mappa({
  segnalazioni,
  selezionata,
  onSeleziona,
  strati = ['zona_acquaiolo', 'reticolo_principale', 'canale', 'condotta'],
  centro,
  zoom,
  conLegenda = true,
  volaPrima,
  zoomVolo,
  punto,
  onPunto,
  className = '',
}: PropsMappa) {
  const el = useRef<HTMLDivElement>(null)
  const mappa = useRef<L.Map | null>(null)
  const gruppo = useRef<L.LayerGroup | null>(null)
  const adattata = useRef(false)
  const inVolo = useRef(false)
  const onSel = useRef(onSeleziona)
  onSel.current = onSeleziona
  const zoomDelVolo = useRef(zoomVolo)
  zoomDelVolo.current = zoomVolo
  const onPun = useRef(onPunto)
  onPun.current = onPunto
  const pin = useRef<L.Marker | null>(null)

  useEffect(() => {
    const m = L.map(el.current!, { zoomControl: true, attributionControl: false })
    mappa.current = m
    m.on('click', (e) => onPun.current?.([e.latlng.lat, e.latlng.lng]))
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, opacity: 0.8 }).addTo(m)
    const overlay: Record<string, L.LayerGroup> = {}
    let vivo = true
    ;(Object.keys(STRATI) as Strato[]).forEach((k) => {
      const g = L.layerGroup()
      overlay[STRATI[k].nome] = g
      if (strati.includes(k)) g.addTo(m)
      caricaStrato(k)
        .then((dati) => {
          if (!vivo) return
          L.geoJSON(dati, {
            style: STRATI[k].stile,
            onEachFeature: (f, l) => l.bindTooltip(tooltipStrato(k, f.properties ?? {}), { sticky: true }),
          }).addTo(g)
        })
        .catch(() => {}) // senza layer la mappa resta utile
    })
    L.control.layers(undefined, overlay, { collapsed: true, position: 'topright' }).addTo(m)
    gruppo.current = L.layerGroup().addTo(m)
    if (centro) m.setView(centro, zoom ?? 15)
    else m.setView([45.38, 10.5], 11)
    let raf = 0
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => m.invalidateSize())
    })
    ro.observe(el.current!)
    return () => {
      vivo = false
      ro.disconnect()
      m.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const g = gruppo.current!
    g.clearLayers()
    // le Critiche per ultime, così stanno sopra
    ;[...segnalazioni]
      .sort((a, b) => LIVELLI.indexOf(b.priorita) - LIVELLI.indexOf(a.priorita))
      .forEach((s) => {
        const mk = L.marker([s.lat, s.lng], { icon: icona(s, s.id === selezionata), zIndexOffset: s.id === selezionata ? 1000 : 0 })
        mk.bindTooltip(tooltip(s), { direction: 'top', offset: [0, -8] })
        mk.on('click', () => {
          if (!volaPrima) return onSel.current?.(s.id)
          if (inVolo.current) return
          inVolo.current = true
          // il pallino si ingrandisce subito, poi la mappa ci vola sopra e aspetta le tessere prima della transizione
          mk.getElement()?.firstElementChild?.classList.add('sel')
          mk.setZIndexOffset(1000)
          const m = mappa.current!
          m.once('moveend', async () => {
            await tessereCaricate(el.current!)
            inVolo.current = false
            onSel.current?.(s.id)
          })
          m.options.zoomSnap = 0 // lo zoom del volo può essere frazionario
          m.flyTo([s.lat, s.lng], zoomDelVolo.current?.() ?? 16, { duration: 1.1 })
        })
        mk.addTo(g)
      })
    // la prima volta, senza un centro imposto, inquadra tutti i pallini
    if (!centro && !adattata.current && segnalazioni.length > 1) {
      mappa.current!.fitBounds(L.latLngBounds(segnalazioni.map((s) => [s.lat, s.lng])), { padding: [40, 40] })
      adattata.current = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segnalazioni, selezionata])

  useEffect(() => {
    pin.current?.remove()
    pin.current = punto ? L.marker(punto, { icon: segnaposto, zIndexOffset: 2000 }).addTo(mappa.current!) : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [punto?.[0], punto?.[1]])

  useEffect(() => {
    if (centro) mappa.current!.setView(centro, Math.max(mappa.current!.getZoom(), zoom ?? 15))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [centro?.[0], centro?.[1]])

  return (
    <div className={`mappa-wrap ${className}`}>
      <div ref={el} className="mappa" />
      {conLegenda && (
        <div className="legenda">
          {LIVELLI.map((l) => (
            <span key={l}>
              <Pallino livello={l} /> {NOME_LIVELLO[l]}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
