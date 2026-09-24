from django.core.validators import MinValueValidator
from django.db import models


class Acquaiolo(models.Model):
    """Recapito di un Acquaiolo nella Rubrica del Portale operatore."""

    nome = models.CharField(max_length=120)
    telefono = models.CharField(max_length=32)
    zona_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)],
        help_text="Identificativo della Zona acquaiolo nel KML.",
    )

    class Meta:
        ordering = ["nome", "id"]
        verbose_name = "Acquaiolo"
        verbose_name_plural = "Acquaioli"

    def __str__(self) -> str:
        return self.nome
