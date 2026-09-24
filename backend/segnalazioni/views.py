from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from .models import Segnalazione, Foto, Evento
from .serializers import SegnalazioneCreateSerializer, SegnalazioneStatoSerializer
from geo.services import check_perimetro
from estrazione.services import estrai_da_testo
from .priority import calcola_priorita

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
            
        # 2. Estrazione dati (testo o transcript_ai)
        testo = data.get('transcript_ai') or data['descrizione']
        estratti = estrai_da_testo(testo)
        
        # 3. Calcolo priorità
        priorita = calcola_priorita(
            categoria=estratti.get("categoria", ""),
            pericolo_persone=estratti.get("pericolo_persone", False),
            pericolo_strada=estratti.get("pericolo_strada", False),
            pericolo_case=estratti.get("pericolo_case", False),
            quantita_acqua=estratti.get("quantita_acqua", "")
        )
        
        pericolo_immediato = priorita == "critica" or any([
            estratti.get("pericolo_persone", False),
            estratti.get("pericolo_strada", False),
            estratti.get("pericolo_case", False)
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
            **{k: v for k, v in estratti.items() if k in [
                'categoria', 'durata', 'quantita_acqua', 
                'pericolo_persone', 'pericolo_strada', 'pericolo_case', 'estratti_confidenza'
            ]},
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
