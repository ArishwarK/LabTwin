# LabTwin — Laboratory Monitoring System

Centralized Academic Block & Floor-wise Laboratory Monitoring System for college computer laboratories. Features real-time Digital Twin telemetry for workstation connectivity and electrical power relays, floor navigation, occupancy tracking, and Google Calendar lab booking integration.

## Features
- **Floor Navigation & Elevation View**: Interactive elevation explorer for campus academic blocks with individual lab tracking across all floors.
- **Digital Twin Telemetry**: Live telemetry view monitoring PC power, CPU/RAM/Disk utilization, operating status, and network connectivity.
- **REST Telemetry Ingestion**: Integrated Node.js/Express API (`POST /api/metrics`) for ingesting hardware metrics from workstation background agents.
- **Lab Booking & Calendar**: Integrated schedule booking with optional Google Calendar synchronization via Firebase Authentication.

## Deploy to Vercel

The application is pre-configured for one-click deployment to [Vercel](https://vercel.com):

1. **Push your repository** to GitHub or GitLab.
2. **Import into Vercel**:
   - Framework Preset: **Vite**
   - Root Directory: `./`
   - Build Command: `vite build` (or leave default `npm run build`)
   - Output Directory: `dist`
3. **Environment Variables (Optional)**:
   - `GEMINI_API_KEY`: (Optional) Server-side Gemini API key if using AI telemetry analysis.
4. **Deploy**:
   - Vercel automatically detects `vercel.json` and routes `/api/*` to the serverless function (`/api/index.ts`) and all client routes to the Vite single-page application (`dist/index.html`).

### Deploy via Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Deploy preview
vercel

# Deploy to production
vercel --prod
```

**Prerequisites:** Node.js 22+

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the unified application on port 3000:
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   npm start
   ```

## Telemetry Ingestion API

Laboratory workstations can send telemetry heartbeats to:
- **Endpoint**: `POST /api/metrics`
- **Sample Payload**:
  ```json
  {
    "device_id": "LAB-A-PC01",
    "hostname": "CIT-CSE-LAB01",
    "ip_address": "192.168.10.101",
    "cpu_usage": 34.5,
    "ram_usage": 58.2,
    "disk_usage": 42.8,
    "timestamp": "2026-09-19T16:45:00Z"
  }
  ```

