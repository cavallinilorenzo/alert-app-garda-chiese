"""Servizi geo della metà B: perimetro, Zona acquaiolo, indirizzo.

Implementano il Protocol `contratti.Geo` a partire dai KML di `mappe/`, caricati
in memoria con uno STRtree (vedi `research/stack-geo.md`). Le distanze si
calcolano in UTM 32N, quindi in metri, sulle geometrie originali.
"""

from functools import cache
from pathlib import Path

import numpy as np
import shapely
from django.conf import settings
from pyproj import Transformer
from shapely.geometry import Point

from contratti import Indirizzo, RisultatoPerimetro, Tracciato, ZonaAcquaiolo
from geo.geocoding import Nominatim
from geo.kml import leggi_kml

FILE_DEI_LAYER = {
    "canale": "RIB_Canali_2026.kml",
    "condotta": "RIB_Condotte_2026.kml",
    "reticolo_principale": "RIP_2026.kml",
}
FILE_DELLE_ZONE = "acquaioli_2026.kml"
NON_SERVITA = "NON SERVITA"

# Soglia di perimetro per layer, in metri (issue #7).
SOGLIA_M = {"canale": 300, "condotta": 300, "reticolo_principale": 300}

MESSAGGIO_ACCETTATO = "La posizione è sul reticolo consortile: {}."
MESSAGGIO_FUORI_PERIMETRO = (
    "La posizione non risulta sul reticolo consortile. "
    "Controlla il pin o contatta il Consorzio di bonifica Garda Chiese."
)

_A_UTM = Transformer.from_crs("EPSG:4326", "EPSG:32632", always_xy=True)
_A_WGS84 = Transformer.from_crs("EPSG:32632", "EPSG:4326", always_xy=True)


def cartella_mappe() -> Path:
    return Path(getattr(settings, "GEO_MAPPE_DIR", settings.REPO_DIR / "mappe"))


def _proietta(geometria, transformer):
    return shapely.transform(
        geometria, lambda xy: np.column_stack(transformer.transform(xy[:, 0], xy[:, 1]))
    )


def in_utm(geometria):
    return _proietta(geometria, _A_UTM)


def in_wgs84(geometria):
    return _proietta(geometria, _A_WGS84)


def _punto_utm(lat: float, lon: float) -> Point:
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        raise ValueError(f"Coordinate WGS84 non valide: lat={lat}, lon={lon}")
    return Point(*_A_UTM.transform(lon, lat))


class _IndiceLayer:
    """Tracciati di un layer con il loro STRtree in UTM."""

    def __init__(self, tracciati: list[Tracciato], linee_utm: list):
        self.tracciati = tracciati
        self.albero = shapely.STRtree(linee_utm)

    def piu_vicino(self, punto: Point) -> tuple[Tracciato, float]:
        indici, distanze = self.albero.query_nearest(punto, return_distance=True)
        return self.tracciati[int(indici[0])], float(distanze[0])


def tracciato_da_placemark(layer: str, placemark) -> Tracciato:
    a = placemark.attributi
    return Tracciato(
        layer=layer,
        id_placemark=placemark.id,
        nome=a.get("NOME", ""),
        nome_completo=a.get("NOME_COMPL", ""),
        tipo=a.get("NOME_TIPO") or None,
        codice=a.get("CODICE_CAN") or None,
    )


def zona_da_placemark(placemark) -> ZonaAcquaiolo:
    # L'attributo ID dei KML vale sempre 0: l'id è il numero del placemark
    # (`acquaioli_2026.21` -> 21). NOME è l'acquaiolo, ZONA la macro-zona.
    acquaiolo = placemark.attributi.get("NOME", "")
    servita = acquaiolo != NON_SERVITA
    return ZonaAcquaiolo(
        id=int(placemark.id.rsplit(".", 1)[1]),
        nome=placemark.attributi.get("ZONA", ""),
        servita=servita,
        acquaiolo=acquaiolo if servita else None,
    )


class GeoKML:
    """Implementazione di `contratti.Geo` sui KML di `mappe/`."""

    def __init__(
        self,
        layer: dict[str, _IndiceLayer],
        zone: list[ZonaAcquaiolo],
        poligoni_utm: list,
        geocoder: Nominatim,
    ):
        self._layer = layer
        self._zone = zone
        self._albero_zone = shapely.STRtree(poligoni_utm)
        self._geocoder = geocoder

    @classmethod
    def da_cartella(cls, cartella: Path, geocoder: Nominatim | None = None) -> "GeoKML":
        layer = {}
        for nome_layer, nome_file in FILE_DEI_LAYER.items():
            tracciati, linee_utm = [], []
            for pm in leggi_kml(Path(cartella) / nome_file):
                tracciati.append(tracciato_da_placemark(nome_layer, pm))
                linee_utm.append(in_utm(pm.geometria))
            if tracciati:
                layer[nome_layer] = _IndiceLayer(tracciati, linee_utm)

        placemark_zone = leggi_kml(Path(cartella) / FILE_DELLE_ZONE)
        zone = [zona_da_placemark(pm) for pm in placemark_zone]
        poligoni_utm = [shapely.make_valid(in_utm(pm.geometria)) for pm in placemark_zone]
        return cls(layer, zone, poligoni_utm, geocoder or Nominatim())

    def reverse_geocode(self, lat: float, lon: float) -> Indirizzo | None:
        _punto_utm(lat, lon)  # valida le coordinate
        return self._geocoder.reverse_geocode(lat, lon)

    def zona_acquaiolo(self, lat: float, lon: float) -> ZonaAcquaiolo | None:
        indici = self._albero_zone.query(_punto_utm(lat, lon), predicate="intersects")
        # Le zone non si sovrappongono: su un confine condiviso vale la prima.
        return self._zone[int(min(indici))] if len(indici) else None

    def check_perimetro(self, lat: float, lon: float) -> RisultatoPerimetro:
        punto = _punto_utm(lat, lon)
        vicini = [indice.piu_vicino(punto) for indice in self._layer.values()]
        distanza_minima = min(distanza for _, distanza in vicini)
        candidati = [(t, d) for t, d in vicini if d <= SOGLIA_M[t.layer]]
        if not candidati:
            return RisultatoPerimetro(
                accettato=False,
                tracciato=None,
                distanza_m=distanza_minima,
                zona=None,
                acquaiolo_suggerito=None,
                messaggio=MESSAGGIO_FUORI_PERIMETRO,
            )
        tracciato, distanza = min(candidati, key=lambda c: c[1])
        zona = self.zona_acquaiolo(lat, lon)
        return RisultatoPerimetro(
            accettato=True,
            tracciato=tracciato,
            distanza_m=distanza,
            zona=zona,
            acquaiolo_suggerito=zona.acquaiolo if zona else None,
            messaggio=MESSAGGIO_ACCETTATO.format(tracciato.nome_completo or tracciato.nome),
        )


@cache
def geo() -> GeoKML:
    """Istanza condivisa, caricata dai KML alla prima chiamata (~100 ms)."""
    return GeoKML.da_cartella(cartella_mappe())


def check_perimetro(lat: float, lon: float) -> RisultatoPerimetro:
    return geo().check_perimetro(lat, lon)


def zona_acquaiolo(lat: float, lon: float) -> ZonaAcquaiolo | None:
    return geo().zona_acquaiolo(lat, lon)


def reverse_geocode(lat: float, lon: float) -> Indirizzo | None:
    return geo().reverse_geocode(lat, lon)
