import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from accounts.models import Acquaiolo

pytestmark = pytest.mark.django_db


def utente(username="operatore", password="password-sicura"):
    return get_user_model().objects.create_user(
        username=username,
        password=password,
        first_name="Mario",
        last_name="Rossi",
    )


def autenticato(user):
    client = APIClient()
    response = client.post(
        "/api/auth/token",
        {"username": user.username, "password": "password-sicura"},
        format="json",
    )
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {response.data['access']}")
    return client, response.data["refresh"]


def test_login_e_me_restituiscono_jwt_e_operatore():
    user = utente()
    client, _ = autenticato(user)

    response = client.get("/api/auth/me")

    assert response.status_code == 200
    assert response.json() == {"id": user.id, "nome_completo": "Mario Rossi"}


def test_rubrica_richiede_un_operatore_autenticato():
    response = APIClient().get("/api/acquaioli")

    assert response.status_code == 401


def test_operatore_crea_legge_e_modifica_un_acquaiolo():
    client, _ = autenticato(utente())

    create = client.post(
        "/api/acquaioli",
        {"nome": "BRIGNANI", "telefono": "+39 333 1234567", "zona_id": 21},
        format="json",
    )
    assert create.status_code == 201
    acquaiolo_id = create.json()["id"]

    listed = client.get("/api/acquaioli")
    assert listed.status_code == 200
    assert listed.json()[0]["zona_id"] == 21

    updated = client.patch(
        f"/api/acquaioli/{acquaiolo_id}", {"telefono": "+39 333 7654321"}, format="json"
    )
    assert updated.status_code == 200
    assert updated.json()["telefono"] == "+39 333 7654321"
    assert Acquaiolo.objects.get(pk=acquaiolo_id).telefono == "+39 333 7654321"


def test_logout_invalida_il_refresh_token():
    client, refresh = autenticato(utente())

    logout = client.post("/api/auth/logout", {"refresh": refresh}, format="json")
    assert logout.status_code == 200
    assert logout.json() == {"success": True}

    renewed = APIClient().post("/api/auth/token/refresh", {"refresh": refresh}, format="json")
    assert renewed.status_code == 401
