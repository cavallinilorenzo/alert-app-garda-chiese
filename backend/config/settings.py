"""
Settings del backend.

La configurazione arriva dalle variabili d'ambiente, lette anche dal file `.env`
nella root della repo (vedi `.env.example`). I segreti non stanno mai nel codice.
"""

from datetime import timedelta
from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = BASE_DIR.parent

env = environ.Env(
    DJANGO_DEBUG=(bool, False),
    DJANGO_ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
    POSTGRES_HOST=(str, "localhost"),
    POSTGRES_PORT=(int, 5432),
    GEMINI_API_KEY=(str, ""),
    GEMINI_MODELLO=(str, "gemini-3.1-flash-lite"),
    VAPID_PUBLIC_KEY=(str, ""),
    VAPID_PRIVATE_KEY=(str, ""),
    VAPID_CLAIMS_EMAIL=(str, "mailto:admin@example.com"),
    EMAIL_HOST=(str, ""),
    EMAIL_PORT=(int, 587),
    EMAIL_TIMEOUT=(int, 10),
    EMAIL_USE_TLS=(bool, True),
    EMAIL_HOST_USER=(str, ""),
    EMAIL_HOST_PASSWORD=(str, ""),
    EMAIL_NOTIFICATION_RECIPIENT=(str, "garda-chiese-alert@outlook.it"),
    DEFAULT_FROM_EMAIL=(str, "garda-chiese-alert@outlook.it"),
)
environ.Env.read_env(REPO_DIR / ".env")

SECRET_KEY = env("DJANGO_SECRET_KEY")
DEBUG = env("DJANGO_DEBUG")
ALLOWED_HOSTS = env("DJANGO_ALLOWED_HOSTS")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "segnalazioni",
    "accounts",
    "geo",
    "estrazione",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"

# Postgres anche in locale (docker compose): SQLite non si usa.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("POSTGRES_DB"),
        "USER": env("POSTGRES_USER"),
        "PASSWORD": env("POSTGRES_PASSWORD"),
        "HOST": env("POSTGRES_HOST"),
        "PORT": env("POSTGRES_PORT"),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "it-it"
TIME_ZONE = "Europe/Rome"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Estrazione vocale. Senza chiave l'endpoint risponde 503 e l'App passa al form a mano.
GEMINI_API_KEY = env("GEMINI_API_KEY")
GEMINI_MODELLO = env("GEMINI_MODELLO")
VAPID_PUBLIC_KEY = env("VAPID_PUBLIC_KEY")
VAPID_PRIVATE_KEY = env("VAPID_PRIVATE_KEY")
VAPID_CLAIMS_EMAIL = env("VAPID_CLAIMS_EMAIL")

# Email transazionali per le nuove Segnalazioni. In locale l'invio resta
# disabilitato se EMAIL_HOST è vuoto; le credenziali non vanno nel repository.
EMAIL_HOST = env("EMAIL_HOST")
EMAIL_PORT = env("EMAIL_PORT")
EMAIL_TIMEOUT = env("EMAIL_TIMEOUT")
EMAIL_USE_TLS = env("EMAIL_USE_TLS")
EMAIL_HOST_USER = env("EMAIL_HOST_USER")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD")
EMAIL_NOTIFICATION_RECIPIENT = env("EMAIL_NOTIFICATION_RECIPIENT")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL")

# API: autenticazione JWT e accesso negato di default. Gli endpoint pubblici
# (per esempio l'invio di una Segnalazione) lo dichiarano con AllowAny.
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=15),
    "REFRESH_TOKEN_LIFETIME": timedelta(hours=24),
    "BLACKLIST_AFTER_ROTATION": True,
}
