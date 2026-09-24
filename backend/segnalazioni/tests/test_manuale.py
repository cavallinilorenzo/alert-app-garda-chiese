"""Inserimento manuale dal Portale operatore (`POST /segnalazioni/manuale`)."""

from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient

from contratti import Indirizzo, RisultatoPerimetro
from segnalazioni.models import Segnalazione

pytestmark = pytest.mark.django_db

FUORI_PERIMETRO = RisultatoPerimetro(
    accettato=False,
    tracciato=None,
    distanza_m=900,
    zona=None,
    acquaiolo_suggerito=None,
    messaggio="Il punto indicato è fuori dal perimetro.",
)


@pytest.fixture
def operatore():
    return User.objects.create_user(
        username="op", password="password", first_name="Anna", last_name="Neri"
    )


@pytest.fixture
def auth_client(operatore):
    client = APIClient()
    client.force_authenticate(user=operatore)
    return client


def inserisci(client, **dati):
    corpo = {
        "lat": 45.3,
        "lng": 10.6,
        "canale_ingresso": "numero_verde",
        "descrizione": "Al telefono: il canale esce sulla strada",
        **dati,
    }
    with (
        patch("segnalazioni.views.check_perimetro", return_value=FUORI_PERIMETRO),
        patch(
            "segnalazioni.views.reverse_geocode",
            return_value=Indirizzo(testo="Medole", comune="Medole"),
        ),
    ):
        return client.post(reverse("segnalazioni-manuale"), corpo, format="multipart")


def test_serve_un_operatore():
    assert inserisci(APIClient()).status_code == 401


def test_senza_foto_ne_cellulare_e_anche_fuori_perimetro(auth_client, operatore):
    with patch("segnalazioni.views.invia_email_nuova_segnalazione") as invia_email:
        response = inserisci(auth_client, categoria="canale_che_tracima", pericolo_strada="si")

    assert response.status_code == 201
    invia_email.assert_called_once()
    assert response.data["canale_ingresso"] == "numero_verde"
    assert response.data["foto"] == []
    assert response.data["cellulare"] == ""
    # stesse regole dell'App di segnalazione
    assert response.data["priorita"] == "critica"
    assert response.data["priorita_calcolata"] == "critica"
    ricevuta = response.data["registro"][0]
    assert ricevuta["stato"] == "ricevuta"
    assert ricevuta["operatore"]["id"] == operatore.id
    assert "numero verde" in ricevuta["nota"]


def test_il_canale_web_app_non_si_inserisce_a_mano(auth_client):
    response = inserisci(auth_client, canale_ingresso="web_app")

    assert response.status_code == 400
    assert response.data["code"] == "dati_non_validi"
    assert "canale_ingresso" in response.data["fields"]
    assert not Segnalazione.objects.exists()


def test_le_segnalazioni_dell_app_arrivano_dalla_web_app():
    s = Segnalazione.objects.create(lat=45.0, lng=10.0, descrizione="Test", cellulare="1")
    assert s.canale_ingresso == "web_app"
