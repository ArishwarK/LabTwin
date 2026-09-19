# Laboratory Monitoring System — FastAPI Backend

A standalone, lightweight Python FastAPI backend service designed to ingest real-time hardware telemetry from client monitoring agents running on laboratory workstations and persist them into Cloud SQL PostgreSQL.

---

## 1. Folder Structure

```
backend/
├── main.py              # FastAPI application, CORS middleware, and API endpoints
├── models.py            # SQLAlchemy 2.x ORM models (Device and Metric)
├── database.py          # Database connection, session factory, and startup resilience
├── schemas.py           # Pydantic v2 validation models for metrics and responses
├── requirements.txt     # Python dependencies
├── .env.example         # Example environment variables template
└── README.md            # Execution and testing documentation
```

---

## 2. Prerequisites

- Python 3.10+ installed on your system.
- Optional: PostgreSQL instance (local or Google Cloud SQL). The server boots and functions in standalone validation mode even if PostgreSQL is not yet configured.

---

## 3. Local Setup & Installation

Navigate to the `backend/` directory from the repository root:

```bash
cd backend
```

Create a virtual environment:

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux / macOS
python3 -m venv venv
source venv/bin/activate
```

Install Python dependencies:

```bash
pip install -r requirements.txt
```

*(Optional)* Configure your local `.env` file:

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` to provide your PostgreSQL connection string if available:
```env
DATABASE_URL=postgresql+psycopg://username:password@localhost:5432/laboratory_monitoring
FRONTEND_URL=http://localhost:5173
```

---

## 4. Starting the Server

Run the development server using `uvicorn`:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will now be listening at:
- **Base URL:** [http://localhost:8000](http://localhost:8000)
- **Interactive Swagger Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Redoc Documentation:** [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

## 5. Testing the Endpoints

### A. Health Probe (`GET /health`)

Verify the service is alive:

```bash
curl -X GET http://localhost:8000/health
```

**Expected Response (HTTP 200):**
```json
{
  "status": "healthy"
}
```

---

### B. Service Identification (`GET /`)

```bash
curl -X GET http://localhost:8000/
```

**Expected Response (HTTP 200):**
```json
{
  "status": "online",
  "service": "Laboratory Monitoring Backend"
}
```

---

### C. Ingest Hardware Telemetry (`POST /api/metrics`)

Submit a sample client PC telemetry packet:

```bash
curl -X POST http://localhost:8000/api/metrics \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "LAB-A-PC01",
    "hostname": "CIT-CSE-LAB01",
    "ip_address": "192.168.10.101",
    "cpu_usage": 32.4,
    "ram_usage": 64.1,
    "ram_total": 17179869184,
    "ram_used": 11012296151,
    "disk_usage": 45.2,
    "disk_total": 512110190592,
    "disk_used": 231473806147,
    "temperature": 51.0,
    "timestamp": "2026-09-19T16:45:00Z"
  }'
```

**Expected Response (HTTP 201 Created):**
```json
{
  "status": "received",
  "message": "Telemetry metrics successfully validated and accepted",
  "data": {
    "device_id": "LAB-A-PC01",
    "hostname": "CIT-CSE-LAB01",
    "ip_address": "192.168.10.101",
    "cpu_usage": 32.4,
    "ram_usage": 64.1,
    "ram_total": 17179869184,
    "ram_used": 11012296151,
    "disk_usage": 45.2,
    "disk_total": 512110190592,
    "disk_used": 231473806147,
    "temperature": 51.0,
    "timestamp": "2026-09-19T16:45:00Z"
  },
  "received_at": "2026-09-19T16:45:01.123456"
}
```

---

## 6. How the Python Monitoring Agent Connects

Each laboratory computer runs a lightweight background daemon (e.g. using `psutil`):

```
+------------------------+
|  Laboratory PC (Agent) |
|  - Reads psutil.cpu    |
|  - Reads psutil.mem    |
|  - Reads disk & temps  |
+-----------+------------+
            |
            | HTTP POST (JSON every 10-30s)
            v
+------------------------+
|  FastAPI Backend       |
|  http://<SERVER>:8000  |
|  /api/metrics          |
+-----------+------------+
            |
            | SQLAlchemy 2.x Session
            v
+------------------------+
|  PostgreSQL Database   |
|  (Cloud SQL / Local)   |
|  - devices table       |
|  - metrics table       |
+------------------------+
```

1. **Collection**: The agent samples CPU, RAM, disk, and temperature every 10–30 seconds.
2. **Payload Dispatch**: The agent performs an HTTP POST request to `http://<backend-ip>:8000/api/metrics`.
3. **Ingestion & Validation**: FastAPI validates bounds (`0-100%`) via Pydantic.
4. **Persistence**: The workstation record in `devices` is updated (`last_seen = now()`, `status = online`), and the timestamped metrics are appended to the `metrics` table.
