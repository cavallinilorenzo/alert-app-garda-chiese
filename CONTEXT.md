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
Il mezzo da cui arriva una segnalazione: web app, numero verde, email, di persona (il passaparola, o chi la riferisce direttamente a un operatore o a un acquaiolo). Tutte le segnalazioni confluiscono nello stesso portale, distinte dal canale: quelle che non arrivano dalla web app le inserisce a mano l'operatore, per conto del segnalante.

**Fuori perimetro**:
Una segnalazione la cui posizione non riguarda il reticolo consortile. Viene rifiutata prima dell'invio e non arriva al Consorzio.

**Categoria**:
Ciò che il segnalante vede (acqua che esce dal terreno, canale che esonda, canale senz'acqua…), non la causa: chi segnala non vede una condotta, ne vede gli effetti. Ogni segnalazione ne ha una sola.
_Avoid_: tipo di guasto, causa

**Pericolo**:
Un rischio immediato dichiarato dal segnalante per persone, strade o edifici. Basta un pericolo per rendere la segnalazione critica; il danno a campi e colture non è un pericolo.

**Operatore**:
Persona del Consorzio che usa il portale per smistare e gestire le segnalazioni. Ha un account personale creato dall'amministratore: non esiste registrazione. L'acquaiolo non è un operatore.

**Rubrica acquaioli**:
Elenco dei recapiti telefonici degli acquaioli, usato dall'operatore per contattare chi è competente per una segnalazione.

### Ciclo di vita

**Stato**:
La fase in cui si trova una segnalazione: Ricevuta, In verifica, Assegnata, In intervento, Chiusa. Lo cambia solo l'operatore, con un'azione esplicita; aprire una segnalazione non ne cambia lo stato.
_Avoid_: fase, status

**Esito**:
Il motivo per cui una segnalazione è stata chiusa: risolta, duplicata, non di competenza, non riscontrata, falsa. Si indica sempre alla chiusura.

**Duplicato**:
Una segnalazione che riguarda la stessa criticità di un'altra già ricevuta, l'originale. Viene chiusa con esito duplicata e resta collegata all'originale, che mostra quante persone l'hanno segnalata.

**Registro**:
Lo storico di una segnalazione: cambi di stato, correzioni, note interne e duplicati collegati, ciascuno con il momento e l'operatore che l'ha fatto. Si aggiunge e basta, non si modifica.
_Avoid_: log, cronologia

**Operatore di riferimento**:
L'operatore che ha preso in carico una segnalazione. Indica chi la sta seguendo, ma non impedisce agli altri operatori di lavorarci.
_Avoid_: assegnatario, responsabile

**Pagina di stato**:
La pagina che il segnalante apre dal link ricevuto a fine invio per seguire la propria segnalazione: gli stati attraversati con le date, l'esito e un eventuale messaggio dell'operatore. Non mostra le note interne.
_Avoid_: tracking

### Applicazioni

**App di segnalazione**:
La web app pubblica, pensata per mobile, con cui il segnalante crea una segnalazione. Si apre dal sito del Consorzio.

**Portale operatore**:
L'applicazione desktop riservata al personale del Consorzio per gestire tutte le segnalazioni.
_Avoid_: dashboard, backoffice, pannello
