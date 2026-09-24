import pytest
from django.core import mail
from django.test import override_settings

from segnalazioni.models import Segnalazione
from segnalazioni.notifiche import invia_email_nuova_segnalazione

pytestmark = pytest.mark.django_db


@override_settings(
    EMAIL_BACKEND="django.core.mail.backends.locmem.EmailBackend",
    EMAIL_HOST="smtp.example.com",
    EMAIL_NOTIFICATION_RECIPIENT="garda-chiese-alert@outlook.it",
    DEFAULT_FROM_EMAIL="garda-chiese-alert@outlook.it",
)
def test_invia_email_nuova_segnalazione():
    segnalazione = Segnalazione.objects.create(
        lat=45.0,
        lng=10.0,
        descrizione="Il canale perde acqua",
        cellulare="3331234567",
        priorita="alta",
        priorita_calcolata="alta",
        comune="Castiglione delle Stiviere",
    )

    invia_email_nuova_segnalazione(segnalazione)

    assert len(mail.outbox) == 1
    messaggio = mail.outbox[0]
    assert messaggio.subject == f"Nuova segnalazione {segnalazione.codice_pratica}"
    assert messaggio.from_email == "garda-chiese-alert@outlook.it"
    assert messaggio.to == ["garda-chiese-alert@outlook.it"]
    assert "Il canale perde acqua" in messaggio.body
