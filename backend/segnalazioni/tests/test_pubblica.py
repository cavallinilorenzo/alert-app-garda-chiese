from io import BytesIO
from unittest.mock import patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from PIL import Image
from rest_framework import status
from rest_framework.test import APIClient

from accounts.models import Acquaiolo
from segnalazioni.models import Evento, Foto, Segnalazione

pytestmark = pytest.mark.django_db


@pytest.fixture
def client():
    return APIClient()


def foto_jpeg():
    # ImageField con Pillow valida il contenuto: serve un JPEG vero, non byte a caso.
    buffer = BytesIO()
    Image.new("RGB", (1, 1)).save(buffer, format="JPEG")
    return SimpleUploadedFile("foto.jpg", buffer.getvalue(), content_type="image/jpeg")


@pytest.fixture
def mock_geo():
    from contratti import RisultatoPerimetro, Tracciato, ZonaAcquaiolo

    with patch("segnalazioni.views.check_perimetro") as mock:
        mock.return_value = RisultatoPerimetro(
            accettato=True,
            tracciato=Tracciato(
                layer="canale",
                id_placemark="123",
                nome="Canale di test",
                nome_completo="Canale di test completo",
                tipo="Primario",
                codice=None,
            ),
            distanza_m=12.5,
            zona=ZonaAcquaiolo(id=4, nome="Zona 4", servita=True, acquaiolo="Acquaiolo Test"),
            acquaiolo_suggerito="Acquaiolo Test",
            messaggio="La posizione è sul reticolo consortile: Canale di test completo.",
        )
        yield mock


@pytest.mark.parametrize(
    "pericoli",
    [("si", "no", "no"), ("no", "si", "no"), ("no", "no", "si")],
)
def test_calcolo_priorita_critica(pericoli):
    from segnalazioni.priority import calcola_priorita

    # Un pericolo a "si" vince su tutto, anche su categoria e quantità basse.
    assert calcola_priorita("acqua_sporca", *pericoli, "gocce") == "critica"


@pytest.mark.parametrize(
    "categoria,quantita_acqua",
    [
        ("canale_che_tracima", ""),
        ("argine_danneggiato", ""),
        ("paratoia_danneggiata", ""),
        ("altro", "molta_acqua"),
    ],
)
def test_calcolo_priorita_alta(categoria, quantita_acqua):
    from segnalazioni.priority import calcola_priorita

    assert calcola_priorita(categoria, "no", "non_so", "", quantita_acqua) == "alta"


@pytest.mark.parametrize(
    "categoria,quantita_acqua",
    [
        ("acqua_che_affiora", ""),
        ("ostruzione", "non_so"),
        ("acqua_sporca", "piccolo_flusso"),
    ],
)
def test_calcolo_priorita_media(categoria, quantita_acqua):
    from segnalazioni.priority import calcola_priorita

    assert calcola_priorita(categoria, "no", "no", "no", quantita_acqua) == "media"


@pytest.mark.parametrize(
    "categoria,quantita_acqua",
    [
        ("acqua_sporca", "gocce"),
        ("altro", "non_applicabile"),
        ("", ""),
    ],
)
def test_calcolo_priorita_bassa(categoria, quantita_acqua):
    from segnalazioni.priority import calcola_priorita

    assert calcola_priorita(categoria, "no", "no", "no", quantita_acqua) == "bassa"


def test_creazione_segnalazione(client, mock_geo):
    url = reverse("segnalazioni-list")
    foto = foto_jpeg()
    data = {
        "lat": 45.0,
        "lng": 10.0,
        "foto": foto,
        "descrizione": "C'è un canale rotto",
        "cellulare": "3331234567",
        "categoria": "canale_che_tracima",
        "quantita_acqua": "molta_acqua",
        "pericolo_persone": "no",
        "pericolo_strada": "no",
        "pericolo_edifici": "no",
    }

    response = client.post(url, data, format="multipart")
    assert response.status_code == status.HTTP_201_CREATED

    assert "id" in response.data
    assert "codice_pratica" in response.data
    assert "token_stato" in response.data
    assert response.data["priorita"] == "alta"
    assert not response.data["pericolo_immediato"]

    # Verifica che il modello sia stato salvato
    segnalazione = Segnalazione.objects.get(id=response.data["id"])
    assert segnalazione.priorita == "alta"
    assert segnalazione.layer == "canale"
    assert segnalazione.id_placemark == "123"
    assert Foto.objects.filter(segnalazione=segnalazione).exists()
    assert Evento.objects.filter(segnalazione=segnalazione).count() == 1
    # l'Acquaiolo della zona 4 nella Rubrica è proposto come competente
    assert segnalazione.acquaiolo_competente_id == Acquaiolo.objects.filter(zona_id=4).first().id


def test_creazione_segnalazione_fuori_perimetro(client, mock_geo):
    from contratti import RisultatoPerimetro

    mock_geo.return_value = RisultatoPerimetro(
        accettato=False,
        tracciato=None,
        distanza_m=400,
        zona=None,
        acquaiolo_suggerito=None,
        messaggio="Fuori perimetro",
    )
    url = reverse("segnalazioni-list")
    foto = foto_jpeg()
    data = {
        "lat": 45.0,
        "lng": 10.0,
        "foto": foto,
        "descrizione": "Fuori perimetro",
        "cellulare": "3331234567",
    }

    response = client.post(url, data, format="multipart")
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["code"] == "fuori_perimetro"
    assert Segnalazione.objects.count() == 0


def test_stato_segnalazione(client):
    segnalazione = Segnalazione.objects.create(
        lat=45.0,
        lng=10.0,
        descrizione="Test",
        cellulare="123",
        stato_corrente=Segnalazione.Stato.IN_VERIFICA,
    )
    Evento.objects.create(segnalazione=segnalazione, stato=Segnalazione.Stato.RICEVUTA)
    Evento.objects.create(segnalazione=segnalazione, stato=Segnalazione.Stato.IN_VERIFICA)

    url = reverse("segnalazioni-stato", kwargs={"token": segnalazione.token_stato})
    response = client.get(url)

    assert response.status_code == status.HTTP_200_OK
    assert response.data["stato_corrente"] == "in_verifica"
    assert not response.data["is_duplicato"]
    assert len(response.data["timeline"]) == 2
