"""KML sintetici: un Canale dritto nord-sud e due Zone acquaiolo affiancate.

Il Canale corre lungo il meridiano 10.5 tra le latitudini 45.40 e 45.44. La
zona a ovest del meridiano è di un Acquaiolo, quella a est è `NON SERVITA`.
"""

import pytest

from geo.services import GeoKML

LON_CANALE = 10.5
LAT_CENTRO = 45.42

KML = """<?xml version="1.0" encoding="utf-8" ?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document><Folder>{}</Folder></Document></kml>
"""

CANALE = """
<Placemark id="RIB_Canali_2026.7">
  <ExtendedData><SchemaData schemaUrl="#RIB_Canali_2026">
    <SimpleData name="CODICE_CAN">2126</SimpleData>
    <SimpleData name="NOME">ARNO'</SimpleData>
    <SimpleData name="NOME_COMPL">ARNO' o CANALE ALTO MANTOVANO</SimpleData>
    <SimpleData name="NOME_TIPO">Canale</SimpleData>
  </SchemaData></ExtendedData>
  <LineString><coordinates>10.5,45.40 10.5,45.44</coordinates></LineString>
</Placemark>
"""

ZONE = """
<Placemark id="acquaioli_2026.3">
  <ExtendedData><SchemaData schemaUrl="#acquaioli_2026">
    <SimpleData name="ID">0</SimpleData>
    <SimpleData name="NOME">CAUZZI</SimpleData>
    <SimpleData name="ZONA">Colli Morenici</SimpleData>
  </SchemaData></ExtendedData>
  <Polygon><outerBoundaryIs><LinearRing><coordinates>
    10.45,45.39 10.5,45.39 10.5,45.45 10.45,45.45 10.45,45.39
  </coordinates></LinearRing></outerBoundaryIs></Polygon>
</Placemark>
<Placemark id="acquaioli_2026.21">
  <ExtendedData><SchemaData schemaUrl="#acquaioli_2026">
    <SimpleData name="ID">0</SimpleData>
    <SimpleData name="NOME">NON SERVITA</SimpleData>
    <SimpleData name="ZONA">Alto Mantovano</SimpleData>
  </SchemaData></ExtendedData>
  <Polygon><outerBoundaryIs><LinearRing><coordinates>
    10.5,45.39 10.55,45.39 10.55,45.45 10.5,45.45 10.5,45.39
  </coordinates></LinearRing></outerBoundaryIs></Polygon>
</Placemark>
"""


@pytest.fixture
def cartella_mappe(tmp_path):
    (tmp_path / "RIB_Canali_2026.kml").write_text(KML.format(CANALE))
    (tmp_path / "RIB_Condotte_2026.kml").write_text(KML.format(""))
    (tmp_path / "RIP_2026.kml").write_text(KML.format(""))
    (tmp_path / "acquaioli_2026.kml").write_text(KML.format(ZONE))
    return tmp_path


@pytest.fixture
def geo(cartella_mappe):
    return GeoKML.da_cartella(cartella_mappe)
