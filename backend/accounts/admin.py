from django.contrib import admin

from accounts.models import Acquaiolo


@admin.register(Acquaiolo)
class AcquaioloAdmin(admin.ModelAdmin):
    list_display = ("nome", "telefono", "zona_id")
    search_fields = ("nome", "telefono")
    list_filter = ("zona_id",)
