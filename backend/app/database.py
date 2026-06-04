import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# Determine DB URL based on environment variable or default to SQLite for dev
SQLITE_URL = "sqlite:///./dev.db"
POSTGRES_URL = os.getenv("DATABASE_URL")  # e.g., postgres://user:pass@localhost/dbname

DATABASE_URL = POSTGRES_URL if POSTGRES_URL else SQLITE_URL

# Connect args for SQLite to allow multithreading
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {},
    echo=False,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
