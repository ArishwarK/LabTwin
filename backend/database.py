"""
Database configuration for the Laboratory Monitoring System.
Uses SQLAlchemy 2.x with support for PostgreSQL (via psycopg 3).
Designed to allow FastAPI to boot cleanly even when the database is not yet configured.
"""

import os
import logging
from typing import Generator, Optional
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session

# Load environment variables from backend/.env if present
load_dotenv()

logger = logging.getLogger("laboratory_monitoring.database")

# Read database connection string from environment
DATABASE_URL: Optional[str] = os.getenv("DATABASE_URL")

engine = None
SessionLocal = None

if DATABASE_URL and DATABASE_URL.strip():
    try:
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            echo=False,
        )
        SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=engine,
        )
        logger.info("SQLAlchemy engine initialized for PostgreSQL database.")
    except Exception as exc:
        logger.warning(
            "Could not initialize database engine with provided DATABASE_URL: %s. "
            "FastAPI will start in disconnected local development mode.",
            exc,
        )
        engine = None
        SessionLocal = None
else:
    logger.info(
        "DATABASE_URL not configured. FastAPI running in local development mode without PostgreSQL."
    )


class Base(DeclarativeBase):
    """Base declarative class for all SQLAlchemy 2.x models."""
    pass


def get_db() -> Generator[Optional[Session], None, None]:
    """
    FastAPI dependency that provides a SQLAlchemy session if the database is configured.
    Yields None if the database is not configured so endpoints remain resilient.
    """
    if SessionLocal is None:
        yield None
        return

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> bool:
    """
    Helper function to create all registered tables in the target database.
    Returns True if migration executed, False if database is not configured.
    """
    if engine is None:
        logger.warning("Database engine is not configured; skipping table creation.")
        return False

    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables verified/created successfully.")
        return True
    except Exception as exc:
        logger.error("Failed to create database tables: %s", exc)
        return False
