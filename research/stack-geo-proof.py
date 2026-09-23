"""Prova usa-e-getta per la issue #4 (stack geo).

Legge i KML reali di `mappe/`, costruisce uno STRtree shapely in UTM 32N
(EPSG:32632) e, per alcuni punti di prova, restituisce il tracciato più vicino
(layer, NOME, CODICE_CAN, NOME_TIPO, distanza in metri) e la zona acquaiolo che
contiene il punto. Misura anche tempi, dimensioni GeoJSON e distribuzione delle
distanze.

Uso:
    python3 -m venv /tmp/geo && /tmp/geo/bin/pip install shapely pyproj
    /tmp/geo/bin/python research/stack-geo-proof.py [cartella_mappe]

Solo libreria standard + shapely 2 + pyproj.
"""

import gzip
import json
import statistics
import sys
import time
import xml.etree.ElementTree as ET
from pathlib import Path

import numpy as np
import shapely
from pyproj import Transformer
from shapely.geometry import LineString, MultiLineString, MultiPolygon, Point, Polygon

MAPPE = Path(sys.argv[1] if len(sys.argv) > 1 else "mappe")
NS = {"k": "http://www.opengis.net/kml/2.2"}
LAYER_LINEE = {
    "canale": "RIB_Canali_2026.kml",
    "condotta": "RIB_Condotte_2026.kml",
    "rip": "RIP_2026.kml",
}
ZONE = "acquaioli_2026.kml"

to_utm = Transformer.from_crs("EPSG:4326", "EPSG:32632", always_xy=True)
to_wgs = Transformer.from_crs("EPSG:32632", "EPSG:4326", always_xy=True)


def coords(el):
    out = []
    for tok in el.text.split():
        parts = tok.split(",")
        out.append((float(parts[0]), float(parts[1])))
    return out


def parse_kml(path):
    """Restituisce una lista di (attributi, geometria WGS84) per Placemark."""
    root = ET.parse(path).getroot()
    feats = []
    for pm in root.iter("{%s}Placemark" % NS["k"]):
        attrs = {sd.get("name"): (sd.text or "").strip() for sd in pm.iter("{%s}SimpleData" % NS["k"])}
        lines = [LineString(coords(c)) for ls in pm.iter("{%s}LineString" % NS["k"]) for c in ls.iter("{%s}coordinates" % NS["k"])]
        polys = []
        for pg in pm.iter("{%s}Polygon" % NS["k"]):
            outer = coords(pg.find("k:outerBoundaryIs/k:LinearRing/k:coordinates", NS))
            inner = [coords(c) for c in pg.findall("k:innerBoundaryIs/k:LinearRing/k:coordinates", NS)]
            polys.append(Polygon(outer, inner))
        if lines:
            geom = lines[0] if len(lines) == 1 else MultiLineString(lines)
        elif polys:
            geom = polys[0] if len(polys) == 1 else MultiPolygon(polys)
        else:
            continue
        feats.append((attrs, geom))
    return feats


def project(geom, tr):
    return shapely.transform(geom, lambda xy: np.column_stack(tr.transform(xy[:, 0], xy[:, 1])))


# ---------------------------------------------------------------- caricamento
t0 = time.perf_counter()
righe = []  # (layer, attrs) allineato a geoms_utm
geoms_utm = []
raw_wgs = {}
for layer, fname in LAYER_LINEE.items():
    feats = parse_kml(MAPPE / fname)
    raw_wgs[layer] = feats
    for attrs, g in feats:
        righe.append((layer, attrs))
        geoms_utm.append(project(g, to_utm))
zone_feats = parse_kml(MAPPE / ZONE)
raw_wgs["acquaioli"] = zone_feats
zone_utm = [shapely.make_valid(project(g, to_utm)) for _, g in zone_feats]
t_parse = time.perf_counter() - t0

t1 = time.perf_counter()
tree_linee = shapely.STRtree(geoms_utm)
tree_zone = shapely.STRtree(zone_utm)
t_tree = time.perf_counter() - t1
print(f"Parse KML + proiezione UTM: {t_parse*1000:.0f} ms; STRtree: {t_tree*1000:.1f} ms")
print(f"Placemark linee: {len(geoms_utm)}; zone acquaiolo: {len(zone_utm)}")
n_ls = sum(shapely.get_num_geometries(g) for g in geoms_utm)
print(f"LineString totali: {n_ls}; vertici linee: {sum(shapely.get_num_coordinates(g) for g in geoms_utm)}")
print(f"Zone non valide prima di make_valid: {sum(not g.is_valid for _, g in zone_feats)}")


def nearest(lon, lat):
    x, y = to_utm.transform(lon, lat)
    p = Point(x, y)
    idx, dist = tree_linee.query_nearest(p, return_distance=True)
    i = int(idx[0])
    layer, a = righe[i]
    zi = tree_zone.query(p, predicate="within")
    zone = [zone_feats[int(j)][0] for j in zi]
    return {
        "layer": layer,
        "NOME": a.get("NOME"),
        "CODICE_CAN": a.get("CODICE_CAN"),
        "NOME_TIPO": a.get("NOME_TIPO"),
        "distanza_m": round(float(dist[0]), 1),
        "zone": [(z.get("NOME"), z.get("ZONA")) for z in zone],
    }


# ------------------------------------------------------------ punti di prova
# 1) un vertice reale di un canale spostato di ~30 m a nord (distanza attesa <= 30 m)
a0, g0 = raw_wgs["canale"][0]
lon0, lat0 = list(g0.geoms[0].coords if hasattr(g0, "geoms") else g0.coords)[0]
campioni = {
    f"vertice di '{a0.get('NOME')}' + 30 m N": (lon0, lat0 + 30 / 111_320),
    "Castiglione d/Stiviere, centro": (10.4870, 45.3905),
    "Lonato del Garda, centro": (10.4840, 45.4610),
    "Guidizzolo, centro": (10.5800, 45.3190),
    "Desenzano, lungolago": (10.5400, 45.4690),
    "Milano Duomo (fuori comprensorio)": (9.1900, 45.4642),
}
for nome, (lon, lat) in campioni.items():
    print(f"{nome}: {nearest(lon, lat)}")

# ------------------------------------------------------------ tempi di query
rng = np.random.default_rng(42)
allb = shapely.total_bounds(shapely.GeometryCollection(geoms_utm))
N = 10_000
xs = rng.uniform(allb[0], allb[2], N)
ys = rng.uniform(allb[1], allb[3], N)
pts = shapely.points(xs, ys)

t2 = time.perf_counter()
for k in range(1000):
    tree_linee.query_nearest(pts[k], return_distance=True)
    tree_zone.query(pts[k], predicate="within")
t_single = (time.perf_counter() - t2) / 1000
print(f"Query singola (nearest + zona): {t_single*1e6:.0f} us")

t3 = time.perf_counter()
lonlat = np.column_stack(to_wgs.transform(xs, ys))
t_proj = time.perf_counter()
_, dist_bbox = tree_linee.query_nearest(pts, return_distance=True, all_matches=False)
t_batch = time.perf_counter() - t_proj
print(f"Batch {N} punti nearest: {t_batch*1000:.0f} ms")


def pct(d):
    d = np.asarray(d)
    q = np.percentile(d, [10, 25, 50, 75, 90, 95])
    soglie = {s: float((d <= s).mean() * 100) for s in (10, 25, 50, 100, 200, 500)}
    return q.round(0).tolist(), {k: round(v, 1) for k, v in soglie.items()}


print(f"Bbox UTM linee: {allb.round(0).tolist()}  (~{(allb[2]-allb[0])/1000:.0f} x {(allb[3]-allb[1])/1000:.0f} km)")
print("Distanze punti casuali nel bbox -> tracciato (p10,p25,p50,p75,p90,p95) e % entro soglia:", pct(dist_bbox))

# punti casuali dentro l'unione delle zone acquaiolo (proxy del comprensorio)
unione = shapely.union_all(zone_utm)
print(f"Area zone acquaiolo (unione): {unione.area/1e6:.0f} km2")
inside = pts[shapely.contains(unione, pts)]
_, dist_in = tree_linee.query_nearest(inside, return_distance=True, all_matches=False)
print(f"Punti casuali dentro zone acquaiolo ({len(inside)}):", pct(dist_in))

# per layer: distanza da ciascun layer separatamente
for layer in LAYER_LINEE:
    sub = [g for (l, _), g in zip(righe, geoms_utm) if l == layer]
    t = shapely.STRtree(sub)
    _, d = t.query_nearest(inside, return_distance=True, all_matches=False)
    print(f"  solo {layer}:", pct(d))

# punti che cadono in >1 zona o in nessuna
cnt = np.array([len(tree_zone.query(p, predicate="within")) for p in inside[:3000]])
print(f"Zone per punto (campione 3000): 0={int((cnt==0).sum())} 1={int((cnt==1).sum())} >1={int((cnt>1).sum())}")
# punti vicini (<50 m) a un tracciato ma fuori da qualunque zona
near_pts = pts[dist_bbox <= 50]
fuori = sum(len(tree_zone.query(p, predicate="within")) == 0 for p in near_pts)
print(f"Punti entro 50 m da un tracciato ma fuori da ogni zona acquaiolo: {fuori}/{len(near_pts)}")
nomi_zone = sorted({(a.get('ZONA'), a.get('NOME')) for a, _ in zone_feats})
print("Zone:", nomi_zone)

# ------------------------------------------------------------ GeoJSON per Leaflet


def fc(feats, tol_m=None, decimals=None, props=None):
    out = []
    for a, g in feats:
        if tol_m:
            g = project(shapely.simplify(project(g, to_utm), tol_m, preserve_topology=True), to_wgs)
        gj = json.loads(shapely.to_geojson(g))
        if decimals is not None:
            gj["coordinates"] = _round(gj["coordinates"], decimals)
        p = a if props is None else {k: a.get(k) for k in props}
        out.append({"type": "Feature", "properties": p, "geometry": gj})
    return json.dumps({"type": "FeatureCollection", "features": out}, separators=(",", ":")).encode()


def _round(c, d):
    if isinstance(c[0], (int, float)):
        return [round(c[0], d), round(c[1], d)]
    return [_round(x, d) for x in c]


PROPS = ["NOME", "CODICE_CAN", "NOME_TIPO", "FUNZIONE"]
print("\nGeoJSON (KB): raw | raw gzip | 5 m + 6 decimali + 4 attributi | idem gzip")
for layer, feats in raw_wgs.items():
    props = ["NOME", "ZONA"] if layer == "acquaioli" else PROPS
    raw = fc(feats)
    s = fc(feats, tol_m=5, decimals=6, props=props)
    print(f"  {layer:10s} {len(raw)/1024:8.0f} {len(gzip.compress(raw))/1024:8.0f} {len(s)/1024:8.0f} {len(gzip.compress(s))/1024:8.0f}")
