from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from contratti import ServizioNonDisponibile
from estrazione import services

# Quello che producono MediaRecorder (Chrome: webm/opus, Safari iOS: mp4/aac) più i
# formati comuni dei file audio.
MIME_AMMESSI = {
    "audio/webm",
    "audio/ogg",
    "audio/mp4",
    "audio/m4a",
    "audio/x-m4a",
    "audio/aac",
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/flac",
}
# Gemini accetta fino a 20 MB inline; 30 secondi di voce sono meno di 1 MB.
AUDIO_MAX_BYTES = 10 * 1024 * 1024

# L'App manda un JPEG ridotto a 1600 px; se la riduzione fallisce arriva l'originale,
# anche HEIC da iPhone. Sono tutti formati che Gemini legge.
FOTO_MIME_AMMESSI = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
FOTO_MAX_BYTES = 10 * 1024 * 1024
# Sotto questa confidenza un campo visto nella foto non si propone al Segnalante: meglio
# una domanda in più che una risposta sbagliata già scelta.
CONFIDENZA_MIN_FOTO = 0.6


def errore(status, code, message, fields=None):
    """Risposta nel formato `Error` del contratto."""
    return Response({"code": code, "message": message, "fields": fields or {}}, status=status)


class EstrazioneVocaleView(APIView):
    """`POST /api/estrazione/vocale`: pubblico, lo chiama l'App di segnalazione."""

    authentication_classes = []
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser]

    def post(self, request):
        audio = request.FILES.get("audio")
        if audio is None or audio.size == 0:
            return self.audio_non_valido("Manca la registrazione.")
        if audio.size > AUDIO_MAX_BYTES:
            return errore(
                413,
                "audio_troppo_grande",
                "La registrazione è troppo lunga.",
                {"audio": ["La registrazione supera i 10 MB."]},
            )
        mime_type = audio.content_type.split(";")[0].strip().lower()
        if mime_type not in MIME_AMMESSI:
            return self.audio_non_valido("Formato audio non supportato.")

        try:
            risultato = services.estrattore_predefinito().estrai(audio.read(), mime_type)
        except ServizioNonDisponibile as e:
            return errore(
                503, e.code, "L'assistente vocale non è disponibile: compila il modulo a mano."
            )
        return Response(
            {
                "transcript": risultato.transcript,
                "campi": {
                    nome: campo.valore
                    for nome, campo in risultato.campi.items()
                    if campo.valore is not None
                },
                "mancanti": risultato.mancanti,
            }
        )

    def audio_non_valido(self, motivo):
        return errore(400, "audio_non_valido", motivo, {"audio": [motivo]})


class AnalisiFotoView(APIView):
    """`POST /api/estrazione/foto`: pubblico, lo chiama l'App di segnalazione dopo lo scatto."""

    authentication_classes = []
    permission_classes = [AllowAny]
    parser_classes = [MultiPartParser]

    def post(self, request):
        foto = request.FILES.get("foto")
        if foto is None or foto.size == 0:
            return self.foto_non_valida("Manca la foto.")
        if foto.size > FOTO_MAX_BYTES:
            return errore(
                413,
                "foto_troppo_grande",
                "La foto è troppo pesante.",
                {"foto": ["La foto supera i 10 MB."]},
            )
        mime_type = foto.content_type.split(";")[0].strip().lower()
        if mime_type not in FOTO_MIME_AMMESSI:
            return self.foto_non_valida("Formato della foto non supportato.")

        try:
            risultato = services.estrattore_predefinito().analizza_foto(foto.read(), mime_type)
        except ServizioNonDisponibile as e:
            return errore(503, e.code, "Non riusciamo a controllare la foto in questo momento.")
        return Response(
            {
                "pertinente": risultato.pertinente,
                "motivo": risultato.motivo,
                "campi": {
                    nome: campo.valore
                    for nome, campo in risultato.campi.items()
                    if campo.valore is not None and campo.confidenza >= CONFIDENZA_MIN_FOTO
                },
            }
        )

    def foto_non_valida(self, motivo):
        return errore(400, "foto_non_valida", motivo, {"foto": [motivo]})
