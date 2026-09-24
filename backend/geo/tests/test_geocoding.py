"""Indirizzo leggibile da Nominatim, con un trasporto HTTP finto."""

import json
from urllib.error import URLError

import pytest

from contratti import GeocodingNonDisponibile, Indirizzo
from geo.geocoding import Nominatim


def risponde(body):
    def apri(url, timeout):
        apri.url = url
        return json.dumps(body).encode()

    return apri


def test_indirizzo_con_via_e_comune():
    apri = risponde(
        {
            "display_name": "5, Via Roma, Castiglione delle Stiviere, Mantova, Lombardia, Italia",
            "address": {
                "house_number": "5",
                "road": "Via Roma",
                "town": "Castiglione delle Stiviere",
            },
        }
    )

    indirizzo = Nominatim(apri).reverse_geocode(45.3905, 10.487)

    assert indirizzo == Indirizzo(
        testo="Via Roma 5, Castiglione delle Stiviere", comune="Castiglione delle Stiviere"
    )
    assert "lat=45.3905" in apri.url and "lon=10.487" in apri.url


def test_senza_via_usa_il_nome_completo():
    apri = risponde(
        {
            "display_name": "Guidizzolo, Mantova, Lombardia, Italia",
            "address": {"village": "Guidizzolo"},
        }
    )

    indirizzo = Nominatim(apri).reverse_geocode(45.319, 10.58)

    assert indirizzo == Indirizzo(
        testo="Guidizzolo, Mantova, Lombardia, Italia", comune="Guidizzolo"
    )


def test_nessun_indirizzo():
    apri = risponde({"error": "Unable to geocode"})

    assert Nominatim(apri).reverse_geocode(0, 0) is None


def test_nominatim_irraggiungibile():
    def apri(url, timeout):
        raise URLError("timeout")

    with pytest.raises(GeocodingNonDisponibile) as errore:
        Nominatim(apri).reverse_geocode(45.3905, 10.487)
    assert errore.value.code == "geocoding_non_disponibile"
