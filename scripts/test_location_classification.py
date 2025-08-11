#!/usr/bin/env python3
"""
Simple test script for location classification
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from api.database import SessionLocal
from api.models import SentimentData

print("Testing location classification...")

# Create database session
db = SessionLocal()

try:
    # Get total count of records
    total_records = db.query(SentimentData).count()
    print(f"Total records in database: {total_records}")
    
    # Get a sample record
    sample_record = db.query(SentimentData).first()
    if sample_record:
        print(f"Sample record ID: {sample_record.entry_id}")
        print(f"Sample record country: {sample_record.country}")
        print(f"Sample record source: {sample_record.source}")
        print(f"Sample record platform: {sample_record.platform}")
        print(f"Sample record text preview: {sample_record.text[:100] if sample_record.text else 'No text'}...")
    else:
        print("No records found in database")
    
    # Check country distribution
    from sqlalchemy import func
    country_counts = db.query(SentimentData.country, func.count(SentimentData.entry_id)).group_by(SentimentData.country).all()
    print("\nCurrent country distribution:")
    for country, count in country_counts:
        print(f"  {country or 'None'}: {count}")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()

print("Test completed!")
