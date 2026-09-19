"""
Pydantic v2 schemas for validating incoming telemetry from laboratory PCs
and structuring responses for the FastAPI endpoints.
"""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class MetricsCreate(BaseModel):
    """
    Schema representing incoming telemetry payload sent by the Python monitoring agent
    running locally on each laboratory workstation.
    """
    model_config = ConfigDict(
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "device_id": "LAB-A-PC01",
                "hostname": "CIT-CSE-LAB01",
                "ip_address": "192.168.10.101",
                "cpu_usage": 34.5,
                "ram_usage": 58.2,
                "ram_total": 17179869184,
                "ram_used": 9998684160,
                "disk_usage": 42.8,
                "disk_total": 512110190592,
                "disk_used": 219183161344,
                "temperature": 48.5,
                "timestamp": "2026-09-19T16:45:00Z"
            }
        }
    )

    device_id: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Unique identifier for the PC (e.g. LAB-A-PC01)"
    )
    hostname: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Operating system hostname of the workstation"
    )
    ip_address: str = Field(
        ...,
        min_length=7,
        max_length=45,
        description="Current local IPv4 or IPv6 address"
    )
    cpu_usage: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="CPU utilization percentage strictly between 0.0 and 100.0"
    )
    ram_usage: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="RAM utilization percentage strictly between 0.0 and 100.0"
    )
    ram_total: int = Field(
        ...,
        gt=0,
        description="Total system RAM capacity in bytes"
    )
    ram_used: int = Field(
        ...,
        ge=0,
        description="Currently consumed RAM in bytes"
    )
    disk_usage: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Primary disk utilization percentage strictly between 0.0 and 100.0"
    )
    disk_total: int = Field(
        ...,
        gt=0,
        description="Total disk space capacity in bytes"
    )
    disk_used: int = Field(
        ...,
        ge=0,
        description="Currently consumed disk space in bytes"
    )
    temperature: Optional[float] = Field(
        default=None,
        ge=-40.0,
        le=150.0,
        description="CPU core or package temperature in Celsius (optional)"
    )
    timestamp: datetime = Field(
        ...,
        description="Telemetry capture timestamp in ISO 8601 format"
    )


class MetricsResponse(BaseModel):
    """
    Response schema returned after successful telemetry ingestion.
    """
    status: str = Field(default="received", description="Ingestion status flag")
    message: str = Field(
        default="Telemetry metrics successfully validated and accepted",
        description="Descriptive status message"
    )
    data: MetricsCreate = Field(..., description="Echoed and validated telemetry payload")
    received_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Timestamp when the backend server accepted the request"
    )


class HealthResponse(BaseModel):
    """Schema for GET /health endpoint."""
    status: str = Field(default="healthy", description="Health check status")


class RootResponse(BaseModel):
    """Schema for GET / endpoint."""
    status: str = Field(default="online", description="Service online status")
    service: str = Field(
        default="Laboratory Monitoring Backend",
        description="Name of the backend microservice"
    )
