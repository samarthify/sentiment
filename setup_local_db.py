#!/usr/bin/env python3
"""
Script to set up a local SQLite database for testing.
This will create the proper schema and optionally populate with sample data.
"""

import os
import sys
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add src to path so we can import models
sys.path.append(str(Path(__file__).parent / "src"))

def setup_local_database():
    """Set up local SQLite database with proper schema"""
    
    # Set up local database URL
    local_db_url = "sqlite:///./sentiment_analysis_local.db"
    
    print(f"Setting up local database: {local_db_url}")
    
    try:
        # Import models after setting up path
        from api import models
        from api.database import Base
        
        # Create engine
        engine = create_engine(local_db_url, echo=True)
        
        # Create all tables
        print("Creating database schema...")
        Base.metadata.create_all(bind=engine)
        
        print("Local database schema created successfully!")
        print(f"   Database file: sentiment_analysis_local.db")
        print(f"   Connection URL: {local_db_url}")
        
        return engine, local_db_url
        
    except Exception as e:
        print(f"Error setting up database: {e}")
        import traceback
        traceback.print_exc()
        return None, None

def create_startup_script():
    """Create a PowerShell script to start the API with local database"""
    
    ps_script = """# PowerShell script to start API with local database
Write-Host "Starting API server with local SQLite database..." -ForegroundColor Green

# Set environment variable for local database
$env:DATABASE_URL = "sqlite:///./sentiment_analysis_local.db"

Write-Host "Database URL: $env:DATABASE_URL" -ForegroundColor Yellow

# Start the API server
Write-Host "Starting API server..." -ForegroundColor Cyan
python -m src.api.service
"""
    
    with open("start_local_api.ps1", "w", encoding='utf-8') as f:
        f.write(ps_script)
    
    print("Created start_local_api.ps1")

def create_sample_data(engine):
    """Create some sample sentiment data for testing"""
    
    try:
        from api import models
        from sqlalchemy.orm import sessionmaker
        from datetime import datetime, timedelta
        import uuid
        
        # Create session
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
        
        print("Creating sample data...")
        
        # Sample data entries with correct field names
        sample_entries = [
            {
                "text": "This is a positive sentiment example with great news about the economy",
                "sentiment_label": "positive",
                "sentiment_score": 0.85,
                "sentiment_justification": "Recommended Action: Monitor positive economic indicators. The text expresses optimism about economic conditions.",
                "source": "news",
                "platform": "sample_news",
                "date": datetime.now() - timedelta(days=1),
                "run_timestamp": datetime.now(),
                "user_id": uuid.uuid4()
            },
            {
                "text": "Negative sentiment about recent policy changes causing concern",
                "sentiment_label": "negative", 
                "sentiment_score": -0.72,
                "sentiment_justification": "Recommended Action: Address policy concerns. The text shows dissatisfaction with recent policy changes.",
                "source": "social",
                "platform": "sample_social",
                "date": datetime.now() - timedelta(hours=12),
                "run_timestamp": datetime.now(),
                "user_id": uuid.uuid4()
            },
            {
                "text": "Neutral update on latest developments in the region",
                "sentiment_label": "neutral",
                "sentiment_score": 0.02,
                "sentiment_justification": "Recommended Action: Continue monitoring. The text provides factual information without strong emotional indicators.",
                "source": "news",
                "platform": "sample_news",
                "date": datetime.now() - timedelta(hours=6),
                "run_timestamp": datetime.now(),
                "user_id": uuid.uuid4()
            }
        ]
        
        # Add sample entries
        for entry_data in sample_entries:
            entry = models.SentimentData(**entry_data)
            db.add(entry)
        
        db.commit()
        
        # Check what we created
        count = db.query(models.SentimentData).count()
        justified_count = db.query(models.SentimentData).filter(
            models.SentimentData.sentiment_justification.isnot(None),
            models.SentimentData.sentiment_justification != ""
        ).count()
        
        print(f"Created {count} sample records")
        print(f"Records with AI justification: {justified_count}")
        
        db.close()
        return True
        
    except Exception as e:
        print(f"Error creating sample data: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main setup function"""
    print("Setting up local database for sentiment analysis testing...")
    print()
    
    # Setup database schema
    engine, db_url = setup_local_database()
    
    if engine is None:
        print("Failed to set up database")
        return
    
    print()
    
    # Create sample data
    print("Creating sample data for testing...")
    # For automation, let's create sample data
    if create_sample_data(engine):
        print("Sample data created successfully!")
    
    print()
    
    # Create startup script
    create_startup_script()
    
    print()
    print("Local database setup complete!")
    print()
    print("Next steps:")
    print("   1. Run: ./start_local_api.ps1 (in PowerShell)")
    print("   2. Or manually set: $env:DATABASE_URL = 'sqlite:///./sentiment_analysis_local.db'")
    print("   3. Then run: python -m src.api.service")
    print("   4. Test the /latest-data endpoint - should be much faster!")
    print()
    print(f"Local database: sentiment_analysis_local.db")
    print(f"Connection URL: {db_url}")

if __name__ == "__main__":
    main()
