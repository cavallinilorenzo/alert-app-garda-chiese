# Hack4Water Alert — Consorzio di bonifica Garda Chiese

Servizio di segnalazione geolocalizzata delle criticità sul reticolo del Consorzio: una web app per chi segnala e un portale per il personale del Consorzio che prende in carico le segnalazioni.

## Language

### Territorio

**Consorzio**:
Il Consorzio di bonifica Garda Chiese, ente che gestisce opere di bonifica e irrigazione. È il cliente della challenge.
_Avoid_: azienda, ente gestore

**Reticolo consortile**:
L'insieme dei tracciati gestiti dal Consorzio: canali, condotte e reticolo principale. Una criticità è di competenza del Consorzio solo se riguarda il reticolo consortile.
_Avoid_: acquedotto, rete idrica

**Canale**:
Tratto superficiale e visibile del reticolo consortile (dispensatori, fossi, vasi, scoli, dugali…).

**Condotta**:
Tratto sotterraneo in pressione del reticolo consortile, a uso irriguo. Una sua rottura si vede solo dagli effetti in superficie (acqua che affiora, terreno allagato).
_Avoid_: tubatura, tubo

**Reticolo principale**:
Corsi d'acqua di competenza del Consorzio elencati negli allegati normativi (RIP).

**Comprensorio**:
L'area geografica di competenza del Consorzio (33 comuni). Si trova nel comprensorio non implica che un punto riguardi il reticolo consortile.

**Zona acquaiolo**:
Area del comprensorio affidata a un acquaiolo, raggruppata in macro-zone (es. Colli Morenici, Medio Nord). Alcune zone sono "non servite".

**Acquaiolo**:
Addetto del Consorzio responsabile sul campo di una zona acquaiolo.

### Segnalazioni

**Segnalazione**:
La comunicazione di una criticità sul reticolo consortile, con posizione, tipo di criticità, priorità, eventuali foto e stato.
_Avoid_: alert, ticket, report

**Segnalante**:
La persona che invia una segnalazione. Non ha un account.
_Avoid_: utente, cliente, consumer

**Canale di ingresso**:
Il mezzo da cui arriva una segnalazione: web app, numero verde, email. Tutte le segnalazioni confluiscono nello stesso portale, distinte dal canale.

**Fuori perimetro**:
Una segnalazione la cui posizione non riguarda il reticolo consortile. Viene rifiutata prima dell'invio e non arriva al Consorzio.

**Operatore**:
Persona del Consorzio che usa il portale per smistare e gestire le segnalazioni. L'acquaiolo non è un operatore.

**Rubrica acquaioli**:
Elenco dei recapiti telefonici degli acquaioli, usato dall'operatore per contattare chi è competente per una segnalazione.

### Applicazioni

**App di segnalazione**:
La web app pubblica, pensata per mobile, con cui il segnalante crea una segnalazione. Si apre dal sito del Consorzio.

**Portale operatore**:
L'applicazione desktop riservata al personale del Consorzio per gestire tutte le segnalazioni.
_Avoid_: dashboard, backoffice, pannello
