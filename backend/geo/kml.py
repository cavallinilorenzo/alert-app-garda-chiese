"""Lettura dei KML di `mappe/` con la libreria standard, senza GDAL."""

import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path

from shapely.geometry import LineString, MultiLineString, MultiPolygon, Polygon
from shapely.geometry.base import BaseGeometry

NS = "{http://www.opengis.net/kml/2.2}"


@dataclass(frozen=True, slots=True)
class Placemark:
    id: str
    attributi: dict[str, str]
    geometria: BaseGeometry  # WGS84, coordinate (lon, lat)


def _coordinate(elemento) -> list[tuple[float, float]]:
    punti = []
    for tupla in elemento.text.split():
        lon, lat, *_ = tupla.split(",")
        punti.append((float(lon), float(lat)))
    return punti


def _geometria(placemark) -> BaseGeometry | None:
    linee = [
        LineString(_coordinate(c))
        for ls in placemark.iter(f"{NS}LineString")
        for c in ls.iter(f"{NS}coordinates")
    ]
    if linee:
        return linee[0] if len(linee) == 1 else MultiLineString(linee)

    poligoni = []
    for pg in placemark.iter(f"{NS}Polygon"):
        esterno = pg.find(f"{NS}outerBoundaryIs/{NS}LinearRing/{NS}coordinates")
        interni = pg.findall(f"{NS}innerBoundaryIs/{NS}LinearRing/{NS}coordinates")
        poligoni.append(Polygon(_coordinate(esterno), [_coordinate(c) for c in interni]))
    if poligoni:
        return poligoni[0] if len(poligoni) == 1 else MultiPolygon(poligoni)
    return None


def leggi_kml(percorso: Path) -> list[Placemark]:
    """Un Placemark per ogni `<Placemark>` con geometria, attributi da `SimpleData`."""
    placemark = []
    for pm in ET.parse(percorso).getroot().iter(f"{NS}Placemark"):
        geometria = _geometria(pm)
        if geometria is None:
            continue
        attributi = {sd.get("name"): (sd.text or "").strip() for sd in pm.iter(f"{NS}SimpleData")}
        placemark.append(Placemark(pm.get("id"), attributi, geometria))
    return placemark
