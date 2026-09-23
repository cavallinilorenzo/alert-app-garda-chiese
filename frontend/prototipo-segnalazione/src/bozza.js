// PROTOTIPO. Stato in memoria della segnalazione in corso; ogni variante lo mostra nel pannello "Stato".
import { useEffect, useState } from 'react'
import { CAMPI_VUOTI } from './dati.js'

const VUOTA = {
  modalita: null, // 'voce' | 'form'
  posizione: null, // { lat, lng, fonte: 'gps' | 'pin' }
  perimetro: null, // risposta finta di /api/perimetro/check
  foto: null,
  campi: CAMPI_VUOTI,
  transcript: null,
  cellulare: '',
  inviata: false,
}

export function useBozza(onStato) {
  const [bozza, setBozza] = useState(VUOTA)
  useEffect(() => {
    onStato?.(bozza)
  }, [bozza, onStato])
  const aggiorna = (patch) => setBozza((b) => ({ ...b, ...patch }))
  const aggiornaCampi = (patch) => setBozza((b) => ({ ...b, campi: { ...b.campi, ...patch } }))
  return [bozza, aggiorna, aggiornaCampi]
}
