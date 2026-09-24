from django.db.models import Case, IntegerField, Value, When
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from geo.services import check_perimetro

from .models import Evento, Foto, Segnalazione
from .priority import calcola_priorita
from .serializers import (
    SegnalazioneCreateSerializer,
    SegnalazioneDetailSerializer,
    SegnalazioneListSerializer,
    SegnalazioneStatoSerializer,
    SegnalazioneUpdateSerializer,
)


class PortalePagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response({"items": data, "total": self.page.paginator.count})


class SegnalazioneListCreateView(generics.ListCreateAPIView):
    pagination_class = PortalePagination

    def get_permissions(self):
        if self.request.method == "POST":
            return []
        return [IsAuthenticated()]

    def get_authenticators(self):
        if self.request.method == "POST":
            return []
        return super().get_authenticators()

    def get_serializer_class(self):
        if self.request.method == "POST":
            return SegnalazioneCreateSerializer
        return SegnalazioneListSerializer

    def get_parsers(self):
        if self.request.method == "POST":
            return [MultiPartParser(), FormParser()]
        return super().get_parsers()

    def get_queryset(self):
        qs = Segnalazione.objects.annotate(
            priorita_order=Case(
                When(priorita="critica", then=Value(1)),
                When(priorita="alta", then=Value(2)),
                When(priorita="media", then=Value(3)),
                When(priorita="bassa", then=Value(4)),
                default=Value(5),
                output_field=IntegerField(),
            )
        )

        stato = self.request.query_params.get("stato_corrente")
        if stato:
            qs = qs.filter(stato_corrente=stato)

        return qs.order_by("priorita_order", "-created_at")

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        lat = data["lat"]
        lng = data["lng"]

        # 1. Controlla perimetro
        geo_data = check_perimetro(lat, lng)
        if not geo_data.accettato:
            return Response(
                {"code": "fuori_perimetro", "message": geo_data.messaggio, "fields": {}},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 3. Calcolo priorità
        priorita = calcola_priorita(
            categoria=data.get("categoria", ""),
            pericolo_persone=data.get("pericolo_persone", ""),
            pericolo_strada=data.get("pericolo_strada", ""),
            pericolo_edifici=data.get("pericolo_edifici", ""),
            quantita_acqua=data.get("quantita_acqua", ""),
        )

        pericolo_immediato = priorita == "critica" or any(
            [
                data.get("pericolo_persone") == "si",
                data.get("pericolo_strada") == "si",
                data.get("pericolo_edifici") == "si",
            ]
        )

        # 4. Creazione Segnalazione
        segnalazione = Segnalazione(
            lat=lat,
            lng=lng,
            descrizione=data["descrizione"],
            cellulare=data["cellulare"],
            transcript_ai=data.get("transcript_ai", ""),
            priorita=priorita,
            priorita_calcolata=priorita,
            categoria=data.get("categoria", ""),
            durata=data.get("durata", ""),
            quantita_acqua=data.get("quantita_acqua", ""),
            pericolo_persone=data.get("pericolo_persone", ""),
            pericolo_strada=data.get("pericolo_strada", ""),
            pericolo_edifici=data.get("pericolo_edifici", ""),
            estratti_confidenza=data.get("estratti_confidenza", {}),
            layer=geo_data.tracciato.layer if geo_data.tracciato else None,
            id_placemark=geo_data.tracciato.id_placemark if geo_data.tracciato else None,
            nome_tracciato=geo_data.tracciato.nome if geo_data.tracciato else "",
            nome_completo_tracciato=geo_data.tracciato.nome_completo if geo_data.tracciato else "",
            tipo_tracciato=geo_data.tracciato.tipo if geo_data.tracciato else "",
            distanza_m=geo_data.distanza_m,
            zona_id=geo_data.zona.id if geo_data.zona else None,
            acquaiolo_competente_id=None,  # Da implementare quando si ha la rubrica acquaioli
        )
        segnalazione.save()

        # 5. Salva foto
        foto = data.pop("foto")
        Foto.objects.create(segnalazione=segnalazione, immagine=foto)

        # 6. Evento iniziale
        Evento.objects.create(segnalazione=segnalazione, stato=Segnalazione.Stato.RICEVUTA)

        return Response(
            {
                "id": segnalazione.id,
                "codice_pratica": segnalazione.codice_pratica,
                "token_stato": str(segnalazione.token_stato),
                "priorita": segnalazione.priorita,
                "pericolo_immediato": pericolo_immediato,
            },
            status=status.HTTP_201_CREATED,
        )


class SegnalazioneStatoView(generics.RetrieveAPIView):
    authentication_classes = []
    permission_classes = []
    serializer_class = SegnalazioneStatoSerializer
    lookup_field = "token_stato"
    lookup_url_kwarg = "token"
    queryset = Segnalazione.objects.all()


class SegnalazioneDetailView(generics.RetrieveUpdateAPIView):
    queryset = Segnalazione.objects.all()

    def get_serializer_class(self):
        if self.request.method in ["PUT", "PATCH"]:
            return SegnalazioneUpdateSerializer
        return SegnalazioneDetailSerializer

    def perform_update(self, serializer):
        instance = self.get_object()
        data = serializer.validated_data

        campi_modificati = []

        # Gestione lat/lng
        new_lat = data.get("lat")
        new_lng = data.get("lng")
        if (new_lat and new_lat != instance.lat) or (new_lng and new_lng != instance.lng):
            if instance.lat_originale is None:
                instance.lat_originale = instance.lat
                instance.lng_originale = instance.lng

            geo_data = check_perimetro(new_lat or instance.lat, new_lng or instance.lng)
            instance.layer = geo_data.tracciato.layer if geo_data.tracciato else None
            instance.id_placemark = geo_data.tracciato.id_placemark if geo_data.tracciato else ""
            instance.nome_tracciato = geo_data.tracciato.nome if geo_data.tracciato else ""
            instance.distanza_m = geo_data.distanza_m
            instance.zona_id = geo_data.zona.id if geo_data.zona else None

            # Non sovrascrivere l'acquaiolo se giA  assegnato
            if not instance.acquaiolo_competente_id and geo_data.zona:
                instance.acquaiolo_competente_id = geo_data.zona.id  # o l'ID dell'acquaiolo

            campi_modificati.append("posizione")

        new_cat = data.get("categoria")
        if new_cat and new_cat != instance.categoria:
            if not instance.categoria_originale:
                instance.categoria_originale = instance.categoria
            campi_modificati.append("categoria")

        new_prio = data.get("priorita")
        if new_prio and new_prio != instance.priorita:
            campi_modificati.append("priorita")

        new_acq = data.get("acquaiolo_competente_id")
        if new_acq and new_acq != instance.acquaiolo_competente_id:
            campi_modificati.append("acquaiolo")

        serializer.save()

        if campi_modificati:
            Evento.objects.create(
                segnalazione=instance,
                stato=instance.stato_corrente,
                tipo_evento="correzione_campo",
                operatore=self.request.user,
                nota=f"Modificati: {', '.join(campi_modificati)}",
            )


class SegnalazioneAzioniView(APIView):
    def post(self, request, pk):
        seg = get_object_or_404(Segnalazione, pk=pk)
        azione = request.data.get("azione")
        nota = request.data.get("nota", "")
        tipo = "cambio_stato"

        if azione == "prendi_in_carico":
            seg.stato_corrente = Segnalazione.Stato.IN_VERIFICA
            seg.operatore_riferimento = request.user
        elif azione == "assegna":
            seg.stato_corrente = Segnalazione.Stato.ASSEGNATA
            seg.acquaiolo_competente_id = request.data.get("acquaiolo_id")
        elif azione == "avvia_intervento":
            seg.stato_corrente = Segnalazione.Stato.IN_INTERVENTO
        elif azione == "chiudi":
            seg.stato_corrente = Segnalazione.Stato.CHIUSA
            seg.esito = request.data.get("esito")
            if seg.esito == "duplicata":
                seg.duplicato_di_id = request.data.get("duplicato_di")
                seg.is_duplicato = True
        elif azione == "indietro":
            if seg.stato_corrente == Segnalazione.Stato.IN_INTERVENTO:
                seg.stato_corrente = Segnalazione.Stato.ASSEGNATA
            elif seg.stato_corrente == Segnalazione.Stato.ASSEGNATA:
                seg.stato_corrente = Segnalazione.Stato.IN_VERIFICA
            elif seg.stato_corrente == Segnalazione.Stato.IN_VERIFICA:
                seg.stato_corrente = Segnalazione.Stato.RICEVUTA
        elif azione == "riapri":
            seg.stato_corrente = Segnalazione.Stato.IN_VERIFICA
        elif azione == "nota":
            tipo = "nota"
        elif azione == "messaggio_segnalante":
            seg.messaggio_al_segnalante = nota
            tipo = "nota"

        seg.save()

        Evento.objects.create(
            segnalazione=seg,
            stato=seg.stato_corrente,
            tipo_evento=tipo,
            operatore=request.user,
            nota=nota,
        )
        serializer = SegnalazioneDetailSerializer(seg, context={'request': request})
        return Response(serializer.data)
