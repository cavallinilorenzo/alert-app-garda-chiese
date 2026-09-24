"""Le liste di valori del backend coincidono con gli enum di `api/openapi.yaml`.

Se il contratto cambia le opzioni di un passo e il backend no, questi test falliscono.
"""

from pathlib import Path

import pytest
import yaml

from contratti import CAMPI_ESTRAZIONE, CAMPI_FOTO
from segnalazioni.models import Segnalazione

CONTRATTO = yaml.safe_load(
    (Path(__file__).resolve().parents[2] / "api" / "openapi.yaml").read_text()
)

CAMPI_CON_OPZIONI = [
    "categoria",
    "durata",
    "quantita_acqua",
    "pericolo_persone",
    "pericolo_strada",
    "pericolo_edifici",
]


def _valori_del_modello(campo):
    return [valore for valore, _ in Segnalazione._meta.get_field(campo).choices]


def _campi_estratti(percorso):
    risposta = CONTRATTO["paths"][percorso]["post"]["responses"]["200"]
    return risposta["content"]["application/json"]["schema"]["properties"]["campi"]["properties"]


@pytest.mark.parametrize("campo", [c for c, v in CAMPI_ESTRAZIONE.items() if v is not None])
def test_campi_dell_estrazione_vocale(campo):
    assert list(CAMPI_ESTRAZIONE[campo]) == _campi_estratti("/estrazione/vocale")[campo]["enum"]


@pytest.mark.parametrize("campo", [c for c, v in CAMPI_FOTO.items() if v is not None])
def test_campi_dell_analisi_della_foto(campo):
    assert list(CAMPI_FOTO[campo]) == _campi_estratti("/estrazione/foto")[campo]["enum"]


@pytest.mark.parametrize("campo", CAMPI_CON_OPZIONI)
def test_campi_dell_invio(campo):
    corpo = CONTRATTO["paths"]["/segnalazioni"]["post"]["requestBody"]["content"]
    proprieta = corpo["multipart/form-data"]["schema"]["properties"]

    assert _valori_del_modello(campo) == proprieta[campo]["enum"]


@pytest.mark.parametrize("campo", [*CAMPI_CON_OPZIONI, "categoria_originale"])
def test_campi_del_dettaglio(campo):
    dettaglio = CONTRATTO["components"]["schemas"]["SegnalazioneDettaglio"]["properties"]

    # Nel dettaglio "" vuol dire non indicato: nel modello è `blank=True`.
    assert Segnalazione._meta.get_field(campo).blank
    assert [*_valori_del_modello(campo), ""] == dettaglio[campo]["enum"]


def test_categoria_della_correzione_dell_operatore():
    corpo = CONTRATTO["paths"]["/segnalazioni/{id}"]["patch"]["requestBody"]["content"]
    proprieta = corpo["application/json"]["schema"]["properties"]

    assert _valori_del_modello("categoria") == proprieta["categoria"]["enum"]
