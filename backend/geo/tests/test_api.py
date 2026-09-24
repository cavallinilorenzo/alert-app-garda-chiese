"""Endpoint di `geo` sui KML veri, senza autenticazione (li usa l'App di segnalazione)."""

import pytest

URL_CHECK = "/api/perimetro/check"


def test_check_di_un_punto_sul_reticolo(client_contratto):
    response = client_contratto.post(URL_CHECK, {"lat": 45.3905, "lng": 10.4870}, format="json")

    assert response.status_code == 200
    body = response.json()
    assert body["accettato"] is True
    assert body["distanza_m"] == pytest.approx(83.4, abs=0.5)
    assert body["zona_id"] == 21
    assert body["messaggio"]


def test_check_di_un_punto_fuori_perimetro(client_contratto):
    response = client_contratto.post(URL_CHECK, {"lat": 45.4642, "lng": 9.19}, format="json")

    assert response.status_code == 200
    body = response.json()
    assert body["accettato"] is False
    assert "zona_id" not in body
    assert body["messaggio"].startswith("La posizione non risulta sul reticolo consortile.")


@pytest.mark.parametrize(
    "dati, campo",
    [({"lat": 45.39}, "lng"), ({"lat": 95, "lng": 10.48}, "lat"), ({"lat": "x", "lng": 1}, "lat")],
)
def test_check_con_dati_non_validi(client_contratto, dati, campo):
    response = client_contratto.post(URL_CHECK, dati, format="json")

    assert response.status_code == 400
    body = response.json()
    assert body["code"] == "dati_non_validi"
    assert body["message"]
    assert campo in body["fields"]


@pytest.mark.parametrize(
    "layer, n_feature",
    [("canale", 237), ("condotta", 38), ("reticolo_principale", 27), ("zona_acquaiolo", 24)],
)
def test_layer_geojson(client, layer, n_feature):
    response = client.get(f"/api/layer/{layer}.geojson")

    assert response.status_code == 200
    assert response["Content-Type"] == "application/geo+json"
    assert "max-age" in response["Cache-Control"]
    body = response.json()
    assert body["type"] == "FeatureCollection"
    assert len(body["features"]) == n_feature


def test_layer_geojson_di_un_tracciato(client):
    feature = client.get("/api/layer/canale.geojson").json()["features"][0]

    assert feature["id"] == "RIB_Canali_2026.1"
    assert set(feature["properties"]) == {"nome", "nome_completo", "tipo", "codice"}
    coordinate = feature["geometry"]["coordinates"]
    while isinstance(coordinate[0], list):
        coordinate = coordinate[0]
    lon, lat = coordinate
    assert round(lon, 6) == lon and round(lat, 6) == lat


def test_layer_geojson_di_una_zona_non_servita(client):
    feature = client.get("/api/layer/zona_acquaiolo.geojson").json()["features"][1]

    assert feature["id"] == 2
    assert feature["properties"] == {"nome": "Colli Morenici", "servita": False, "acquaiolo": None}


def test_layer_sconosciuto(client):
    assert client.get("/api/layer/acquedotto.geojson").status_code == 404
