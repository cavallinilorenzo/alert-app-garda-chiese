import random
import string
import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _


def generate_codice_pratica():
    suffix = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"GCH-{suffix}"


class Segnalazione(models.Model):
    class Esito(models.TextChoices):
        RISOLTA = "risolta", _("Risolta")
        DUPLICATA = "duplicata", _("Duplicata")
        NON_COMPETENZA = "non_di_competenza", _("Non di competenza")
        NON_RISCONTRATA = "non_riscontrata", _("Non riscontrata")
        FALSA = "falsa", _("Falsa")

    class Stato(models.TextChoices):
        RICEVUTA = "ricevuta", _("Ricevuta")
        IN_VERIFICA = "in_verifica", _("In verifica")
        ASSEGNATA = "assegnata", _("Assegnata")
        IN_INTERVENTO = "in_intervento", _("In intervento")
        CHIUSA = "chiusa", _("Chiusa")

    class Priorita(models.TextChoices):
        BASSA = "bassa", _("Bassa")
        MEDIA = "media", _("Media")
        ALTA = "alta", _("Alta")
        CRITICA = "critica", _("Critica")

    # Valori degli enum di `api/openapi.yaml`, etichette dell'App di segnalazione
    # (ticket "Revisione delle opzioni di ogni passo dell'App di segnalazione", #100).
    class Categoria(models.TextChoices):
        ACQUA_CHE_AFFIORA = "acqua_che_affiora", _("Acqua che esce dal terreno")
        PERDITA_DAL_CANALE = "perdita_dal_canale", _("Canale che perde")
        CANALE_CHE_TRACIMA = "canale_che_tracima", _("Canale che esonda o allaga")
        ARGINE_DANNEGGIATO = "argine_danneggiato", _("Argine o sponda franata")
        OSTRUZIONE = "ostruzione", _("Qualcosa blocca l'acqua")
        CANALE_ASCIUTTO = "canale_asciutto", _("Canale senz'acqua")
        PARATOIA_DANNEGGIATA = "paratoia_danneggiata", _("Paratoia o impianto rotto")
        ACQUA_SPORCA = "acqua_sporca", _("Acqua sporca o rifiuti")
        ALTRO = "altro", _("Altro")

    class Durata(models.TextChoices):
        ADESSO = "adesso", _("L'ho appena notato")
        ALCUNE_ORE = "alcune_ore", _("Da qualche ora")
        PIU_DI_UN_GIORNO = "piu_di_un_giorno", _("Da qualche giorno")
        DA_SETTIMANE = "da_settimane", _("Da settimane")
        NON_SO = "non_so", _("Non so")

    class QuantitaAcqua(models.TextChoices):
        GOCCE = "gocce", _("Gocciola")
        PICCOLO_FLUSSO = "piccolo_flusso", _("Un filo, come un rubinetto")
        MOLTA_ACQUA = "molta_acqua", _("Tanta, scorre forte")
        GETTO = "getto", _("Zampilla con forza")
        NON_SO = "non_so", _("Non so")
        NON_APPLICABILE = "non_applicabile", _("Non applicabile")

    class Risposta(models.TextChoices):
        SI = "si", _("Sì")
        NO = "no", _("No")
        NON_SO = "non_so", _("Non so")

    class Layer(models.TextChoices):
        CANALE = "canale", _("Canale")
        CONDOTTA = "condotta", _("Condotta")
        RIP = "reticolo_principale", _("Reticolo Idrico Principale")

    codice_pratica = models.CharField(max_length=15, default=generate_codice_pratica, unique=True)
    token_stato = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)

    stato_corrente = models.CharField(max_length=20, choices=Stato.choices, default=Stato.RICEVUTA)
    priorita = models.CharField(max_length=10, choices=Priorita.choices, default=Priorita.BASSA)
    priorita_calcolata = models.CharField(
        max_length=10, choices=Priorita.choices, default=Priorita.BASSA
    )
    override_motivazione = models.TextField(blank=True)

    lat = models.FloatField()
    lng = models.FloatField()
    lat_originale = models.FloatField(null=True, blank=True)
    lng_originale = models.FloatField(null=True, blank=True)
    descrizione = models.TextField()
    cellulare = models.CharField(max_length=20)

    is_duplicato = models.BooleanField(default=False)
    messaggio_al_segnalante = models.TextField(blank=True)
    esito = models.CharField(max_length=20, choices=Esito.choices, blank=True, default="")
    duplicato_di = models.ForeignKey(
        "self", null=True, blank=True, on_delete=models.SET_NULL, related_name="duplicati"
    )
    operatore_riferimento = models.ForeignKey(
        "auth.User", null=True, blank=True, on_delete=models.SET_NULL
    )

    # Dati estratti
    transcript_ai = models.TextField(blank=True)
    categoria = models.CharField(max_length=100, choices=Categoria.choices, blank=True)
    categoria_originale = models.CharField(max_length=100, choices=Categoria.choices, blank=True)
    durata = models.CharField(max_length=100, choices=Durata.choices, blank=True)
    quantita_acqua = models.CharField(max_length=100, choices=QuantitaAcqua.choices, blank=True)
    pericolo_persone = models.CharField(
        max_length=20, choices=Risposta.choices, blank=True, default=""
    )
    pericolo_strada = models.CharField(
        max_length=20, choices=Risposta.choices, blank=True, default=""
    )
    pericolo_edifici = models.CharField(
        max_length=20, choices=Risposta.choices, blank=True, default=""
    )

    # Confidenze (potremmo usare JSONField o campi separati)
    estratti_confidenza = models.JSONField(default=dict, blank=True)

    # Dati geografici calcolati al momento dell'invio
    layer = models.CharField(max_length=20, choices=Layer.choices, blank=True, default="")
    id_placemark = models.CharField(max_length=50, blank=True, default="")
    nome_tracciato = models.CharField(max_length=255, blank=True, default="")
    nome_completo_tracciato = models.CharField(max_length=255, blank=True, default="")
    tipo_tracciato = models.CharField(max_length=100, blank=True, default="")
    distanza_m = models.FloatField(null=True, blank=True)
    zona_id = models.IntegerField(null=True, blank=True)
    acquaiolo_competente_id = models.IntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.codice_pratica} - {self.stato_corrente}"

    def save(self, *args, **kwargs):
        if not self.pk and not self.priorita_calcolata:
            self.priorita_calcolata = self.priorita
        super().save(*args, **kwargs)


class Foto(models.Model):
    segnalazione = models.ForeignKey(Segnalazione, on_delete=models.CASCADE, related_name="foto")
    immagine = models.ImageField(upload_to="segnalazioni/")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Foto di {self.segnalazione.codice_pratica}"


class Evento(models.Model):
    segnalazione = models.ForeignKey(
        Segnalazione, on_delete=models.CASCADE, related_name="timeline"
    )
    stato = models.CharField(max_length=50)
    tipo_evento = models.CharField(max_length=50, default="cambio_stato")
    operatore = models.ForeignKey("auth.User", null=True, blank=True, on_delete=models.SET_NULL)
    nota = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Evento {self.stato} per {self.segnalazione.codice_pratica}"
