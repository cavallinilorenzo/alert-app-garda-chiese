def calcola_priorita(
    categoria: str,
    pericolo_persone: str,
    pericolo_strada: str,
    pericolo_edifici: str,
    quantita_acqua: str,
) -> str:
    """
    Calcola la priorita (bassa, media, alta, critica) basata sui criteri #8.
    """
    if pericolo_persone == "si" or pericolo_strada == "si" or pericolo_edifici == "si":
        return "critica"
    
    cat_alta = [
        "tracimazione/allagamento",
        "argine o sponda danneggiata/franata",
        "paratoia o impianto danneggiato"
    ]
    if categoria in cat_alta or quantita_acqua == "molta acqua":
        return "alta"
    
    cat_media = ["acqua che affiora/perdita", "ostruzione/accumulo"]
    if categoria in cat_media or quantita_acqua == "piccolo flusso":
        return "media"
    
    return "bassa"
