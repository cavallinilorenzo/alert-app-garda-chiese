def estrai_da_testo(testo: str) -> dict:
    # Fake per test
    return {
        "transcript_ai": testo,
        "categoria": "tracimazione/allagamento",
        "durata": "da ieri",
        "quantita_acqua": "molta acqua",
        "pericolo_persone": False,
        "pericolo_strada": False,
        "pericolo_case": False,
        "estratti_confidenza": {
            "categoria": 0.9,
            "quantita_acqua": 0.8
        }
    }
