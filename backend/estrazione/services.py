"""
Servizi della app `estrazione`: dall'audio e dalla foto del Segnalante ai campi della
Segnalazione.

I tipi (`Estrattore`, `RisultatoEstrazione`, `RisultatoAnalisiFoto`, `CampoEstratto`)
stanno in `contratti.py`. L'implementazione è Gemini, con il file e lo schema JSON in una
sola chiamata (ticket "Speech-to-text e LLM di estrazione per la demo", #3; analisi della
foto nel ticket #92).
"""

import json
import logging

from django.conf import settings
from google import genai
from google.genai import types

from contratti import (
    CAMPI_ESTRAZIONE,
    CAMPI_FOTO,
    CATEGORIE_CON_QUANTITA_ACQUA,
    CampoEstratto,
    Estrattore,
    EstrazioneNonDisponibile,
    RisultatoAnalisiFoto,
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
- categoria, cosa ha visto: acqua_che_affiora (acqua che esce dal terreno), \
perdita_dal_canale (un canale o una condotta che perde acqua), canale_che_tracima \
(canale che esce dagli argini, allagamento), argine_danneggiato (argine o sponda rotta o \
franata), ostruzione (rami, rifiuti, accumuli che bloccano l'acqua), canale_asciutto \
(canale senz'acqua o quasi), paratoia_danneggiata (paratoia, chiusa o impianto rotto), \
acqua_sporca (acqua sporca, schiuma, cattivo odore, rifiuti che non bloccano l'acqua), \
altro (un problema diverso da questi).
- descrizione: una frase breve, tra 10 e 500 caratteri, che riassume il problema con le \
parole della persona, compresi i riferimenti di luogo (via, località, ponte).
- durata, da quando lo vede: adesso (l'ha appena notato), alcune_ore, piu_di_un_giorno \
(da qualche giorno), da_settimane, non_so.
- quantita_acqua, quanta acqua esce: gocce, piccolo_flusso (un filo, come un rubinetto), \
molta_acqua (tanta, scorre forte), getto (zampilla con forza), non_so. Solo per \
acqua_che_affiora, perdita_dal_canale, canale_che_tracima e argine_danneggiato; per le \
altre categorie non_applicabile.
- pericolo_persone, pericolo_strada (strada o viabilità), pericolo_edifici (case o altri \
edifici): si, no, non_so.
"""


ISTRUZIONI_FOTO = """\
Sei l'assistente dell'app con cui i cittadini segnalano problemi sui canali e sulle \
condotte del Consorzio di bonifica Garda Chiese (provincia di Mantova e Brescia). \
Guarda la foto allegata alla segnalazione e restituisci:

- pertinente: true se la foto mostra qualcosa che può riguardare il reticolo del \
Consorzio: un canale, un fosso, un argine o una sponda, una paratoia, una chiusa o un \
impianto, acqua che affiora dal terreno, un campo o una strada allagati, rifiuti o rami \
nell'acqua. false se non c'entra (persone in primo piano, interni, animali, oggetti, \
schermate, documenti) o se non si capisce cosa mostra (foto nera, mossa, sfocata, dito \
sull'obiettivo). Nel dubbio, se si vede acqua o un corso d'acqua, è pertinente.
- motivo: se non è pertinente, una frase breve e gentile, rivolta alla persona con il tu, \
che dice cosa si vede e cosa fotografare invece. Se è pertinente, null.
- campi: solo se è pertinente, per ogni campo il valore che si vede nella foto e la tua \
confidenza da 0 a 1. Se la foto non è pertinente, tutti i valori sono null.

Descrivi solo quello che si vede. Se un campo non si capisce dalla foto usa null, con \
confidenza 0. Non inventare.

Campi:
- categoria, cosa mostra: acqua_che_affiora (acqua che esce dal terreno), \
perdita_dal_canale (un canale o una condotta che perde acqua), canale_che_tracima \
(canale che esce dagli argini, allagamento), argine_danneggiato (argine o sponda rotta o \
franata), ostruzione (rami, rifiuti, accumuli che bloccano l'acqua), canale_asciutto \
(canale senz'acqua o quasi), paratoia_danneggiata (paratoia, chiusa o impianto rotto), \
acqua_sporca (acqua sporca, schiuma, chiazze, rifiuti che non bloccano l'acqua), altro \
(un problema diverso da questi).
- descrizione: una frase breve, tra 10 e 500 caratteri, che descrive il problema che si \
vede, senza dire che è una foto.
- quantita_acqua, quanta acqua esce: gocce, piccolo_flusso, molta_acqua, getto (zampilla \
con forza). Solo per acqua_che_affiora, perdita_dal_canale, canale_che_tracima e \
argine_danneggiato; per le altre categorie null.
- pericolo_strada: si se si vede acqua o un cedimento sulla strada; altrimenti null.
- pericolo_edifici: si se si vede acqua che raggiunge case o altri edifici; altrimenti null.
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

SCHEMA_FOTO = {
    "type": "object",
    "properties": {
        "pertinente": {"type": "boolean"},
        "motivo": {"type": ["string", "null"]},
        "campi": {
            "type": "object",
            "properties": {nome: _schema_campo(valori) for nome, valori in CAMPI_FOTO.items()},
            "required": list(CAMPI_FOTO),
        },
    },
    "required": ["pertinente", "motivo", "campi"],
}

# Il motivo di Gemini manca o è troppo lungo per un banner: si usa questo.
MOTIVO_PREDEFINITO = (
    "La foto non sembra mostrare il problema. Inquadra il canale, l'argine o il punto "
    "dove vedi l'acqua."
)


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

    def analizza_foto(self, foto: bytes, mime_type: str) -> RisultatoAnalisiFoto:
        try:
            return self._analizza_foto(foto, mime_type)
        except Exception as e:
            logger.exception("Analisi della foto con Gemini fallita")
            raise EstrazioneNonDisponibile(str(e)) from e

    def _estrai(self, audio, mime_type):
        dati = self._genera(audio, MIME_PER_GEMINI.get(mime_type, mime_type), ISTRUZIONI, SCHEMA)
        return RisultatoEstrazione(
            transcript=dati["transcript"],
            campi=_quantita_secondo_categoria(_campi(CAMPI_ESTRAZIONE, dati["campi"])),
        )

    def _analizza_foto(self, foto, mime_type):
        dati = self._genera(foto, mime_type, ISTRUZIONI_FOTO, SCHEMA_FOTO)
        if not dati["pertinente"]:
            motivo = (dati["motivo"] or "").strip()
            if not motivo or len(motivo) > 300:
                motivo = MOTIVO_PREDEFINITO
            return RisultatoAnalisiFoto(pertinente=False, motivo=motivo, campi={})
        return RisultatoAnalisiFoto(
            pertinente=True,
            motivo=None,
            campi=_quantita_secondo_categoria(_campi(CAMPI_FOTO, dati["campi"]), senza_acqua=None),
        )

    def _genera(self, dati: bytes, mime_type: str, istruzioni: str, schema: dict) -> dict:
        risposta = self.client.models.generate_content(
            model=self.modello,
            contents=[types.Part.from_bytes(data=dati, mime_type=mime_type), istruzioni],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_json_schema=schema,
                temperature=0,
            ),
        )
        return json.loads(risposta.text)


def _campi(tassonomia, dati) -> dict[str, CampoEstratto]:
    return {nome: _campo(tassonomia[nome], dati[nome]) for nome in tassonomia if nome in dati}


def _quantita_secondo_categoria(
    campi: dict[str, CampoEstratto], senza_acqua: str | None = "non_applicabile"
) -> dict[str, CampoEstratto]:
    """La quantità d'acqua si chiede solo se l'acqua esce: le istruzioni non bastano.

    Per le altre categorie vale `senza_acqua` (`non_applicabile` per la voce, con la
    confidenza della categoria; None per la foto, che non ha quel valore). Per le categorie
    con l'acqua `non_applicabile` non ha senso e il campo resta da chiedere.
    """
    categoria = campi.get("categoria")
    if categoria is None or categoria.valore is None:
        return campi
    quantita = campi.get("quantita_acqua")
    if categoria.valore not in CATEGORIE_CON_QUANTITA_ACQUA:
        confidenza = categoria.confidenza if senza_acqua is not None else 0.0
        campi["quantita_acqua"] = CampoEstratto(senza_acqua, confidenza)
    elif quantita is not None and quantita.valore == "non_applicabile":
        campi["quantita_acqua"] = CampoEstratto(None, 0.0)
    return campi


def _campo(valori, dati) -> CampoEstratto:
    """Lo schema non basta: un valore fuori dalla tassonomia vale come non detto."""
    valore = dati["valore"]
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
