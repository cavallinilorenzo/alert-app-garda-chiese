<p align="center">
  <img src="./frontend/shared/marchio/logo.png" alt="Garda Chiese Logo" width="250" />
</p>

<h1 align="center">💧 Garda Chiese Alert App</h1>

<p align="center">
  <i>A unified platform for citizen reporting and infrastructure triage.<br/>Developed with ❤️ for the <a href="https://www.unimn.it/hackathon-acquam-mantova/"><strong>ACQUAM</strong> Hackathon.</i></a>
</p>

<p align="center">
  <a href="#-about-the-project"><strong>About</strong></a> ·
  <a href="#-key-features"><strong>Features</strong></a> ·
  <a href="#-public-access"><strong>Live Site</strong></a> ·
  <a href="#-local-setup--hosting"><strong>Local Setup</strong></a> ·
  <a href="#-architecture"><strong>Architecture</strong></a>
</p>

<hr />

## 📖 About the Project

The **Garda Chiese Alert App** was conceptualized and built during the **Hack4Water** challenge. It aims to modernize the way the *Consorzio di bonifica Garda Chiese* handles infrastructural anomalies within its network. 

Before this project, citizens lacked a streamlined way to report issues like broken pipes, flooded fields, or damaged banks. This system bridges the gap by offering a two-sided platform:
1. **Citizen Reporting App**: A frictionless, geo-localized reporting tool.
2. **Operator Portal**: A dashboard for internal triage, assignment, and management.

---

## ✨ Key Features

### 📱 Citizen Reporting App (Frontend)
- **Mobile-First Experience**: Designed to be responsive, fast, and easy to use on the field.
- **AI Voice Extraction**: Powered by **Google Gemini AI**, users can simply record a voice message detailing the problem, and the system automatically extracts the relevant information.
- **Rich Media & Geolocation**: Supports photo uploads and accurate GPS coordinate tracking to pinpoint the exact location of the anomaly.
- **Real-Time Status Tracking**: Citizens receive a link to track the lifecycle of their report without needing an account.

### 💻 Operator Portal (Dashboard)
- **Triage & Priority Management**: Operators can categorize reports, assign priorities based on danger levels, and filter out out-of-bounds reports.
- **Interactive Map Integration**: GeoJSON map layers displaying the entire consortium's network, borders, and zones using **Leaflet**.
- **Issue Lifecycle Management**: Full control over report statuses (Received, In Verification, Assigned, In Progress, Closed).
- **Push Notifications**: Real-time alerts for incoming critical reports.
- **Operator Directory**: Built-in contact list for field operators (*acquaioli*).

---

## 🚀 Local Setup & Hosting

Want to run the platform locally or host it on your own server? We've made it incredibly simple using Docker.

### Prerequisites
- [Docker](https://www.docker.com/) and [Docker Compose](https://docs.docker.com/compose/) installed on your machine.
- A reverse proxy (e.g., Nginx Proxy Manager) if deploying for production.
- (Optional) A Google Gemini API key for the voice extraction feature.

### Running Locally

1. **Clone the repository:**
   ```bash
   git clone https://github.com/cavallinilorenzo/alert-app-garda-chiese.git
   cd alert-app-garda-chiese
   ```

2. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   # Edit the .env file with your specific configurations
   ```

3. **Start the containers:**
   ```bash
   docker-compose up --build -d
   ```

4. **Access the application:**
   - 📱 **Citizen App**: `http://localhost:8080/`
   - 💻 **Operator Portal**: `http://localhost:8080/portale/`
   - ⚙️ **Backend API**: `http://localhost:8080/api/`

---

## 🏗️ Architecture

The platform follows a modern, decoupled architecture:

<div align="center">

| Component | Technology Stack |
| :--- | :--- |
| **Backend** | Python, Django, Django REST Framework |
| **Database** | PostgreSQL + PostGIS (for spatial data) |
| **Frontend** | React, TypeScript, Vite, Leaflet |
| **AI Integration**| Google Gemini API (`gemini-3.1-flash-lite`) |
| **Deployment**| Docker, Docker Compose, GitHub Container Registry |

</div>
