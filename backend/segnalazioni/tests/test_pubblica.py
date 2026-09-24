from unittest.mock import patch

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from segnalazioni.models import Evento, Foto, Segnalazione

pytestmark = pytest.mark.django_db

@pytest.fixture
def client():
    return APIClient()



@pytest.fixture
def mock_geo():
    from contratti import RisultatoPerimetro, Tracciato, ZonaAcquaiolo
    with patch('segnalazioni.views.check_perimetro') as mock:
        mock.return_value = RisultatoPerimetro(
            accettato=True,
            tracciato=Tracciato(
                layer="canale",
                id_placemark="123",
                nome="Canale di test",
                nome_completo="Canale di test completo",
                tipo="Primario",
                codice=None
            ),
            distanza_m=12.5,
            zona=ZonaAcquaiolo(
                id=4,
                nome="Zona 4",
                servita=True,
                acquaiolo="Acquaiolo Test"
            ),
            acquaiolo_suggerito="Acquaiolo Test",
            messaggio="La posizione è sul reticolo consortile: Canale di test completo."
        )
        yield mock

def test_calcolo_priorita_critica():
    from segnalazioni.priority import calcola_priorita
    
    # Se c'è un pericolo per le persone, è critica
    priorita = calcola_priorita("tracimazione/allagamento", "si", "no", "no", "molta acqua")
    assert priorita == "critica"
    
def test_calcolo_priorita_alta():
    from segnalazioni.priority import calcola_priorita
    
    # Se la categoria è tracimazione senza pericoli, è alta
    priorita = calcola_priorita("tracimazione/allagamento", "no", "no", "no", "")
    assert priorita == "alta"
    
    # Se la quantità d'acqua è molta, è alta
    priorita = calcola_priorita("acqua_che_affiora", "no", "no", "no", "molta acqua")
    assert priorita == "alta"

def test_calcolo_priorita_media():
    from segnalazioni.priority import calcola_priorita
    
    priorita = calcola_priorita("acqua_che_affiora", "no", "no", "no", "piccolo flusso")
    assert priorita == "media"

def test_calcolo_priorita_bassa():
    from segnalazioni.priority import calcola_priorita
    
    priorita = calcola_priorita("altro", "no", "no", "no", "")
    assert priorita == "bassa"

def test_creazione_segnalazione(client, mock_geo):
    url = reverse('segnalazioni-create')
    foto = SimpleUploadedFile("foto.jpg", b"file_content", content_type="image/jpeg")
    data = {
        "lat": 45.0,
        "lng": 10.0,
        "foto": foto,
        "descrizione": "C'è un canale rotto",
        "cellulare": "3331234567",
        "categoria": "tracimazione/allagamento",
        "quantita_acqua": "molta acqua",
        "pericolo_persone": "no",
        "pericolo_strada": "no",
        "pericolo_edifici": "no"
    }
    
    response = client.post(url, data, format='multipart')
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

def test_creazione_segnalazione_fuori_perimetro(client, mock_geo):
    from contratti import RisultatoPerimetro
    mock_geo.return_value = RisultatoPerimetro(
        accettato=False,
        tracciato=None,
        distanza_m=400,
        zona=None,
        acquaiolo_suggerito=None,
        messaggio="Fuori perimetro"
    )
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
    assert not response.data["is_duplicato"]
    assert len(response.data["timeline"]) == 2
