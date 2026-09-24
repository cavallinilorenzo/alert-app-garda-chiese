"""Tipi condivisi tra le due metà del backend.

La metà A (`segnalazioni`, `accounts`) usa i servizi della metà B (`geo`,
`estrazione`) solo tramite questi tipi e Protocol, senza importarne il codice
interno. Nei test la metà A inietta un fake che implementa lo stesso Protocol.
Decisione: https://github.com/cavallinilorenzo/alert-app-garda-chiese/issues/26

Coordinate sempre in WGS84: latitudine tra -90 e 90, longitudine tra -180 e 180.
"""

from collections.abc import Mapping
from dataclasses import dataclass
from typing import Literal, Protocol

Layer = Literal["canale", "condotta", "reticolo_principale"]


@dataclass(frozen=True, slots=True)
class Tracciato:
    """Un tracciato del Reticolo consortile, identificato da layer e placemark del KML."""

    layer: Layer
    id_placemark: str
    nome: str
    nome_completo: str
    tipo: str | None
    codice: str | None


@dataclass(frozen=True, slots=True)
class ZonaAcquaiolo:
    """Una Zona acquaiolo. Se `servita` è falso la zona è `NON SERVITA` e non ha acquaiolo."""

    id: int
    nome: str
    servita: bool
    acquaiolo: str | None


@dataclass(frozen=True, slots=True)
class RisultatoPerimetro:
    """Esito del controllo del perimetro.

    `distanza_m` è la distanza dal tracciato più vicino di tutto il reticolo.
    Se `accettato` è falso la posizione è Fuori perimetro e `tracciato` è None.
    """

    accettato: bool
    tracciato: Tracciato | None
    distanza_m: float
    zona: ZonaAcquaiolo | None
    acquaiolo_suggerito: str | None
    messaggio: str


@dataclass(frozen=True, slots=True)
class Indirizzo:
    """Indirizzo leggibile di una posizione."""

    testo: str
    comune: str | None


class ServizioNonDisponibile(Exception):
    """Errore tecnico di un servizio esterno. Gli endpoint lo traducono in 503."""

    code = "servizio_non_disponibile"


class GeocodingNonDisponibile(ServizioNonDisponibile):
    code = "geocoding_non_disponibile"


class EstrazioneNonDisponibile(ServizioNonDisponibile):
    code = "estrazione_non_disponibile"


class Geo(Protocol):
    def check_perimetro(self, lat: float, lon: float) -> RisultatoPerimetro:
        """Tracciato più vicino entro soglia e Zona acquaiolo. Fuori perimetro non è un errore."""
        ...

    def zona_acquaiolo(self, lat: float, lon: float) -> ZonaAcquaiolo | None:
        """Zona acquaiolo del punto, `NON SERVITA` compresa; None se fuori da ogni zona."""
        ...

    def reverse_geocode(self, lat: float, lon: float) -> Indirizzo | None:
        """Indirizzo leggibile; None se non esiste. Solleva GeocodingNonDisponibile."""
        ...


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


# Campi che si possono vedere in una foto: la durata no, e un pericolo si vede solo
# quando c'è (una foto non basta a dire che non c'è).
CAMPI_FOTO: Mapping[str, tuple[str, ...] | None] = {
    "categoria": CAMPI_ESTRAZIONE["categoria"],
    "descrizione": None,
    "quantita_acqua": ("gocce", "piccolo_flusso", "molta_acqua"),
    "pericolo_strada": ("si",),
    "pericolo_edifici": ("si",),
}


@dataclass(frozen=True, slots=True)
class RisultatoAnalisiFoto:
    """Se la foto non è pertinente `motivo` spiega al Segnalante perché e `campi` è vuoto."""

    pertinente: bool
    motivo: str | None
    campi: Mapping[str, CampoEstratto]


class Estrattore(Protocol):
    def estrai(self, audio: bytes, mime_type: str) -> RisultatoEstrazione:
        """Solleva EstrazioneNonDisponibile se il provider non risponde."""
        ...

    def analizza_foto(self, foto: bytes, mime_type: str) -> RisultatoAnalisiFoto:
        """Pertinenza della foto e campi che si vedono. Solleva EstrazioneNonDisponibile."""
        ...
