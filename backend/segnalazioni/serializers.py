from rest_framework import serializers

from .models import Evento, Segnalazione


class SegnalazioneCreateSerializer(serializers.ModelSerializer):
    foto = serializers.ImageField(write_only=True, required=True)

    class Meta:
        model = Segnalazione
        fields = [
            "lat",
            "lng",
            "foto",
            "descrizione",
            "cellulare",
            "transcript_ai",
            "categoria",
            "durata",
            "quantita_acqua",
            "pericolo_persone",
            "pericolo_strada",
            "pericolo_edifici",
            "estratti_confidenza",
        ]
        extra_kwargs = {
            "transcript_ai": {"required": False, "allow_blank": True},
            "categoria": {"required": False, "allow_blank": True},
            "durata": {"required": False, "allow_blank": True},
            "quantita_acqua": {"required": False, "allow_blank": True},
            "pericolo_persone": {"required": False, "allow_blank": True},
            "pericolo_strada": {"required": False, "allow_blank": True},
            "pericolo_edifici": {"required": False, "allow_blank": True},
            "estratti_confidenza": {"required": False},
        }


class SegnalazioneListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Segnalazione
        fields = [
            "id",
            "codice_pratica",
            "stato_corrente",
            "priorita",
            "lat",
            "lng",
            "created_at",
            "categoria",
            "is_duplicato",
        ]


class SegnalazioneStatoSerializer(serializers.ModelSerializer):
    """Pagina di stato: lo Stato più un riassunto per riconoscere la Segnalazione.

    Chi ha il token vede anche le foto: nginx serve /media/ senza JWT. Cellulare e
    descrizione restano fuori.
    """

    foto = serializers.SerializerMethodField()
    timeline = serializers.SerializerMethodField()

    class Meta:
        model = Segnalazione
        fields = [
            "codice_pratica",
            "created_at",
            "foto",
            "categoria",
            "comune",
            "nome_completo_tracciato",
            "stato_corrente",
            "is_duplicato",
            "messaggio_al_segnalante",
            "timeline",
        ]

    def get_foto(self, obj):
        # Percorsi relativi (/media/...), come nella scheda del Portale operatore.
        return [f.immagine.url for f in obj.foto.all()]

    def get_timeline(self, obj):
        return [
            {"stato": evento.stato, "data": evento.created_at}
            for evento in obj.timeline.all().order_by("-created_at")
        ]


class EventoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evento
        fields = ["id", "stato", "nota", "created_at"]


class DuplicatoCollegatoSerializer(serializers.ModelSerializer):
    foto = serializers.SerializerMethodField()

    class Meta:
        model = Segnalazione
        fields = ["id", "codice_pratica", "cellulare", "foto", "created_at"]

    def get_foto(self, obj):
        # Percorsi relativi (/media/...): stessa origine del frontend. Un URL assoluto
        # costruito dietro Nginx e il proxy HTTPS perde la porta e lo schema giusti.
        return [f.immagine.url for f in obj.foto.all()]


class OperatoreRiferimentoSerializer(serializers.ModelSerializer):
    nome_completo = serializers.SerializerMethodField()

    class Meta:
        model = Segnalazione.operatore_riferimento.field.related_model
        fields = ["id", "nome_completo"]

    def get_nome_completo(self, obj):
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username


class SegnalazioneDetailSerializer(serializers.ModelSerializer):
    registro = EventoSerializer(source="timeline", many=True, read_only=True)
    foto = serializers.SerializerMethodField()
    duplicati = DuplicatoCollegatoSerializer(many=True, read_only=True)
    operatore_riferimento = OperatoreRiferimentoSerializer(read_only=True)

    class Meta:
        model = Segnalazione
        fields = [
            "id",
            "codice_pratica",
            "stato_corrente",
            "esito",
            "priorita",
            "priorita_calcolata",
            "override_motivazione",
            "created_at",
            "lat",
            "lng",
            "lat_originale",
            "lng_originale",
            "descrizione",
            "cellulare",
            "transcript_ai",
            "foto",
            "categoria",
            "categoria_originale",
            "durata",
            "quantita_acqua",
            "pericolo_persone",
            "pericolo_strada",
            "pericolo_edifici",
            "estratti_confidenza",
            "layer",
            "nome_tracciato",
            "nome_completo_tracciato",
            "tipo_tracciato",
            "distanza_m",
            "zona_id",
            "acquaiolo_competente_id",
            "operatore_riferimento",
            "is_duplicato",
            "duplicato_di",
            "duplicati",
            "registro",
            "messaggio_al_segnalante",
        ]

    def get_foto(self, obj):
        # Percorsi relativi (/media/...): stessa origine del frontend. Un URL assoluto
        # costruito dietro Nginx e il proxy HTTPS perde la porta e lo schema giusti.
        return [f.immagine.url for f in obj.foto.all()]


class SegnalazioneUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Segnalazione
        fields = ["lat", "lng", "categoria", "priorita", "acquaiolo_competente_id"]
