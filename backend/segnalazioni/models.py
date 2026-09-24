from django.db import models
from django.utils.translation import gettext_lazy as _
import uuid
import random
import string

def generate_codice_pratica():
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f"GCH-{suffix}"

class Segnalazione(models.Model):
    class Stato(models.TextChoices):
        RICEVUTA = 'ricevuta', _('Ricevuta')
        IN_VERIFICA = 'in_verifica', _('In verifica')
        ASSEGNATA = 'assegnata', _('Assegnata')
        IN_INTERVENTO = 'in_intervento', _('In intervento')
        CHIUSA = 'chiusa', _('Chiusa')

    class Priorita(models.TextChoices):
        BASSA = 'bassa', _('Bassa')
        MEDIA = 'media', _('Media')
        ALTA = 'alta', _('Alta')
        CRITICA = 'critica', _('Critica')

    class Layer(models.TextChoices):
        CANALI = 'canali', _('Canali')
        CONDOTTE = 'condotte', _('Condotte')
        RIP = 'rip', _('Reticolo Idrico Principale')

    codice_pratica = models.CharField(max_length=15, default=generate_codice_pratica, unique=True)
    token_stato = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    
    stato_corrente = models.CharField(max_length=20, choices=Stato.choices, default=Stato.RICEVUTA)
    priorita = models.CharField(max_length=10, choices=Priorita.choices, default=Priorita.BASSA)
    priorita_calcolata = models.CharField(max_length=10, choices=Priorita.choices, default=Priorita.BASSA)
    override_motivazione = models.TextField(blank=True)

    lat = models.FloatField()
    lng = models.FloatField()
    descrizione = models.TextField()
    cellulare = models.CharField(max_length=20)
    
    is_duplicato = models.BooleanField(default=False)
    messaggio_al_segnalante = models.TextField(blank=True)
    
    # Dati estratti
    transcript_ai = models.TextField(blank=True)
    categoria = models.CharField(max_length=100, blank=True)
    durata = models.CharField(max_length=100, blank=True)
    quantita_acqua = models.CharField(max_length=100, blank=True)
    pericolo_persone = models.BooleanField(default=False)
    pericolo_strada = models.BooleanField(default=False)
    pericolo_case = models.BooleanField(default=False)
    
    # Confidenze (potremmo usare JSONField o campi separati)
    estratti_confidenza = models.JSONField(default=dict, blank=True)

    # Dati geografici calcolati al momento dell'invio
    layer = models.CharField(max_length=20, choices=Layer.choices, null=True, blank=True)
    id_placemark = models.CharField(max_length=50, null=True, blank=True)
    nome_tracciato = models.CharField(max_length=255, null=True, blank=True)
    nome_completo_tracciato = models.CharField(max_length=255, null=True, blank=True)
    tipo_tracciato = models.CharField(max_length=100, null=True, blank=True)
    distanza_m = models.FloatField(null=True, blank=True)
    zona_id = models.IntegerField(null=True, blank=True)
    acquaiolo_competente_id = models.IntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.pk and not self.priorita_calcolata:
            self.priorita_calcolata = self.priorita
        super().save(*args, **kwargs)

class Foto(models.Model):
    segnalazione = models.ForeignKey(Segnalazione, on_delete=models.CASCADE, related_name='foto')
    immagine = models.ImageField(upload_to='segnalazioni/')
    created_at = models.DateTimeField(auto_now_add=True)

class Evento(models.Model):
    segnalazione = models.ForeignKey(Segnalazione, on_delete=models.CASCADE, related_name='timeline')
    stato = models.CharField(max_length=20, choices=Segnalazione.Stato.choices)
    nota = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
