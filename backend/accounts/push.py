import json
import logging

from django.conf import settings

from accounts.models import SottoscrizionePush

logger = logging.getLogger(__name__)


def invia_notifica_nuova_segnalazione(segnalazione):
    """Invia una push agli operatori.

    La segnalazione non fallisce se il provider è indisponibile.
    """
    if not all(
        (settings.VAPID_PUBLIC_KEY, settings.VAPID_PRIVATE_KEY, settings.VAPID_CLAIMS_EMAIL)
    ):
        return
    try:
        from pywebpush import WebPushException, webpush
    except ImportError:
        logger.warning("pywebpush non installato: notifiche push disabilitate")
        return

    payload = json.dumps(
        {
            "titolo": "Nuova segnalazione",
            "corpo": f"{segnalazione.codice_pratica} · priorità {segnalazione.priorita}",
            "url": f"/portale/?segnalazione={segnalazione.id}",
        }
    )
    for subscription in SottoscrizionePush.objects.select_related("operatore"):
        try:
            webpush(
                subscription_info={
                    "endpoint": subscription.endpoint,
                    "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
                },
                data=payload,
                vapid_private_key=settings.VAPID_PRIVATE_KEY,
                vapid_claims={"sub": settings.VAPID_CLAIMS_EMAIL},
            )
        except WebPushException as error:
            # Endpoint scaduti o revocati: non teniamoli nel database.
            if getattr(error.response, "status_code", None) in (404, 410):
                subscription.delete()
            else:
                logger.warning("Invio push fallito per %s: %s", subscription.operatore, error)
        except Exception:
            logger.exception("Invio push fallito per %s", subscription.operatore)
