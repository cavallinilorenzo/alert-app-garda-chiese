from django.urls import path
from .views import SegnalazioneCreateView, SegnalazioneStatoView

urlpatterns = [
    path('segnalazioni', SegnalazioneCreateView.as_view(), name='segnalazioni-create'),
    path('segnalazioni/stato/<uuid:token>', SegnalazioneStatoView.as_view(), name='segnalazioni-stato'),
]
