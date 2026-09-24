from django.urls import path

from geo import views

urlpatterns = [
    path("perimetro/check", views.CheckPerimetroView.as_view()),
    path("layer/<str:layer>.geojson", views.layer_geojson),
]
