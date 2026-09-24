from django.contrib import admin
from django.urls import include, path

# Tutti gli endpoint REST stanno sotto /api/; ogni app espone il proprio urls.py.
urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("segnalazioni.urls")),
    path("api/", include("accounts.urls")),
    path("api/", include("geo.urls")),
    path("api/", include("estrazione.urls")),
]
