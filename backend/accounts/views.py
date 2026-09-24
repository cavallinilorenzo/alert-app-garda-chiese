from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import (
    TokenObtainPairView as SimpleJWTTokenObtainPairView,
)
from rest_framework_simplejwt.views import (
    TokenRefreshView as SimpleJWTTokenRefreshView,
)

from accounts.models import Acquaiolo
from accounts.serializers import AcquaioloSerializer, OperatoreSerializer


class TokenView(SimpleJWTTokenObtainPairView):
    permission_classes = [AllowAny]
    serializer_class = TokenObtainPairSerializer


class TokenRefreshView(SimpleJWTTokenRefreshView):
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


class AcquaioloListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AcquaioloSerializer
    queryset = Acquaiolo.objects.all()


class AcquaioloDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = AcquaioloSerializer
    queryset = Acquaiolo.objects.all()
    http_method_names = ["get", "patch", "head", "options"]
