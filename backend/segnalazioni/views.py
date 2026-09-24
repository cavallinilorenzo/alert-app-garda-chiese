from rest_framework import generics, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from geo.services import check_perimetro

from .models import Evento, Foto, Segnalazione
from .priority import calcola_priorita
from .serializers import SegnalazioneCreateSerializer, SegnalazioneStatoSerializer


class SegnalazioneCreateView(generics.CreateAPIView):
    parser_classes = (MultiPartParser, FormParser)
    serializer_class = SegnalazioneCreateSerializer
    authentication_classes = [] # Public endpoint
    permission_classes = []

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        lat = data['lat']
        lng = data['lng']
        
        # 1. Controlla perimetro
        geo_data = check_perimetro(lat, lng)
        if not geo_data.accettato:
            return Response({
                "code": "fuori_perimetro",
                "message": geo_data.messaggio,
                "fields": {}
            }, status=status.HTTP_400_BAD_REQUEST)
            
        # 3. Calcolo priorità
        priorita = calcola_priorita(
            categoria=data.get("categoria", ""),
            pericolo_persone=data.get("pericolo_persone", ""),
            pericolo_strada=data.get("pericolo_strada", ""),
            pericolo_edifici=data.get("pericolo_edifici", ""),
            quantita_acqua=data.get("quantita_acqua", "")
        )
        
        pericolo_immediato = priorita == "critica" or any([
            data.get("pericolo_persone") == "si",
            data.get("pericolo_strada") == "si",
            data.get("pericolo_edifici") == "si"
        ])
        
        # 4. Creazione Segnalazione
        segnalazione = Segnalazione(
            lat=lat,
            lng=lng,
            descrizione=data['descrizione'],
            cellulare=data['cellulare'],
            transcript_ai=data.get('transcript_ai', ''),
            priorita=priorita,
            priorita_calcolata=priorita,
            categoria=data.get('categoria', ''),
            durata=data.get('durata', ''),
            quantita_acqua=data.get('quantita_acqua', ''),
            pericolo_persone=data.get('pericolo_persone', ''),
            pericolo_strada=data.get('pericolo_strada', ''),
            pericolo_edifici=data.get('pericolo_edifici', ''),
            estratti_confidenza=data.get('estratti_confidenza', {}),
            layer=geo_data.tracciato.layer if geo_data.tracciato else None,
            id_placemark=geo_data.tracciato.id_placemark if geo_data.tracciato else None,
            nome_tracciato=geo_data.tracciato.nome if geo_data.tracciato else "",
            nome_completo_tracciato=geo_data.tracciato.nome_completo if geo_data.tracciato else "",
            tipo_tracciato=geo_data.tracciato.tipo if geo_data.tracciato else "",
            distanza_m=geo_data.distanza_m,
            zona_id=geo_data.zona.id if geo_data.zona else None,
            acquaiolo_competente_id=None  # Da implementare quando si ha la rubrica acquaioli
        )
        segnalazione.save()
        
        # 5. Salva foto
        foto = data.pop('foto')
        Foto.objects.create(segnalazione=segnalazione, immagine=foto)
        
        # 6. Evento iniziale
        Evento.objects.create(segnalazione=segnalazione, stato=Segnalazione.Stato.RICEVUTA)
        
        return Response({
            "id": segnalazione.id,
            "codice_pratica": segnalazione.codice_pratica,
            "token_stato": str(segnalazione.token_stato),
            "priorita": segnalazione.priorita,
            "pericolo_immediato": pericolo_immediato
        }, status=status.HTTP_201_CREATED)

class SegnalazioneStatoView(generics.RetrieveAPIView):
    authentication_classes = []
    permission_classes = []
    serializer_class = SegnalazioneStatoSerializer
    lookup_field = 'token_stato'
    lookup_url_kwarg = 'token'
    queryset = Segnalazione.objects.all()
