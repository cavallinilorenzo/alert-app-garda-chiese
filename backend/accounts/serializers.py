from django.contrib.auth import get_user_model
from rest_framework import serializers

from accounts.models import Acquaiolo


class AcquaioloSerializer(serializers.ModelSerializer):
    class Meta:
        model = Acquaiolo
        fields = ("id", "nome", "telefono", "zona_id")
        read_only_fields = ("id",)


class OperatoreSerializer(serializers.ModelSerializer):
    nome_completo = serializers.SerializerMethodField()

    class Meta:
        model = get_user_model()
        fields = ("id", "nome_completo")

    def get_nome_completo(self, obj):
        nome = " ".join(parte for parte in (obj.first_name, obj.last_name) if parte).strip()
        return nome or obj.username
