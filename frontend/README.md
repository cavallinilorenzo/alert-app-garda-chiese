# Frontend

Workspace npm con due app Vite + React + TypeScript e un pacchetto condiviso:

- `segnalazione/`: App di segnalazione (mobile), servita in produzione sotto `/`
- `portale/`: Portale operatore (desktop), servito in produzione sotto `/portale/`
- `shared/`: client API generato dal contratto, config del proxy di sviluppo, componenti comuni

Node 22 (`nvm use` legge `.nvmrc`). Tutti i comandi si lanciano da `frontend/`.

```sh
npm install
npm run mock                 # Prism sul contratto, porta 4010
npm run dev:segnalazione     # https://localhost:5173 (anche in LAN, per provare dal telefono)
npm run dev:portale          # http://localhost:5174/portale/
```

## Da dove arrivano i dati

Le app chiamano sempre `/api/...` sulla loro stessa origine: in sviluppo il proxy di Vite la gira dove dice la variabile `API`.

| `API` | Destinazione |
|---|---|
| `mock` (default) | Prism, `npm run mock` |
| `backend` | Django in locale su `:8000` |
| un URL | quel server, per esempio `API=https://garda-chiese.simonetrentin.me` |

```sh
API=backend npm run dev:portale
```

Prism risponde col primo `example` del contratto per ogni endpoint; per sceglierne un altro si manda l'header `Prefer: example=<nome>`.

## Contratto

Dopo ogni modifica a `api/openapi.yaml`:

```sh
npm run gen:api
```

rigenera `shared/src/api/schema.d.ts`, che si committa. Il client tipizzato si importa così:

```ts
import { api } from 'shared/api'

const { data, error } = await api.GET('/layer/{layer}.geojson', {
  params: { path: { layer: 'canale' } },
})
```

## Controlli

```sh
npm run typecheck
npm run build
```

Sono gli stessi che gira la CI (`.github/workflows/frontend.yml`), insieme al controllo che `schema.d.ts` sia allineato al contratto.
