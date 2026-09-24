from unittest.mock import patch

import pytest
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from contratti import Indirizzo, RisultatoPerimetro, Tracciato
from segnalazioni.models import Evento, Foto, Segnalazione

pytestmark = pytest.mark.django_db


@pytest.fixture
def operatore():
    return User.objects.create_user(username="test_op", password="password")


@pytest.fixture
def auth_client(operatore):
    client = APIClient()
    client.force_authenticate(user=operatore)
    return client


def test_lista_segnalazioni_senza_auth(client):
    url = reverse("segnalazioni-list")
    response = client.get(url)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_lista_segnalazioni_vuota(auth_client):
    url = reverse("segnalazioni-list")
    response = auth_client.get(url)
    assert response.status_code == status.HTTP_200_OK
    assert response.data["total"] == 0
    assert len(response.data["items"]) == 0


def test_lista_ordinamento(auth_client):
    Segnalazione.objects.create(
        lat=45.0, lng=10.0, descrizione="Test", priorita="bassa", cellulare="123"
    )
    Segnalazione.objects.create(
        lat=45.0, lng=10.0, descrizione="Test", priorita="critica", cellulare="123"
    )
    Segnalazione.objects.create(
        lat=45.0, lng=10.0, descrizione="Test", priorita="alta", cellulare="123"
    )

    url = reverse("segnalazioni-list")
    response = auth_client.get(url)
    items = response.data["items"]
    assert len(items) == 3
    assert items[0]["priorita"] == "critica"
    assert items[1]["priorita"] == "alta"
    assert items[2]["priorita"] == "bassa"


def test_lista_filtri(auth_client):
    Segnalazione.objects.create(
        lat=45.0,
        lng=10.0,
        descrizione="Test1",
        priorita="bassa",
        cellulare="123",
        stato_corrente="in_verifica",
    )
    Segnalazione.objects.create(
        lat=45.0,
        lng=10.0,
        descrizione="Test2",
        priorita="bassa",
        cellulare="123",
        stato_corrente="chiusa",
    )

    url = reverse("segnalazioni-list") + "?stato_corrente=in_verifica"
    response = auth_client.get(url)
    items = response.data["items"]
    assert len(items) == 1
    assert items[0]["stato_corrente"] == "in_verifica"


def test_dettaglio_segnalazione(auth_client):
    s = Segnalazione.objects.create(
        lat=45.0, lng=10.0, descrizione="Test", priorita="bassa", cellulare="123"
    )
    url = reverse("segnalazioni-detail", kwargs={"pk": s.id})
    response = auth_client.get(url)
    assert response.status_code == 200
    assert response.data["descrizione"] == "Test"


def test_foto_con_percorso_relativo(auth_client):
    # dietro Nginx un URL assoluto perde porta e schema: il frontend usa /media/...
    s = Segnalazione.objects.create(
        lat=45.0, lng=10.0, descrizione="Test", priorita="bassa", cellulare="123"
    )
    Foto.objects.create(segnalazione=s, immagine=SimpleUploadedFile("f.jpg", b"x"))
    url = reverse("segnalazioni-detail", kwargs={"pk": s.id})
    foto = auth_client.get(url, HTTP_HOST="localhost:8080").data["foto"]
    assert foto[0].startswith("/media/segnalazioni/")


def test_correggere_la_posizione_aggiorna_comune_e_tracciato(auth_client):
    s = Segnalazione.objects.create(
        lat=45.0,
        lng=10.0,
        descrizione="Test",
        cellulare="123",
        comune="Medole",
        nome_completo_tracciato="Vecchio tracciato",
    )
    perimetro = RisultatoPerimetro(
        accettato=True,
        tracciato=Tracciato(
            layer="canale",
            id_placemark="7",
            nome="Nuovo",
            nome_completo="Nuovo tracciato",
            tipo=None,
            codice=None,
        ),
        distanza_m=5,
        zona=None,
        acquaiolo_suggerito=None,
        messaggio="",
    )
    with (
        patch("segnalazioni.views.check_perimetro", return_value=perimetro),
        patch(
            "segnalazioni.views.reverse_geocode",
            return_value=Indirizzo(testo="Guidizzolo", comune="Guidizzolo"),
        ),
    ):
        url = reverse("segnalazioni-detail", kwargs={"pk": s.id})
        response = auth_client.patch(url, {"lat": 45.3, "lng": 10.5}, format="json")

    assert response.status_code == 200
    s.refresh_from_db()
    assert s.comune == "Guidizzolo"
    assert s.nome_completo_tracciato == "Nuovo tracciato"


def test_patch_priorita_salva_la_motivazione_e_la_scrive_nel_registro(auth_client):
    s = Segnalazione.objects.create(
        lat=45.0,
        lng=10.0,
        descrizione="Test",
        priorita="alta",
        priorita_calcolata="alta",
        cellulare="123",
    )
    url = reverse("segnalazioni-detail", kwargs={"pk": s.id})
    response = auth_client.patch(
        url,
        {"priorita": "media", "override_motivazione": "Verificato al telefono"},
        format="json",
    )

    assert response.status_code == 200
    # la risposta è la Segnalazione completa, come nel contratto
    assert response.data["registro"]
    assert response.data["priorita_calcolata"] == "alta"
    s.refresh_from_db()
    assert s.priorita == "media"
    assert s.override_motivazione == "Verificato al telefono"
    evento = Evento.objects.get(segnalazione=s, tipo_evento="correzione_campo")
    assert "da alta a media" in evento.nota
    assert "Verificato al telefono" in evento.nota


def test_patch_priorita_senza_motivazione(auth_client):
    s = Segnalazione.objects.create(
        lat=45.0,
        lng=10.0,
        descrizione="Test",
        priorita="alta",
        priorita_calcolata="alta",
        cellulare="123",
    )
    url = reverse("segnalazioni-detail", kwargs={"pk": s.id})
    response = auth_client.patch(url, {"priorita": "bassa"}, format="json")

    assert response.status_code == 400
    assert response.data["code"] == "dati_non_validi"
    assert "override_motivazione" in response.data["fields"]
    s.refresh_from_db()
    assert s.priorita == "alta"


def test_azioni_segnalazione(auth_client):
    s = Segnalazione.objects.create(
        lat=45.0, lng=10.0, descrizione="Test", priorita="bassa", cellulare="123"
    )
    url = reverse("segnalazioni-azioni", kwargs={"pk": s.id})

    response = auth_client.post(url, {"azione": "prendi_in_carico", "nota": "Presa"})
    assert response.status_code == 200
    s.refresh_from_db()
    assert s.stato_corrente == "in_verifica"
    assert s.operatore_riferimento.username == "test_op"

    response = auth_client.post(url, {"azione": "chiudi", "esito": "falsa"})
    s.refresh_from_db()
    assert s.stato_corrente == "chiusa"
    assert s.esito == "falsa"
    assert Evento.objects.count() == 2
