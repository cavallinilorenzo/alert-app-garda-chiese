# PROTOTIPO: layout del Portale operatore

Codice usa-e-getta per il ticket [Layout del portale operatore (mappa, lista, scheda)](https://github.com/cavallinilorenzo/alert-app-garda-chiese/issues/10). Vive solo sul branch `fe/10-prototipo-portale-operatore` e **non va in `main`**. Niente backend: le azioni cambiano solo lo stato in memoria, condiviso tra le varianti (quello che fai in A lo ritrovi in B e C; ↺ ricomincia).

## Avvio

```sh
cd frontend/prototipo-portale
npm install
npm run dev
```

Poi apri `http://localhost:5173/?variant=A` su un monitor desktop.

## Dati

`npm run dati` (serve `uv`) rigenera da `mappe/*.kml`:

- `public/*.geojson`: canali, condotte, reticolo principale e zone acquaiolo, semplificati. Sono i tracciati veri e si accendono o spengono dal controllo dei layer della mappa.
- `src/segnalazioni.json`: 34 segnalazioni finte, ciascuna entro 120 m da un tracciato vero, con infrastruttura più vicina, distanza, zona e acquaiolo calcolati con shapely, e priorità calcolata con le regole del ticket [Criteri di priorità](https://github.com/cavallinilorenzo/alert-app-garda-chiese/issues/8). Le foto sono segnaposto casuali.
- `src/rubrica.json`: gli acquaioli delle zone, con numeri di telefono **finti**.

## Secondo giro: `?variant=B2` (default)

Al primo giro è stata scelta **B**. B2 è la sua rifinitura dopo il feedback:

- **Filtri**: una sola barra, condivisa tra Segnalazioni e Mappa: cerca, zona, priorità e stato in vista; il canale di ingresso va in "Altri filtri".
- **Lista**: righe su due livelli (titolo e dettaglio), tag "Pericolo", tempo di ricezione in evidenza, in rosso quando è oltre i tempi di presa in carico. Con la scheda aperta la lista si stringe a colonna.
- **Scheda**, in ordine di lettura: priorità, stato e codice → titolo grande → **quando è arrivata** (il canale di ingresso è in piccolo) → avviso di pericolo o di possibile rottura → **foto e mappa** grandi → avanzamento con le azioni → cosa è successo (descrizione grande, **pericoli prima**, "da verificare" solo se la confidenza è bassa, transcript ridotto a due righe) → contatti, infrastruttura, priorità → registro.
- **Mappa**: clic su un pallino → si torna a Segnalazioni con la scheda già aperta e la riga evidenziata.
- **Transizioni**: la scheda entra da destra, la lista si stringe, cambio pagina in dissolvenza, stepper animato, toast di conferma dopo ogni azione (disattivate con `prefers-reduced-motion`).

## Primo giro: cosa confrontare

| `?variant=` | Schermata principale | Scheda | Mappa | Rubrica |
|---|---|---|---|---|
| `A` Mappa prima | mappa a tutto schermo, lista flottante a sinistra | cassetto a destra, in una colonna: priorità → azioni → contatti → foto → racconto → infrastruttura → registro | è la schermata | finestra sopra la mappa |
| `B` Coda di lavoro | tabella densa ordinata per priorità, menu laterale | affiancata alla tabella, su due colonne: foto e racconto a sinistra, mini-mappa, infrastruttura, contatti e registro a destra | pagina a parte più mini-mappa nella scheda | pagina a parte |
| `C` Tabellone per stato | colonne Ricevuta → In intervento (Chiusa ridotta), card con il tasto del prossimo passo | finestra grande con schede (Dettagli, Posizione, Contatti, Registro) e azioni fisse in basso | striscia richiudibile in alto | pannello laterale |

Barra nera in basso: ◀ ▶ cambiano variante (anche con le frecce della tastiera), ↺ ricomincia, `{}` mostra la segnalazione aperta com'è in memoria. `Esc` chiude la scheda.

## Da decidere guardandolo

1. **Schermata principale**: mappa, tabella o tabellone per stato? Oppure un mix, per esempio la tabella di B con la striscia di mappa di C.
2. **Scheda**: una colonna, due colonne o schede? Cosa deve stare sopra senza scorrere: priorità, azioni, contatti, foto?
3. **Tasto del prossimo passo sulla card (C)**: va bene assegnare all'acquaiolo di zona con un clic, senza aprire la scheda?
4. **Layer**: quali sono accesi di default? Le condotte coprono quasi tutta la parte est del comprensorio.
5. **Chiuse**: nascoste di default (A, B) oppure in una colonna ridotta (C)?
6. **Rubrica**: pagina, finestra o pannello?
