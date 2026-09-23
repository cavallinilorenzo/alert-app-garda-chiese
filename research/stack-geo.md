# Stack geo: PostGIS o shapely, import KML, tracciato più vicino

Ricerca per la issue #4. Domanda: qual è lo stack geo più semplice e affidabile in Django per (1) importare i 4 KML di `mappe/`, (2) dato un punto GPS trovare il tracciato del **reticolo consortile** più vicino e la **zona acquaiolo** che lo contiene, (3) servire i layer come GeoJSON a Leaflet.

## Raccomandazione

**Django normale (senza GeoDjango), con shapely 2 + pyproj e un indice STRtree in memoria**, caricato all'avvio del backend direttamente dai KML. Le segnalazioni restano nel DB normale (SQLite o Postgres), con `lat`/`lon` come float e i campi calcolati al momento dell'invio (layer, codice, nome, tipo, distanza, acquaiolo).

Perché:

- **I dati sono piccoli.** In tutto ci sono 302 placemark e 6.580 LineString, con 73.146 vertici, più 24 poligoni di zona. Parsing e proiezione richiedono circa 110 ms. Una query (tracciato più vicino più zona) richiede **circa 45 µs**. Un database spaziale non serve per queste prestazioni.
- **Il deploy è semplice.** `pip install shapely pyproj` installa wheel che includono già GEOS e PROJ. GeoDjango con PostGIS richiede invece GEOS, GDAL e PROJ di sistema più l'estensione PostGIS sul server del team ([Django GIS install](https://docs.djangoproject.com/en/stable/ref/contrib/gis/install/): "PostgreSQL: GEOS, GDAL, PROJ, PostGIS"). Con 2 giorni di hackathon, è mezza giornata di rischio che si evita.
- **L'import è banale.** I KML sono XML regolari (`Placemark` → `ExtendedData/SimpleData` + `LineString`/`Polygon`) e si leggono con `xml.etree` della libreria standard, senza GDAL.
- **La strada per migrare resta aperta.** Se in futuro servissero query spaziali sulle segnalazioni (es. "tutte le segnalazioni entro 500 m da X"), si passa a PostGIS senza cambiare il contratto API.

**Quando scegliere invece PostGIS:** se i tracciati dovessero essere modificati dal portale operatore, se il dataset crescesse di ordini di grandezza, o se il server avesse già Postgres con PostGIS installato. Nessuna di queste condizioni vale per la demo.

## Prova sui KML reali

Script: [`research/stack-geo-proof.py`](stack-geo-proof.py). Ambiente: Python 3.12, shapely 2.1.2, pyproj 3.8.0, su un Mac.

```
python3 -m venv /tmp/geo && /tmp/geo/bin/pip install shapely pyproj
/tmp/geo/bin/python research/stack-geo-proof.py mappe
```

Come funziona:
1. Legge ogni `Placemark`: attributi da `SimpleData`, geometria da `LineString` o `Polygon` (con i buchi `innerBoundaryIs`).
2. Proietta tutto da WGS84 (EPSG:4326) a **UTM 32N (EPSG:32632)** con `pyproj.Transformer.from_crs(..., always_xy=True)`. `always_xy` garantisce l'ordine lon,lat ([doc pyproj](https://pyproj4.github.io/pyproj/stable/api/transformer.html)). Proiettando, le distanze calcolate da shapely escono in metri: shapely lavora "in two-dimensional Cartesian space" nelle unità delle coordinate ([doc STRtree](https://shapely.readthedocs.io/en/stable/strtree.html)).
3. Costruisce un `STRtree` per le linee e uno per le zone. Il tracciato più vicino si ottiene con `tree.query_nearest(p, return_distance=True)`. La zona si ottiene con `tree_zone.query(p, predicate="within")`, dove il predicato vale `predicate(input, geometria_albero)`, cioè "il punto è dentro la zona" ([doc STRtree](https://shapely.readthedocs.io/en/stable/strtree.html)).

### Tempi misurati

| Operazione | Tempo |
|---|---|
| Parse dei 4 KML + proiezione UTM | ~110 ms |
| Costruzione dei due STRtree | ~0,1 ms |
| Query singola (tracciato più vicino + zona acquaiolo) | ~45 µs |
| Batch di 10.000 punti (solo tracciato più vicino) | ~360 ms |

### Risultati sui punti di prova

| Punto | Layer | NOME | CODICE_CAN | NOME_TIPO | Distanza | Zona acquaiolo |
|---|---|---|---|---|---|---|
| Vertice reale del canale 2126 spostato di 30 m a nord (controllo) | canale | ARNO' o CANALE ALTO MANTOVANO | 2126 | Canale | **29,9 m** | nessuna |
| Castiglione d/Stiviere, centro | rip | GOZZOLINA E RIALE | 0098 | Vaso | 83,4 m | NON SERVITA (Alto Mantovano) |
| Guidizzolo, centro | canale | P - principale | 3024 | Dispensatore | 263,6 m | BRIGNANI (Alto Mantovano) |
| Lonato del Garda, centro | canale | ARNO' o CANALE ALTO MANTOVANO | 2126 | Canale | 1.397 m | nessuna |
| Desenzano, lungolago | canale | ARNO' o CANALE ALTO MANTOVANO | 2126 | Canale | 5.075 m | nessuna |
| Milano Duomo (fuori comprensorio) | canale | PICENARDA | 8238 | Vaso | 90.735 m | nessuna |

Il controllo a 30 m restituisce 29,9 m: la proiezione e la distanza metrica sono corrette.

## Dati emersi dai KML (utili per #7 e per il modello dati)

- **Estensione.** Il bbox delle linee è circa 32 × 38 km. L'unione delle zone acquaiolo copre **757 km²**.
- **Lunghezze.** Canali 1.140 km, condotte 1.238 km, RIP 335 km.
- **Copertura delle zone.** Le zone acquaiolo coprono quasi tutto il reticolo: fuori da ogni zona restano solo il 2,4% dei canali, lo 0,3% delle condotte e lo 0,6% del RIP. Su 3.000 punti casuali dentro le zone, ognuno cade in **esattamente una** zona, quindi nel campione non ci sono sovrapposizioni. Tutti i poligoni sono validi.
- **Zone "NON SERVITA".** Sono due: una in Colli Morenici (39,5 km²) e una in Alto Mantovano (8,1 km²). Il centro di Castiglione cade in una zona non servita.
- **Condotte senza codice.** 37 condotte su 38 hanno `CODICE_CAN` vuoto, quindi vanno identificate per `NOME`/`NOME_COMPL`. Anche 13 placemark senza `NOME_TIPO`. Per il RIP il campo `NOME_TIPO` è il tipo di corso d'acqua (es. "Vaso"), non "RIP".
- **Attributi disponibili.** Canali e RIP hanno `CODICE_CAN, NOME, NOME_COMPL, NOME_TIPO, FUNZIONE, GERARCHIA, COMUNI, PROVINCIA, TRATTOGEST, BACINO_IRR/SCO, CAN_ALIMEN/SFOCIO…`. Il RIP ha in più `NORMATIVA`. Le zone hanno `ID, NOME` (acquaiolo), `ZONA` (macro-zona) e `Shape_Area`.

### Distribuzione delle distanze (per la soglia di perimetro, #7)

Distanza dal tracciato più vicino, per 6.089 punti casuali uniformi **dentro le zone acquaiolo** (proxy del comprensorio):

| Layer | p10 | p25 | mediana | p75 | p90 | ≤25 m | ≤50 m | ≤100 m | ≤200 m | ≤500 m |
|---|---|---|---|---|---|---|---|---|---|---|
| tutti i tracciati | 15 m | 40 m | 115 m | 281 m | 552 m | 16% | 30% | 46% | 66% | 88% |
| solo canali | 34 m | 97 m | 282 m | 709 m | 1.390 m | 8% | 15% | 26% | 42% | 66% |
| solo condotte | 36 m | 904 m | 3.650 m | 6.075 m | 7.882 m | 7% | 12% | 16% | 19% | 22% |
| solo RIP | 124 m | 326 m | 778 m | 1.609 m | 2.572 m | 2% | 4% | 8% | 16% | 36% |

Come leggerla: il reticolo è fitto. Con una soglia unica di 100 m, quasi metà del comprensorio (46%) risulta "in perimetro"; con 200 m i due terzi. Le condotte sono concentrate in pochi distretti irrigui: fuori da quelle aree la distanza da una condotta è di chilometri, dentro è di poche decine di metri. Una soglia per layer (es. stretta per i canali, più larga per le condotte, dato che una rottura si vede dagli effetti in superficie) è facile da implementare con uno STRtree per layer oppure con `query_nearest(..., max_distance=soglia)`.

## Servire i layer a Leaflet

Dimensioni dei FeatureCollection GeoJSON (KB):

| Layer | raw | raw gzip | semplificato 5 m + 6 decimali + attributi ridotti | idem gzip |
|---|---|---|---|---|
| canali | 1.032 | 373 | 281 | 78 |
| condotte | 1.383 | 463 | 538 | 138 |
| RIP | 303 | 118 | 62 | 19 |
| zone acquaiolo | 484 | 181 | 125 | 36 |

- La semplificazione è `shapely.simplify(geom_utm, 5, preserve_topology=True)` in UTM, così la tolleranza è in metri (Douglas-Peucker, "maximum allowed geometry displacement", [doc](https://shapely.readthedocs.io/en/stable/reference/shapely.simplify.html)). Poi si riproietta in WGS84 e si arrotonda a 6 decimali (~0,1 m).
- Attributi tenuti nella versione ridotta: `NOME, CODICE_CAN, NOME_TIPO, FUNZIONE` per le linee, `NOME, ZONA` per le zone.
- Tutti e quattro i layer semplificati pesano **circa 270 KB gzip**: si possono servire interi, come file statici generati all'avvio (o con un management command) e messi in cache. Tile vettoriali e bbox dinamici non servono.
- **Il calcolo del perimetro va fatto sempre sulle geometrie originali**, non su quelle semplificate. Quelle semplificate servono solo per il disegno.

## Confronto sintetico

| | Django + shapely/STRtree in memoria | GeoDjango + PostGIS |
|---|---|---|
| Dipendenze | `pip install shapely pyproj` (wheel con GEOS/PROJ inclusi) | GEOS, GDAL, PROJ di sistema + Postgres ≥ 15 con estensione PostGIS ([doc](https://docs.djangoproject.com/en/stable/ref/contrib/gis/install/)) |
| Import KML | ~60 righe con `xml.etree`, oppure lettura all'avvio | `LayerMapping` legge qualunque formato OGR, KML incluso, ma "requires GDAL" ([doc](https://docs.djangoproject.com/en/stable/ref/contrib/gis/layermapping/)) |
| Tracciato più vicino | `STRtree.query_nearest` in UTM, ~45 µs | `ORDER BY geom <-> punto LIMIT 1`: il KNN usa l'indice GiST solo in `ORDER BY` ([doc PostGIS](https://postgis.net/docs/geometry_distance_knn.html)). Per avere metri su WGS84 serve `geography=True` o una colonna proiettata ([doc GeoDjango](https://docs.djangoproject.com/en/stable/ref/contrib/gis/db-api/)). Con geography il KNN usa la sfera, non lo sferoide |
| Tempo di risposta | Microsecondi, in-process | Millisecondi (round-trip al DB), comunque più che sufficiente |
| Memoria | Pochi MB per worker (73k vertici) | Nel DB |
| Rischio in 2 giorni | Basso | Medio: installazione e configurazione sul server privato, driver, migrazioni con campi geometrici |
| Aggiornamento mappe | Sostituire i KML e riavviare | Rilanciare l'import |

## Note per l'implementazione

- Si carica una sola volta all'avvio (es. in `AppConfig.ready()` o in un modulo singleton). Con gunicorn ogni worker ha la sua copia, che è comunque di pochi MB.
- Al momento dell'invio si salvano nella segnalazione i valori calcolati (layer, nome, codice, tipo, distanza, acquaiolo/zona). Così lo storico non cambia quando cambiano i KML.
- La risposta di `POST /perimetro/check` può restituire il tracciato più vicino **per ciascun layer**, così la regola della soglia (#7) resta una semplice funzione.
