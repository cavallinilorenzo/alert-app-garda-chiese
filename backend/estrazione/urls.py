from django.urls import path

from estrazione.views import AnalisiFotoView, EstrazioneVocaleView

urlpatterns = [
    path("estrazione/vocale", EstrazioneVocaleView.as_view()),
    path("estrazione/foto", AnalisiFotoView.as_view()),
]
