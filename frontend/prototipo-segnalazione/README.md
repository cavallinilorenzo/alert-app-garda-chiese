# PROTOTIPO: flusso dell'App di segnalazione

Codice usa-e-getta per il ticket [Flusso dell'app di segnalazione (schermate mobile)](https://github.com/cavallinilorenzo/alert-app-garda-chiese/issues/9). Vive solo sul branch `fe/9-prototipo-flusso-segnalazione` e **non va in `main`**. Niente backend, niente AI, niente GPS veri: tutto è simulato.

## Avvio

```sh
cd frontend/prototipo-segnalazione
npm install
npm run dev
```

Dal telefono, sulla stessa Wi‑Fi, apri l'indirizzo `Network:` che stampa Vite (es. `https://192.168.1.20:5173/?variant=A`). Il certificato è autofirmato: accetta l'avviso una volta ("Avanzate → Procedi"). Serve HTTPS perché il telefono consenta GPS e microfono.

Nella variante A, con lo scenario predefinito, **GPS e dettatura sono veri**. La dettatura usa il riconoscimento vocale del browser, e i campi li estrae un estrattore a parole chiave che fa le veci di Gemini. Il controllo del perimetro resta finto: il nome del canale vero arriverà dal backend.

## Cosa confrontare

| `?variant=` | Forma | Ordine dei passi |
|---|---|---|
| `A` | Procedura guidata, una cosa per schermata | Parla/Scrivi → **posizione** → foto → cosa → cellulare → riepilogo |
| `B` | Conversazione in chat | **racconto** → domande sui mancanti → posizione → foto → cellulare → riepilogo |
| `C` | Pagina unica che si riempie | **foto** → posizione (automatica) → cosa (schede Parla/Scrivi) → cellulare → foglio di riepilogo |

Barra nera in basso: ◀ ▶ cambiano variante (anche con le frecce della tastiera), ↺ ricomincia, ⚙ sceglie lo scenario (GPS negato, fuori perimetro, cosa capisce l'AI, pericolo per persone), `{}` mostra la segnalazione in corso.
