import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from contratti import CampoEstratto, EstrazioneNonDisponibile, RisultatoAnalisiFoto
from estrazione import services
from tests.contratto import ClientContratto

URL = "/api/estrazione/foto"


class EstrattoreFinto:
    def __init__(self, risultato=None, errore=None):
        self.risultato = risultato
        self.errore = errore
        self.chiamate = []

    def analizza_foto(self, foto, mime_type):
        self.chiamate.append((foto, mime_type))
        if self.errore:
            raise self.errore
        return self.risultato


def usa(monkeypatch, finto):
    monkeypatch.setattr(services, "estrattore_predefinito", lambda: finto)
    return finto


@pytest.fixture
def estrattore(monkeypatch):
    return usa(
        monkeypatch,
        EstrattoreFinto(
            RisultatoAnalisiFoto(
                pertinente=True,
                motivo=None,
                campi={
                    "categoria": CampoEstratto("canale_che_tracima", 0.9),
                    "descrizione": CampoEstratto("Il canale è uscito e copre la strada", 0.8),
                    "quantita_acqua": CampoEstratto("molta_acqua", 0.4),
                    "pericolo_strada": CampoEstratto("si", 0.7),
                    "pericolo_edifici": CampoEstratto(None, 0.0),
                },
            )
        ),
    )


def foto(nome="foto.jpg", contenuto=b"\xff\xd8\xff\xe0foto", mime="image/jpeg"):
    return SimpleUploadedFile(nome, contenuto, content_type=mime)


def invia(file):
    return ClientContratto().post(URL, {"foto": file} if file else {}, format="multipart")


def test_foto_pertinente_restituisce_i_campi_visti_con_sicurezza(estrattore):
    risposta = invia(foto())

    assert risposta.status_code == 200
    # La quantità d'acqua è sotto la confidenza minima: la si chiede al Segnalante.
    assert risposta.json() == {
        "pertinente": True,
        "motivo": None,
        "campi": {
            "categoria": "canale_che_tracima",
            "descrizione": "Il canale è uscito e copre la strada",
            "pericolo_strada": "si",
        },
    }
    assert estrattore.chiamate == [(b"\xff\xd8\xff\xe0foto", "image/jpeg")]


def test_foto_non_pertinente_restituisce_il_motivo(monkeypatch):
    usa(
        monkeypatch,
        EstrattoreFinto(
            RisultatoAnalisiFoto(
                pertinente=False, motivo="Si vede una stanza. Fotografa il canale.", campi={}
            )
        ),
    )

    risposta = invia(foto())

    assert risposta.status_code == 200
    assert risposta.json() == {
        "pertinente": False,
        "motivo": "Si vede una stanza. Fotografa il canale.",
        "campi": {},
    }


def test_accetta_le_foto_heic_di_iphone(estrattore):
    risposta = invia(foto("IMG_0001.HEIC", mime="image/heic"))

    assert risposta.status_code == 200
    assert estrattore.chiamate[0][1] == "image/heic"


@pytest.mark.parametrize(
    "file",
    [None, foto(contenuto=b""), foto("nota.webm", mime="audio/webm")],
    ids=["senza foto", "foto vuota", "non è una foto"],
)
def test_foto_non_valida_risponde_400(estrattore, file):
    risposta = invia(file)

    assert risposta.status_code == 400
    assert risposta.json()["code"] == "foto_non_valida"
    assert "foto" in risposta.json()["fields"]
    assert estrattore.chiamate == []


def test_foto_oltre_10_mb_risponde_413(estrattore):
    risposta = invia(foto(contenuto=b"\0" * (10 * 1024 * 1024 + 1)))

    assert risposta.status_code == 413
    assert risposta.json()["code"] == "foto_troppo_grande"
    assert estrattore.chiamate == []


def test_provider_non_disponibile_risponde_503(monkeypatch):
    usa(monkeypatch, EstrattoreFinto(errore=EstrazioneNonDisponibile("timeout")))

    risposta = invia(foto())

    assert risposta.status_code == 503
    assert risposta.json()["code"] == "estrazione_non_disponibile"
