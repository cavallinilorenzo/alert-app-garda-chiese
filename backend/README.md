# Backend

Django REST Framework + JWT. Setup e regole di lavoro in [`docs/come-lavoriamo.md`](../docs/come-lavoriamo.md).

```sh
docker compose up -d            # dalla root: Postgres
cd backend
uv sync
uv run pytest
uv run ruff check . && uv run ruff format --check .
```

## Test degli endpoint contro il contratto

Nei test di un endpoint usa la fixture `client_contratto` al posto di `client`: è un
`APIClient` di DRF che, dopo ogni richiesta, controlla che la risposta rispetti
[`api/openapi.yaml`](../api/openapi.yaml). Se il percorso, il metodo, il codice di stato,
il content type o il body non sono quelli del contratto, il test fallisce con un messaggio
che dice cosa non torna, per esempio:

```
POST /api/perimetro/check -> 400 non rispetta api/openapi.yaml: Unknown response http status: 400
```

```python
def test_check_di_un_punto_sul_reticolo(client_contratto):
    response = client_contratto.post(
        "/api/perimetro/check", {"lat": 45.3905, "lng": 10.4870}, format="json"
    )

    assert response.status_code == 200
    assert response.json()["accettato"] is True
```

- Si valida solo la **risposta**, non la richiesta: puoi mandare apposta dati sbagliati e
  controllare che l'errore sia documentato (ogni `400`, `404`, `503`... deve stare nel contratto).
- Le asserzioni sui valori restano nel test: la fixture controlla solo la forma.
- Per una risposta avuta in altro modo c'è `tests.contratto.valida_risposta(response)`.
- Se il test fallisce perché manca qualcosa nel contratto, non va cambiato il test: serve una
  PR su `api/openapi.yaml`, approvata da un'altra persona.

Esempi in [`tests/test_contratto.py`](tests/test_contratto.py). La validazione usa
[openapi-core](https://openapi-core.readthedocs.io/).
