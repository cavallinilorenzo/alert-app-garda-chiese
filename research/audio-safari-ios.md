# Registrazione audio da Safari iOS verso l'estrazione vocale

Ricerca per l'issue #56 (figlia della mappa #53). Data: 2026-09-24.

Domanda: con `MediaRecorder` in Safari iOS attuale quale formato audio si ottiene, come scegliere il `mimeType` perché funzioni su iOS Safari, Chrome Android e desktop, se quei formati passano da `POST /api/estrazione/vocale` fino a Gemini, a quali condizioni iOS concede il microfono e quali limiti ci sono rispetto al `413` del contratto.

Integra la §1 di [`stt-llm-demo.md`](stt-llm-demo.md) (issue #3), che resta valida; qui le fonti sono verificate di nuovo e confrontate con il codice attuale del backend.

## Risposta breve

- **Safari iOS, senza `mimeType`**: MP4 con audio AAC (`audio/mp4`). Da Safari 18.4 sa produrre anche **WebM/Opus**, ma solo se lo si chiede esplicitamente: il default non è cambiato, e le note di Safari 26 e 27 non lo cambiano.
- **Chrome (Android e desktop)**: WebM/Opus (`audio/webm;codecs=opus`). Da Chrome 126 accetta anche `audio/mp4`.
- **Scelta del `mimeType`**: provare in ordine `audio/webm;codecs=opus` → `audio/mp4` → `audio/ogg;codecs=opus` con `MediaRecorder.isTypeSupported()`. All'invio usare il **`recorder.mimeType` reale** come `type` del `Blob`.
- **Backend**: accetta sia `audio/webm` sia `audio/mp4` (i parametri `;codecs=...` vengono tolti prima del controllo). `audio/mp4` viene passato a Gemini come `audio/m4a`, che è nell'elenco di Gemini, mentre `audio/mp4` non c'è. `audio/webm` è nell'elenco di Gemini così com'è. **Resta da provare con una registrazione vera fatta da un iPhone.**
- **Microfono su iOS**: serve HTTPS (secure context), il permesso va chiesto almeno la prima volta e l'app dev'essere il documento top-level oppure un `<iframe allow="microphone">`. Conviene chiamare `getUserMedia` dal tap sul pulsante "Parla".
- **Limiti**: 10 MB (il `413`) equivalgono a circa 11 minuti a 128 kbps e 22 minuti a 64 kbps. Con un tetto lato client di 60-90 secondi il `413` in pratica non capita. Il limite di Gemini (20 MB inline per richiesta) sta sopra al nostro.

## 1. Che formato produce Safari iOS

| Browser | Formato di default | Altri formati su richiesta | Fonte |
|---|---|---|---|
| Safari iOS 14.3+ | MP4 + AAC (`audio/mp4`) | — | [WebKit: MediaRecorder API](https://webkit.org/blog/11353/mediarecorder-api/) |
| Safari 18.4+ | invariato | WebM + Opus; ALAC o PCM in MP4 | [WebKit Features in Safari 18.4](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/) |
| Safari 26.0 | invariato | ALAC/PCM (`audio/mp4; codecs=alac`) | [WebKit Features in Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/) |
| Safari 27.0 | nessuna novità su MediaRecorder; solo correzioni sulla decodifica WebM/Opus e sull'AudioSession durante la cattura | — | [WebKit Features for Safari 27.0](https://webkit.org/blog/18325/webkit-features-for-safari-27-0/) |
| Chrome Android / desktop | WebM + Opus | MP4 (H.264/AAC) da Chrome 126, anche su Android | [Chrome Platform Status: MP4 container support for MediaRecorder](https://chromestatus.com/feature/5163469011943424) |

Citazioni:
- WebKit (2020): "Safari currently supports the MP4 file format with H.264 as video codec and AAC as audio codec."
- WebKit 18.4: "MediaRecorder in WebKit for Safari 18.4 now supports creating WebM files using the Opus audio codec and either VP8 or VP9 for video." e "MediaRecorder can also generate high-quality, lossless audio tracks in ALAC or PCM formats." L'esempio usa un `mimeType` esplicito. Nel testo nessuna frase dice che il default cambia.
- MediaRecorder è su Safari iOS dalla 14 ([MDN browser-compat-data](https://github.com/mdn/browser-compat-data/blob/main/api/MediaRecorder.json)).

Quindi un iPhone aggiornato che registra senza opzioni produce un file MP4 (in pratica un `.m4a`) con AAC. Se il codice chiede WebM, Safari 18.4+ produce WebM/Opus.

## 2. Come scegliere il `mimeType`

MDN: `isTypeSupported()` "returns `true` if the MIME media type specified is one the user agent should be able to successfully record" ([MDN isTypeSupported](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static)). `recorder.mimeType` restituisce il tipo richiesto oppure, se non se n'è chiesto nessuno, "which was chosen by the browser", e "_may_ include the `codecs` parameter" ([MDN mimeType](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/mimeType)). L'esempio di MDN costruisce il file con `new Blob(chunks, { type: mediaRecorder.mimeType })` ([MDN dataavailable](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/dataavailable_event)).

Ordine raccomandato e perché:

1. `audio/webm;codecs=opus`: è il formato nativo di Chrome e Firefox, lo usa anche Safari 18.4+, e **Gemini elenca `audio/webm` esplicitamente**, quindi il backend non deve rimappare nulla.
2. `audio/mp4`: lo usa Safari iOS < 18.4. Il backend lo passa come `audio/m4a`.
3. `audio/ogg;codecs=opus`: ultima risorsa per browser vecchi o insoliti. Backend e Gemini accettano `audio/ogg`.
4. Nessuno supportato: `new MediaRecorder(stream)` senza opzioni, e il formato resta quello scelto dal browser.

`audio/mp4` non va messo primo. Su Chrome 126+ sarebbe supportato, e le fonti consultate non dicono quale codec audio Chrome metta nell'MP4 quando non lo si specifica. Se fosse Opus-in-MP4, inviarlo a Gemini come `audio/m4a` sarebbe una scommessa. Con WebM primo, Chrome resta sul suo percorso collaudato.

```js
const CANDIDATI = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus"];

async function avviaRegistrazione() {            // chiamata dal tap su "Parla"
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const scelto = CANDIDATI.find((t) => MediaRecorder.isTypeSupported(t));
  const rec = new MediaRecorder(stream, {
    ...(scelto && { mimeType: scelto }),
    audioBitsPerSecond: 64_000,                  // indicativo: Gemini scende comunque a 16 kbps
  });
  const chunks = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.onstop = () => {
    stream.getTracks().forEach((t) => t.stop()); // spegne il microfono e l'indicatore di iOS
    const tipo = (rec.mimeType || chunks[0]?.type || "").replace(/^video\//, "audio/");
    const audio = new Blob(chunks, { type: tipo });
    const ext = tipo.includes("mp4") ? "m4a" : tipo.includes("ogg") ? "ogg" : "webm";
    const form = new FormData();
    form.append("audio", audio, `registrazione.${ext}`);
    // fetch("/api/estrazione/vocale", { method: "POST", body: form })
  };
  rec.start(1000);                               // chunk da 1 s: nulla va perso se la pagina si chiude
  setTimeout(() => rec.state === "recording" && rec.stop(), 90_000); // tetto di durata
  return rec;
}
```

Note sul codice:
- **Il `type` del `Blob` è obbligatorio**. Il backend legge il `Content-Type` della parte multipart (`audio.content_type`), che il browser prende da `blob.type`. Un `new Blob(chunks)` senza `type` arriva come `application/octet-stream` e viene rifiutato con `400 audio_non_valido`.
- Il `.replace(/^video\//, "audio/")` è una difesa a basso costo: il backend accetta solo `audio/*`. Nelle fonti consultate non ho trovato conferma che Safari restituisca `video/mp4` per uno stream solo audio, quindi resta una precauzione e non un bug noto.
- `audioBitsPerSecond` è supportato da Safari 14.1 e Chrome 49 ([MDN BCD](https://github.com/mdn/browser-compat-data/blob/main/api/MediaRecorder.json)), ma il browser può trattarlo come un suggerimento.
- MDN avverte di non contare i chunk per misurare il tempo, perché `timeslice` "is not exact" e Safari può mettere in pausa la cattura. Per mostrare il timer si usa un orologio separato.

## 3. Compatibilità con `POST /api/estrazione/vocale`

Percorso del file nel backend:

1. `backend/estrazione/views.py`: rifiuta un file mancante o vuoto (`400`) e uno sopra `10 * 1024 * 1024` byte (`413 audio_troppo_grande`). Poi fa `content_type.split(";")[0].strip().lower()` e controlla il risultato contro `MIME_AMMESSI` (`audio/webm`, `audio/ogg`, `audio/mp4`, `audio/m4a`, `audio/x-m4a`, `audio/aac`, `audio/mpeg`, `audio/mp3`, `audio/wav`, `audio/x-wav`, `audio/flac`). Se non c'è, risponde `400 audio_non_valido`.
2. `backend/estrazione/services.py`: `MIME_PER_GEMINI` rimappa `audio/mp4` e `audio/x-m4a` in `audio/m4a`, `audio/mp3` in `audio/mpeg` e `audio/x-wav` in `audio/wav`. Poi invia i byte inline con `types.Part.from_bytes`, con un timeout di 30 s. La rimappatura di `audio/mp4` è coperta da `backend/tests/test_estrattore_gemini.py`.
3. `api/openapi.yaml`: documenta lo stesso elenco, il limite di 10 MB e i parametri tipo `;codecs=opus`.

Formati di Gemini ([Gemini: audio understanding](https://ai.google.dev/gemini-api/docs/audio)): `audio/wav`, `audio/mp3`, `audio/aiff`, `audio/aac`, `audio/ogg`, `audio/flac`, `audio/mpeg`, `audio/m4a`, `audio/l16`, `audio/opus`, `audio/alaw`, `audio/mulaw`, `audio/webm`. `audio/mp4` non c'è.

| Cosa registra il browser | Content-Type inviato | Backend | MIME passato a Gemini | Nell'elenco Gemini? |
|---|---|---|---|---|
| Chrome / Firefox / Safari 18.4+ con WebM | `audio/webm;codecs=opus` | ok (`audio/webm`) | `audio/webm` | sì |
| Safari iOS < 18.4 o senza opzioni | `audio/mp4` | ok | `audio/m4a` | sì (stesso contenitore MP4/AAC) |
| Firefox con Ogg | `audio/ogg;codecs=opus` | ok (`audio/ogg`) | `audio/ogg` | sì |
| `Blob` senza `type` | `application/octet-stream` | **400** | — | — |
| Tipo `video/mp4` | `video/mp4` | **400** | — | — |

Rischio residuo: l'equivalenza `audio/mp4` = `audio/m4a` è ragionevole (M4A è un MP4 con solo audio), ma la documentazione di Gemini non la dichiara. Il test attuale verifica solo la rimappatura, non una risposta vera di Gemini. Prima della demo va registrata una clip su un iPhone, con e senza WebM, e inviata all'endpoint reale. Se Gemini rifiutasse l'MP4, con l'ordine consigliato un iPhone con iOS 18.4+ invia già WebM, quindi il problema resterebbe solo sugli iOS più vecchi.

## 4. Permesso del microfono su iOS

- **HTTPS**: `getUserMedia()` esiste solo in un secure context (HTTPS, `localhost` o `file:`); su HTTP `navigator.mediaDevices` è `undefined` ([MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)). WebKit: "the document requesting the camera and microphone needs to come from a HTTPS domain" ([WebKit: A Closer Look Into WebRTC](https://webkit.org/blog/7763/a-closer-look-into-webrtc/)). Per provare dal telefono in LAN serve un tunnel HTTPS. **Da verificare**: `deploy/nginx-garda-chiese.conf` nella repo ascolta solo sulla porta 80. Se l'HTTPS del dominio non viene configurato fuori dalla repo (es. certbot), in produzione il microfono non funziona.
- **Prompt**: il browser deve chiedere "at least the first time" ([MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)); WebKit: "the user is prompted ... when `getUserMedia` is first called". Un rifiuto arriva come `NotAllowedError`, e l'app deve rimandare al form a mano.
- **Gesto dell'utente**: né MDN né WebKit lo indicano come requisito di `getUserMedia`. Conviene comunque chiamarlo dal tap su "Parla": il prompt compare in un momento comprensibile e, se poi si riproduce audio, WebKit richiede un gesto per avviare la riproduzione ("A user gesture will still be required to initiate audio playback").
- **iframe**: "Only a window's top-level document ... can even request permission ..., unless the top-level context expressly grants permission for a given `<iframe>` ... using Permissions Policy" ([MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)). La policy di default di `microphone` è `self` ([MDN Permissions-Policy: microphone](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Permissions-Policy/microphone)). Safari supporta l'attributo `<iframe allow>` da 11.1 ma **non** l'header HTTP `Permissions-Policy` ([MDN BCD iframe](https://github.com/mdn/browser-compat-data/blob/main/html/elements/iframe.json), [BCD Permissions-Policy](https://github.com/mdn/browser-compat-data/blob/main/http/headers/Permissions-Policy.json)). Se il sito del Consorzio incorporasse l'app, dovrebbe usare `<iframe allow="microphone" src="https://...">`; non basta un header. Aperta come link, l'app non ha questo problema.
- **Webview delle altre app** (link aperto da WhatsApp o Instagram): WebKit abilita `getUserMedia` in `WKWebView` da iOS 14.3 ([WebKit: MediaRecorder API](https://webkit.org/blog/11353/mediarecorder-api/)), ma il permesso dipende dall'app che ospita la webview. Non l'ho verificato. Se il microfono non parte, si mostra il form.

## 5. Limiti noti

- **Dimensione e `413`**: il contratto fissa 10 MB (`AUDIO_MAX_BYTES = 10 * 1024 * 1024`). Stima: 10 MiB × 8 / 128 kbps ≈ **11 min**, a 64 kbps ≈ **22 min**. Una segnalazione dura 10-40 s, quindi con un tetto lato client di 60-90 s il `413` non capita.
- **nginx**: `client_max_body_size 10M` misura il corpo *intero*, boundary multipart compresi. Un file appena sotto i 10 MiB verrebbe fermato da nginx con un `413` in HTML, non con il JSON `audio_troppo_grande`. Con il tetto di durata è un caso teorico, ma il frontend deve gestire anche un `413` senza JSON.
- **Gemini**: "Maximum request size is 20 MB total (including prompts and all files)" per l'audio inline; 32 token al secondo; audio "Downsampled to 16 Kbps" e ridotto a mono; massimo 9,5 ore ([Gemini: audio understanding](https://ai.google.dev/gemini-api/docs/audio)). L'SDK codifica i byte inline in base64 (+33%), quindi 10 MiB diventano circa 14 MB: siamo sotto i 20. Visto il downsampling, registrare sopra i 64 kbps non migliora la trascrizione.
- **Tempo**: il backend aspetta Gemini al massimo 30 s (`GEMINI_TIMEOUT_MS`), poi risponde `503` e si passa al form. Una clip più corta risponde anche prima.
- **Chunk e sospensione**: MDN segnala che su Safari la cattura può essere messa in pausa e che su Chrome Android lo schermo bloccato ferma `dataavailable` ([MDN dataavailable](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/dataavailable_event)). Se l'app va in background la registrazione può risultare troncata o vuota: il backend risponde `400` a un file vuoto, e il frontend deve proporre di riprovare.

## Cosa resta da verificare sul campo

1. Una clip registrata da un iPhone con iOS 18.4+ (WebM) e una con iOS < 18.4, oppure forzando `audio/mp4` (MP4/AAC), inviate all'endpoint reale con una `GEMINI_API_KEY` valida.
2. Il valore esatto di `recorder.mimeType` su Safari iOS (con o senza `codecs`, `audio/` o `video/`).
3. Che il dominio di produzione sia servito in HTTPS.
