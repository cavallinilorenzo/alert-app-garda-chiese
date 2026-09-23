# Speech-to-text e LLM di estrazione per la demo

Ricerca per l'issue #3 (figlia della mappa #1). Data: 2026-09-23, demo il 2026-09-25.

Domanda: quale combinazione di speech-to-text + LLM con structured output usare per il flusso vocale dell'**app di segnalazione** (browser mobile: Safari iOS e Chrome Android), con le chiamate ai provider fatte dal backend Django REST Framework.

## Risposta breve

- **Registrazione**: `MediaRecorder` nel browser, senza forzare il formato; il frontend invia il `Blob` al backend via `multipart/form-data` insieme al `mimeType` effettivo. Safari iOS produce per default MP4/AAC (da 18.4 sa fare anche WebM/Opus se richiesto), Chrome Android WebM/Opus. Serve HTTPS.
- **Niente Web Speech API** come percorso principale: su Safari iOS esiste solo con prefisso `webkit`, su Chrome passa comunque per un server Google, e non abbiamo controllo su qualità e vocabolario.
- **Raccomandazione**: **una sola chiamata a Gemini (`gemini-3.1-flash-lite`) con l'audio in input e structured output JSON**, che restituisce insieme trascrizione e campi estratti. I campi non detti sono `null` (tipo `["string","null"]`), e il backend ricalcola l'elenco dei campi mancanti da richiedere.
- **Piano B** (stessa interfaccia lato backend): OpenAI `gpt-4o-mini-transcribe` (STT, con prompt di vocabolario) + `gpt-5-nano` con Structured Outputs `strict`.
- **Costo stimato per segnalazione**: circa **0,1 centesimi di dollaro** con Gemini (circa 0,2 centesimi con il piano B), per un audio di 30 secondi. Anche con 2-3 turni di richiesta dei campi mancanti si resta sotto 1 centesimo.

## 1. Registrazione audio nel browser

### Supporto di MediaRecorder

| Browser | MediaRecorder da | Formato di default | Fonte |
|---|---|---|---|
| Safari iOS | 14 (abilitato di default da iOS 14.3) | MP4 con audio AAC (`audio/mp4`) | [MDN BCD](https://github.com/mdn/browser-compat-data), [WebKit: MediaRecorder API](https://webkit.org/blog/11353/mediarecorder-api/) |
| Safari 18.4+ | — | anche WebM/Opus, se richiesto con `mimeType` | [WebKit Features in Safari 18.4](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/) |
| Chrome Android | 47 | WebM/Opus (`audio/webm;codecs=opus`) | [MDN BCD](https://github.com/mdn/browser-compat-data) |

WebKit: "Safari currently supports the MP4 file format with H.264 as video codec and AAC as audio codec." Safari 18.4: "MediaRecorder ... now supports creating WebM files using the Opus audio codec". La nota 18.4 non dice che il default sia cambiato, quindi non va dato per scontato.

MDN raccomanda di non cablare i formati per browser ma di verificarli a runtime con `MediaRecorder.isTypeSupported()` ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static)). Scelta pratica:

```js
const preferiti = ["audio/webm;codecs=opus", "audio/mp4"];
const mimeType = preferiti.find((t) => MediaRecorder.isTypeSupported(t));
const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
// all'invio usare rec.mimeType (il formato reale), non quello richiesto
```

### Permessi e HTTPS

- `getUserMedia()` funziona solo in *secure context* (HTTPS, oppure `localhost`); su HTTP `navigator.mediaDevices` è `undefined` ([MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)). Per provare da telefono in LAN serve un tunnel HTTPS (es. ngrok/cloudflared) o un deploy.
- Il browser chiede sempre il permesso almeno la prima volta. La richiesta va fatta dal documento top-level: se l'app venisse **incorporata in un `<iframe>` nel sito del Consorzio**, l'iframe deve avere `allow="microphone"` (Permissions Policy) ([MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)). Se l'app si apre come link, il problema non c'è.
- Avviare `getUserMedia` dal tap sul pulsante "Parla" (gesto utente), e gestire `NotAllowedError` con un messaggio che rimanda al form testuale.

## 2. Web Speech API (STT nel browser)

Dal dataset di compatibilità MDN (browser-compat-data 8.1.2, 2026-09-17):

- `SpeechRecognition`: Chrome e Chrome Android senza prefisso da 139 (prima `webkitSpeechRecognition` da 33); **Safari iOS solo con prefisso `webkit`, da 14.5**; Firefox solo dietro flag.
- `processLocally` (riconoscimento on-device): solo Chrome desktop 139, sperimentale; **non** su Chrome Android né Safari.
- MDN: "This feature is not Baseline"; "On some browsers, like Chrome, using Speech Recognition on a web page involves a server-based recognition engine. Your audio is sent to a web service" ([MDN SpeechRecognition](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition)).

Conclusione: funziona su entrambi i browser target, ma con due implementazioni diverse, senza prompt di vocabolario ("dugale", "vaso", "condotta"), senza un file audio da conservare e con comportamento non controllabile in demo. Si può al massimo usare per mostrare una trascrizione "live" mentre si parla, mentre la trascrizione di riferimento resta quella del backend. Per la demo non conviene.

## 3. Opzioni STT lato server

| Opzione | Prezzo | Formati accettati | Note |
|---|---|---|---|
| OpenAI `gpt-4o-mini-transcribe` | $0,003/min | mp3, mp4, mpeg, mpga, m4a, wav, webm; max 25 MB | supporta `prompt` (vocabolario) e `language` |
| OpenAI `gpt-transcribe` | $0,0045/min | idem | modello raccomandato da OpenAI; usa `languages` (ISO 639-1); streaming del testo |
| OpenAI `gpt-4o-transcribe` / `whisper-1` | $0,006/min | idem | Whisper: prompt max 224 token |
| ElevenLabs Scribe v2 | $0,22/ora (circa $0,0037/min); keyterm prompting +$0,05/ora | — | piano Free con 4,5 ore incluse |
| Gemini (audio in input) | 32 token/s di audio (1 min = 1.920 token); vedi §4 | wav, mp3, aiff, aac, ogg, flac, mpeg, m4a, l16, opus, alaw, mulaw, webm; inline max 20 MB | STT ed estrazione nella stessa chiamata |

Fonti: [OpenAI pricing](https://developers.openai.com/api/docs/pricing), [OpenAI speech-to-text](https://developers.openai.com/api/docs/guides/speech-to-text), [ElevenLabs API pricing](https://elevenlabs.io/pricing/api), [Gemini audio](https://ai.google.dev/gemini-api/docs/audio), [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing).

**Formati e compatibilità**:
- OpenAI accetta sia il `webm` di Chrome sia l'`mp4`/`m4a` di Safari: nessuna conversione.
- Gemini elenca `audio/webm`, `audio/m4a` e `audio/aac`, ma **non `audio/mp4`**. L'audio di Safari va quindi inviato dichiarando `audio/m4a` (il contenitore è lo stesso MP4/AAC); se il provider lo rifiuta, si converte con `ffmpeg` nel backend (`-c:a libopus` in webm/ogg). **Va verificato con un file reale registrato da un iPhone prima della demo.**

**Qualità in italiano con rumore di campagna**: nessun provider pubblica benchmark su audio rumoroso in italiano paragonabile al nostro caso; le pagine ufficiali non danno numeri di latenza. Per registrazioni brevi (10-40 s) di una voce vicina al telefono, tutti i modelli citati sono adatti. Il rischio principale sono i termini locali (nomi di canali, località, "dugale", "vaso"), e si riduce passandoli nel prompt. Suggerimento: registrare 5-6 clip di prova all'aperto (vento, trattore) e confrontare Gemini con `gpt-4o-mini-transcribe` in mezz'ora.

## 4. LLM di estrazione con structured output

### Come si esprime "campo mancante"

Entrambi i provider supportano JSON Schema con tipi nullable:

- **OpenAI Structured Outputs** (`strict: true`): "all fields in the schema must be required"; un campo opzionale si ottiene "by using a union with null", es. `{"type": ["string","null"]}`; `additionalProperties: false` ovunque; in caso di rifiuto per sicurezza la risposta ha un campo `refusal` ([OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)).
- **Gemini structured output**: `mime_type: application/json` + `schema`; supporta `enum`, `required`, `description` e i nullable come `{"type": ["string","null"]}`; supporta "a subset of the JSON Schema specification" ([Gemini structured output](https://ai.google.dev/gemini-api/docs/structured-output)).

Convenzione proposta: **tutti i campi sono `required` ma nullable**. `null` significa "il segnalante non l'ha detto". Il modello non decide lui cosa chiedere: è il **backend** a calcolare `campi_mancanti` confrontando i `null` con i campi obbligatori della segnalazione, e a scegliere la domanda da fare. Così la logica di richiesta è deterministica e testabile. Nel prompt va scritto esplicitamente: "se un'informazione non è detta, usa null; non inventare".

Schema di esempio (i valori degli enum sono segnaposto; il tipo di criticità e le priorità vanno allineati con il modello di dominio):

```json
{
  "type": "object",
  "properties": {
    "trascrizione": { "type": "string" },
    "tipo_criticita": {
      "type": ["string", "null"],
      "enum": ["rottura_condotta", "canale_ostruito", "esondazione", "perdita", "altro", null]
    },
    "tipo_tratto": { "type": ["string", "null"], "enum": ["canale", "condotta", "non_so", null] },
    "descrizione": { "type": ["string", "null"], "description": "Riassunto breve del problema" },
    "luogo_descritto": { "type": ["string", "null"], "description": "Riferimenti di luogo detti a voce (via, località, ponte)" },
    "priorita_percepita": { "type": ["string", "null"], "enum": ["bassa", "media", "alta", null] },
    "pericolo_persone": { "type": ["boolean", "null"] }
  },
  "required": ["trascrizione", "tipo_criticita", "tipo_tratto", "descrizione", "luogo_descritto", "priorita_percepita", "pericolo_persone"],
  "additionalProperties": false
}
```

Nota: con `strict` di OpenAI un enum nullable deve avere `null` anche fra i valori dell'`enum`, come sopra. La documentazione Gemini non dice esplicitamente se `null` dentro `enum` sia accettato (supporta "a subset" di JSON Schema): se lo schema viene rifiutato, togliere `null` dagli `enum` e lasciarlo solo in `type`.

La posizione GPS non passa dall'LLM: arriva dal browser. `luogo_descritto` è solo un aiuto per l'operatore.

### Modelli economici (prezzi per 1M token, tier standard)

| Modello | Input testo | Input audio | Output |
|---|---|---|---|
| `gemini-3.1-flash-lite` (stabile) | $0,25 | $0,50 | $1,50 |
| `gemini-3.5-flash-lite` (stabile) | $0,30 | $0,30 | $2,50 |
| `gemini-2.5-flash-lite` | $0,10 | $0,30 | $0,40 |
| OpenAI `gpt-5-nano` | $0,05 | — | $0,40 |
| OpenAI `gpt-4o-mini` | $0,15 | — | $0,60 |

Fonti: [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing), [Gemini models](https://ai.google.dev/gemini-api/docs/models), [OpenAI pricing](https://developers.openai.com/api/docs/pricing). Tutti i Flash-Lite hanno un **free tier**, ma lì i contenuti "are used to improve our products"; nel tier a pagamento no. I limiti di richieste del free tier si vedono solo in AI Studio ([rate limits](https://ai.google.dev/gemini-api/docs/rate-limits)). Per la demo il free tier basta; per un pilota con dati di cittadini serve il tier a pagamento.

## 5. Raccomandazione e costo per segnalazione

**Scelta: Gemini `gemini-3.1-flash-lite`, una chiamata con audio + schema JSON.**

Motivi: una sola chiamata di rete (meno latenza e meno codice), accetta direttamente il WebM di Chrome, restituisce trascrizione e campi insieme, costo trascurabile, free tier per sviluppo e demo. `gemini-3.5-flash-lite` è un'alternativa equivalente per prezzo, da provare se la qualità in italiano risulta migliore.

**Stima di costo** (audio di 30 s, prompt di sistema + schema di circa 800 token, output di circa 300 token):

| Voce | Gemini 3.1 Flash-Lite | Piano B: gpt-4o-mini-transcribe + gpt-5-nano |
|---|---|---|
| Audio | 960 token × $0,50/M = $0,00048 | 0,5 min × $0,003 = $0,0015 |
| Input testo | 800 × $0,25/M = $0,0002 | 1.000 × $0,05/M = $0,00005 |
| Output | 300 × $1,50/M = $0,00045 | 300 × $0,40/M = $0,00012 |
| **Totale per turno** | **circa $0,0011** | **circa $0,0017** |

Ogni turno di richiesta dei campi mancanti costa più o meno lo stesso di un turno. **1.000 segnalazioni costano circa 1-3 dollari.** Se `gpt-5-nano` usa token di ragionamento, l'output cresce: impostare lo sforzo di ragionamento al minimo.

### Flusso di richiesta sul backend (schema)

```
[React] tap "Parla" -> getUserMedia -> MediaRecorder -> stop
   POST /api/segnalazioni/vocale/        (multipart: audio, mime_type, bozza_id?)
[DRF view]
   1. valida: dimensione (< 10 MB), durata (< 90 s), mime in whitelist
   2. normalizza il mime (audio/mp4 -> audio/m4a per Gemini)
   3. chiama il provider (chiave in variabile d'ambiente, mai al client)
        Gemini: parts = [prompt di sistema + campi già noti della bozza, audio inline]
                response_format = application/json + schema
   4. unisce il risultato con la bozza: i nuovi valori non null sovrascrivono,
      i null non cancellano i valori già noti
   5. campi_mancanti = [c for c in OBBLIGATORI if bozza[c] is None]
   6. risponde { bozza_id, campi, trascrizione, campi_mancanti, domanda_successiva }
[React] mostra i campi compilati; se campi_mancanti non è vuoto, mostra la
        domanda e il pulsante "Parla" (o un campo di testo) per rispondere;
        il segnalante conferma e poi invia la segnalazione (POST normale)
```

Per il turno successivo si manda lo stesso endpoint con `bozza_id` e il nuovo audio. Nel prompt si mette la domanda fatta ("Che tipo di tratto è: canale o condotta?") così la risposta breve ("un canale") viene interpretata correttamente. Isolare il provider dietro una funzione `estrai_da_audio(audio, mime, bozza) -> Estrazione` permette di passare al piano B cambiando un'implementazione.

## Caveat

- **Da verificare prima della demo** con un iPhone reale: che Gemini accetti l'audio MP4/AAC di Safari dichiarato come `audio/m4a`. In caso contrario, conversione con ffmpeg nel backend oppure piano B (OpenAI accetta `mp4`/`m4a`).
- Latenza e qualità in italiano con rumore non sono documentate dai provider: misurarle con 5-6 clip registrate all'aperto.
- Free tier Gemini: i dati possono essere usati da Google; va bene per la demo, non per dati reali di segnalanti (serve anche un'informativa privacy sull'audio).
- Prezzi e modelli letti il 2026-09-23; Google ha prezzi promozionali su alcuni Flash fino al 31-12-2026 (non sui Flash-Lite scelti).
- Serve HTTPS anche per la demo da telefono; se l'app viene incorporata in un iframe del sito del Consorzio, serve `allow="microphone"`.
- Prevedere sempre il fallback a form testuale (permesso negato, rumore eccessivo, provider giù).
