"""Tipi condivisi tra le due metà del backend.

La metà A (`segnalazioni`, `accounts`) usa i servizi della metà B (`geo`,
`estrazione`) solo tramite questi tipi e Protocol, senza importarne il codice
interno. Nei test la metà A inietta un fake che implementa lo stesso Protocol.
Decisione: https://github.com/cavallinilorenzo/alert-app-garda-chiese/issues/26

Coordinate sempre in WGS84: latitudine tra -90 e 90, longitudine tra -180 e 180.
"""

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
