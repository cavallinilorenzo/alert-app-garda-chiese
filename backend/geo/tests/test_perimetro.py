import pytest
from pyproj import Geod

from contratti import ZonaAcquaiolo

from .conftest import LAT_CENTRO, LON_CANALE

WGS84 = Geod(ellps="WGS84")


def a_est_del_canale(metri):
    """Punto a `metri` (geodetici) a est del Canale sintetico."""
    lon, lat, _ = WGS84.fwd(LON_CANALE, LAT_CENTRO, 90, metri)
    return lat, lon


def test_punto_entro_la_soglia_e_accettato(geo):
    lat, lon = a_est_del_canale(295)

    risultato = geo.check_perimetro(lat, lon)

    assert risultato.accettato
    assert risultato.distanza_m == pytest.approx(295, abs=1)
    assert risultato.tracciato.layer == "canale"
    assert risultato.tracciato.id_placemark == "RIB_Canali_2026.7"
    assert risultato.tracciato.nome == "ARNO'"
    assert risultato.tracciato.nome_completo == "ARNO' o CANALE ALTO MANTOVANO"
    assert risultato.tracciato.tipo == "Canale"
    assert risultato.tracciato.codice == "2126"


def test_punto_oltre_la_soglia_e_fuori_perimetro(geo):
    lat, lon = a_est_del_canale(305)

    risultato = geo.check_perimetro(lat, lon)

    assert not risultato.accettato
    assert risultato.tracciato is None
    assert risultato.distanza_m == pytest.approx(305, abs=1)
    assert risultato.acquaiolo_suggerito is None
    assert risultato.messaggio == (
        "La posizione non risulta sul reticolo consortile. "
        "Controlla il pin o contatta il Consorzio di bonifica Garda Chiese."
    )


def test_punto_accettato_suggerisce_l_acquaiolo_della_zona(geo):
    lat, lon = a_est_del_canale(-100)

    risultato = geo.check_perimetro(lat, lon)

    assert risultato.accettato
    assert risultato.zona == ZonaAcquaiolo(
        id=3, nome="Colli Morenici", servita=True, acquaiolo="CAUZZI"
    )
    assert risultato.acquaiolo_suggerito == "CAUZZI"


def test_zona_non_servita_e_accettata_senza_acquaiolo(geo):
    lat, lon = a_est_del_canale(100)

    risultato = geo.check_perimetro(lat, lon)

    assert risultato.accettato
    assert risultato.zona == ZonaAcquaiolo(
        id=21, nome="Alto Mantovano", servita=False, acquaiolo=None
    )
    assert risultato.acquaiolo_suggerito is None


def test_punto_fuori_da_ogni_zona_non_ha_zona(geo):
    assert geo.zona_acquaiolo(45.42, 10.7) is None


@pytest.mark.parametrize("lat, lon", [(90.1, 10.5), (-90.1, 10.5), (45.4, 180.1), (45.4, -180.1)])
def test_coordinate_fuori_dal_range_wgs84_sono_rifiutate(geo, lat, lon):
    with pytest.raises(ValueError):
        geo.check_perimetro(lat, lon)
    with pytest.raises(ValueError):
        geo.zona_acquaiolo(lat, lon)
