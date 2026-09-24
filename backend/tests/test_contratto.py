"""La fixture `client_contratto` valida ogni risposta contro `api/openapi.yaml`."""

import pytest
from openapi_core import OpenAPI

from tests.contratto import valida_risposta

URL_CHECK = "/api/perimetro/check"


def test_una_risposta_conforme_passa(client_contratto):
    response = client_contratto.post(URL_CHECK, {"lat": 45.3905, "lng": 10.4870}, format="json")

    assert response.status_code == 200
    assert response.json()["accettato"] is True


CONTRATTO_CHE_VUOLE_UN_ALTRO_CAMPO = OpenAPI.from_dict(
    {
        "openapi": "3.1.0",
        "info": {"title": "prova", "version": "1"},
        "servers": [{"url": "/api"}],
        "paths": {
            "/perimetro/check": {
                "post": {
                    "responses": {
                        "200": {
                            "description": "ok",
                            "content": {
                                "application/json": {
                                    "schema": {"type": "object", "required": ["inesistente"]}
                                }
                            },
                        }
                    }
                }
            }
        },
    }
)


def test_una_risposta_non_conforme_fa_fallire_il_test(client):
    response = client.post(URL_CHECK, {"lat": 45.3905, "lng": 10.4870}, "application/json")

    with pytest.raises(AssertionError, match=r"POST /api/perimetro/check -> 200.*inesistente"):
        valida_risposta(response, CONTRATTO_CHE_VUOLE_UN_ALTRO_CAMPO)


def test_un_codice_di_stato_non_documentato_fa_fallire_il_test(client):
    response = client.post(URL_CHECK, {"lat": 45.39}, "application/json")

    assert response.status_code == 400
    with pytest.raises(AssertionError, match=r"POST /api/perimetro/check -> 400"):
        valida_risposta(response, CONTRATTO_CHE_VUOLE_UN_ALTRO_CAMPO)
