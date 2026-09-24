from django.http import Http404, HttpResponse
from django.views.decorators.cache import cache_control
from django.views.decorators.http import require_GET
from rest_framework import serializers
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from geo import geojson, services


class PosizioneSerializer(serializers.Serializer):
    lat = serializers.FloatField(min_value=-90, max_value=90)
    lng = serializers.FloatField(min_value=-180, max_value=180)


def dati_non_validi(errori) -> Response:
    """Risposta 400 nello schema `Error` del contratto."""
    return Response(
        {
            "code": "dati_non_validi",
            "message": "I dati inviati non sono validi.",
            "fields": {campo: [str(e) for e in messaggi] for campo, messaggi in errori.items()},
        },
        status=400,
    )


class CheckPerimetroView(APIView):
    """`POST /api/perimetro/check`: la posizione è sul Reticolo consortile?"""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        posizione = PosizioneSerializer(data=request.data)
        if not posizione.is_valid():
            return dati_non_validi(posizione.errors)

        risultato = services.check_perimetro(
            posizione.validated_data["lat"], posizione.validated_data["lng"]
        )
        body = {
            "accettato": risultato.accettato,
            "distanza_m": round(risultato.distanza_m, 1),
            "messaggio": risultato.messaggio,
        }
        if risultato.zona is not None:
            body["zona_id"] = risultato.zona.id
        return Response(body)


@require_GET
@cache_control(public=True, max_age=24 * 60 * 60)
def layer_geojson(request, layer):
    """`GET /api/layer/{layer}.geojson`: layer statico, pubblico e cacheabile."""
    if layer not in geojson.LAYER:
        raise Http404
    return HttpResponse(geojson.layer_geojson(layer), content_type="application/geo+json")
