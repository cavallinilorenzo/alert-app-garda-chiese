# Garda Chiese Alert App

A complete platform for reporting and managing hydrogeological and infrastructure alerts within the Garda-Chiese consortium network.

The system is split into three main components:
1. **Citizen Reporting App** (Frontend): A mobile-first web app for citizens to report issues (leaks, blockages, damaged banks, etc.) with photos, voice messages, and GPS coordinates.
2. **Operator Portal** (Frontend): A dashboard for operators to triage, assign, and track reports.
3. **Backend API**: A Django-powered REST API backed by a PostgreSQL database, managing users, permissions, report lifecycle, and AI integrations (Gemini) for voice transcriptions.

## System Architecture

- **Backend**: Python / Django / Django REST Framework
- **Database**: PostgreSQL
- **Frontend**: React (TypeScript + Vite)
- **Deployment**: Docker Compose via GitHub Container Registry (GHCR)

---

## 🚀 Deployment Guide (via Portainer)

The project is configured for automated deployment via Docker Compose.
Images are automatically built by GitHub Actions and pushed to the GitHub Container Registry (`ghcr.io`) upon pushing to the `main` branch.

Follow these steps to deploy the application on a **Portainer** instance (e.g., on TrueNAS, CasaOS, or a standard VPS):

### 1. Prerequisites
- A running instance of Portainer.
- A reverse proxy (e.g., Nginx Proxy Manager, Traefik, Cloudflare Tunnel) to handle HTTPS. **Note:** Features like Geolocation and Microphone recording in the Citizen App strictly require an `https://` connection to work in modern browsers.

### 2. Create the Stack
1. Open Portainer and go to **Stacks** > **Add stack**.
2. Set a name for the stack (e.g., `garda-chiese`).
3. Under **Build method**, select **Repository**.
4. Fill in the repository details:
   - **Repository URL**: `https://github.com/cavallinilorenzo/alert-app-garda-chiese.git`
   - **Repository reference**: `refs/heads/main`
   - **Compose path**: `docker-compose.prod.yml`

### 3. Environment Variables
Scroll down to the **Environment variables** section, click **Advanced mode**, and paste the following configuration. Replace the placeholder values with your actual secure data:

```env
# The port exposed on the host machine by the Nginx container
NGINX_PORT=8080

# Django Security (Set a strong, random 50+ chars string)
DJANGO_SECRET_KEY=your_super_secret_key_here
DJANGO_ALLOWED_HOSTS=*

# PostgreSQL Database Configuration
POSTGRES_DB=garda_chiese
POSTGRES_USER=garda_chiese
POSTGRES_PASSWORD=your_secure_db_password

# Optional: Google Gemini API for voice extraction
# Leave empty if you don't want AI voice transcription
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODELLO=gemini-3.1-flash-lite
```

### 4. Deploy
Click on **Deploy the stack**. 

Portainer will pull the pre-built Docker images from GitHub Packages and start the application. 
Once running, the app will be accessible on your server's IP at the port specified in `NGINX_PORT` (e.g., `http://YOUR-IP:8080`).

### Routing
The internal Nginx container automatically routes traffic based on the URL path:
- `http://YOUR-IP:8080/` ➔ **Citizen Reporting App**
- `http://YOUR-IP:8080/portale/` ➔ **Operator Portal**
- `http://YOUR-IP:8080/api/` ➔ **Backend API**
- `http://YOUR-IP:8080/admin/` ➔ **Django Admin Dashboard**

## Persistent Data (Volumes)
The `docker-compose.prod.yml` uses Docker Named Volumes to ensure your data is safe:
- `postgres_data`: Contains the database.
- `static_data`: Contains Django admin static files.
- `media_data`: Contains user uploads (photos and audio).

These volumes are managed by Docker and will persist across container restarts, image updates, and deployments. They will only be deleted if you explicitly delete the volumes when removing the stack in Portainer.
