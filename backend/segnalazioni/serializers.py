from rest_framework import serializers

from .models import Segnalazione, Evento


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
    timeline = serializers.SerializerMethodField()

    class Meta:
        model = Segnalazione
        fields = ["stato_corrente", "is_duplicato", "messaggio_al_segnalante", "timeline"]

    def get_timeline(self, obj):
        return [
            {"stato": evento.stato, "data": evento.created_at}
            for evento in obj.timeline.all().order_by("-created_at")
        ]


class EventoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evento
        fields = ['id', 'stato', 'nota', 'created_at']

class SegnalazioneDetailSerializer(serializers.ModelSerializer):
    registro = EventoSerializer(source='timeline', many=True, read_only=True)
    class Meta:
        model = Segnalazione
        fields = [
            'id', 'codice_pratica', 'stato_corrente', 'priorita', 'lat', 'lng', 
            'descrizione', 'cellulare', 'categoria', 'is_duplicato', 'registro',
            'messaggio_al_segnalante'
        ]



class SegnalazioneUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Segnalazione
        fields = ['lat', 'lng', 'categoria', 'priorita', 'acquaiolo_competente_id']

