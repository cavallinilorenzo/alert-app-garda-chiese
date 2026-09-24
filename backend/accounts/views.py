from django.conf import settings
from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt import views as simplejwt_views
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from accounts.models import Acquaiolo, SottoscrizionePush
from accounts.serializers import (
    AcquaioloSerializer,
    OperatoreSerializer,
    SottoscrizionePushSerializer,
)


class TokenView(simplejwt_views.TokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = TokenObtainPairSerializer


class TokenRefreshView(simplejwt_views.TokenRefreshView):
    permission_classes = [AllowAny]
    serializer_class = TokenRefreshSerializer


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(OperatoreSerializer(request.user).data)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh = request.data.get("refresh")
        if not refresh:
            return Response(
                {
                    "code": "dati_non_validi",
                    "message": "Il refresh token è obbligatorio.",
                    "fields": {"refresh": ["Campo obbligatorio."]},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            RefreshToken(refresh).blacklist()
        except TokenError:
            return Response(
                {
                    "code": "token_non_valido",
                    "message": "Il refresh token non è valido.",
                    "fields": {},
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response({"success": True})


class PushSubscriptionView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response({"public_key": settings.VAPID_PUBLIC_KEY})

    def post(self, request):
        serializer = SottoscrizionePushSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        SottoscrizionePush.objects.update_or_create(
            endpoint=serializer.validated_data["endpoint"],
            defaults={"operatore": request.user, **serializer.validated_data},
        )
        return Response({"success": True}, status=status.HTTP_201_CREATED)

    def delete(self, request):
        endpoint = request.data.get("endpoint")
        SottoscrizionePush.objects.filter(operatore=request.user, endpoint=endpoint).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class AcquaioloListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AcquaioloSerializer
    queryset = Acquaiolo.objects.all()


class AcquaioloDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AcquaioloSerializer
    queryset = Acquaiolo.objects.all()
    http_method_names = ["get", "patch", "head", "options"]
