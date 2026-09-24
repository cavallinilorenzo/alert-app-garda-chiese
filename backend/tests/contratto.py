"""Validazione delle risposte del backend contro il contratto `api/openapi.yaml`.

Nei test si usa la fixture `client_contratto` (vedi `conftest.py`): è un `APIClient`
che, dopo ogni richiesta, controlla che la risposta sia descritta dal contratto
(percorso, metodo, codice di stato, content type e schema del body).
"""

from pathlib import Path

from openapi_core import OpenAPI
from openapi_core.contrib.django import DjangoOpenAPIRequest, DjangoOpenAPIResponse
from rest_framework.test import APIClient

PERCORSO_CONTRATTO = Path(__file__).resolve().parents[2] / "api" / "openapi.yaml"
CONTRATTO = OpenAPI.from_file_path(str(PERCORSO_CONTRATTO))


def valida_risposta(response, contratto: OpenAPI = CONTRATTO) -> None:
    """Fa fallire il test se `response` non rispetta il contratto.

    Valida solo la risposta: la richiesta no, così i test possono mandare apposta
    dati non validi e controllare che il backend risponda con un errore documentato.
    """
    request = response.wsgi_request
    try:
        contratto.validate_response(DjangoOpenAPIRequest(request), DjangoOpenAPIResponse(response))
    except Exception as errore:
        raise AssertionError(
            f"{request.method} {request.path} -> {response.status_code} "
            f"non rispetta api/openapi.yaml: {_dettagli(errore)}"
        ) from errore


def _dettagli(errore: BaseException) -> str:
    """Gli errori di schema con il campo a cui si riferiscono, se openapi-core li ha."""
    causa = errore
    while causa is not None:
        if schema_errors := getattr(causa, "schema_errors", None):
            return "; ".join(
                f"{'.'.join(map(str, e.absolute_path)) or 'body'}: {e.message}"
                for e in schema_errors
            )
        causa = causa.__cause__
    return str(errore)


class ClientContratto(APIClient):
    def request(self, **kwargs):
        response = super().request(**kwargs)
        valida_risposta(response)
        return response
