def calcola_priorita(
    categoria: str,
    pericolo_persone: str,
    pericolo_strada: str,
    pericolo_edifici: str,
    quantita_acqua: str,
) -> str:
    """
    Calcola la priorita (bassa, media, alta, critica) basata sui criteri #8.

    Confronta i valori degli enum di `api/openapi.yaml`, non le etichette mostrate.
    """
    if pericolo_persone == "si" or pericolo_strada == "si" or pericolo_edifici == "si":
        return "critica"

    cat_alta = ["canale_che_tracima", "argine_danneggiato", "paratoia_danneggiata"]
    if categoria in cat_alta or quantita_acqua == "molta_acqua":
        return "alta"

    cat_media = ["acqua_che_affiora", "ostruzione"]
    if categoria in cat_media or quantita_acqua == "piccolo_flusso":
        return "media"

    return "bassa"
