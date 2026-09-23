// PROTOTIPO. Dati dal ticket "Tassonomia delle criticità e campi di una segnalazione" (#5).
// Tutto finto: niente backend, niente AI, niente GPS vero.

export const CATEGORIE = [
  { id: 'affiora', label: 'Acqua che affiora o perdita', icona: '💧' },
  { id: 'tracima', label: 'Canale che tracima o allagamento', icona: '🌊' },
  { id: 'argine', label: 'Argine o sponda danneggiata/franata', icona: '⛰️' },
  { id: 'ostruzione', label: 'Ostruzione o accumulo', icona: '🪵' },
  { id: 'paratoia', label: 'Paratoia o impianto danneggiato', icona: '⚙️' },
  { id: 'sporca', label: 'Acqua sporca o cattivo odore', icona: '🟤' },
  { id: 'altro', label: 'Altro', icona: '❓' },
]

export const DURATE = ['adesso', 'da meno di un’ora', 'da alcune ore', 'da più di un giorno', 'non so', 'non applicabile']
export const QUANTITA = ['gocce', 'piccolo flusso', 'molta acqua', 'non so', 'non applicabile']
export const SI_NO = ['sì', 'no', 'non so']

export const DOMANDE = [
  { campo: 'categoria', testo: 'Che cosa hai visto?', obbligatorio: true },
  { campo: 'descrizione', testo: 'Raccontalo in una frase breve.', obbligatorio: true },
  { campo: 'durata', testo: 'Da quanto tempo lo vedi?', opzioni: DURATE },
  { campo: 'quantita', testo: 'Quanta acqua vedi?', opzioni: QUANTITA },
  { campo: 'pericolo_persone', testo: 'C’è pericolo per le persone?', opzioni: SI_NO },
  { campo: 'pericolo_strada', testo: 'C’è pericolo per una strada o per la viabilità?', opzioni: SI_NO },
  { campo: 'pericolo_edifici', testo: 'C’è pericolo per case o altri edifici?', opzioni: SI_NO },
]

export const CAMPI_VUOTI = Object.fromEntries(DOMANDE.map((d) => [d.campo, null]))

export const categoria = (id) => CATEGORIE.find((c) => c.id === id)

export const mancanti = (campi) => DOMANDE.filter((d) => campi[d.campo] == null || campi[d.campo] === '')
export const obbligatoriMancanti = (campi) => mancanti(campi).filter((d) => d.obbligatorio)
export const descrizioneValida = (t) => t != null && t.trim().length >= 10 && t.length <= 500
export const isEmergenza = (campi) => campi.pericolo_persone === 'sì'

// Punto finto: vicino a Castiglione delle Stiviere, dentro il comprensorio.
export const CENTRO_COMPRENSORIO = { lat: 45.3906, lng: 10.4868 }
export const POSIZIONE_GPS_FINTA = { lat: 45.3941, lng: 10.4925 }

const TRASCRIZIONI = {
  completa:
    'Qui in mezzo al campo esce acqua dal terreno da ieri sera, c’è un bel flusso, la strada è bagnata ma nessun pericolo per le case.',
  parziale: 'Sto vedendo che esce acqua dal terreno qui vicino al campo di mais.',
  senzaCategoria: 'Volevo segnalare una cosa strana che ho visto vicino alla strada.',
  emergenza:
    'Il canale sta uscendo e l’acqua sta andando sulla strada, c’è una macchina ferma e dei ragazzi in bici, è pericoloso!',
}

const CAMPI_ESTRATTI = {
  completa: {
    categoria: 'affiora',
    descrizione: 'Esce acqua dal terreno in mezzo al campo da ieri sera, strada bagnata.',
    durata: 'da più di un giorno',
    quantita: 'piccolo flusso',
    pericolo_persone: 'no',
    pericolo_strada: 'sì',
    pericolo_edifici: 'no',
  },
  parziale: {
    categoria: 'affiora',
    descrizione: 'Esce acqua dal terreno vicino a un campo di mais.',
  },
  senzaCategoria: {
    descrizione: null,
  },
  emergenza: {
    categoria: 'tracima',
    descrizione: 'Il canale tracima e l’acqua invade la strada, ci sono persone.',
    durata: 'adesso',
    quantita: 'molta acqua',
    pericolo_persone: 'sì',
    pericolo_strada: 'sì',
  },
}

// Secondo giro di voce ("riparla"): riempie quello che manca con valori plausibili.
const COMPLETAMENTO = {
  categoria: 'altro',
  descrizione: 'Ho visto dell’acqua vicino alla strada, non so da dove arrivi.',
  durata: 'da alcune ore',
  quantita: 'piccolo flusso',
  pericolo_persone: 'no',
  pericolo_strada: 'no',
  pericolo_edifici: 'no',
}

const attesa = (ms) => new Promise((r) => setTimeout(r, ms))

// Simula POST /api/segnalazioni/estrazione (Gemini): audio -> transcript + campi, null = "non detto".
export async function estraiFinta(scenario, campiAttuali, giro) {
  await attesa(1400)
  if (giro === 1) {
    return {
      transcript: TRASCRIZIONI[scenario.ai],
      campi: { ...CAMPI_VUOTI, ...CAMPI_ESTRATTI[scenario.ai] },
    }
  }
  const campi = { ...campiAttuali }
  for (const [k, v] of Object.entries(COMPLETAMENTO)) if (campi[k] == null) campi[k] = v
  return { transcript: 'Allora, è da qualche ora, non c’è pericolo per nessuno.', campi }
}

// Simula POST /api/perimetro/check (soglia 300 m, ticket #7).
export async function controllaPerimetroFinto(scenario) {
  await attesa(900)
  return scenario.perimetro === 'dentro'
    ? { dentro: true, tracciato: 'Canale Seriola Marchionale (codice C-1123)', distanza_m: 42, acquaiolo: 'Zona Colli Morenici' }
    : { dentro: false }
}

// Simula navigator.geolocation (che su http dal telefono non funziona comunque).
export async function chiediGpsFinto(scenario) {
  await attesa(1100)
  if (scenario.gps === 'negato') throw new Error('permesso negato')
  return { ...POSIZIONE_GPS_FINTA, fonte: 'gps' }
}

export const SCENARIO_INIZIALE = { gps: 'ok', perimetro: 'dentro', ai: 'parziale' }

export const OPZIONI_SCENARIO = {
  gps: [
    ['ok', 'GPS consentito'],
    ['negato', 'GPS negato'],
  ],
  perimetro: [
    ['dentro', 'Dentro il perimetro'],
    ['fuori', 'Fuori perimetro'],
  ],
  ai: [
    ['completa', 'AI: tutto detto'],
    ['parziale', 'AI: mancano i facoltativi'],
    ['senzaCategoria', 'AI: manca anche il “cosa”'],
    ['emergenza', 'AI: pericolo per persone'],
  ],
}
