from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [("accounts", "0003_rubrica_dalla_mappa")]

    operations = [
        migrations.CreateModel(
            name="SottoscrizionePush",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("endpoint", models.TextField(unique=True)),
                ("p256dh", models.TextField()),
                ("auth", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "operatore",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="push_subscriptions",
                        to="auth.user",
                    ),
                ),
            ],
            options={
                "verbose_name": "Sottoscrizione push",
                "verbose_name_plural": "Sottoscrizioni push",
            },
        ),
    ]
