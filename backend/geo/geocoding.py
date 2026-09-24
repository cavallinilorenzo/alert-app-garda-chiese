"""Indirizzo leggibile di una posizione con il reverse geocoding di Nominatim (OpenStreetMap).

Policy d'uso: https://operations.osmfoundation.org/policies/nominatim/ (User-Agent
identificativo, al massimo una richiesta al secondo: basta per una Segnalazione per invio).
"""

import json
import ssl
from collections.abc import Callable
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

import certifi

from contratti import GeocodingNonDisponibile, Indirizzo

URL_NOMINATIM = "https://nominatim.openstreetmap.org/reverse"
USER_AGENT = "hack4water-alert-garda-chiese/1.0"
TIMEOUT_S = 5


# I certificati di certifi funzionano anche col Python di python.org su macOS,
# che non usa quelli di sistema.
_SSL = ssl.create_default_context(cafile=certifi.where())


def _apri(url: str, timeout: float) -> bytes:
    richiesta = Request(url, headers={"User-Agent": USER_AGENT})
    with urlopen(richiesta, timeout=timeout, context=_SSL) as risposta:
        return risposta.read()


class Nominatim:
    def __init__(self, apri: Callable[[str, float], bytes] = _apri):
        self._apri = apri

    def reverse_geocode(self, lat: float, lon: float) -> Indirizzo | None:
        parametri = {"format": "jsonv2", "lat": lat, "lon": lon, "accept-language": "it"}
        try:
            dati = json.loads(self._apri(f"{URL_NOMINATIM}?{urlencode(parametri)}", TIMEOUT_S))
        except (URLError, TimeoutError, ValueError) as errore:
            raise GeocodingNonDisponibile(str(errore)) from errore
        if "error" in dati:
            return None

        a = dati.get("address", {})
        comune = a.get("city") or a.get("town") or a.get("village") or a.get("municipality")
        if a.get("road"):
            via = " ".join(filter(None, [a["road"], a.get("house_number")]))
            testo = ", ".join(filter(None, [via, comune]))
        else:
            testo = dati["display_name"]
        return Indirizzo(testo=testo, comune=comune)
