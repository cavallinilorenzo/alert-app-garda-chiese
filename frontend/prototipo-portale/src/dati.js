// PROTOTIPO. Dati finti e regole in memoria (niente backend). Le segnalazioni sono generate da
// script/genera_dati.py su tracciati veri; le regole vengono dai ticket #5, #6, #8.
import SEGNALAZIONI from './segnalazioni.json'
import RUBRICA from './rubrica.json'

export const ORA = new Date('2026-09-24T11:30')
export const IO = 'Lorenzo (tu)'

export const CATEGORIE = {
  affiora: 'Acqua che affiora o perdita',
  tracima: 'Canale che tracima o allagamento',
  argine: 'Argine o sponda danneggiata/franata',
  ostruzione: 'Ostruzione o accumulo',
  paratoia: 'Paratoia o impianto danneggiato',
  sporca: 'Acqua sporca o cattivo odore',
  altro: 'Altro',
}

export const STATI = ['Ricevuta', 'In verifica', 'Assegnata', 'In intervento', 'Chiusa']
export const ESITI = ['risolta', 'duplicata', 'non di competenza', 'non riscontrata', 'falsa']
export const LIVELLI = ['Critica', 'Alta', 'Media', 'Bassa']
export const COLORI = { Critica: '#d0021b', Alta: '#f07b05', Media: '#e8c400', Bassa: '#2f6fd6' }
export const TEMPI = { Critica: 'verifica immediata', Alta: 'verifica entro 4 ore', Media: 'entro 1 giorno lavorativo', Bassa: 'entro 3 giorni lavorativi' }
export const INGRESSI = ['web app', 'numero verde', 'email']
export const ZONE = [...new Set(SEGNALAZIONI.map((s) => s.zona).filter(Boolean))].sort()

// Tasto che fa avanzare di un passo, per stato (ticket #6).
export const AVANZA = {
  Ricevuta: 'Prendi in carico',
  'In verifica': 'Assegna a…',
  Assegnata: 'Intervento avviato',
  'In intervento': null,
}

export const eta = (iso) => {
  const min = Math.round((ORA - new Date(iso)) / 60000)
  if (min < 60) return `${min} min fa`
  if (min < 60 * 24) return `${Math.round(min / 60)} h fa`
  return `${Math.round(min / 60 / 24)} g fa`
}
export const dataOra = (iso) =>
  new Date(iso).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

// Ordine della lista (ticket #8): Critica → Bassa, a parità di livello le più vecchie prima.
export const ordina = (lista) =>
  [...lista].sort((a, b) => LIVELLI.indexOf(a.priorita) - LIVELLI.indexOf(b.priorita) || a.ricevuta_il.localeCompare(b.ricevuta_il))

export const FILTRI_INIZIALI = { stati: STATI.filter((s) => s !== 'Chiusa'), livelli: LIVELLI, ingressi: INGRESSI, zona: '', testo: '' }
export const filtra = (lista, f) =>
  lista.filter(
    (s) =>
      f.stati.includes(s.stato) &&
      f.livelli.includes(s.priorita) &&
      f.ingressi.includes(s.canale_ingresso) &&
      (!f.zona || s.zona === f.zona) &&
      (!f.testo || `${s.codice} ${s.descrizione} ${s.infrastruttura.nome} ${s.acquaiolo_zona}`.toLowerCase().includes(f.testo.toLowerCase())),
  )

// Registro iniziale plausibile, ricostruito dallo stato attuale.
const registroIniziale = (s) => {
  const ev = [{ tipo: 'cambio_stato', a: 'Ricevuta', quando: s.ricevuta_il, chi: s.canale_ingresso }]
  const passi = STATI.indexOf(s.stato)
  let t = new Date(s.ricevuta_il)
  for (let i = 1; i <= passi; i++) {
    t = new Date(Math.min(t.getTime() + (20 + i * 35) * 60000, ORA.getTime() - (passi - i + 1) * 60000))
    const e = { tipo: 'cambio_stato', a: STATI[i], quando: t.toISOString(), chi: s.operatore_riferimento }
    if (STATI[i] === 'Assegnata') e.nota = `a ${s.acquaiolo ?? 'acquaiolo'}`
    if (STATI[i] === 'Chiusa') e.nota = `esito: ${s.esito}`
    ev.push(e)
    if (i === 1) ev.push({ tipo: 'nota', quando: new Date(t.getTime() + 5 * 60000).toISOString(), chi: s.operatore_riferimento, nota: 'Chiamato il segnalante, conferma la posizione.' })
  }
  return ev
}

export const statoIniziale = () => ({
  segnalazioni: SEGNALAZIONI.map((s) => ({ ...s, registro: registroIniziale(s), override: null })),
  rubrica: RUBRICA.map((r, i) => ({ ...r, id: i + 1 })),
})

const evento = (tipo, extra) => ({ tipo, quando: ORA.toISOString(), chi: IO, ...extra })

// Azioni dell'operatore, solo in memoria.
export function riduttore(st, az) {
  if (az.tipo === 'reset') return statoIniziale()
  if (az.tipo.startsWith('rubrica_')) {
    if (az.tipo === 'rubrica_salva')
      return {
        ...st,
        rubrica: az.voce.id ? st.rubrica.map((r) => (r.id === az.voce.id ? az.voce : r)) : [...st.rubrica, { ...az.voce, id: Date.now() }],
      }
    if (az.tipo === 'rubrica_elimina') return { ...st, rubrica: st.rubrica.filter((r) => r.id !== az.id) }
  }
  const cambia = (fn) => ({ ...st, segnalazioni: st.segnalazioni.map((s) => (s.id === az.id ? fn(s) : s)) })
  const conEvento = (s, e, campi = {}) => ({ ...s, ...campi, registro: [...s.registro, e] })
  switch (az.tipo) {
    case 'avanza':
      return cambia((s) => {
        const a = STATI[STATI.indexOf(s.stato) + 1]
        const campi = { stato: a }
        if (s.stato === 'Ricevuta') campi.operatore_riferimento = IO
        if (a === 'Assegnata') campi.acquaiolo = az.acquaiolo
        return conEvento(s, evento('cambio_stato', { a, nota: a === 'Assegnata' ? `a ${az.acquaiolo}` : undefined }), campi)
      })
    case 'indietro':
      return cambia((s) => {
        const a = STATI[STATI.indexOf(s.stato) - 1]
        return conEvento(s, evento('cambio_stato', { a, nota: az.nota }), { stato: a })
      })
    case 'chiudi':
      return cambia((s) =>
        conEvento(s, evento('cambio_stato', { a: 'Chiusa', nota: `esito: ${az.esito}${az.nota ? ` — ${az.nota}` : ''}` }), {
          stato: 'Chiusa',
          esito: az.esito,
          duplicato_di: az.duplicato_di ?? null,
        }),
      )
    case 'riapri':
      return cambia((s) => conEvento(s, evento('cambio_stato', { a: 'In verifica', nota: az.nota }), { stato: 'In verifica', esito: null }))
    case 'nota':
      return cambia((s) => conEvento(s, evento('nota', { nota: az.nota })))
    case 'override':
      return cambia((s) =>
        conEvento(s, evento('correzione_campo', { nota: `priorità ${s.priorita} → ${az.livello}: ${az.motivo}` }), {
          priorita: az.livello,
          override: { motivo: az.motivo },
        }),
      )
    case 'acquaiolo':
      return cambia((s) => conEvento(s, evento('correzione_campo', { nota: `acquaiolo ${s.acquaiolo ?? '—'} → ${az.acquaiolo}` }), { acquaiolo: az.acquaiolo }))
    default:
      return st
  }
}
