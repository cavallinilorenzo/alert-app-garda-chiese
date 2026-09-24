from django.core.validators import MinValueValidator
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("accounts", "0001_acquaiolo"),
    ]

    operations = [
        migrations.AlterField(
            model_name="acquaiolo",
            name="zona_id",
            field=models.PositiveIntegerField(
                blank=True,
                help_text="Identificativo della Zona acquaiolo nel KML.",
                null=True,
                validators=[MinValueValidator(1)],
            ),
        ),
    ]
