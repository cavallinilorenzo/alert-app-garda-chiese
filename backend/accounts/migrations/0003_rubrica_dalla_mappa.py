"""Rubrica acquaioli presa dalla mappa (ticket #95).

Svuota la Rubrica e la riempie con un Acquaiolo per ogni Zona acquaiolo servita di
`mappe/acquaioli_2026.kml`: cognome e zona (id del placemark) vengono dal KML, nome di
battesimo e telefono sono inventati per la demo. Le zone 2 e 21 non sono servite.
Le segnalazioni già ricevute prendono come acquaiolo competente quello della loro zona.
"""

from django.db import migrations

# (zona_id, nome, telefono)
RUBRICA = [
    (1, "Sorio Davide", "+39 347 5128834"),
    (3, "Cauzzi Marco", "+39 338 2940157"),
    (4, "Haliuc Andrei", "+39 351 7736209"),
    (4, "Gorrieri Mattia", "+39 340 6613582"),
    (5, "Moreschi Luca", "+39 333 9087341"),
    (6, "Buzzago Giovanni", "+39 349 2251690"),
    (7, "Pegoraro Giorgio", "+39 328 4470915"),
    (8, "Cerini Stefano", "+39 345 8316627"),
    (9, "Tonelli Alberto", "+39 339 1573348"),
    (10, "Viapiana Roberto", "+39 366 2084471"),
    (11, "Peverada Franco", "+39 348 6925103"),
    (12, "Negrisoli Massimo", "+39 335 7741286"),
    (13, "Tia Claudio", "+39 320 3398752"),
    (14, "Belduvini Enrico", "+39 342 9150637"),
    (15, "Bertani Fabio", "+39 331 4862019"),
    (16, "Marchini Walter", "+39 347 0376594"),
    (17, "Bignotti Sergio", "+39 393 5527148"),
    (18, "Gabusi Mauro", "+39 329 8814063"),
    (19, "Pegoraro Luigi", "+39 346 1209875"),
    (20, "Brignani Antonio", "+39 334 6658210"),
    (22, "Guidetti Paolo", "+39 380 7193426"),
    (23, "Martelli Simone", "+39 337 2405981"),
    (24, "Martelli Simone", "+39 337 2405981"),
]


def carica(apps, schema_editor):
    Acquaiolo = apps.get_model("accounts", "Acquaiolo")
    Segnalazione = apps.get_model("segnalazioni", "Segnalazione")

    Acquaiolo.objects.all().delete()
    di_zona = {}
    for zona_id, nome, telefono in RUBRICA:
        a = Acquaiolo.objects.create(nome=nome, telefono=telefono, zona_id=zona_id)
        di_zona.setdefault(zona_id, a.id)

    # gli id della vecchia Rubrica non esistono più
    for s in Segnalazione.objects.all():
        s.acquaiolo_competente_id = di_zona.get(s.zona_id)
        s.save(update_fields=["acquaiolo_competente_id"])


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0002_alter_acquaiolo_zona_id"),
        ("segnalazioni", "0003_segnalazione_categoria_originale_and_more"),
    ]

    operations = [migrations.RunPython(carica, migrations.RunPython.noop)]
