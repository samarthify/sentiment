#!/usr/bin/env python3
"""
Script to copy all data from the remote database to the local SQLite database.
This will give you a complete local copy for faster testing.
"""

import os
import sys
from pathlib import Path
from datetime import datetime
import json

# Add src to path so we can import models
sys.path.append(str(Path(__file__).parent / "src"))

def copy_database_data():
    """Copy all data from remote database to local SQLite database"""
    
    try:
        print("Starting database copy process...")
        print()
        
        # Import required modules
        from api import models
        from api.database import SessionLocal
        from sqlalchemy import create_engine
        from sqlalchemy.orm import sessionmaker
        
        # Hardcoded database URL for the remote PostgreSQL database
        original_db_url = "postgresql://postgres:ProjectAlpha_34@sentiment-analysis.cbk0s6ece5f7.ap-south-1.rds.amazonaws.com:5432/sentiment-analysis"
        print(f"Source database: {original_db_url[:50]}...")
            
        print(f"Source database: {original_db_url[:50]}...")
        
        # Set up connections
        local_db_url = "sqlite:///./sentiment_analysis_local.db"
        print(f"Target database: {local_db_url}")
        print()
        
        # Create engines for both databases
        remote_engine = create_engine(original_db_url)
        local_engine = create_engine(local_db_url)
        
        # Create sessions
        RemoteSession = sessionmaker(autocommit=False, autoflush=False, bind=remote_engine)
        LocalSession = sessionmaker(autocommit=False, autoflush=False, bind=local_engine)
        
        remote_db = RemoteSession()
        local_db = LocalSession()
        
        print("Connected to both databases successfully!")
        print()
        
        # Copy SentimentData table
        print("Copying SentimentData records...")
        
        # Get all records from remote database
        remote_records = remote_db.query(models.SentimentData).all()
        total_records = len(remote_records)
        
        print(f"Found {total_records} records in remote database")
        
        if total_records == 0:
            print("No records found to copy")
            return True
        
        # Clear existing local data
        local_db.query(models.SentimentData).delete()
        local_db.commit()
        print("Cleared existing local data")
        
        # Copy records in batches for better performance
        batch_size = 100
        copied_count = 0
        
        for i in range(0, total_records, batch_size):
            batch = remote_records[i:i + batch_size]
            
            for record in batch:
                # Create new record with same data
                new_record = models.SentimentData(
                    run_timestamp=record.run_timestamp,
                    user_id=record.user_id,
                    title=record.title,
                    description=record.description,
                    content=record.content,
                    url=record.url,
                    published_date=record.published_date,
                    source=record.source,
                    source_url=record.source_url,
                    query=record.query,
                    language=record.language,
                    platform=record.platform,
                    date=record.date,
                    text=record.text,
                    file_source=record.file_source,
                    original_id=record.original_id,
                    alert_id=record.alert_id,
                    published_at=record.published_at,
                    source_type=record.source_type,
                    country=record.country,
                    favorite=record.favorite,
                    tone=record.tone,
                    source_name=record.source_name,
                    parent_url=record.parent_url,
                    parent_id=record.parent_id,
                    children=record.children,
                    direct_reach=record.direct_reach,
                    cumulative_reach=record.cumulative_reach,
                    domain_reach=record.domain_reach,
                    tags=record.tags,
                    score=record.score,
                    alert_name=record.alert_name,
                    type=record.type,
                    post_id=record.post_id,
                    retweets=record.retweets,
                    likes=record.likes,
                    user_location=record.user_location,
                    comments=record.comments,
                    user_name=record.user_name,
                    user_handle=record.user_handle,
                    user_avatar=record.user_avatar,
                    sentiment_label=record.sentiment_label,
                    sentiment_score=record.sentiment_score,
                    sentiment_justification=record.sentiment_justification,
                    created_at=record.created_at or datetime.now()
                )
                local_db.add(new_record)
            
            # Commit batch
            local_db.commit()
            copied_count += len(batch)
            
            print(f"Copied {copied_count}/{total_records} records ({(copied_count/total_records)*100:.1f}%)")
        
        print()
        print("Copying other tables...")
        
        # Copy Users table
        try:
            remote_users = remote_db.query(models.User).all()
            if remote_users:
                local_db.query(models.User).delete()
                for user in remote_users:
                    new_user = models.User(
                        id=user.id,
                        email=user.email,
                        created_at=user.created_at,
                        last_login=user.last_login,
                        is_admin=user.is_admin,
                        api_calls_count=user.api_calls_count,
                        data_entries_count=user.data_entries_count
                    )
                    local_db.add(new_user)
                local_db.commit()
                print(f"Copied {len(remote_users)} users")
        except Exception as e:
            print(f"Note: Could not copy users table: {e}")
        
        # Copy other tables (EmailConfiguration, TargetIndividualConfiguration, etc.)
        try:
            # EmailConfiguration
            remote_email_configs = remote_db.query(models.EmailConfiguration).all()
            if remote_email_configs:
                local_db.query(models.EmailConfiguration).delete()
                for config in remote_email_configs:
                    new_config = models.EmailConfiguration(
                        id=config.id,
                        user_id=config.user_id,
                        recipients=config.recipients,
                        frequency=config.frequency,
                        is_active=config.is_active,
                        created_at=config.created_at,
                        updated_at=config.updated_at
                    )
                    local_db.add(new_config)
                local_db.commit()
                print(f"Copied {len(remote_email_configs)} email configurations")
        except Exception as e:
            print(f"Note: Could not copy email configurations: {e}")
        
        try:
            # TargetIndividualConfiguration
            remote_target_configs = remote_db.query(models.TargetIndividualConfiguration).all()
            if remote_target_configs:
                local_db.query(models.TargetIndividualConfiguration).delete()
                for config in remote_target_configs:
                    new_config = models.TargetIndividualConfiguration(
                        id=config.id,
                        user_id=config.user_id,
                        individual_name=config.individual_name,
                        query_variations=config.query_variations,
                        created_at=config.created_at,
                        updated_at=config.updated_at
                    )
                    local_db.add(new_config)
                local_db.commit()
                print(f"Copied {len(remote_target_configs)} target configurations")
        except Exception as e:
            print(f"Note: Could not copy target configurations: {e}")
        
        # Final verification
        local_count = local_db.query(models.SentimentData).count()
        justified_count = local_db.query(models.SentimentData).filter(
            models.SentimentData.sentiment_justification.isnot(None),
            models.SentimentData.sentiment_justification != ""
        ).count()
        
        print()
        print("Copy completed!")
        print(f"Total records in local database: {local_count}")
        print(f"Records with AI justification: {justified_count}")
        
        # Close connections
        remote_db.close()
        local_db.close()
        
        return True
        
    except Exception as e:
        print(f"Error during database copy: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main function"""
    print("Database Copy Tool")
    print("==================")
    print()
    print("This will copy all data from your remote database to a local SQLite database")
    print("for faster testing and development.")
    print()
    
    # Database URL is now hardcoded, no environment variable needed
    print("Using hardcoded PostgreSQL database connection")
    
    if copy_database_data():
        print()
        print("Success! Your data has been copied to the local database.")
        print()
        print("To use the local database:")
        print("1. Set: $env:DATABASE_URL = 'sqlite:///./sentiment_analysis_local.db'")
        print("2. Run: python -m src.api.service")
        print("3. Test the /latest-data endpoint - should be much faster!")
        print()
        print("To switch back to remote database:")
        print("1. Reset DATABASE_URL to your original remote connection string")
    else:
        print()
        print("Copy failed. Please check the error messages above.")

if __name__ == "__main__":
    main()
