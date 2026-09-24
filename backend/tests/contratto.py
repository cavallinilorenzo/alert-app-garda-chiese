"""Validazione delle risposte del backend contro il contratto `api/openapi.yaml`.

Nei test si usa la fixture `client_contratto` (vedi `conftest.py`): è un `APIClient`
che, dopo ogni richiesta, controlla che la risposta sia descritta dal contratto
(percorso, metodo, codice di stato, content type e schema del body).
"""

import json
import re
from pathlib import Path

from openapi_core import Config, OpenAPI
from openapi_core.contrib.django import DjangoOpenAPIRequest, DjangoOpenAPIResponse
from rest_framework.test import APIClient

PERCORSO_CONTRATTO = Path(__file__).resolve().parents[2] / "api" / "openapi.yaml"
# openapi-core non sa leggere `application/geo+json` e senza questo lo tratterebbe come stringa.
CONTRATTO = OpenAPI.from_file_path(
    str(PERCORSO_CONTRATTO),
    config=Config(extra_media_type_deserializers={"application/geo+json": json.loads}),
)


def valida_risposta(response, contratto: OpenAPI = CONTRATTO) -> None:
    """Fa fallire il test se `response` non rispetta il contratto.

    Valida solo la risposta: la richiesta no, così i test possono mandare apposta
    dati non validi e controllare che il backend risponda con un errore documentato.
    """
    request = response.wsgi_request
    try:
        contratto.validate_response(RichiestaDjango(request), DjangoOpenAPIResponse(response))
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


class RichiestaDjango(DjangoOpenAPIRequest):
    """Traduce le route di `path()` in percorsi del contratto senza perdere i suffissi.

    La regex di openapi-core arriva fino alla `/` successiva, quindi trasforma
    `layer/<str:layer>.geojson` in `/layer/{layer}` e il percorso non si trova. Le route
    di `path()` non sono regex: basta sostituire `<convertitore:nome>` con `{nome}`.
    Le route con regex (`re_path`, router di DRF) restano a openapi-core.
    """

    parametro_path = re.compile(r"<(?:\w+:)?(\w+)>")

    @property
    def path_pattern(self):
        match = self.request.resolver_match
        if match is None or match.route.startswith("^"):
            return super().path_pattern
        return "/" + self.parametro_path.sub(r"{\1}", match.route)


class ClientContratto(APIClient):
    def request(self, **kwargs):
        response = super().request(**kwargs)
        valida_risposta(response)
        return response
