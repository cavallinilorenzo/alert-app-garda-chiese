"""
Servizi della app `estrazione`: dall'audio del Segnalante ai campi della Segnalazione.

I tipi (`Estrattore`, `RisultatoEstrazione`, `CampoEstratto`) stanno in `contratti.py`.
L'implementazione è Gemini, con audio e schema JSON in una sola chiamata (ticket
"Speech-to-text e LLM di estrazione per la demo", #3).
"""

import json
import logging

from django.conf import settings
from google import genai
from google.genai import types

from contratti import (
    CAMPI_ESTRAZIONE,
    CampoEstratto,
    Estrattore,
    EstrazioneNonDisponibile,
    RisultatoEstrazione,
)

logger = logging.getLogger(__name__)

# Il Segnalante aspetta davanti al telefono: oltre questo tempo meglio il form a mano.
GEMINI_TIMEOUT_MS = 30_000

# Gemini non elenca audio/mp4 (il formato di Safari iOS) ma accetta lo stesso
# contenitore come audio/m4a.
MIME_PER_GEMINI = {
    "audio/mp4": "audio/m4a",
    "audio/x-m4a": "audio/m4a",
    "audio/mp3": "audio/mpeg",
    "audio/x-wav": "audio/wav",
}

ISTRUZIONI = """\
Sei l'assistente dell'app con cui i cittadini segnalano problemi sui canali e sulle \
condotte del Consorzio di bonifica Garda Chiese (provincia di Mantova e Brescia). \
Ascolta la registrazione e restituisci:

- transcript: la trascrizione fedele in italiano, senza correggere il parlato;
- campi: per ogni campo il valore detto e la tua confidenza da 0 a 1.

Se un'informazione non viene detta usa null, con confidenza 0. Non inventare e non \
dedurre dal contesto quello che la persona non dice. Usa non_so solo se la persona dice \
esplicitamente di non saperlo: se non ne parla, il valore è null.

Campi:
- categoria, cosa ha visto: acqua_che_affiora (acqua che esce dal terreno, perdita), \
canale_che_tracima (canale che esce dagli argini, allagamento), argine_danneggiato \
(argine o sponda rotta o franata), ostruzione (rami, rifiuti, accumuli che bloccano \
l'acqua), paratoia_danneggiata (paratoia, chiusa o impianto rotto), acqua_sporca (acqua \
sporca, schiuma, cattivo odore), altro (un problema diverso da questi).
- descrizione: una frase breve, tra 10 e 500 caratteri, che riassume il problema con le \
parole della persona, compresi i riferimenti di luogo (via, località, ponte).
- durata, da quanto tempo lo vede: adesso, meno_di_un_ora, alcune_ore, \
piu_di_un_giorno, non_so; non_applicabile se non ha senso per questo problema.
- quantita_acqua: gocce, piccolo_flusso, molta_acqua, non_so; non_applicabile se non ha \
senso per questo problema.
- pericolo_persone, pericolo_strada (strada o viabilità), pericolo_edifici (case o altri \
edifici): si, no, non_so.
"""


def _schema_campo(valori):
    if valori is None:
        valore = {"type": ["string", "null"]}
    else:
        valore = {"anyOf": [{"type": "string", "enum": list(valori)}, {"type": "null"}]}
    return {
        "type": "object",
        "properties": {
            "valore": valore,
            "confidenza": {"type": "number", "minimum": 0, "maximum": 1},
        },
        "required": ["valore", "confidenza"],
    }


SCHEMA = {
    "type": "object",
    "properties": {
        "transcript": {"type": "string"},
        "campi": {
            "type": "object",
            "properties": {
                nome: _schema_campo(valori) for nome, valori in CAMPI_ESTRAZIONE.items()
            },
            "required": list(CAMPI_ESTRAZIONE),
        },
    },
    "required": ["transcript", "campi"],
}


class EstrattoreGemini:
    """Adattatore Gemini dell'`Estrattore`. `client` è un `google.genai.Client`."""

    def __init__(self, client, modello: str):
        self.client = client
        self.modello = modello

    def estrai(self, audio: bytes, mime_type: str) -> RisultatoEstrazione:
        # Qualunque guasto (rete, quota, timeout, JSON diverso dallo schema) si traduce
        # nello stesso errore: il Segnalante compila il form a mano.
        try:
            return self._estrai(audio, mime_type)
        except Exception as e:
            logger.exception("Estrazione con Gemini fallita")
            raise EstrazioneNonDisponibile(str(e)) from e

    def _estrai(self, audio, mime_type):
        risposta = self.client.models.generate_content(
            model=self.modello,
            contents=[
                types.Part.from_bytes(
                    data=audio, mime_type=MIME_PER_GEMINI.get(mime_type, mime_type)
                ),
                ISTRUZIONI,
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_json_schema=SCHEMA,
                temperature=0,
            ),
        )
        dati = json.loads(risposta.text)
        return RisultatoEstrazione(
            transcript=dati["transcript"],
            campi={
                nome: _campo(nome, dati["campi"][nome])
                for nome in CAMPI_ESTRAZIONE
                if nome in dati["campi"]
            },
        )


def _campo(nome, dati) -> CampoEstratto:
    """Lo schema non basta: un valore fuori dalla tassonomia vale come non detto."""
    valori, valore = CAMPI_ESTRAZIONE[nome], dati["valore"]
    if valori is None and valore is not None:
        valore = str(valore)[:500]
    elif valori is not None and valore not in valori:
        valore = None
    return CampoEstratto(valore, min(max(float(dati["confidenza"]), 0.0), 1.0))


def estrattore_predefinito() -> Estrattore:
    if not settings.GEMINI_API_KEY:
        raise EstrazioneNonDisponibile("GEMINI_API_KEY non configurata")
    client = genai.Client(
        api_key=settings.GEMINI_API_KEY,
        http_options=types.HttpOptions(timeout=GEMINI_TIMEOUT_MS),
    )
    return EstrattoreGemini(client, settings.GEMINI_MODELLO)
