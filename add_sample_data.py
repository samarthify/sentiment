#!/usr/bin/env python3
"""
Quick script to add sample data to the local database for testing.
"""

import os
import sys
from pathlib import Path
from datetime import datetime, timedelta
import uuid

# Add src to path so we can import models
sys.path.append(str(Path(__file__).parent / "src"))

def add_sample_data():
    """Add sample sentiment data to the local database"""
    
    try:
        # Set the database URL
        os.environ["DATABASE_URL"] = "sqlite:///./sentiment_analysis_local.db"
        
        from api import models
        from api.database import SessionLocal
        
        # Create session
        db = SessionLocal()
        
        print("Adding sample data to local database...")
        
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
                "text": "Negative sentiment about recent policy changes causing concern among citizens",
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
                "text": "Neutral update on latest developments in the region without strong opinions",
                "sentiment_label": "neutral",
                "sentiment_score": 0.02,
                "sentiment_justification": "Recommended Action: Continue monitoring. The text provides factual information without strong emotional indicators.",
                "source": "news",
                "platform": "sample_news",
                "date": datetime.now() - timedelta(hours=6),
                "run_timestamp": datetime.now(),
                "user_id": uuid.uuid4()
            },
            {
                "text": "Highly positive response to new economic reforms showing great promise",
                "sentiment_label": "positive",
                "sentiment_score": 0.92,
                "sentiment_justification": "Recommended Action: Amplify positive messaging. Strong positive sentiment towards reforms indicates good public reception.",
                "source": "social",
                "platform": "twitter",
                "date": datetime.now() - timedelta(hours=3),
                "run_timestamp": datetime.now(),
                "user_id": uuid.uuid4()
            },
            {
                "text": "Critical analysis of government spending shows concerning trends",
                "sentiment_label": "negative",
                "sentiment_score": -0.65,
                "sentiment_justification": "Recommended Action: Prepare response strategy. Critical analysis may influence public opinion on fiscal policy.",
                "source": "news",
                "platform": "reuters",
                "date": datetime.now() - timedelta(hours=2),
                "run_timestamp": datetime.now(),
                "user_id": uuid.uuid4()
            }
        ]
        
        # Add sample entries
        for entry_data in sample_entries:
            # Set created_at manually to avoid SQLite func.now() issue
            entry_data["created_at"] = datetime.now()
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

if __name__ == "__main__":
    if add_sample_data():
        print("Sample data added successfully!")
        print("")
        print("You can now start the API server with:")
        print("  python -m src.api.service")
        print("")
        print("And test the /latest-data endpoint - it should be much faster with local data!")
    else:
        print("Failed to add sample data")
