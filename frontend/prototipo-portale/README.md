# PROTOTIPO: layout del Portale operatore

Codice usa-e-getta per il ticket [Layout del portale operatore (mappa, lista, scheda)](https://github.com/cavallinilorenzo/alert-app-garda-chiese/issues/10). Vive solo sul branch `fe/10-prototipo-portale-operatore` e **non va in `main`**. Niente backend: le azioni cambiano solo lo stato in memoria (il tasto "ricomincia" nella barra del prototipo lo riporta all'inizio).

## Avvio

```sh
cd frontend/prototipo-portale
npm install
npm run dev
```

Poi apri `http://localhost:5173/` su un monitor desktop.

## Storia

- **Primo giro** (commit `43532be`): tre varianti, A mappa prima, B coda di lavoro, C tabellone per stato. È stata scelta **B**.
- **Secondo giro**: B rifinita. È l'unica rimasta in `src/PortaleOperatore.jsx`:
  - **Filtri**: una sola barra, condivisa tra Segnalazioni e Mappa. Cerca, zona, priorità e stato sono in vista; il canale di ingresso è in "Altri filtri".
  - **Lista**: righe su due livelli (titolo e dettaglio) e tag "Pericolo". Il tempo di ricezione è in evidenza, in rosso se è oltre i tempi di presa in carico. Con la scheda aperta la lista si stringe a colonna.
  - **Scheda**, in ordine di lettura: priorità, stato e codice → titolo grande → **quando è arrivata** (il canale di ingresso è in piccolo) → avviso di pericolo o di possibile rottura → **foto e mappa** grandi → avanzamento con le azioni → cosa è successo (descrizione grande, **pericoli prima** del transcript, "da verificare" solo se la confidenza è bassa) → contatti, infrastruttura, priorità → registro.
  - **Mappa**: il clic su un pallino riporta a Segnalazioni con la scheda già aperta e la riga evidenziata.
  - **Transizioni**: la scheda entra da destra, la lista si stringe, il cambio pagina è in dissolvenza, lo stepper è animato e dopo ogni azione compare un toast. Sono disattivate con `prefers-reduced-motion`.
  - **Icone**: Material Symbols Rounded (pacchetto `material-symbols`, locale), niente emoji.

## Dati

`npm run dati` (serve `uv`) rigenera da `mappe/*.kml`:

- `public/*.geojson`: canali, condotte, reticolo principale e zone acquaiolo, semplificati. Sono i tracciati veri e si accendono o spengono dal controllo dei layer della mappa.
- `src/segnalazioni.json`: 34 segnalazioni finte, ciascuna entro 120 m da un tracciato vero, con infrastruttura più vicina, distanza, zona e acquaiolo calcolati con shapely, e priorità calcolata con le regole del ticket [Criteri di priorità](https://github.com/cavallinilorenzo/alert-app-garda-chiese/issues/8). Le foto sono segnaposto casuali.
- `src/rubrica.json`: gli acquaioli delle zone, con numeri di telefono **finti**.
