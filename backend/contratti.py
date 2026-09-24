"""
Tipi condivisi tra le due metà del backend.

Deciso nel ticket "Funzioni di servizio tra le metà A e B del backend" (#26): le
implementazioni stanno in `geo/services.py` ed `estrazione/services.py`, qui ci sono
solo i tipi che l'altra metà usa (e i Protocol che i suoi test implementano con un fake).
"""

from collections.abc import Mapping
from dataclasses import dataclass
from typing import ClassVar, Protocol


class ServizioNonDisponibile(Exception):
    """Errore tecnico di un servizio esterno. Gli endpoint lo traducono in 503."""

    code: ClassVar[str] = "servizio_non_disponibile"


# --- Estrazione -------------------------------------------------------------

# Campi che l'Estrattore cerca nell'audio, nell'ordine della checklist vocale
# (ticket "Tassonomia delle criticità e campi di una segnalazione", #5), con i valori
# ammessi. `None` = testo libero.
CAMPI_ESTRAZIONE: Mapping[str, tuple[str, ...] | None] = {
    "categoria": (
        "acqua_che_affiora",
        "canale_che_tracima",
        "argine_danneggiato",
        "ostruzione",
        "paratoia_danneggiata",
        "acqua_sporca",
        "altro",
    ),
    "descrizione": None,
    "durata": (
        "adesso",
        "meno_di_un_ora",
        "alcune_ore",
        "piu_di_un_giorno",
        "non_so",
        "non_applicabile",
    ),
    "quantita_acqua": ("gocce", "piccolo_flusso", "molta_acqua", "non_so", "non_applicabile"),
    "pericolo_persone": ("si", "no", "non_so"),
    "pericolo_strada": ("si", "no", "non_so"),
    "pericolo_edifici": ("si", "no", "non_so"),
}


@dataclass(frozen=True, slots=True)
class CampoEstratto:
    """`valore` è None se il Segnalante non l'ha detto; `confidenza` va da 0 a 1."""

    valore: str | None
    confidenza: float


@dataclass(frozen=True, slots=True)
class RisultatoEstrazione:
    transcript: str
    campi: Mapping[str, CampoEstratto]

    @property
    def mancanti(self) -> list[str]:
        """I campi di CAMPI_ESTRAZIONE non detti, da compilare a mano nel form."""
        return [
            nome
            for nome in CAMPI_ESTRAZIONE
            if (campo := self.campi.get(nome)) is None or campo.valore is None
        ]


class Estrattore(Protocol):
    def estrai(self, audio: bytes, mime_type: str) -> RisultatoEstrazione:
        """Solleva EstrazioneNonDisponibile se il provider non risponde."""
        ...


class EstrazioneNonDisponibile(ServizioNonDisponibile):
    code = "estrazione_non_disponibile"
