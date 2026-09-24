from django.urls import path

from estrazione.views import EstrazioneVocaleView

urlpatterns = [
    path("estrazione/vocale", EstrazioneVocaleView.as_view()),
]
