import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import DATABASE_URL

logger = logging.getLogger("brandguard.database")

# Handle PostgreSQL and SQLite URLs cleanly
# For PostgreSQL with psycopg 3: postgresql+psycopg://user:pass@host:port/dbname
db_url = DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg://", 1)
elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+psycopg://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

# Connection engine
connect_args = {}
if "sqlite" in db_url:
    connect_args = {"check_same_thread": False}

try:
    engine = create_engine(
        db_url,
        connect_args=connect_args,
        pool_pre_ping=True,
        echo=False
    )
    # Validate primary connection
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
except Exception as e:
    # Safe fallback if connection string is invalid or DB server is not reachable
    logger.warning(f"Primary database not accessible ({e}). Falling back to local SQLite.")
    engine = create_engine("sqlite:///./brandguard.db", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency for database session management."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def test_database_connection() -> dict:
    """Test the database connection without exposing passwords."""
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1")).scalar()
            is_postgres = "postgresql" in str(engine.url.drivername)
            db_name = engine.url.database or "default"
            return {
                "connected": result == 1,
                "dialect": engine.dialect.name,
                "database_name": db_name,
                "is_postgresql": is_postgres,
                "error": None
            }
    except Exception as e:
        error_msg = str(e)
        # Sanitize error message to prevent leaking credentials
        sanitized_error = error_msg.split("@")[-1] if "@" in error_msg else error_msg
        return {
            "connected": False,
            "dialect": engine.dialect.name if hasattr(engine, "dialect") else "unknown",
            "database_name": getattr(engine.url, "database", None),
            "is_postgresql": "postgresql" in str(getattr(engine.url, "drivername", "")),
            "error": f"Connection failed: {sanitized_error}"
        }

