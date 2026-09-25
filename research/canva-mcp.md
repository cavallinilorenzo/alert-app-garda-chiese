# Ricerca: server MCP di Canva, cosa sa fare per il nostro deck

Ticket: [#147](https://github.com/cavallinilorenzo/alert-app-garda-chiese/issues/147), figlio della mappa [#144](https://github.com/cavallinilorenzo/alert-app-garda-chiese/issues/144). Fonti consultate il 25/09/2026. Tutte primarie: documentazione ufficiale di Canva su canva.dev (sezione "Canva for AI assistants"), metadati OAuth pubblicati dal server stesso, documentazione di Claude Code. Le pagine dell'Help Center di Canva (`canva.com/help/mcp-agent-setup/`, `canva.com/help/mcp-canva-usage/`) rispondono con una challenge anti-bot e **non sono state lette**.

## In breve

- **Comando per Claude Code** (quello del ticket #146 è corretto):
  ```bash
  claude mcp add --transport http canva https://mcp.canva.com/mcp
  ```
  Poi, dentro Claude Code, `/mcp` → Canva → login nel browser (oppure `claude mcp login canva` da shell). Trasporto Streamable HTTP, autenticazione OAuth per utente. Non serve nessuna chiave né app sul Developer Portal: il server accetta la registrazione dinamica del client. Ognuno si collega con il proprio account Canva e vede solo i propri design.
- **Si può**: generare una presentazione da un brief in linguaggio naturale (Canva propone più candidati, se ne sceglie uno), aprire un design esistente e **sostituire testi e immagini pagina per pagina**, caricare immagini da **URL pubblico HTTPS**, leggere le note del relatore, esportare in PDF/PPTX/PNG/MP4, commentare, spostare in cartelle.
- **Non documentato, quindi da non dare per scontato**: impostare font e colori, aggiungere o togliere pagine, cercare icone ed elementi nella libreria di Canva, **scrivere** le note del relatore. Le uniche operazioni di modifica documentate sono `replace_text`, `find_and_replace_text`, `update_fill`, `insert_fill`. Il resto si vede solo con la lista dei tool dopo il collegamento (#146).
- **Immagini locali**: il logo del Consorzio e il QR code in PNG **non si caricano da disco**. `upload-asset-from-url` vuole un URL pubblico HTTPS e la nostra repo è privata. Strada pratica: il team trascina i due PNG nei Caricamenti di Canva a mano, poi l'agente li trova tra gli asset e li piazza.
- **Piano Free basta** per tutto ciò che ci serve. Pro serve solo per ridimensionare, autofill, brand kit e brand template. Sul Free l'export è "qualità standard" e fallisce con `license_required` se il design contiene elementi premium. `generate-design` consuma crediti Canva AI (quanti ne ha un piano Free **non è documentato** nelle pagine lette).
- **Conseguenza per il deck**: la generazione da zero dà una bozza da ritoccare, non il deck finito. Il controllo fine su palette, font, sfondo scuro con l'onda e posizione degli elementi resta nell'editor di Canva, a mano. L'agente è utile per bozza, testi, immagini ed export.

## 1. Collegamento a Claude Code

- **Endpoint**: `https://mcp.canva.com/mcp`, trasporto **Streamable HTTP** ([Quickstart, Step 2](https://www.canva.dev/docs/apps/quickstart/), [Verify your Canva MCP app](https://www.canva.dev/docs/apps/mcp/verify-app/)). Per client che non supportano server remoti Canva indica `npx -y mcp-remote@latest https://mcp.canva.com/mcp` via stdio. Claude Code non ne ha bisogno.
- **Comando**: Claude Code aggiunge un server remoto con `claude mcp add --transport http <nome> <url>` e fa il login OAuth da `/mcp` o con `claude mcp login <nome>` ([Claude Code, MCP](https://code.claude.com/docs/en/mcp)). Quindi:
  ```bash
  claude mcp add --transport http canva https://mcp.canva.com/mcp
  # poi in sessione: /mcp  → seleziona canva → login nel browser
  ```
  Senza `--scope` il server finisce in scope locale (solo questo progetto, solo per chi lo esegue). Va bene: ognuno deve fare il proprio login comunque.
- **OAuth**: verificato direttamente sul server il 25/09/2026. Senza token `POST /mcp` risponde `401` con `WWW-Authenticate` che punta a `/.well-known/oauth-protected-resource/mcp`. I metadati espongono `registration_endpoint` (registrazione dinamica), `client_id_metadata_document_supported: true` (CIMD) e PKCE `S256`. Claude Code quindi completa il flusso da solo, senza client ID o secret. Il Developer Portal e la waitlist di cui parla la [pagina Access](https://www.canva.dev/docs/apps/mcp/access/) servono a chi integra Canva nel proprio prodotto, non a chi usa un client già esistente. La stessa pagina dice che la registrazione dinamica è "deprecated in favor of CIMD" ma resta attiva.
- **Autenticazione per utente**: niente account di servizio. Ognuno vede i propri design e quelli condivisi con lui ([Troubleshooting](https://www.canva.dev/docs/apps/mcp/troubleshooting/)). Il deck va quindi creato sull'account di chi fa il login, e poi condiviso con gli altri dall'editor di Canva.
- **Alternativa**: se chi usa Claude Code ha già collegato Canva come connettore su claude.ai, il connettore compare da solo in `/mcp` ([Claude Code, Use MCP servers from claude.ai](https://code.claude.com/docs/en/mcp)). Un server aggiunto con `claude mcp add` sullo stesso URL ha la precedenza e nasconde il connettore.
- **Tempi**: `generate-design` può impiegare fino a 60 secondi ([Troubleshooting](https://www.canva.dev/docs/apps/mcp/troubleshooting/), [Usage policy §7.1](https://www.canva.dev/docs/apps/mcp/usage-policy/)). Claude Code tiene per ogni richiesta HTTP un timer di almeno 60 secondi, quindi dovrebbe bastare. Da verificare sul campo.

## 2. I tool esposti

Elenco completo dalla pagina [MCP tools and rate limits](https://www.canva.dev/docs/apps/mcp/tools/). Canva stessa raccomanda di leggere la lista dal client invece di presumerla fissa ([Verify, Step 1](https://www.canva.dev/docs/apps/mcp/verify-app/)).

| Gruppo | Tool | Limite | Piano |
|---|---|---:|---|
| Asset | `upload-asset-from-url` | 30/min | tutti |
| | `get-assets` | 100/min | tutti |
| Autofill | `autofill-design`, `get-brand-template-dataset` | 60–100/min | **Pro+** |
| Brand template | `search-brand-templates`, `list-brand-kits`, `create-design-from-brand-template` | 20–100/min | **Pro+** |
| Commenti | `comment-on-design`, `reply-to-comment`, `list-comments`, `list-replies` | 20–100/min | tutti |
| Design | `search-designs`, `get-design`, `get-design-pages`, `get-design-content`, `get-presenter-notes`, `get-export-formats` | 100/min | tutti |
| | `generate-design`, `create-design-from-candidate`, `copy-design` | 20/min | tutti |
| Import | `import-design-from-url` | 20/min | tutti |
| Shortlink | `resolve-shortlink` | nessuno | tutti |
| Export | `export-design` | 20/min | tutti (qualità dipende dal piano) |
| Cartelle | `create-folder`, `list-folder-items`, `search-folders`, `move-item-to-folder` | 20–100/min | tutti |
| Ridimensionamento | `resize-design` | 20/min | **Pro+** |
| Modifica | `start-editing-transaction`, `perform-editing-operations`, `commit-editing-transaction`, `cancel-editing-transaction`, `get-design-thumbnail` | 20–50/min | tutti |

Gli scope OAuth pubblicati dal server confermano il perimetro: `design:content:read/write`, `asset:read/write`, `folder:read/write`, `comment:read/write`, `brandtemplate:*`, `brandkit:read`, `profile:read` ([metadati OAuth](https://mcp.canva.com/.well-known/oauth-protected-resource)).

## 3. Le domande del ticket, una per una

### Creare una presentazione da zero o da un template

- **Da zero**: `generate-design` prende un brief in linguaggio naturale e restituisce più **candidati** con anteprima. `create-design-from-candidate` trasforma quello scelto in un design vero e modificabile, e ne restituisce `id`, `edit_url` e `page_count` ([generate-design](https://www.canva.dev/docs/apps/mcp/tools/generate-design/), [create-design-from-candidate](https://www.canva.dev/docs/apps/mcp/tools/create-design-from-candidate/)). Canva chiede di far scegliere il candidato all'utente, non all'agente.
- Che si possa chiedere esplicitamente una **presentazione 16:9 di 7 pagine**: gli esempi ufficiali mostrano solo un post Instagram. `get-design-pages` restituisce `design_type: "presentation"` e pagine 1920×1080, quindi le presentazioni esistono come tipo. Lo schema di input di `generate-design` (parametri, tipi di design accettati, numero di pagine) **non è documentato**: da leggere dalla lista dei tool dopo #146.
- **Da template**: con il piano Free c'è solo `copy-design`, che duplica un design già presente nell'account (per esempio un template di presentazione aperto a mano nell'editor e salvato). `create-design-from-brand-template` e l'autofill richiedono Pro.
- **Da file**: `import-design-from-url` importa un design da un URL. Quali formati accetti (PPTX?) e se conservi le note del relatore **non è documentato** nelle pagine lette.

### Testi, colori e font

- **Testi: sì.** Il flusso è a transazione: `start-editing-transaction` restituisce gli elementi modificabili di tutte le pagine (`richtexts` e `fills`, ognuno con `element_id` e `page_index`, più posizione e dimensioni). `perform-editing-operations` riceve `transaction_id`, `page_index` e un array di operazioni. `commit-editing-transaction` salva. Senza commit le modifiche si perdono ([start](https://www.canva.dev/docs/apps/mcp/tools/start-editing-transaction/), [perform](https://www.canva.dev/docs/apps/mcp/tools/perform-editing-operations/), [commit](https://www.canva.dev/docs/apps/mcp/tools/commit-editing-transaction/)).
- Operazioni **documentate**: `replace_text` (per `element_id`), `find_and_replace_text` (da usare sulle pagine responsive), `update_fill` e `insert_fill` (immagini, tramite `asset_id`) ([perform-editing-operations](https://www.canva.dev/docs/apps/mcp/tools/perform-editing-operations/), [Verify, Step 4](https://www.canva.dev/docs/apps/mcp/verify-app/)).
- **Colori e font: non documentati.** Nessuna pagina cita operazioni di stile. **Non verificabile** finché non leggiamo lo schema di `perform-editing-operations` dal server. Ipotesi prudente: si cambiano a mano nell'editor, oppure si chiedono già nel brief di `generate-design` ("sfondo blu notte, accento azzurro…").
- Il commit fallisce se qualcuno modifica lo stesso design nel browser durante la transazione. In quel caso: annullare, riaprire, riapplicare. **Non tenere il deck aperto nell'editor mentre lavora l'agente.**

### Immagini: logo del Consorzio e QR code in PNG

- `upload-asset-from-url` carica immagini o video **solo da URL pubblico HTTPS** che risponda 200, altrimenti `fetch_failed`. L'`asset_id` restituito si usa poi in `update_fill` / `insert_fill`. Non si passa mai l'URL grezzo a un'operazione di modifica ([upload-asset-from-url](https://www.canva.dev/docs/apps/mcp/tools/upload-asset-from-url/)).
- **Non esiste un upload da file locale** tra i tool. Per noi:
  - `frontend/shared/marchio/logo.png` e `logo-scuro.png` non hanno un URL pubblico. La repo è privata (raw.githubusercontent risponde 404) e nel sito pubblicato il logo è impacchettato con un nome hash.
  - Il QR code generato in locale ha lo stesso problema.
  - **Strada consigliata**: il team trascina i PNG nei Caricamenti di Canva, poi l'agente li trova con `get-assets` e li inserisce con `insert_fill` / `update_fill`. La pagina di `get-assets` non esiste nella documentazione: che elenchi i caricamenti dell'utente **non è verificato**.
  - In alternativa si ospitano i PNG per pochi minuti su un URL pubblico HTTPS qualsiasi. Più fragile, e fuori dalla repo.
  - Il QR si può anche creare dentro Canva con la sua app QR code, a mano.

### Icone ed elementi della libreria

- La [pagina introduttiva](https://www.canva.dev/docs/apps/mcp/) cita una "library search", ma **nessun tool elencato cerca nella libreria di elementi, icone o foto di Canva**. Le ricerche esposte riguardano design, cartelle, asset propri e brand template. **Non verificabile**: forse `generate-design` inserisce icone nella bozza, ma non si possono chiedere e piazzare singolarmente. Icone ed elementi decorativi (l'onda) si aggiungono a mano nell'editor, oppure si caricano come immagini nostre.

### Note del relatore

- **Lettura sì**: c'è `get-presenter-notes` (tutti i piani).
- **Scrittura: non documentata.** Nessuna operazione di modifica documentata tocca le note. Ipotesi prudente: il discorso va incollato a mano nelle note di ogni slide. Resta aperto se l'import di un PPTX con le note (`import-design-from-url`) le conservi.

### Condividere ed esportare

- `export-design` accetta `format` (la pagina introduttiva cita PDF, PNG, JPG, PPTX, MP4) più `quality`, `size`, `width`, `height`, `lossless`. Restituisce link firmati che scadono subito, da scaricare immediatamente ([export-design](https://www.canva.dev/docs/apps/mcp/tools/export-design/)). `get-export-formats` dice quali formati valgono per un design.
- Qualità: Free = standard. Pro = lossless, sfondo trasparente, elementi premium. Su qualsiasi piano un design con elementi premium può fallire con `license_required` ([tools, nota Exports](https://www.canva.dev/docs/apps/mcp/tools/)).
- **Condivisione: nessun tool** cambia i permessi o invita persone. I tool restituiscono `edit_url` e `view_url`. La condivisione con Matteo e Simone si fa dall'editor di Canva ([Design edit handoff](https://www.canva.dev/docs/apps/mcp/workflows/design-edit/)).

## 4. Modificare un design esistente pagina per pagina

**Sì, per testi e immagini.** `start-editing-transaction` restituisce l'elenco delle pagine (`page_number`, dimensioni, `is_editable`) e gli elementi con il loro `page_index`. Ogni chiamata a `perform-editing-operations` indica la pagina su cui lavora. `get-design-pages` dà le miniature per pagina, `get-design-thumbnail` l'anteprima dopo le modifiche. Quindi un flusso "prototipo fatto a mano o generato → l'agente riempie testi e immagini slide per slide → export" è supportato.

**Non documentato**: aggiungere, eliminare o riordinare pagine, spostare o ridimensionare elementi, creare elementi nuovi diversi dalle immagini (`insert_fill`). Conviene partire da un design che ha **già 7 pagine** con la struttura giusta.

## 5. Limiti rilevanti per noi

- **Piano**: il Free basta. Ci servirebbe Pro solo per brand kit e brand template ([Access](https://www.canva.dev/docs/apps/mcp/access/)).
- **Crediti AI**: il modello a crediti di Canva si applica a `generate-design` ([Usage policy §7.3](https://www.canva.dev/docs/apps/mcp/usage-policy/)). Quante generazioni permetta un account Free **non è documentato** qui. Meglio poche generazioni mirate e poi modifiche via transazione, che non consumano crediti (ipotesi non verificata).
- **Rate limit**: 20 generazioni/min, 50 operazioni di modifica/min. Irrilevanti per un deck di 7 slide.
- **Scelta del tool**: con altri server MCP collegati, o con la generazione di immagini integrata, il modello può non chiamare Canva. Canva consiglia di scrivere esplicitamente "in Canva" nel prompt ([Verify, Step 5](https://www.canva.dev/docs/apps/mcp/verify-app/)).
- **Usage policy**: il logo di Canva non va alterato. Il nostro logo del Consorzio non è toccato da questa regola.

## Cosa resta aperto

Si chiude con la lista dei tool dopo il collegamento (#146), guardando lo schema di input di `generate-design` e `perform-editing-operations`:

- Se `generate-design` accetta tipo "presentazione", formato e numero di pagine.
- Se esistono operazioni di stile (colore, font, dimensione), di layout (posizione) o di pagina (aggiungi/elimina).
- Se si possono scrivere le note del relatore.
- Se `get-assets` elenca i PNG caricati a mano nell'editor.
- Quanti crediti AI ha un account Free.
