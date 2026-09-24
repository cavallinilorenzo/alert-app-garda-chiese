# Come lavoriamo

Guida per il team e per i nostri agenti AI (Claude Code, Codex, Antigravity). La decisione completa, con le motivazioni, è nel ticket [Struttura del monorepo, ownership e convenzioni git](https://github.com/cavallinilorenzo/alert-app-garda-chiese/issues/12). Se questa guida e il ticket non coincidono, vale il ticket, tranne che per la divisione del lavoro: la ownership per area descritta nel ticket non vale più, perché ora tutti lavorano su tutto.

## Chi fa cosa

Tutti lavorano su tutto: chiunque può prendere ticket di frontend, di backend o condivisi. Le etichette `area:frontend`, `area:backend` e `area:condiviso` dicono quale parte della repo tocca un ticket, non chi lo deve fare.

| Area | Cosa |
|---|---|
| `area:frontend` | `frontend/`: App di segnalazione (mobile) e Portale operatore (desktop), React |
| `area:backend` | `backend/`: Django REST Framework + JWT |
| `area:condiviso` | `api/openapi.yaml` e `CONTEXT.md` |

Frontend e backend si parlano **solo via REST**, attraverso il contratto in `api/openapi.yaml`.

Il backend è diviso in quattro app:

- `segnalazioni` (modello, CRUD, ciclo di vita, azioni dell'operatore) e `accounts` (JWT, operatori, rubrica acquaioli).
- `geo` (import KML, perimetro, infrastruttura più vicina, zona acquaiolo, GeoJSON) ed `estrazione` (Gemini, interfaccia `Estrattore`).

## Il lavoro parte da un ticket

Tutto passa dalle GitHub Issues. Adesso stiamo scrivendo la spec nella [mappa](https://github.com/cavallinilorenzo/alert-app-garda-chiese/issues/1). Finita la spec, si apre una mappa di implementazione per area.

1. Prendi un ticket aperto, non assegnato e non bloccato, di qualunque area.
2. **Assegnatelo prima di iniziare**: l'assegnazione è il claim e impedisce che due persone lavorino sulla stessa cosa.
3. Con un agente AI: chiedigli di lavorare il ticket con la skill `wayfinder`, per esempio `/wayfinder <url della mappa o del ticket>` in Claude Code, oppure "usa la skill wayfinder su <url>" in Codex e Antigravity. L'agente deve avere `gh` installato e autenticato (`gh auth login`).
4. I ticket `grilling` e `prototype` si fanno insieme a una persona: l'agente fa le domande e tu rispondi. I ticket `research` l'agente li fa da solo.

## Git

- **Trunk-based**: un branch breve per ticket, PR su `main`, merge entro qualche ora.
- Nome del branch: `<area>/<numero-issue>-<slug>`, per esempio `be/15-endpoint-segnalazioni`, `fe/20-schermata-riepilogo`, `condiviso/11-contratto`.
- **Squash merge**, poi si cancella il branch.
- Commit e PR in italiano. Nella descrizione della PR metti `Closes #<n>`.
- `main` deve essere **sempre deployabile**, perché è quello che finisce sul server.
- Non si pusha direttamente su `main` e non si fa mai force push.

### Review

- **`api/` richiede l'approvazione di un'altra persona** (`CODEOWNERS`). Chi modifica il contratto si fa approvare da uno degli altri due.
- `frontend/` e `backend/` si mergiano senza review obbligatoria.
- I file di root (`docker-compose.yml`, `settings.py`, `urls.py` di root, `package.json` del workspace) si modificano solo dopo aver avvisato gli altri.

## Struttura della repo

```
api/openapi.yaml        contratto REST, l'unica fonte di verità tra FE e BE
backend/                Django: app segnalazioni, accounts, geo, estrazione
frontend/               workspace npm
  segnalazione/         App di segnalazione (mobile)
  portale/              Portale operatore (desktop)
  shared/               client API generato dal contratto, layer Leaflet
mappe/                  KML del reticolo e delle zone acquaiolo (sola lettura)
documenti/              materiale della challenge (sola lettura)
CONTEXT.md              glossario del dominio
docs/adr/               decisioni architetturali
```

## Giorno 1: scheletri prima di tutto

Tre PR in parallelo, che non si toccano tra loro:

1. **Backend**: progetto Django con le quattro app già registrate (ognuna con il suo `urls.py` incluso), DRF più JWT, `docker-compose.yml` di sviluppo con Postgres, `.env.example`.
2. **Frontend**: workspace con `segnalazione/`, `portale/`, `shared/` e gli script `gen:api` e `mock`.
3. **Contratto**: `api/openapi.yaml` vuoto ma valido.

Poi ci si divide.

## Ambiente

- Python 3.12 con **uv** e **ruff**; Node 22 con **npm workspaces**. Le versioni sono fissate in `.python-version` e `.nvmrc`.
- **Postgres anche in locale**, con `docker compose`. SQLite non si usa.
- `.env` sta nel gitignore; si committa solo `.env.example`. I segreti (chiave Gemini, `DJANGO_SECRET_KEY`, password del DB) si passano in privato e non vanno **mai** nella repo.

## Contratto, mock e chiamate API

- Tutti gli endpoint stanno sotto `/api/` (`/api/segnalazioni/`, `/api/perimetro/check`).
- **Stessa origine**: in sviluppo il proxy di Vite gira `/api` al backend o al mock, in produzione lo fa Caddy. Niente CORS e niente `VITE_API_URL`.
- Il frontend usa `openapi-typescript` più `openapi-fetch`. Il file generato si **committa** in `frontend/shared/`: dopo ogni modifica al contratto si lancia `npm run gen:api`.
- Finché il backend non è pronto, il frontend usa **Prism** (`npm run mock`), che risponde con gli `examples` del contratto. Per questo ogni endpoint nel contratto deve avere `examples` realistici.

## CI

GitHub Actions minima, **solo informativa** (non blocca il merge), con job attivati per path:

- `api/**`: `redocly lint`
- `backend/**`: `ruff` e `pytest`
- `frontend/**`: `tsc` e build delle due app

## Lingua del codice

I termini del dominio si scrivono **in italiano, identici a `CONTEXT.md`**: `Segnalazione`, `Segnalante`, `acquaiolo_competente`, `/api/segnalazioni/`. La parte tecnica generica resta in inglese: `created_at`, `utils`, `status_code`. Vedi [ADR 0001](adr/0001-dominio-in-italiano-nel-codice.md).

## Deploy

Si decide nel ticket [Dati del server del team e setup di deploy](https://github.com/cavallinilorenzo/alert-app-garda-chiese/issues/13), assegnato a Trento.
