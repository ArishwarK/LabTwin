"""
SQLAlchemy 2.x ORM models for the Laboratory Monitoring System.
Defines Device and Metric entities designed for PostgreSQL / Cloud SQL.
"""

from datetime import datetime
from typing import List, Optional
from sqlalchemy import (
    BigInteger,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class Device(Base):
    """
    Represents a physical or virtual laboratory workstation being monitored.
    """
    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(
        String(100),
        unique=True,
        index=True,
        nullable=False,
        comment="Unique identifier for the PC (e.g. LAB-A-PC01 or MAC address)"
    )
    hostname: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Operating system hostname"
    )
    ip_address: Mapped[str] = mapped_column(
        String(45),
        nullable=False,
        comment="IPv4 or IPv6 network address"
    )
    status: Mapped[str] = mapped_column(
        String(50),
        default="online",
        nullable=False,
        comment="Current status flag: online, idle, offline, maintenance"
    )
    last_seen: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="Timestamp of the most recent telemetry packet received"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
        comment="Registration timestamp of this lab workstation"
    )

    # 1-to-many relationship: One device has many time-series metric readings
    metrics: Mapped[List["Metric"]] = relationship(
        "Metric",
        back_populates="device",
        cascade="all, delete-orphan",
        order_by="desc(Metric.timestamp)"
    )

    def __repr__(self) -> str:
        return f"<Device(device_id={self.device_id!r}, hostname={self.hostname!r}, status={self.status!r})>"


class Metric(Base):
    """
    Time-series hardware telemetry readings reported by Python agents on lab PCs.
    """
    __tablename__ = "metrics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    device_id: Mapped[str] = mapped_column(
        String(100),
        ForeignKey("devices.device_id", ondelete="CASCADE"),
        index=True,
        nullable=False,
        comment="Foreign key matching the device identifier"
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        comment="Time at which metrics were captured on the client PC"
    )
    cpu_usage: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        comment="CPU utilization percentage (0.0 to 100.0)"
    )
    ram_usage: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        comment="RAM utilization percentage (0.0 to 100.0)"
    )
    ram_total: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        comment="Total installed system RAM in bytes"
    )
    ram_used: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        comment="Current RAM usage in bytes"
    )
    disk_usage: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        comment="Primary storage disk utilization percentage (0.0 to 100.0)"
    )
    disk_total: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        comment="Total disk capacity in bytes"
    )
    disk_used: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
        comment="Used disk space in bytes"
    )
    temperature: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        comment="Processor core temperature in Celsius (optional)"
    )

    # Many-to-1 relationship back to Device
    device: Mapped["Device"] = relationship("Device", back_populates="metrics")

    def __repr__(self) -> str:
        return (
            f"<Metric(id={self.id}, device_id={self.device_id!r}, "
            f"cpu={self.cpu_usage}%, ram={self.ram_usage}%, time={self.timestamp})>"
        )
