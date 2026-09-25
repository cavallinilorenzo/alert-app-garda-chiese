"""Notifiche generate dal ciclo di vita delle Segnalazioni."""

import logging

from django.conf import settings
from django.core.mail import send_mail

from .models import Segnalazione

logger = logging.getLogger(__name__)


def invia_email_nuova_segnalazione(segnalazione: Segnalazione) -> None:
    """Invia la notifica della Segnalazione al destinatario configurato.

    L'invio è best effort: un problema del provider email non deve impedire
    la registrazione della Segnalazione nel sistema.
    """
    if not settings.EMAIL_HOST:
        logger.info("Invio email disabilitato: EMAIL_HOST non configurato")
        return

    destinatario = settings.EMAIL_NOTIFICATION_RECIPIENT
    mittente = settings.DEFAULT_FROM_EMAIL
    if not destinatario or not mittente:
        logger.warning("Invio email disabilitato: mittente o destinatario mancanti")
        return

    oggetto = f"Nuova segnalazione {segnalazione.codice_pratica}"
    corpo = "\n".join(
        [
            "È stata ricevuta una nuova segnalazione.",
            "",
            f"Codice pratica: {segnalazione.codice_pratica}",
            f"Priorità: {segnalazione.priorita}",
            f"Descrizione: {segnalazione.descrizione}",
            f"Coordinate: {segnalazione.lat}, {segnalazione.lng}",
            f"Comune: {segnalazione.comune or 'non disponibile'}",
        ]
    )

    try:
        send_mail(
            subject=oggetto,
            message=corpo,
            from_email=mittente,
            recipient_list=[destinatario],
            fail_silently=False,
        )
    except Exception:
        logger.exception("Invio email fallito per la Segnalazione %s", segnalazione.codice_pratica)
