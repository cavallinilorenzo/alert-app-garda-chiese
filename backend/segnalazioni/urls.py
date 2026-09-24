from django.urls import path

from .views import (
    SegnalazioneAzioniView,
    SegnalazioneDetailView,
    SegnalazioneListCreateView,
    SegnalazioneStatoView,
)

urlpatterns = [
    path("segnalazioni", SegnalazioneListCreateView.as_view(), name="segnalazioni-list"),
    path("segnalazioni/<int:pk>", SegnalazioneDetailView.as_view(), name="segnalazioni-detail"),
    path(
        "segnalazioni/<int:pk>/azioni", SegnalazioneAzioniView.as_view(), name="segnalazioni-azioni"
    ),
    path(
        "segnalazioni/stato/<uuid:token>",
        SegnalazioneStatoView.as_view(),
        name="segnalazioni-stato",
    ),
]
