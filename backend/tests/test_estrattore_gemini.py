import json
from types import SimpleNamespace

import pytest
from google.genai import errors

from contratti import CampoEstratto, EstrazioneNonDisponibile
from estrazione.services import MOTIVO_PREDEFINITO, EstrattoreGemini, estrattore_predefinito


class ClientGeminiFinto:
    """Imita `genai.Client`: registra la richiesta e restituisce `testo` come risposta."""

    def __init__(self, testo=None, errore=None):
        self.richieste = []
        self.models = SimpleNamespace(generate_content=self.generate_content)
        self.testo = testo
        self.errore = errore

    def generate_content(self, **richiesta):
        self.richieste.append(richiesta)
        if self.errore:
            raise self.errore
        return SimpleNamespace(text=self.testo)


def risposta_gemini(**campi):
    return json.dumps({"transcript": "C'è acqua che esce dal campo.", "campi": campi})


def test_trasforma_la_risposta_di_gemini_in_un_risultato():
    client = ClientGeminiFinto(
        risposta_gemini(
            categoria={"valore": "acqua_che_affiora", "confidenza": 0.9},
            descrizione={"valore": "Acqua che esce dal campo", "confidenza": 0.8},
            durata={"valore": None, "confidenza": 0},
        )
    )

    risultato = EstrattoreGemini(client, "gemini-3.1-flash-lite").estrai(b"aac", "audio/mp4")

    assert risultato.transcript == "C'è acqua che esce dal campo."
    assert risultato.campi["categoria"] == CampoEstratto("acqua_che_affiora", 0.9)
    assert risultato.campi["descrizione"] == CampoEstratto("Acqua che esce dal campo", 0.8)
    assert risultato.campi["durata"] == CampoEstratto(None, 0.0)
    assert "durata" in risultato.mancanti
    [richiesta] = client.richieste
    assert richiesta["model"] == "gemini-3.1-flash-lite"
    [audio] = [p for p in richiesta["contents"] if getattr(p, "inline_data", None)]
    assert audio.inline_data.data == b"aac"
    assert audio.inline_data.mime_type == "audio/m4a"


def test_scarta_i_valori_che_non_rispettano_la_tassonomia():
    client = ClientGeminiFinto(
        risposta_gemini(
            categoria={"valore": "tubo_rotto", "confidenza": 0.9},
            pericolo_persone={"valore": "si", "confidenza": 1.4},
            descrizione={"valore": "x" * 600, "confidenza": 0.5},
            colore={"valore": "blu", "confidenza": 1},
        )
    )

    risultato = EstrattoreGemini(client, "m").estrai(b"a", "audio/webm")

    assert risultato.campi["categoria"].valore is None
    assert "categoria" in risultato.mancanti
    assert risultato.campi["pericolo_persone"] == CampoEstratto("si", 1.0)
    assert len(risultato.campi["descrizione"].valore) == 500
    assert "colore" not in risultato.campi


@pytest.mark.parametrize(
    "client",
    [
        ClientGeminiFinto(errore=errors.ServerError(503, {"error": {"message": "overloaded"}})),
        ClientGeminiFinto(errore=TimeoutError()),
        ClientGeminiFinto("non è json"),
        ClientGeminiFinto(json.dumps({"campi": {}})),
    ],
    ids=["errore del server", "timeout", "risposta non json", "risposta senza transcript"],
)
def test_i_guasti_del_provider_diventano_estrazione_non_disponibile(client):
    with pytest.raises(EstrazioneNonDisponibile):
        EstrattoreGemini(client, "m").estrai(b"a", "audio/webm")


def test_senza_chiave_gemini_l_estrazione_non_e_disponibile(settings):
    settings.GEMINI_API_KEY = ""

    with pytest.raises(EstrazioneNonDisponibile):
        estrattore_predefinito()


def risposta_foto(pertinente=True, motivo=None, **campi):
    return json.dumps({"pertinente": pertinente, "motivo": motivo, "campi": campi})


def test_trasforma_l_analisi_di_una_foto_pertinente():
    client = ClientGeminiFinto(
        risposta_foto(
            categoria={"valore": "canale_che_tracima", "confidenza": 0.9},
            quantita_acqua={"valore": "molta_acqua", "confidenza": 0.8},
            pericolo_strada={"valore": "si", "confidenza": 0.7},
            pericolo_edifici={"valore": None, "confidenza": 0},
        )
    )

    risultato = EstrattoreGemini(client, "m").analizza_foto(b"\xff\xd8", "image/jpeg")

    assert risultato.pertinente
    assert risultato.motivo is None
    assert risultato.campi["categoria"] == CampoEstratto("canale_che_tracima", 0.9)
    assert risultato.campi["pericolo_strada"] == CampoEstratto("si", 0.7)
    [richiesta] = client.richieste
    [foto] = [p for p in richiesta["contents"] if getattr(p, "inline_data", None)]
    assert foto.inline_data.data == b"\xff\xd8"
    assert foto.inline_data.mime_type == "image/jpeg"


def test_dalla_foto_non_si_ricavano_ne_durata_ne_l_assenza_di_pericolo():
    client = ClientGeminiFinto(
        risposta_foto(
            durata={"valore": "adesso", "confidenza": 1},
            pericolo_strada={"valore": "no", "confidenza": 0.9},
            quantita_acqua={"valore": "non_so", "confidenza": 0.9},
        )
    )

    risultato = EstrattoreGemini(client, "m").analizza_foto(b"f", "image/jpeg")

    assert "durata" not in risultato.campi
    assert risultato.campi["pericolo_strada"].valore is None
    assert risultato.campi["quantita_acqua"].valore is None


def test_una_foto_non_pertinente_ha_un_motivo_e_nessun_campo():
    client = ClientGeminiFinto(
        risposta_foto(
            pertinente=False,
            motivo="Si vede una stanza. Fotografa il canale.",
            categoria={"valore": "altro", "confidenza": 0.2},
        )
    )

    risultato = EstrattoreGemini(client, "m").analizza_foto(b"f", "image/jpeg")

    assert not risultato.pertinente
    assert risultato.motivo == "Si vede una stanza. Fotografa il canale."
    assert risultato.campi == {}


def test_senza_motivo_una_foto_non_pertinente_ha_quello_predefinito():
    client = ClientGeminiFinto(risposta_foto(pertinente=False, motivo=" "))

    risultato = EstrattoreGemini(client, "m").analizza_foto(b"f", "image/jpeg")

    assert risultato.motivo == MOTIVO_PREDEFINITO


def test_i_guasti_del_provider_sulla_foto_diventano_estrazione_non_disponibile():
    client = ClientGeminiFinto(json.dumps({"campi": {}}))

    with pytest.raises(EstrazioneNonDisponibile):
        EstrattoreGemini(client, "m").analizza_foto(b"f", "image/jpeg")
