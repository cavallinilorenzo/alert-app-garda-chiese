from rest_framework import serializers

from .models import Segnalazione


class SegnalazioneCreateSerializer(serializers.ModelSerializer):
    foto = serializers.ImageField(write_only=True, required=True)
    
    class Meta:
        model = Segnalazione
        fields = ['lat', 'lng', 'foto', 'descrizione', 'cellulare', 'transcript_ai']
        extra_kwargs = {
            'transcript_ai': {'required': False, 'allow_blank': True}
        }

class SegnalazioneStatoSerializer(serializers.ModelSerializer):
    timeline = serializers.SerializerMethodField()
    
    class Meta:
        model = Segnalazione
        fields = ['stato_corrente', 'is_duplicato', 'messaggio_al_segnalante', 'timeline']
        
    def get_timeline(self, obj):
        return [
            {
                "stato": evento.stato,
                "data": evento.created_at
            } for evento in obj.timeline.all().order_by('-created_at')
        ]
