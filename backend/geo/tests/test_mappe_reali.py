"""Controllo del perimetro sui KML veri di `mappe/`.

I valori attesi vengono dalle misure della ricerca Stack geo (`research/stack-geo.md`).
"""

import pytest

from geo import services

CASTIGLIONE = (45.3905, 10.4870)
GUIDIZZOLO = (45.3190, 10.5800)
MILANO = (45.4642, 9.1900)


def test_castiglione_e_sul_reticolo_principale_in_zona_non_servita():
    risultato = services.check_perimetro(*CASTIGLIONE)

    assert risultato.accettato
    assert risultato.tracciato.layer == "reticolo_principale"
    assert risultato.tracciato.nome == "GOZZOLINA E RIALE"
    assert risultato.distanza_m == pytest.approx(83.4, abs=0.5)
    assert not risultato.zona.servita
    assert risultato.zona.nome == "Alto Mantovano"
    assert risultato.acquaiolo_suggerito is None


def test_guidizzolo_e_nella_zona_di_brignani():
    zona = services.zona_acquaiolo(*GUIDIZZOLO)

    assert zona.acquaiolo == "BRIGNANI"
    assert zona.nome == "Alto Mantovano"


def test_milano_e_fuori_perimetro():
    risultato = services.check_perimetro(*MILANO)

    assert not risultato.accettato
    assert risultato.distanza_m > 90_000
