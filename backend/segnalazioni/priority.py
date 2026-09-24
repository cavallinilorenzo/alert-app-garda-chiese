def calcola_priorita(
    categoria: str,
    pericolo_persone: str,
    pericolo_strada: str,
    pericolo_edifici: str,
    quantita_acqua: str,
) -> str:
    """
    Calcola la priorita (bassa, media, alta, critica) basata sui criteri #8.

    Confronta i valori degli enum di `api/openapi.yaml`, non le etichette mostrate, con
    le priorità della Revisione delle opzioni (#100). La durata non conta.
    """
    if pericolo_persone == "si" or pericolo_strada == "si" or pericolo_edifici == "si":
        return "critica"

    cat_alta = ["canale_che_tracima", "argine_danneggiato", "paratoia_danneggiata"]
    if categoria in cat_alta or quantita_acqua in ["molta_acqua", "getto"]:
        return "alta"

    cat_media = ["acqua_che_affiora", "perdita_dal_canale", "ostruzione", "canale_asciutto"]
    if categoria in cat_media or quantita_acqua == "piccolo_flusso":
        return "media"

    return "bassa"
