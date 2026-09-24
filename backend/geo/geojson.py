"""Layer GeoJSON per disegnare il reticolo e le zone su Leaflet.

Le geometrie sono semplificate a 5 m e arrotondate a 6 decimali (~0,1 m): servono
solo al disegno. Il controllo del perimetro usa sempre le geometrie originali.
"""

import json
from functools import cache

import numpy as np
import shapely
from shapely.geometry import mapping

from geo.kml import leggi_kml
from geo.services import (
    FILE_DEI_LAYER,
    FILE_DELLE_ZONE,
    cartella_mappe,
    in_utm,
    in_wgs84,
    tracciato_da_placemark,
    zona_da_placemark,
)

LAYER_ZONE = "zona_acquaiolo"
LAYER = [*FILE_DEI_LAYER, LAYER_ZONE]
TOLLERANZA_M = 5


def _semplifica(geometria):
    semplificata = in_wgs84(
        shapely.simplify(in_utm(geometria), TOLLERANZA_M, preserve_topology=True)
    )
    return shapely.transform(semplificata, lambda xy: np.round(xy, 6))


def _feature(id_feature, proprieta, geometria) -> dict:
    return {
        "type": "Feature",
        "id": id_feature,
        "properties": proprieta,
        "geometry": mapping(_semplifica(geometria)),
    }


@cache
def layer_geojson(layer: str) -> bytes:
    """FeatureCollection di un layer, calcolata una volta per processo. KeyError se non esiste."""
    if layer == LAYER_ZONE:
        features = []
        for pm in leggi_kml(cartella_mappe() / FILE_DELLE_ZONE):
            zona = zona_da_placemark(pm)
            proprieta = {"nome": zona.nome, "servita": zona.servita, "acquaiolo": zona.acquaiolo}
            features.append(_feature(zona.id, proprieta, pm.geometria))
    else:
        features = []
        for pm in leggi_kml(cartella_mappe() / FILE_DEI_LAYER[layer]):
            t = tracciato_da_placemark(layer, pm)
            proprieta = {
                "nome": t.nome,
                "nome_completo": t.nome_completo,
                "tipo": t.tipo,
                "codice": t.codice,
            }
            features.append(_feature(t.id_placemark, proprieta, pm.geometria))
    collezione = {"type": "FeatureCollection", "features": features}
    return json.dumps(collezione, ensure_ascii=False, separators=(",", ":")).encode()
