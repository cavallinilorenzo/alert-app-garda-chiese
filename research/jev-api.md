# Ricerca: API di JEV (typesafe.ai), schema, italiano, costi

Ticket: [#2](https://github.com/cavallinilorenzo/alert-app-garda-chiese/issues/2). Fonti consultate il 23/09/2026. Tutte primarie: blog e documentazione di TypeSafe, listini ufficiali di Google e OpenAI.

## In breve

- **JEV non è un LLM e non genera testo.** Riceve uno `state` (il transcript) e una mappa di domande tipizzate. Per ogni domanda restituisce una risposta chiusa con probabilità e confidenza. Non si può chiedergli "estrai l'indirizzo" come testo libero.
- **Lo "schema" sono tre primitive**: `choice` (enum, fino a 255 opzioni), `score` (scala ordinata, da 2 a 10 livelli), `noul` (sì/no come probabilità da 0 a 1). Un campo mancante si rende con un'opzione esplicita tipo `non_indicato`.
- **Italiano: supportato, ma non è la lingua principale.** La documentazione dice che l'accuratezza è migliore in inglese e che le altre lingue sono "gestite ma non altrettanto bene", da testare. Non ci sono benchmark sull'italiano: **non verificabile** senza una chiave API.
- **Costo**: $0,042 per milione di token in input, output gratis. Una segnalazione costa circa 0,00004 $. Con 10.000 segnalazioni l'anno si spendono **meno di 1 $ l'anno**, contro 1–26 $ con un LLM economico. Il risparmio relativo è grande (da 3 a 70 volte), quello assoluto è trascurabile.
- **Latenza dichiarata**: 70–500 ms end-to-end. È un dato del fornitore e non l'abbiamo misurato.
- **Accesso**: early access con waitlist dal 15/09/2026. Endpoint REST, SDK Python e JavaScript/TypeScript, rate limit di 1.200 richieste/minuto (limiti "dinamici").

## 1. Come funziona l'API

### Endpoint e forma della richiesta

`POST https://api.typesafe.ai/v1/systemone` con `Authorization: Bearer <API_KEY>`. Il corpo ha tre campi: `state` (stringa, oggetto o array), `model` (`"jev-latest"`, oggi `jev-1.13.0`) e `questions` (mappa `id → domanda`). La risposta contiene `answers` con gli stessi id, `model` (la versione esatta) e `usage` (`input_tokens`, `output_tokens`).
Fonte: [API reference](https://docs.typesafe.ai/api), [Quick start](https://docs.typesafe.ai/introduction/quickstart).

### Le tre primitive (lo "schema tipizzato")

| Tipo | Definizione | Risposta | Limiti |
|---|---|---|---|
| `choice` | `instructions` + `criteria`: mappa `opzione → descrizione` (o `null`) | `choice`, `probabilities` per opzione (sommano a 1), `confidence` | max 255 opzioni |
| `score` | `instructions` + `criteria`: array ordinato di livelli | `score` (media pesata, può cadere tra due livelli), `legend`, `probabilities`, `confidence` | da 2 a 10 livelli |
| `noul` | `instructions` + `criteria` opzionali `{true, false}` | `noul` ∈ [0,1], **senza** `confidence` | — |

- **Campi opzionali**: non esiste un flag "opzionale". La documentazione consiglia di aggiungere un'opzione `other` / `none of the above` / `not stated`, così il modello dice "manca" invece di tirare a indovinare ([Choice](https://docs.typesafe.ai/primitives/choice), [Date extraction cookbook](https://docs.typesafe.ai/cookbooks/date_extraction_cookbook)).
- **Confidenza**: `choice` e `score` restituiscono `confidence` ∈ [0,1], ricavata da quanto è piatta la distribuzione. È pensata per soglie decise nel codice ("confidence-gated routing"). Le soglie vanno tarate sui propri dati ([Confidence](https://docs.typesafe.ai/confidence)).
- **Più domande in una chiamata**: tutte le domande sono valutate in parallelo e in isolamento sullo stesso `state`. Aggiungerne "cambia di poco il tempo di risposta" ([Introduction](https://docs.typesafe.ai/introduction)).
- `instructions` e `criteria` accettano anche oggetti JSON strutturati ([Advanced: structure](https://docs.typesafe.ai/primitives/advanced)).

### Esempio adattato al nostro caso (illustrativo, non testato)

```json
{
  "state": "Sono in via Roma a Castiglione, c'è un canale che esonda sulla strada, l'acqua arriva quasi alle case",
  "model": "jev-latest",
  "questions": {
    "tipo_criticita": {
      "type": "choice",
      "instructions": "Che tipo di problema descrive la segnalazione?",
      "criteria": {
        "esondazione": "L'acqua esce dal canale e allaga",
        "acqua_affiora": "Acqua che esce dal terreno o dall'asfalto senza un canale visibile",
        "ostruzione": "Canale bloccato da rami, rifiuti, detriti",
        "sponda_danneggiata": "Argine o sponda franata o erosa",
        "non_indicato": "Il testo non dice che tipo di problema è"
      }
    },
    "pericolo_persone": { "type": "noul", "instructions": "Il testo dice che persone, case o strade sono in pericolo immediato?" },
    "entita": {
      "type": "score",
      "instructions": "Quanto è esteso il problema descritto?",
      "criteria": ["Piccolo, localizzato", "Medio, un tratto di canale o un campo", "Esteso, strade o abitazioni coinvolte"]
    }
  }
}
```

### Cosa JEV non fa (limiti documentati di jev-1.13)

Dalla pagina [Jev 1.13 jaggedness](https://docs.typesafe.ai/model-jaggedness/jev-1.13) (rivista il 17/09/2026):

- **Generazione**: "`jev-1.13` is not trained to generate text". Per estrarre valori liberi si trovano prima i candidati con regex o con un LLM, poi JEV sceglie quello giusto con un `choice` ([Pre-parsed value extraction](https://docs.typesafe.ai/cookbooks/pre_parsed_value_extraction_cookbook)).
- **Lettura letterale**: risponde alla domanda scritta, non a quella intesa. Negazioni e condizioni implicite vanno esplicitate.
- **Numeri, conteggi, date**: la matematica va tenuta nel codice.
- **Contenuti avversari**: un testo scritto per manipolare la classificazione può spostare la risposta (rilevante per lo spam).
- **Input solo testo**: niente audio né immagini ([Models](https://docs.typesafe.ai/models)). La trascrizione vocale resta a carico nostro (Web Speech API o altro).

## 2. Italiano

- Documentazione ufficiale ([Models → Language support](https://docs.typesafe.ai/models)): *"English is the primary training language and where accuracy is currently best. Other languages, including CJK scripts, are handled but not equally well; test on your own content before relying on Jev for a non-English workload, and pay close attention to Confidence when routing."*
- Il blog di lancio non parla di lingue.
- **Non verificabile oggi**: non ci sono benchmark per l'italiano e non abbiamo una chiave API (nell'ambiente non c'è `TYPESAFE_API_KEY`). Restano aperte due cose: (a) l'accuratezza su transcript italiani colloquiali o dialettali; (b) se convenga scrivere `instructions`/`criteria` in inglese lasciando lo `state` in italiano. Tutte e due si risolvono solo con un test nel [Playground](https://console.typesafe.ai/playground) su 20–30 transcript di esempio.

## 3. Costi e latenza

### Listini (USD per 1M token, tier standard a pagamento, verificati il 23/09/2026)

| Modello | Input | Output | Fonte |
|---|---:|---:|---|
| TypeSafe `jev-1.13` | 0,042 | **0** | [Models](https://docs.typesafe.ai/models), [blog](https://typesafe.ai/blog/introducing-system-one-models-and-jev) |
| OpenAI `gpt-5-nano` | 0,05 | 0,40 | [OpenAI pricing](https://developers.openai.com/api/docs/pricing) |
| OpenAI `gpt-6-luna` | 0,10 | 0,50 | idem |
| OpenAI `gpt-5.4-mini` | 0,75 | 4,50 | idem (lo stesso "mini" usato nel [cookbook SDE cascade](https://docs.typesafe.ai/cookbooks/sde_cascade) di TypeSafe) |
| Google `gemini-3.5-flash-lite` | 0,30 | 2,50 | [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing) |
| Google `gemini-3.8-flash` | 0,75 → 1,50 dal 01/01/2027 | 3,75 → 7,50 dal 01/01/2027 | idem |

Note: i modelli Gemini hanno un **free tier**, quindi per la demo il costo è zero. Per Gemini l'output include i thinking token, e anche i modelli OpenAI con ragionamento possono consumare più output di quello visibile.

### Costo per segnalazione

**Scenario A (come da ticket)**: 300 token in input, 150 in output.
**Scenario B (più realistico)**: circa 1.000 token in input. Oltre al transcript, in input entrano anche il prompt e lo schema (per l'LLM) o il testo delle domande e dei criteri (per JEV: nel quick start tre domande brevi su un testo di 30 token fanno già 392 token di input). Output di 150 token.

| Modello | $ per segnalazione, A | per 10k/anno, A | per 10k/anno, B |
|---|---:|---:|---:|
| JEV | 0,000013 $ | **0,13 $** | **0,42 $** |
| gpt-5-nano | 0,000075 $ | 0,75 $ | 1,10 $ |
| gpt-6-luna | 0,000105 $ | 1,05 $ | 1,75 $ |
| gemini-3.5-flash-lite | 0,000465 $ | 4,65 $ | 6,75 $ |
| gemini-3.8-flash (prezzo 2026) | 0,00079 $ | 7,88 $ | 13,13 $ |
| gpt-5.4-mini | 0,0009 $ | 9,00 $ | 14,25 $ |
| gemini-3.8-flash (prezzo 2027) | 0,0016 $ | 15,75 $ | 26,25 $ |

Calcolo: `token_in × prezzo_in / 1e6 + token_out × prezzo_out / 1e6`. Per JEV l'output vale 0.

**Lettura per il pitch**: JEV costa da circa 3 a 70 volte meno a seconda del modello di confronto, ma con 10.000 segnalazioni l'anno **qualsiasi opzione costa meno di 30 $ l'anno**. Il costo AI non è un argomento di risparmio credibile per il Consorzio. Gli argomenti forti di JEV sono altri: output tipizzato che non può uscire dall'enum, confidenza calibrata per decidere quando chiedere conferma al segnalante, latenza bassa. Il risparmio vero va cercato altrove (telefonate evitate, uscite a vuoto).

### Latenza

- Dichiarata da TypeSafe: *"End-to-end response time is 70ms-500ms for TypeSafe"*, contro *"3 to 329 seconds for frontier models"*, cioè *"40x-200x faster"* ([blog](https://typesafe.ai/blog/introducing-system-one-models-and-jev)). Il confronto è con modelli frontier (GPT-5.6 Terra, GPT-6 Astra), **non** con modelli flash/nano. I numeri "193.6x faster, 444.6x cheaper" della home sono, per ammissione dell'autore, "on the higher end of real world gains".
- **Non misurata da noi.** Non abbiamo misurato nemmeno la latenza degli LLM economici. Se serve un numero nel pitch, va misurato con la demo.

## 4. Stato dell'accesso, SDK, limiti

- **Accesso**: *"available today in early access… bringing developers off the waitlist as quickly as we can"* (blog del 15/09/2026, Diogo Almeida). La chiave si prende da `console.typesafe.ai/keys` dopo l'ammissione. Non sappiamo se il team sia già stato ammesso.
- **SDK**: Python `typesafe-sdk` (Python ≥ 3.10) e JS/TS `@typesafe-ai/sdk` (Node ≥ 20, tipi delle risposte inferiti dalle domande). Tutti e due gestiscono i retry su 429/529 ([SDK](https://docs.typesafe.ai/sdk), [JavaScript SDK](https://docs.typesafe.ai/sdk/javascript)). Per il nostro backend Django basta l'SDK Python, oppure una `POST` diretta.
- **Limiti** ([Models](https://docs.typesafe.ai/models)): 250.000 token/s e 1.200 richieste/minuto, *"adjusting dynamically… can change without notice"*. Contesto di 64k token (32k per state più la domanda più lunga). Largamente sufficiente per noi.
- **Versioni**: `jev-latest` si sposta a ogni nuovo rilascio. Se tariamo delle soglie di confidenza conviene fissare `jev-1.13.0`.
- **Dati**: JEV non viene addestrato sulle richieste dei clienti. La zero data retention esiste solo per i clienti enterprise ([Legal](https://docs.typesafe.ai/legal)). **Non documentato**: dove sono i server (UE o USA). È rilevante per il GDPR, visto che i transcript possono contenere nomi e indirizzi.

## 5. Raccomandazione per l'interfaccia `Estrattore`

Perché JEV sia davvero un sostituto diretto, il contratto dell'`Estrattore` deve avere la forma di JEV e non quella di un LLM:

1. **Solo campi a insieme chiuso.** Ogni campo estratto è un enum con l'opzione esplicita `non_indicato`, che alimenta la checklist dei "campi mancanti" del flusso vocale. Niente campi di testo libero generati dall'AI. La descrizione è il transcript stesso, salvato così com'è. La posizione viene dal GPS.
2. **Confidenza per campo**: `{valore, confidenza: float | null}`. JEV la fornisce calibrata. L'implementazione LLM di demo può restituire `null` oppure un valore fisso. Il frontend chiede conferma sotto una soglia.
3. **Priorità calcolata nel codice, non chiesta all'AI.** L'`Estrattore` restituisce segnali atomici (ad esempio `pericolo_persone` come `noul`, `entita` come `score`, `tipo_criticita` come `choice`, `acqua_affiora` come `noul`) e una funzione deterministica li combina nella priorità. È il pattern consigliato da TypeSafe ([Composite scoring](https://docs.typesafe.ai/patterns/composite-scoring)). Produce anche i **criteri di priorità** trasparenti richiesti come deliverable, e la stessa funzione vale per tutte e due le implementazioni.
4. **Se serve un luogo citato a voce**: `choice` sui 33 comuni del comprensorio più `non_indicato` (sotto il limite di 255 opzioni), non un campo di testo.
5. **Una sola chiamata per segnalazione**, con tutte le domande insieme. Nessuna dipendenza tra domande.

Forma indicativa:

```python
class Estrattore(Protocol):
    def estrai(self, transcript: str) -> Estrazione: ...

@dataclass
class Campo(Generic[T]):
    valore: T | Literal["non_indicato"]
    confidenza: float | None   # None per implementazioni senza confidenza calibrata

@dataclass
class Estrazione:
    tipo_criticita: Campo[TipoCriticita]
    pericolo_persone: Campo[bool]       # da noul con soglia
    entita: Campo[Entita]               # da score
    # ... priorità calcolata a valle da una funzione pura
```

## Cosa resta aperto

- Qualità di JEV sui transcript **in italiano**: serve una chiave, o l'ammissione dalla waitlist, e un set di prova.
- **Dove risiedono i dati** (UE o USA) e un DPA adeguato per la PA: da chiedere a TypeSafe prima di proporlo in produzione.
- Latenza reale di JEV e dell'LLM di demo, misurate sulla nostra pipeline.
