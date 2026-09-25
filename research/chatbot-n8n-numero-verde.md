# Ricerca: chatbot vocale con n8n sul numero verde, pezzi e fattibilità

Ticket: [#148](https://github.com/cavallinilorenzo/alert-app-garda-chiese/issues/148), figlio della mappa [#144](https://github.com/cavallinilorenzo/alert-app-garda-chiese/issues/144). Fonti consultate il 25/09/2026. Tutte primarie: documentazione e listini ufficiali di n8n, Twilio, Deepgram, Retell, più la nostra `api/openapi.yaml`. Serve per una slide sul criterio Fattibilità, non è un progetto.

## In breve

- **Si fa con pezzi già pronti, senza scrivere un centralino.** Il numero verde del Consorzio inoltra le chiamate a un numero Twilio. Twilio trascrive la voce in italiano (`<Gather input="speech" language="it-IT">`). Ogni frase arriva a un webhook di **n8n**, che la classifica (con JEV o con un LLM) e risponde con la battuta successiva, oppure passa subito la chiamata a un **operatore** (`<Dial>`). A fine chiamata n8n crea la **Segnalazione** via API REST con `canale_ingresso: numero_verde`.
- **n8n orchestra, non gestisce l'audio.** Il nodo Twilio di n8n sa solo mandare SMS e fare chiamate in uscita. La voce la gestisce Twilio (o una piattaforma come Retell), e n8n riceve i webhook. È lo schema di tutti i template ufficiali n8n di voice agent.
- **Costo indicativo: pochi centesimi per chiamata per l'AI. La voce pesa di più.** Riconoscimento vocale Twilio: 0,02 $ per turno. Classificazione con JEV: circa 0 $. Una chiamata di 3 minuti con 4 turni costa **circa 0,10 $ di "intelligenza"**. Se invece il numero verde fosse di Twilio, la ricezione costerebbe 0,4614 $/min più 27 $/mese: **circa 1,5 $ per una chiamata di 3 minuti**. Per questo conviene tenere il numero verde attuale e inoltrare (tariffa del gestore attuale **non verificabile**).
- **Rischi principali**: (1) **emergenze**: il bot non sostituisce i canali di emergenza. Deve dirlo in apertura ("se c'è pericolo per persone chiama il 112") e passare a un operatore al primo segnale di Pericolo o su richiesta. (2) **Dove?**: al telefono non c'è GPS, e l'API chiede `lat`/`lng`. Serve un SMS con il link all'App di segnalazione, oppure il luogo detto a voce e confermato dall'operatore. (3) **Italiano**: supportato da Twilio e Deepgram, non misurato su dialetto e rumore. JEV in italiano **non verificato**. (4) **Latenza**: con i turni c'è una pausa a ogni battuta. Non l'abbiamo misurata.

## 1. Architettura (i pezzi)

```
Segnalante ──► numero verde del Consorzio (gestore attuale)
                 │ inoltro di chiamata
                 ▼
             numero Twilio ── STT it-IT ──► webhook n8n ──► JEV / LLM: Categoria, Pericolo, luogo
                 ▲                              │
                 └──── TwiML: <Say> domanda ◄───┤  nessun Pericolo: domanda successiva
                                                │  Pericolo o "operatore": <Dial> operatore
                                                ▼
                                   POST API REST ──► Segnalazione nel Portale operatore
                                   (+ SMS con link all'App di segnalazione per la posizione)
```

| Pezzo | Cosa fa | Opzione concreta | Fonte |
|---|---|---|---|
| Numero verde | Riceve la chiamata gratuita | Quello attuale del Consorzio, con inoltro a un numero Twilio. In alternativa un numero verde Twilio (solo per aziende ed enti, non per privati). | [Twilio: requisiti Italia](https://www.twilio.com/en-us/guidelines/it/regulatory) |
| Telefonia | Tiene la chiamata, parla (TTS), trasferisce | Twilio Programmable Voice: `<Say>`, `<Gather>`, `<Dial>` | [TwiML Gather](https://www.twilio.com/docs/voice/twiml/gather) |
| Speech-to-text | Voce → testo | `<Gather input="speech" language="it-IT">`, con Deepgram Nova come modello (Nova-2 e Nova-3 supportano l'italiano) | [Gather](https://www.twilio.com/docs/voice/twiml/gather), [Deepgram lingue](https://developers.deepgram.com/docs/models-languages-overview) |
| Orchestrazione | Riceve ogni frase, decide la battuta successiva, chiama le API | n8n: nodo Webhook più Respond to Webhook (risposta testuale con header personalizzati, quindi si può restituire TwiML) e HTTP Request verso il nostro backend | [Respond to Webhook](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook/) |
| Classificazione | Dal testo: Categoria, Pericolo, entità | JEV (`choice` per la Categoria, `noul` per il Pericolo), vedi `research/jev-api.md`. Oppure un LLM economico. | [research/jev-api.md](jev-api.md) |
| Passaggio a operatore | Trasferisce la chiamata a una persona | TwiML `<Dial>` verso il numero dell'operatore di turno | [Gather / TwiML](https://www.twilio.com/docs/voice/twiml/gather) |
| Creazione della Segnalazione | Scrive nel Portale operatore | `POST /segnalazioni/manuale` con `canale_ingresso: numero_verde` | `api/openapi.yaml` |

### Due varianti di conversazione

1. **A turni (consigliata per la slide, tutta in n8n).** Twilio ascolta fino a una pausa (massimo 60 secondi per turno) e manda `SpeechResult` e `Confidence` all'URL `action`. n8n risponde con il TwiML successivo. Bastano webhook HTTP, che n8n gestisce nativamente ([Gather](https://www.twilio.com/docs/voice/twiml/gather)).
2. **In tempo reale (più naturale).** Twilio ConversationRelay fa STT e TTS in streaming e parla con la nostra applicazione via **WebSocket** (`url` deve iniziare con `wss://`). Twilio dichiara una latenza mediana sotto 0,5 s e sotto 0,725 s al 95° percentile. Alla fine della sessione l'URL `action` riceve `HandoffData` e può rispondere con `<Dial>` verso un operatore ([ConversationRelay TwiML](https://www.twilio.com/docs/voice/twiml/connect/conversationrelay), [pagina prodotto](https://www.twilio.com/en-us/products/conversational-ai/conversationrelay)). Serve però un server WebSocket, che n8n non offre tra i nodi documentati. Andrebbe scritto a parte, oppure si usa una piattaforma come Retell, che gestisce voce e LLM e chiama n8n via webhook ([template n8n 3563](https://n8n.io/workflows/3563-build-an-ai-powered-phone-agent-with-retell-google-calendar-and-rag/)).

I template ufficiali n8n di voice agent (Retell, Vapi, Ultravox, ElevenLabs con Twilio) usano tutti una piattaforma vocale esterna, con n8n come colla via webhook ([n8n workflows](https://n8n.io/workflows/6309-create-multilingual-voice-calling-bot-with-gpt-4o-elevenlabs-and-twilio/)). Il nodo Twilio di n8n supporta solo "Send SMS/MMS/WhatsApp message" e "Make a phone call using text-to-speech", non le chiamate in entrata ([n8n Twilio node](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.twilio)).

### Il problema del "Dove?"

`POST /segnalazioni/manuale` chiede `lat` e `lng` obbligatori e un token di operatore (`bearerAuth`). Una telefonata non ha coordinate GPS. Le strade possibili:

- **SMS con il link all'App di segnalazione** (il nodo Twilio di n8n sa mandare SMS): il Segnalante apre il link e condivide la posizione. La chiamata diventa una Segnalazione completa di posizione e foto.
- **Luogo detto a voce** (comune e via): n8n lo geocodifica, e l'operatore lo conferma nel Portale operatore. Per il comune basta un `choice` JEV sui 33 comuni del comprensorio (vedi `research/jev-api.md`, punto 5).
- In entrambi i casi n8n userebbe un'utenza di servizio del Portale. **Da decidere**, non esiste oggi.

## 2. Costi indicativi (listini Twilio in USD, 25/09/2026)

| Voce | Prezzo | Fonte |
|---|---:|---|
| Ricezione su numero verde Twilio in Italia | 0,4614 $/min + 27 $/mese | [Twilio Voice Italia](https://www.twilio.com/en-us/voice/pricing/it) |
| Ricezione su numero locale Twilio in Italia | **non verificabile**: il listino pubblico mostra solo i numeri verdi | idem |
| Chiamata in uscita verso fisso in Italia (es. `<Dial>` all'operatore) | 0,0168 $/min | idem |
| Chiamata in uscita verso cellulare in Italia, dall'area SEE | 0,0445 $/min | idem |
| STT con `<Gather>` (modello scelto da Twilio) | 0,02 $ per turno | [Twilio Voice pricing](https://www.twilio.com/en-us/voice/pricing/us) |
| STT con `<Gather>` Deepgram Nova o Google v2 | 0,025 $ per turno | idem |
| ConversationRelay (variante in tempo reale) | 0,07 $/min, minuti voce a parte | [Twilio Conversational AI pricing](https://www.twilio.com/en-us/products/conversational-ai/pricing) |
| Retell (piattaforma completa) | circa 0,11–0,15 $/min più la telefonia, con 10 $ di credito gratuito | [Retell pricing](https://www.retellai.com/pricing) |
| JEV | circa 0,00004 $ per classificazione | [research/jev-api.md](jev-api.md) |
| n8n | Community Edition self-hosted gratuita. Cloud da 20 €/mese (2.500 esecuzioni) o 50 €/mese (10.000), server a Francoforte. | [n8n pricing](https://n8n.io/pricing/) |

### Una chiamata tipo: 3 minuti, 4 turni

| Scenario | Calcolo | Totale |
|---|---|---:|
| **A. Numero verde attuale inoltrato, bot a turni** | 4 × 0,02 (STT) + JEV ≈ 0 | **≈ 0,08 $** più la ricezione sul numero Twilio (non verificabile) e la tariffa del numero verde attuale (già pagata oggi) |
| B. Numero verde Twilio, bot a turni | 3 × 0,4614 + 0,08 | **≈ 1,46 $** |
| C. Numero verde Twilio, ConversationRelay | 3 × (0,4614 + 0,07) | **≈ 1,60 $** più il server WebSocket e l'LLM |
| Passaggio a operatore | + 0,0168 $/min per la durata della chiamata trasferita | |

**Lettura per la slide**: l'intelligenza (STT più classificazione) costa **meno di 10 centesimi a chiamata**. La voce costa di più solo se si cambia numero verde. Il confronto onesto va fatto con il tempo dell'operatore (oggi la segreteria gestisce a mano anche le segnalazioni non urgenti, come raccontato nella presentazione della challenge), che **non è quantificabile** con i dati che abbiamo.

## 3. Rischi

- **Emergenze.** La challenge chiede che la soluzione non sostituisca i canali di emergenza. Il bot filtra solo le chiamate non urgenti:
  - frase d'apertura: "Se c'è un pericolo per persone, strade o case, chiama il 112";
  - al primo segnale di Pericolo (un `noul` JEV sopra una soglia bassa, o parole chiave) si passa subito a `<Dial>` verso un operatore, senza altre domande;
  - "operatore" detto a voce, o un tasto, trasferisce sempre;
  - fuori orario, senza operatori, il bot rimanda al 112 e non promette interventi.
  Soglie e parole chiave vanno tarate: **non verificato**.
- **Italiano.** Twilio `<Gather>` supporta `it-IT`, ma nella tabella delle lingue l'italiano non ha i modelli "enhanced" né "experimental" di Google v1 ([Gather, lingue](https://www.twilio.com/docs/voice/twiml/gather)). Deepgram Nova-2 e Nova-3 lo supportano. La qualità su dialetto, telefonate da cellulare in campagna e rumore **non è misurata**. JEV è addestrato soprattutto in inglese, e sull'italiano **non è verificato** (vedi `research/jev-api.md`).
- **Latenza.** Nella variante a turni ogni battuta paga il rilevamento della pausa, il webhook n8n, JEV (70–500 ms dichiarati) e la risposta. Stima a occhio: 1–3 s per turno, **non misurata**. La variante in tempo reale dichiara meno di 0,5 s di mediana, ma è un dato del fornitore.
- **Posizione.** Senza GPS la Segnalazione è meno precisa (vedi sopra): SMS con il link o conferma dell'operatore.
- **Privacy.** Una trascrizione contiene voce, numero, nomi e indirizzi. Servono un'informativa in apertura di chiamata e fornitori con dati in UE. n8n Cloud è a Francoforte. Per Twilio, Deepgram e TypeSafe la residenza dei dati **non è stata verificata**.
- **Burocrazia.** Un numero verde Twilio italiano si dà solo ad aziende ed enti, con i documenti del rappresentante ([Twilio: requisiti Italia](https://www.twilio.com/en-us/guidelines/it/regulatory)). Per inoltrare il numero verde attuale serve il gestore del Consorzio: **non sappiamo** quale sia né cosa permetta.

## Cosa resta aperto

- Il gestore e la tariffa del numero verde attuale del Consorzio, e se consente l'inoltro verso un numero esterno.
- Il prezzo di ricezione su un numero locale Twilio italiano, che il listino pubblico non mostra.
- La qualità di STT e JEV su chiamate reali in italiano: servono 20–30 registrazioni di prova.
- La latenza reale di un turno con n8n.
- Un'utenza di servizio del Portale operatore per n8n, e come gestire le coordinate mancanti in `POST /segnalazioni/manuale`.
