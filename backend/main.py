"""
FastAPI application for the Laboratory Monitoring System.
Ingests real-time hardware telemetry from client PCs across academic laboratory floors
and serves monitoring data to the React administrative dashboard.
"""

import os
import logging
from contextlib import asynccontextmanager
from typing import List, Optional
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, status, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.orm import Session

from database import get_db, init_db, engine
from schemas import MetricsCreate, MetricsResponse, HealthResponse, RootResponse

# Initialize environment configuration
load_dotenv()

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("laboratory_monitoring.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager.
    Attempts database schema synchronization on startup if a valid DATABASE_URL is configured.
    """
    logger.info("Starting Laboratory Monitoring Backend service...")
    if engine is not None:
        logger.info("PostgreSQL engine detected. Checking database tables...")
        init_db()
    else:
        logger.info(
            "Running in standalone mode without active PostgreSQL connection. "
            "Telemetry ingestion will validate and acknowledge payloads in memory."
        )
    yield
    logger.info("Shutting down Laboratory Monitoring Backend service.")


# FastAPI Application instance
app = FastAPI(
    title="Laboratory Monitoring Backend",
    description=(
        "Centralized telemetry ingestion and monitoring API for Coimbatore Institute of Technology "
        "Laboratory Workstations (Library Block-A). Receives heartbeats from client Python agents "
        "and prepares data for storage in Cloud SQL PostgreSQL."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# -----------------------------------------------------------------------------
# CORS Configuration
# -----------------------------------------------------------------------------
allowed_origins: List[str] = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

# Read optional frontend URL from environment (e.g. production/cloud origin)
env_frontend_url: Optional[str] = os.getenv("FRONTEND_URL")
if env_frontend_url and env_frontend_url.strip():
    cleaned_url = env_frontend_url.strip().rstrip("/")
    if cleaned_url not in allowed_origins:
        allowed_origins.append(cleaned_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# -----------------------------------------------------------------------------
# Error Handling
# -----------------------------------------------------------------------------
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """
    Formats Pydantic validation errors into a clean, human-readable JSON response.
    """
    logger.warning("Validation failure on %s: %s", request.url.path, exc.errors())
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "status": "error",
            "message": "Invalid telemetry payload structure or values out of allowed range",
            "details": exc.errors(),
        },
    )


# -----------------------------------------------------------------------------
# API Endpoints
# -----------------------------------------------------------------------------
@app.get(
    "/",
    response_model=RootResponse,
    status_code=status.HTTP_200_OK,
    tags=["Root"],
    summary="Service Identification",
)
async def read_root() -> dict:
    """
    Root service identification endpoint.
    Returns status and service title.
    """
    return {
        "status": "online",
        "service": "Laboratory Monitoring Backend",
    }


@app.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    tags=["Health"],
    summary="Health Check Probe",
)
async def health_check() -> dict:
    """
    Service liveness probe endpoint.
    Returns healthy status code when FastAPI is accepting requests.
    """
    return {
        "status": "healthy",
    }


@app.post(
    "/api/metrics",
    response_model=MetricsResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Metrics"],
    summary="Ingest Laboratory PC Telemetry",
)
async def ingest_metrics(
    payload: MetricsCreate,
    db: Optional[Session] = Depends(get_db),
) -> dict:
    """
    Ingest hardware telemetry sent by a Python agent on a laboratory workstation.

    - Validates CPU, RAM, disk, temperature, and timestamp fields using Pydantic.
    - If PostgreSQL is connected, synchronizes the Device record and persists the Metric record.
    - If running standalone without a database, acknowledges and echoes the validated payload.
    """
    logger.info(
        "Received telemetry from %s (%s) - CPU: %.1f%%, RAM: %.1f%%, Disk: %.1f%%",
        payload.device_id,
        payload.ip_address,
        payload.cpu_usage,
        payload.ram_usage,
        payload.disk_usage,
    )

    # If database session is available, optionally persist records
    if db is not None:
        try:
            from models import Device, Metric

            # Check if device already exists, otherwise create new device
            device = db.query(Device).filter(Device.device_id == payload.device_id).first()
            if not device:
                device = Device(
                    device_id=payload.device_id,
                    hostname=payload.hostname,
                    ip_address=payload.ip_address,
                    status="online",
                    last_seen=payload.timestamp,
                )
                db.add(device)
            else:
                # Update existing device status and last_seen
                device.hostname = payload.hostname
                device.ip_address = payload.ip_address
                device.status = "online"
                device.last_seen = payload.timestamp

            # Create new time-series metric entry
            metric_record = Metric(
                device_id=payload.device_id,
                timestamp=payload.timestamp,
                cpu_usage=payload.cpu_usage,
                ram_usage=payload.ram_usage,
                ram_total=payload.ram_total,
                ram_used=payload.ram_used,
                disk_usage=payload.disk_usage,
                disk_total=payload.disk_total,
                disk_used=payload.disk_used,
                temperature=payload.temperature,
            )
            db.add(metric_record)
            db.commit()
            logger.debug("Successfully persisted telemetry for %s to PostgreSQL", payload.device_id)
        except Exception as exc:
            db.rollback()
            logger.error("Failed to commit metrics to database: %s", exc)
            # We do not fail the HTTP request so monitoring agent does not break

    # Return validated telemetry and receipt acknowledgement
    return {
        "status": "received",
        "message": "Telemetry metrics successfully validated and accepted",
        "data": payload,
    }
