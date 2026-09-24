import pytest
from rest_framework.test import APIClient
from rest_framework import status
from django.urls import reverse
from segnalazioni.models import Segnalazione, Foto, Evento
from unittest.mock import patch
from django.core.files.uploadedfile import SimpleUploadedFile
import uuid

pytestmark = pytest.mark.django_db

@pytest.fixture
def client():
    return APIClient()

@pytest.fixture
def mock_estrazione():
    with patch('segnalazioni.views.estrai_da_testo') as mock:
        mock.return_value = {
            "transcript_ai": "fake transcript",
            "categoria": "tracimazione/allagamento",
            "durata": "da ieri",
            "quantita_acqua": "molta acqua",
            "pericolo_persone": False,
            "pericolo_strada": False,
            "pericolo_case": False,
            "estratti_confidenza": {"categoria": 0.9}
        }
        yield mock

@pytest.fixture
def mock_geo():
    with patch('segnalazioni.views.check_perimetro') as mock:
        mock.return_value = {
            "accettato": True,
            "layer": "canali",
            "id_placemark": "123",
            "nome_tracciato": "Canale di test",
            "nome_completo_tracciato": "Canale di test completo",
            "tipo_tracciato": "Primario",
            "distanza_m": 12.5,
            "zona_id": 4,
            "acquaiolo_competente_id": 1,
        }
        yield mock

def test_calcolo_priorita_critica():
    from segnalazioni.priority import calcola_priorita
    
    # Se c'è un pericolo per le persone, è critica
    priorita = calcola_priorita("tracimazione/allagamento", True, False, False, "molta acqua")
    assert priorita == "critica"
    
def test_calcolo_priorita_alta():
    from segnalazioni.priority import calcola_priorita
    
    # Se la categoria è tracimazione senza pericoli, è alta
    priorita = calcola_priorita("tracimazione/allagamento", False, False, False, "")
    assert priorita == "alta"
    
    # Se la quantità d'acqua è molta, è alta
    priorita = calcola_priorita("acqua che affiora/perdita", False, False, False, "molta acqua")
    assert priorita == "alta"

def test_calcolo_priorita_media():
    from segnalazioni.priority import calcola_priorita
    
    priorita = calcola_priorita("acqua che affiora/perdita", False, False, False, "piccolo flusso")
    assert priorita == "media"

def test_calcolo_priorita_bassa():
    from segnalazioni.priority import calcola_priorita
    
    priorita = calcola_priorita("altro", False, False, False, "")
    assert priorita == "bassa"

def test_creazione_segnalazione(client, mock_estrazione, mock_geo):
    url = reverse('segnalazioni-create')
    foto = SimpleUploadedFile("foto.jpg", b"file_content", content_type="image/jpeg")
    data = {
        "lat": 45.0,
        "lng": 10.0,
        "foto": foto,
        "descrizione": "C'è un canale rotto",
        "cellulare": "3331234567"
    }
    
    response = client.post(url, data, format='multipart')
    assert response.status_code == status.HTTP_201_CREATED
    
    assert "id" in response.data
    assert "codice_pratica" in response.data
    assert "token_stato" in response.data
    assert response.data["priorita"] == "alta"
    assert response.data["pericolo_immediato"] == False
    
    # Verifica che il modello sia stato salvato
    segnalazione = Segnalazione.objects.get(id=response.data["id"])
    assert segnalazione.priorita == "alta"
    assert segnalazione.layer == "canali"
    assert segnalazione.id_placemark == "123"
    assert Foto.objects.filter(segnalazione=segnalazione).exists()
    assert Evento.objects.filter(segnalazione=segnalazione).count() == 1

def test_creazione_segnalazione_fuori_perimetro(client, mock_estrazione, mock_geo):
    mock_geo.return_value = {"accettato": False}
    url = reverse('segnalazioni-create')
    foto = SimpleUploadedFile("foto.jpg", b"file_content", content_type="image/jpeg")
    data = {
        "lat": 45.0,
        "lng": 10.0,
        "foto": foto,
        "descrizione": "Fuori perimetro",
        "cellulare": "3331234567"
    }
    
    response = client.post(url, data, format='multipart')
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert response.data["code"] == "fuori_perimetro"
    assert Segnalazione.objects.count() == 0

def test_stato_segnalazione(client):
    segnalazione = Segnalazione.objects.create(
        lat=45.0, lng=10.0, descrizione="Test", cellulare="123",
        stato_corrente=Segnalazione.Stato.IN_VERIFICA
    )
    Evento.objects.create(segnalazione=segnalazione, stato=Segnalazione.Stato.RICEVUTA)
    Evento.objects.create(segnalazione=segnalazione, stato=Segnalazione.Stato.IN_VERIFICA)
    
    url = reverse('segnalazioni-stato', kwargs={'token': segnalazione.token_stato})
    response = client.get(url)
    
    assert response.status_code == status.HTTP_200_OK
    assert response.data["stato_corrente"] == "in_verifica"
    assert response.data["is_duplicato"] == False
    assert len(response.data["timeline"]) == 2
