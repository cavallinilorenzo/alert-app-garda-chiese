import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

from contratti import CampoEstratto, EstrazioneNonDisponibile, RisultatoEstrazione
from estrazione import services

URL = "/api/estrazione/vocale"


class EstrattoreFinto:
    def __init__(self, risultato=None, errore=None):
        self.risultato = risultato
        self.errore = errore
        self.chiamate = []

    def estrai(self, audio, mime_type):
        self.chiamate.append((audio, mime_type))
        if self.errore:
            raise self.errore
        return self.risultato


@pytest.fixture
def estrattore(monkeypatch):
    finto = EstrattoreFinto(
        RisultatoEstrazione(
            transcript="Il canale in via Brescia sta uscendo sulla strada, adesso.",
            campi={
                "categoria": CampoEstratto("canale_che_tracima", 0.9),
                "descrizione": CampoEstratto("Il canale esce sulla strada in via Brescia", 0.8),
                "durata": CampoEstratto("adesso", 0.95),
                "quantita_acqua": CampoEstratto(None, 0.0),
                "pericolo_strada": CampoEstratto("si", 0.7),
            },
        )
    )
    monkeypatch.setattr(services, "estrattore_predefinito", lambda: finto)
    return finto


def audio(nome="nota.webm", contenuto=b"\x1aE\xdf\xa3audio", mime="audio/webm"):
    return SimpleUploadedFile(nome, contenuto, content_type=mime)


def invia(file):
    return APIClient().post(URL, {"audio": file} if file else {}, format="multipart")


def test_restituisce_transcript_campi_detti_e_mancanti(estrattore):
    risposta = invia(audio())

    assert risposta.status_code == 200
    assert risposta.json() == {
        "transcript": "Il canale in via Brescia sta uscendo sulla strada, adesso.",
        "campi": {
            "categoria": "canale_che_tracima",
            "descrizione": "Il canale esce sulla strada in via Brescia",
            "durata": "adesso",
            "pericolo_strada": "si",
        },
        "mancanti": ["quantita_acqua", "pericolo_persone", "pericolo_edifici"],
    }
    assert estrattore.chiamate == [(b"\x1aE\xdf\xa3audio", "audio/webm")]


def test_senza_audio_risponde_400(estrattore):
    risposta = invia(None)

    assert risposta.status_code == 400
    assert risposta.json()["code"] == "audio_non_valido"
    assert "audio" in risposta.json()["fields"]
    assert estrattore.chiamate == []


def test_formato_non_audio_risponde_400(estrattore):
    risposta = invia(audio("foto.jpg", b"\xff\xd8\xff", "image/jpeg"))

    assert risposta.status_code == 400
    assert risposta.json()["code"] == "audio_non_valido"
    assert estrattore.chiamate == []


def test_accetta_il_mime_con_codec_di_chrome_android(estrattore):
    risposta = invia(audio(mime="audio/webm;codecs=opus"))

    assert risposta.status_code == 200
    assert estrattore.chiamate[0][1] == "audio/webm"


def test_audio_vuoto_risponde_400(estrattore):
    risposta = invia(audio(contenuto=b""))

    assert risposta.status_code == 400
    assert risposta.json()["code"] == "audio_non_valido"
    assert estrattore.chiamate == []


def test_audio_oltre_10_mb_risponde_413(estrattore):
    risposta = invia(audio(contenuto=b"\0" * (10 * 1024 * 1024 + 1)))

    assert risposta.status_code == 413
    assert risposta.json()["code"] == "audio_troppo_grande"
    assert estrattore.chiamate == []


def test_provider_non_disponibile_risponde_503(monkeypatch):
    finto = EstrattoreFinto(errore=EstrazioneNonDisponibile("timeout"))
    monkeypatch.setattr(services, "estrattore_predefinito", lambda: finto)

    risposta = invia(audio())

    assert risposta.status_code == 503
    assert risposta.json()["code"] == "estrazione_non_disponibile"
