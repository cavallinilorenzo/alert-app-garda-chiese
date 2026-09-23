// PROTOTIPO. Dati dal ticket "Tassonomia delle criticità e campi di una segnalazione" (#5).
// Niente backend: perimetro finto. GPS e voce sono veri solo con scenario "reale" su HTTPS;
// l'estrazione dei campi dal parlato è un estrattore a parole chiave che fa le veci di Gemini.

export const CATEGORIE = [
  { id: 'affiora', label: 'Acqua che affiora o perdita', icona: '💧', simbolo: 'water_drop' },
  { id: 'tracima', label: 'Canale che tracima o allagamento', icona: '🌊', simbolo: 'flood' },
  { id: 'argine', label: 'Argine o sponda danneggiata/franata', icona: '⛰️', simbolo: 'landslide' },
  { id: 'ostruzione', label: 'Ostruzione o accumulo', icona: '🪵', simbolo: 'block' },
  { id: 'paratoia', label: 'Paratoia o impianto danneggiato', icona: '⚙️', simbolo: 'valve' },
  { id: 'sporca', label: 'Acqua sporca o cattivo odore', icona: '🟤', simbolo: 'water_ec' },
  { id: 'altro', label: 'Altro', icona: '❓', simbolo: 'more_horiz' },
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
  const ai = TRASCRIZIONI[scenario.ai] ? scenario.ai : 'completa'
  if (giro === 1) {
    return {
      transcript: TRASCRIZIONI[ai],
      campi: { ...CAMPI_VUOTI, ...CAMPI_ESTRATTI[ai] },
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
    ? // Nome e codice veri arriveranno dal backend (tracciato più vicino dai KML); qui è un segnaposto.
      { dentro: true, tracciato: 'un canale del Consorzio', distanza_m: 42 }
    : { dentro: false }
}

// Scenario "reale": GPS del telefono (serve HTTPS). Altrimenti posizione finta.
export function chiediGps(scenario) {
  if (scenario.gps !== 'reale') return chiediGpsFinto(scenario)
  return new Promise((ok, ko) => {
    if (!navigator.geolocation) return ko(new Error('non disponibile'))
    navigator.geolocation.getCurrentPosition(
      (p) => ok({ lat: p.coords.latitude, lng: p.coords.longitude, precisione_m: Math.round(p.coords.accuracy), fonte: 'gps' }),
      (e) => ko(e),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  })
}

// Indirizzo leggibile del punto (Nominatim di OpenStreetMap, va bene per un prototipo).
export async function indirizzoDi({ lat, lng }) {
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&accept-language=it`)
    const j = await r.json()
    const a = j.address ?? {}
    const via = [a.road, a.house_number].filter(Boolean).join(' ')
    const frazione = a.hamlet || a.village || a.suburb || a.quarter
    const comune = a.town || a.city || a.municipality
    return [...new Set([via, frazione, comune].filter(Boolean))].join(', ') || null
  } catch {
    return null
  }
}

// Fa le veci di Gemini finché non c'è il backend: parole chiave sul testo trascritto.
// null = "non detto", come nello schema deciso nel ticket #3.
const REGOLE_CATEGORIA = [
  ['sporca', /sporc|puzz|odor|schium|inquin|oleos|marron/],
  ['argine', /argin|spond|fran[aoe]|crollat|smottam/],
  ['paratoia', /paratoi|chiusa|saracinesc|impiant|pompa|valvol/],
  ['ostruzione', /ostru|intasat|ostacol|bloccat|rami\b|ramo\b|foglie|rifiut|detrit|accumul|tappat/],
  ['tracima', /tracim|esond|straripa|strabord|allag|trabocc/],
  ['affiora', /affior|perdit|perde|esce.{0,20}acqua|acqua.{0,20}(esce|usc)|zampill|sgorg|terreno.{0,15}bagnat|tubo|condott|rott/],
]
const PERSONE = /person|gente|bambin|ragazz|pedon|ciclist|qualcuno|anzian/
const STRADA = /strad|\bvia\b|viabilit|carreggiat|macchin|\bauto|traffic/
const EDIFICI = /\bcas[ae]\b|edific|abitaz|cantin|garage|capannon|stall|cascin/
const NEGA = /\bnon\b|nessun|niente|\bno\b/

export function estraiDaTesto(testo) {
  const t = ' ' + testo.toLowerCase() + ' '
  const campi = {}
  for (const [id, re] of REGOLE_CATEGORIA) if (re.test(t)) { campi.categoria = id; break }

  if (/non so da quanto|non so quando/.test(t)) campi.durata = 'non so'
  else if (/giorn|ieri|settiman|\bmes[ei]\b/.test(t)) campi.durata = 'da più di un giorno'
  else if (/\d+\s*ore|qualche ora|alcune ore|un paio d.ore|stamattina|stamani|da oggi|dalla mattina/.test(t)) campi.durata = 'da alcune ore'
  else if (/minut|mezz.ora|un.ora fa|poco fa|da poco/.test(t)) campi.durata = 'da meno di un’ora'
  else if (/adesso|in questo momento|proprio ora|appena/.test(t)) campi.durata = 'adesso'

  if (/non so quant/.test(t)) campi.quantita = 'non so'
  else if (/tant[ao] acqua|molt[ao] acqua|tantissim|getto|forte|fiume|un mare|enorme/.test(t)) campi.quantita = 'molta acqua'
  else if (/gocc/.test(t)) campi.quantita = 'gocce'
  else if (/poc[ao] acqua|un filo|piccol|legger|rigagnol|flusso|scorre/.test(t)) campi.quantita = 'piccolo flusso'

  // Pericolo: si guarda la frase in cui compare la parola; "non/nessun" nella stessa frase = no.
  const frasi = t.split(/[.;!?]|,|\be\b|\bma\b/)
  const pericolo = (bersaglio) => {
    const f = frasi.find((x) => bersaglio.test(x) && /pericol|rischi|minacc/.test(x))
    return f ? (NEGA.test(f) ? 'no' : 'sì') : null
  }
  campi.pericolo_persone = pericolo(PERSONE)
  campi.pericolo_strada = pericolo(STRADA)
  campi.pericolo_edifici = pericolo(EDIFICI)
  if (/nessun pericolo|non c.è (nessun )?pericolo|non (è|e) pericolos/.test(t))
    for (const k of ['pericolo_persone', 'pericolo_strada', 'pericolo_edifici']) campi[k] ??= 'no'

  for (const k of Object.keys(campi)) if (campi[k] == null) delete campi[k]
  return campi
}

// Simula navigator.geolocation.
export async function chiediGpsFinto(scenario) {
  await attesa(1100)
  if (scenario.gps === 'negato') throw new Error('permesso negato')
  return { ...POSIZIONE_GPS_FINTA, fonte: 'gps' }
}

export const SCENARIO_INIZIALE = { gps: 'reale', perimetro: 'dentro', ai: 'reale' }

export const OPZIONI_SCENARIO = {
  gps: [
    ['reale', 'GPS vero'],
    ['ok', 'GPS finto'],
    ['negato', 'GPS negato'],
  ],
  perimetro: [
    ['dentro', 'Dentro il perimetro'],
    ['fuori', 'Fuori perimetro'],
  ],
  ai: [
    ['reale', 'Voce vera'],
    ['completa', 'AI: tutto detto'],
    ['parziale', 'AI: mancano i facoltativi'],
    ['senzaCategoria', 'AI: manca anche il “cosa”'],
    ['emergenza', 'AI: pericolo per persone'],
  ],
}
