from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
import os
from dotenv import load_dotenv
from pathlib import Path

# Load environment variables from .env file located in config directory
env_path = Path(__file__).parent.parent.parent / 'config' / '.env'
load_dotenv(dotenv_path=env_path)

DATABASE_URL = os.getenv("DATABASE_URL")
print(f"DEBUG: DATABASE_URL read by src/api/database.py: {DATABASE_URL}")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set. Please configure it in config/.env")

# Configure the engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # Check connections before use
    pool_recycle=3600    # Recycle connections every hour
)

# Configure the session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models (can be imported from models.py if preferred)
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Function to create tables (optional - use Alembic for migrations)
def create_tables():
    # Import your models here before calling create_all
    from . import models
    try:
        print("Attempting to create tables...")
        Base.metadata.create_all(bind=engine)
        print("Tables created successfully (if they didn't exist). Use Alembic for migrations.")
    except Exception as e:
        print(f"Error creating tables: {e}")
        print("Ensure the database server is running and the DATABASE_URL is correct.") 