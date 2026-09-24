import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export function Map({ onMarkerClick, filters, segnalazioni }: { onMarkerClick: (id: number) => void, filters: any, segnalazioni: any[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    const map = L.map(mapRef.current).setView([45.3, 10.5], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
    leafletMapRef.current = map;
    layerGroupRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, []);

  // Fetch layers and draw them
  useEffect(() => {
    if (!layerGroupRef.current) return;
    const group = layerGroupRef.current;
    group.clearLayers();

    const fetchLayers = async () => {
      try {
        const [reticoloRes, zoneRes] = await Promise.all([
          fetch('/api/layer/reticolo_principale.geojson'),
          fetch('/api/layer/zona_acquaiolo.geojson')
        ]);
        if (reticoloRes.ok) {
          const data = await reticoloRes.json();
          L.geoJSON(data, { style: { color: 'blue', weight: 2 } }).addTo(group);
        }
        if (zoneRes.ok) {
          const data = await zoneRes.json();
          L.geoJSON(data, { style: { color: 'green', weight: 1, fillOpacity: 0.1 } }).addTo(group);
        }
      } catch (e) {
        console.error('Failed to load layers', e);
      }
    };
    fetchLayers();

    segnalazioni.forEach(s => {
      if (s.lat && s.lng) {
        const color = s.priorita === 'critica' ? 'red' : s.priorita === 'alta' ? 'orange' : s.priorita === 'media' ? 'yellow' : 'green';
        const marker = L.circleMarker([s.lat, s.lng], {
          radius: 8,
          fillColor: color,
          color: s.priorita === 'critica' ? 'red' : '#fff',
          weight: s.priorita === 'critica' ? 4 : 1,
          opacity: s.priorita === 'critica' ? 0.5 : 1, // "aura rossa per Critica"
          fillOpacity: 1
        }).addTo(group);
        marker.on('click', () => onMarkerClick(s.id));
      }
    });

  }, [filters, segnalazioni, onMarkerClick]);

  return <div ref={mapRef} style={{ flex: 1, height: '100%', minHeight: '400px' }} />;
}
