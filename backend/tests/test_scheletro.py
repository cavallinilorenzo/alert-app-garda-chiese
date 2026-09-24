from django.apps import apps
from django.contrib.auth import get_user_model
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import AccessToken

APP_DEL_DOMINIO = ["segnalazioni", "accounts", "geo", "estrazione"]


def test_app_del_dominio_registrate():
    for app in APP_DEL_DOMINIO:
        assert apps.is_installed(app)


def test_admin_attivo(client):
    response = client.get("/admin/login/")
    assert response.status_code == 200


def test_api_protetta_di_default():
    view = APIView.as_view()
    response = view(APIRequestFactory().get("/api/"))
    assert response.status_code == 401


def test_jwt_autentica_un_utente(db):
    user = get_user_model().objects.create_user(username="operatore", password="x")
    token = AccessToken.for_user(user)

    class Chi(APIView):
        def get(self, request):
            return Response({"username": request.user.username})

    request = APIRequestFactory().get("/api/", HTTP_AUTHORIZATION=f"Bearer {token}")
    response = Chi.as_view()(request)
    assert response.status_code == 200
    assert response.data == {"username": "operatore"}
