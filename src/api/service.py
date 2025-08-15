from fastapi import FastAPI, WebSocket, HTTPException, BackgroundTasks, Depends, Response, status, Request, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import json
import asyncio
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta, timezone
import pandas as pd
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field
import logging
import uuid
from uuid import UUID
# Database imports
from sqlalchemy.orm import Session
from sqlalchemy import desc
from . import models, database, admin
from .database import SessionLocal, engine, get_db
from .middlewares import UsageTrackingMiddleware
from sqlalchemy import text
# Import the agent
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from agent.core import SentimentAnalysisAgent
from utils.mail_sender import MailSender
from utils.scheduled_reports import ReportScheduler

# Import presidential analysis service
from .presidential_service import add_presidential_endpoints

# Import the auth dependency
from .auth import get_current_user_id

from dotenv import load_dotenv
load_dotenv()

# --- Create tables on startup (or use Alembic) ---
# database.Base.metadata.create_all(bind=engine) # Use Alembic upgrade instead
# ----------------------------------------------------

logger = logging.getLogger("api_service")

app = FastAPI()

origins=[
	"http://localhost:3000",
	"http://13.202.48.110:3000",
    "http://localhost:3001",  # Add this
    "http://13.202.48.110:3001",
]
# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add the usage tracking middleware
app.add_middleware(UsageTrackingMiddleware)


# Include the admin router
app.include_router(admin.router)

# Add presidential analysis endpoints
add_presidential_endpoints(app)

# Initialize agent
try:
    agent = SentimentAnalysisAgent(db_factory=SessionLocal)
except Exception as e:
    logger.error(f"Failed to initialize SentimentAnalysisAgent: {e}", exc_info=True)
    # Decide how to handle this error - exit, run without agent?
    agent = None # Or a dummy agent

# Store active WebSocket connections
active_connections: List[WebSocket] = []

# Initialize email services
mail_sender = MailSender()
report_scheduler = None

# === In-memory data storage ===
# Use pandas DataFrames to store the data
# latest_data_df: Optional[pd.DataFrame] = None
# previous_data_df: Optional[pd.DataFrame] = None
# last_update_time: Optional[datetime] = None
# =============================

class UserSignup(BaseModel):
    id: str
    email: EmailStr
    name: str
    password: str
    is_admin: Optional[bool] = False  # Optional, defaults to False


class DataRecord(BaseModel):
    # Updated to match SentimentData model fields derived from CSV header
    title: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    url: Optional[str] = None
    published_date: Optional[datetime] = None
    source: Optional[str] = None
    source_url: Optional[str] = None
    query: Optional[str] = None
    language: Optional[str] = None
    platform: Optional[str] = None
    date: Optional[datetime] = None # Specific 'date' field
    text: Optional[str] = None
    file_source: Optional[str] = None
    id: Optional[str] = None # This corresponds to 'original_id' in the DB model
    alert_id: Optional[int] = None
    published_at: Optional[datetime] = None # Specific 'published_at' field
    source_type: Optional[str] = None
    country: Optional[str] = None
    favorite: Optional[bool] = None
    tone: Optional[str] = None
    source_name: Optional[str] = None
    parent_url: Optional[str] = None
    parent_id: Optional[str] = None
    children: Optional[int] = None
    direct_reach: Optional[int] = None
    cumulative_reach: Optional[int] = None
    domain_reach: Optional[int] = None
    tags: Optional[str] = None # Consider Union[List[str], str] or just str
    score: Optional[float] = None # General score
    alert_name: Optional[str] = None
    type: Optional[str] = None # 'type' field
    post_id: Optional[str] = None
    retweets: Optional[int] = None
    likes: Optional[int] = None
    user_location: Optional[str] = None
    comments: Optional[int] = None
    user_name: Optional[str] = None
    user_handle: Optional[str] = None
    user_avatar: Optional[str] = None
    sentiment_label: Optional[str] = None
    sentiment_score: Optional[float] = None
    sentiment_justification: Optional[str] = None

class DataUpdateRequest(BaseModel):
    user_id: str # Added user_id field
    data: List[DataRecord]

class CommandRequest(BaseModel):
    command: str
    params: Optional[Dict[str, Any]] = None

async def broadcast_update(message: Dict[str, Any]):
    """Broadcast updates to all connected clients"""
    for connection in active_connections:
        try:
            await connection.send_json(message)
        except:
            # Remove connection safely if send fails
            if connection in active_connections:
                active_connections.remove(connection)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            # Keep connection alive and handle incoming messages
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
            elif data == "status":
                # Avoid blocking websocket: run agent call in executor or make agent async
                status_data = agent.get_status() # Assuming get_status is fast
                await websocket.send_json(status_data)
    except Exception as e:
        logger.warning(f"WebSocket error or connection closed: {e}")
    finally:
        if websocket in active_connections:
             active_connections.remove(websocket)

@app.get("/status")
async def get_status():
    """Get current agent status"""
    # This likely doesn't need DB access unless status includes DB stats
    return agent.get_status()

@app.post("/command")
async def execute_command(request: CommandRequest):
    """Execute a command on the agent"""
    # This likely doesn't need DB access unless command involves DB
    result = agent.execute_command(request.command, request.params)
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['message'])
    # Avoid blocking: run get_status in executor if it becomes slow
    status_data = agent.get_status()
    await broadcast_update({'type': 'status_update', 'data': status_data})
    return result

def parse_datetime(dt_input: Optional[Any]) -> Optional[datetime]:
    """Helper function to parse and clean datetime fields"""
    if dt_input is None:
        return None
    
    parsed_dt = None
    if isinstance(dt_input, str):
        try:
            # Try to parse string datetime, including 'Z' timezone indicator (for ISO format)
            parsed_dt = datetime.fromisoformat(dt_input.replace('Z', '+00:00'))
        except ValueError:
            logger.warning(f"Could not parse timestamp: {dt_input}. Setting to None.")
            return None
    elif isinstance(dt_input, datetime):
        parsed_dt = dt_input
    else:
        logger.warning(f"Unexpected type for timestamp: {type(dt_input)}. Setting to None.")
        return None

    # Ensure the datetime is naive (no timezone)
    if parsed_dt and parsed_dt.tzinfo:
        return parsed_dt.replace(tzinfo=None)
    
    return parsed_dt

@app.post("/data/update")
async def update_data(request: DataUpdateRequest, db: Session = Depends(get_db)):
    try:
        user_id = request.user_id  # Get user_id from request
        new_records = request.data
        if not new_records:
            return {"status": "success", "message": "No new data received."}

        current_run_time = datetime.now()  # Timestamp for this batch
        db_objects = []  # To store all the records to be added

        for record in new_records:
            logger.debug(f"Row: {record}")
            db_obj = models.SentimentData(
                user_id=user_id, # Assign the user ID from the request
                run_timestamp=current_run_time,
                 # Map all fields from DataRecord to SentimentData
                title=record.title,
                description=record.description,
                content=record.content,
                url=record.url,
                published_date=parse_datetime(record.published_date),
                source=record.source,
                source_url=record.source_url,
                query=record.query,
                language=record.language,
                platform=record.platform,
                date=parse_datetime(record.date), # Specific 'date' field
                text=record.text,
                file_source=record.file_source,
                original_id=record.id, # Map request 'id' to DB 'original_id'
                alert_id=record.alert_id,
                published_at=parse_datetime(record.published_at), # Specific 'published_at'
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
                tags=record.tags, # Assuming tags is a string; adjust if it's list/JSON
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
                sentiment_justification=record.sentiment_justification # Added justification
            )
            db_objects.append(db_obj)

        if db_objects:
            db.add_all(db_objects)
            db.commit()  # Commit the transaction
            logger.info(f"Successfully added {len(db_objects)} records to the database.")
            
            # Invalidate cache when new data is added
            try:
                from .data_cache import sentiment_cache
                sentiment_cache.clear_cache()
                logger.info("Cache invalidated due to new data")
            except Exception as cache_error:
                logger.warning(f"Failed to invalidate cache: {cache_error}")
            
            return {"status": "success", "message": f"Data updated with {len(db_objects)} records."}
        else:
            return {"status": "success", "message": "No records to add."}

    except Exception as e:
        db.rollback()  # Rollback in case of error during commit
        logger.error(f"Error updating database: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error updating database: {e}")


def get_latest_run_timestamp(db: Session, user_id: Optional[str] = None) -> Optional[datetime]:
    """Helper function to get the timestamp of the most recent run, optionally filtered by user_id."""
    query = db.query(models.SentimentData.run_timestamp)
    if user_id:
        query = query.filter(models.SentimentData.user_id == user_id)
    
    latest_run = query.order_by(desc(models.SentimentData.run_timestamp)).first()
    return latest_run[0] if latest_run else None

def deduplicate_sentiment_data(records: List[models.SentimentData]) -> List[models.SentimentData]:
    """
    Deduplicate sentiment data records based on content similarity.
    Uses the same logic as the data processor to ensure consistency.
    """
    if not records:
        return records
    
    logger.info(f"Starting deduplication of {len(records)} records")
    
    # Convert to list of dictionaries for easier processing
    records_dict = []
    for record in records:
        # Get the main text content
        text_content = record.text or record.content or record.title or record.description or ""
        records_dict.append({
            'record': record,
            'text': text_content,
            'normalized_text': normalize_text_for_dedup(text_content)
        })
    
    # Remove exact duplicates based on normalized text
    seen_texts = set()
    unique_records = []
    
    for item in records_dict:
        normalized_text = item['normalized_text']
        if normalized_text not in seen_texts:
            seen_texts.add(normalized_text)
            unique_records.append(item['record'])
    
    logger.info(f"After exact deduplication: {len(unique_records)} records (removed {len(records) - len(unique_records)} duplicates)")
    
    # Skip similarity deduplication for performance
    logger.info(f"Skipping similarity deduplication for performance")
    
    return unique_records

def normalize_text_for_dedup(text: str) -> str:
    """
    Normalize text for deduplication (same logic as data processor).
    """
    if not text:
        return ""
    
    # Convert to lowercase
    text = text.lower()
    
    # Remove extra whitespace
    text = ' '.join(text.split())
    
    # Remove common punctuation that doesn't affect meaning
    import re
    text = re.sub(r'[^\w\s]', '', text)
    
    return text.strip()

def remove_similar_content(records: List[models.SentimentData], similarity_threshold: float = 0.85) -> List[models.SentimentData]:
    """
    Remove records with similar content using an optimized approach.
    """
    if len(records) <= 1:
        return records
    
    # For large datasets, use a more efficient approach
    if len(records) > 1000:
        logger.info(f"Large dataset detected ({len(records)} records), using optimized deduplication")
        return remove_similar_content_optimized(records, similarity_threshold)
    
    # Convert to list of dictionaries for processing
    records_data = []
    for record in records:
        text_content = record.text or record.content or record.title or record.description or ""
        records_data.append({
            'record': record,
            'text': text_content,
            'normalized_text': normalize_text_for_dedup(text_content)
        })
    
    # Simple similarity check based on text length and content overlap
    indices_to_keep = []
    
    for i, item1 in enumerate(records_data):
        keep_record = True
        
        for j in range(i + 1, len(records_data)):
            item2 = records_data[j]
            
            # Skip if we already decided to drop this record
            if j in indices_to_keep:
                continue
            
            # Quick length check
            len1, len2 = len(item1['normalized_text']), len(item2['normalized_text'])
            if len1 == 0 or len2 == 0:
                continue
            
            # Calculate similarity based on common words
            words1 = set(item1['normalized_text'].split())
            words2 = set(item2['normalized_text'].split())
            
            if len(words1) == 0 or len(words2) == 0:
                continue
            
            intersection = len(words1.intersection(words2))
            union = len(words1.union(words2))
            
            if union > 0:
                similarity = intersection / union
                
                # If similarity is high, keep the longer/more detailed record
                if similarity > similarity_threshold:
                    if len(item1['text']) < len(item2['text']):
                        keep_record = False
                        break
                    else:
                        # Mark the other record to be dropped
                        indices_to_keep.append(j)
        
        if keep_record:
            indices_to_keep.append(i)
    
    # Return only the records we decided to keep
    return [records_data[i]['record'] for i in indices_to_keep if i < len(records_data)]

def remove_similar_content_optimized(records: List[models.SentimentData], similarity_threshold: float = 0.85) -> List[models.SentimentData]:
    """
    Optimized similarity removal for large datasets using hash-based approach.
    """
    if len(records) <= 1:
        return records
    
    logger.info(f"Using optimized deduplication for {len(records)} records")
    
    # Group records by text length (similar length texts are more likely to be similar)
    length_groups = {}
    for record in records:
        text_content = record.text or record.content or record.title or record.description or ""
        text_length = len(text_content)
        # Group by length ranges to reduce comparisons
        length_range = (text_length // 50) * 50  # Group by 50-character ranges
        if length_range not in length_groups:
            length_groups[length_range] = []
        length_groups[length_range].append(record)
    
    # Process each length group separately
    final_records = []
    for length_range, group_records in length_groups.items():
        if len(group_records) == 1:
            final_records.append(group_records[0])
            continue
        
        # For small groups, use simple deduplication
        if len(group_records) <= 100:
            deduped = remove_similar_content(group_records, similarity_threshold)
            final_records.extend(deduped)
        else:
            # For large groups, use hash-based approach
            logger.info(f"Processing large group with {len(group_records)} records of length ~{length_range}")
            
            # Create hash-based groups for very similar content
            hash_groups = {}
            for record in group_records:
                text_content = record.text or record.content or record.title or record.description or ""
                # Create a simple hash based on first 100 characters
                content_hash = hash(text_content[:100]) % 1000
                if content_hash not in hash_groups:
                    hash_groups[content_hash] = []
                hash_groups[content_hash].append(record)
            
            # Keep one record from each hash group
            for hash_group in hash_groups.values():
                if hash_group:
                    # Keep the record with the longest text
                    longest_record = max(hash_group, key=lambda r: len(r.text or r.content or r.title or r.description or ""))
                    final_records.append(longest_record)
    
    logger.info(f"Optimized deduplication completed: {len(final_records)} records kept from {len(records)} original")
    return final_records

@app.get("/debug-auth")
async def debug_auth(request: Request):
    """Debug endpoint to check authentication details"""
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return {"status": "error", "message": "No Authorization header"}
    
    if not auth_header.startswith("Bearer "):
        return {"status": "error", "message": "Invalid Authorization format"}
    
    token = auth_header.split(" ")[1]
    
    # Try to decode the token
    try:
        from .auth import SECRET_KEY, ALGORITHM
        if not SECRET_KEY:
            return {"status": "error", "message": "JWT secret not configured"}
        
        from jose import jwt
        payload = jwt.decode(
            token, 
            SECRET_KEY, 
            algorithms=[ALGORITHM],
            options={"verify_aud": False}
        )
        
        return {
            "status": "success",
            "token_info": {
                "user_id": payload.get("sub"),
                "exp": payload.get("exp"),
                "iat": payload.get("iat"),
                "aud": payload.get("aud"),
                "iss": payload.get("iss"),
                "token_length": len(token)
            }
        }
    except Exception as e:
        return {"status": "error", "message": f"Token validation failed: {str(e)}"}

@app.get("/latest-data")
async def get_latest_data(db: Session = Depends(get_db), user_id: Optional[str] = None):
    """Get processed data with AI justification (any content) with optional target individual filtering."""
    try:
        logger.info(f"Latest data endpoint called with user_id: {user_id}")
        from .data_cache import sentiment_cache
        
        # Test database connection first
        try:
            db.execute(text("SELECT 1"))
            logger.info("Database connection successful")
        except Exception as db_error:
            logger.error(f"Database connection failed: {str(db_error)}")
            return {"status": "error", "message": f"Database connection failed: {str(db_error)}"}
        
        # Get AI processed data from cache
        logger.info("Loading AI processed data from cache...")
        results = sentiment_cache.get_ai_processed_data(db)
        
        if not results:
            return {"status": "error", "message": "No data with AI justification available."}
        
        # Target individual filtering
        target_config = None
        if user_id:
            try:
                # Convert string user_id to UUID for database query
                from uuid import UUID
                user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id
                
                # Get target individual configuration for the user
                target_config = db.query(models.TargetIndividualConfiguration)\
                                 .filter(models.TargetIndividualConfiguration.user_id == user_uuid)\
                                 .order_by(models.TargetIndividualConfiguration.created_at.desc())\
                                 .first()
                
                if target_config:
                    logger.info(f"Found target config for user {user_id}: {target_config.individual_name} with {len(target_config.query_variations)} variations")
                    
                    # Apply target filtering using cache
                    results = sentiment_cache.filter_by_target_config(results, target_config)
                    logger.info(f"Applied target individual filtering for user {user_id}")
                else:
                    logger.info(f"No target config found for user {user_id}, returning general data")
            except Exception as config_error:
                logger.warning(f"Error getting target config for user {user_id}: {str(config_error)}, returning general data")
        
        if target_config:
            logger.info(f"Found {len(results)} records with AI justification (FILTERED for {target_config.individual_name})")
        else:
            logger.info(f"Found {len(results)} records with AI justification (NO TARGET FILTERING)")
        
        # Apply deduplication using cache
        deduplicated_results = sentiment_cache.deduplicate_data(results)
        logger.info(f"After deduplication: {len(deduplicated_results)} unique records")
        
        data_list = [row.to_dict() for row in deduplicated_results]

        return {
            "status": "success",
            "data": data_list,
            "record_count": len(data_list),
            "user_id": user_id,
            "target_individual": target_config.individual_name if target_config else "No target configured",
            "note": f"Data with AI justification - Target filtering {'ENABLED' if target_config else 'DISABLED'}, Deduplication ENABLED, Cache ENABLED"
        }
    except Exception as e:
        logger.error(f"Error fetching data from cache: {str(e)}", exc_info=True)
        return {"status": "error", "message": f"Error fetching data: {str(e)}"}

@app.get("/cache/info")
async def get_cache_info(db: Session = Depends(get_db)):
    """Get information about the current cache state"""
    try:
        from .data_cache import sentiment_cache
        cache_info = sentiment_cache.get_cache_info()
        stats = sentiment_cache.get_stats(db)
        
        return {
            "status": "success",
            "cache_info": cache_info,
            "stats": {
                "total_records": stats.total_records,
                "ai_processed_count": stats.ai_processed_count,
                "platforms_count": len(stats.platforms),
                "sources_count": len(stats.sources),
                "last_updated": stats.last_updated.isoformat() if stats.last_updated else None,
                "date_range": [
                    stats.date_range[0].isoformat() if stats.date_range[0] else None,
                    stats.date_range[1].isoformat() if stats.date_range[1] else None
                ]
            }
        }
    except Exception as e:
        logger.error(f"Error getting cache info: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/cache/refresh")
async def refresh_cache(db: Session = Depends(get_db)):
    """Force refresh the data cache"""
    try:
        from .data_cache import sentiment_cache
        logger.info("Manual cache refresh requested")
        
        success = sentiment_cache.refresh_cache(db, force=True)
        if success:
            cache_info = sentiment_cache.get_cache_info()
            return {
                "status": "success",
                "message": "Cache refreshed successfully",
                "cache_info": cache_info
            }
        else:
            return {"status": "error", "message": "Cache refresh failed"}
    except Exception as e:
        logger.error(f"Error refreshing cache: {e}")
        return {"status": "error", "message": str(e)}

@app.delete("/cache/clear")
async def clear_cache():
    """Clear all cached data"""
    try:
        from .data_cache import sentiment_cache
        sentiment_cache.clear_cache()
        logger.info("Cache cleared manually")
        return {"status": "success", "message": "Cache cleared successfully"}
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/comparison-data")
async def get_comparison_data(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)) -> Dict[str, Any]:
    """Get the latest and second-latest datasets from the DB for comparison for the authenticated user."""
    logger.debug(f"Fetching comparison data for user: {user_id}")
    try:
        # Find the two most recent distinct run timestamps for this user
        distinct_timestamps = db.query(models.SentimentData.run_timestamp)\
                                .filter(models.SentimentData.user_id == user_id)\
                                .distinct()\
                                .order_by(desc(models.SentimentData.run_timestamp))\
                                .limit(2)\
                                .all()

        if len(distinct_timestamps) < 2:
            return {"status": "error", "message": "Not enough data available for comparison (need at least two distinct runs for this user)."}

        latest_run_time = distinct_timestamps[0][0]
        previous_run_time = distinct_timestamps[1][0]

        # Fetch data for the latest run for this user
        latest_results = db.query(models.SentimentData)\
                           .filter(models.SentimentData.run_timestamp == latest_run_time)\
                           .filter(models.SentimentData.user_id == user_id)\
                           .all()

        # Fetch data for the previous run for this user
        previous_results = db.query(models.SentimentData)\
                             .filter(models.SentimentData.run_timestamp == previous_run_time)\
                             .filter(models.SentimentData.user_id == user_id)\
                             .all()
        
        # Use the to_dict helper method
        latest_data_list = [row.to_dict() for row in latest_results]
        previous_data_list = [row.to_dict() for row in previous_results]

        return {
            "status": "success",
            "latest_data": latest_data_list,
            "previous_data": previous_data_list,
            "latest_timestamp": latest_run_time.isoformat(),
            "previous_timestamp": previous_run_time.isoformat()
        }
    except Exception as e:
        logger.error(f"Error retrieving comparison data from DB: {str(e)}", exc_info=True)
        return {"status": "error", "message": f"Error retrieving comparison data: {str(e)}"}

@app.get("/metrics")
async def get_metrics():
    """Get current metrics and analysis results (Update if metrics move to DB)"""
    try:
        metrics_file = Path('data/metrics/history.json')
        if metrics_file.exists():
            with open(metrics_file, 'r') as f:
                metrics_data = json.load(f)
            return {"status": "success", "data": metrics_data}
        return {"status": "error", "message": "No metrics data available"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/config")
async def get_config():
    """Get current agent configuration"""
    return {"status": "success", "data": agent.config}

@app.post("/config")
async def update_config(config: Dict[str, Any]):
    """Update agent configuration"""
    result = agent.execute_command('update_config', config)
    if not result['success']:
        raise HTTPException(status_code=400, detail=result['message'])
    return result

# Additional model classes for email endpoints
class EmailNotificationRequest(BaseModel):
    recipients: List[EmailStr]
    subject: str
    message: str

class ReportEmailRequest(BaseModel):
    recipients: List[EmailStr]
    subject: str
    report_content: str
    include_attachment: bool = False
    attachment_path: Optional[str] = None

class ScheduleConfig(BaseModel):
    recipients: List[EmailStr]
    daily_time: str = "08:00"
    weekly_day: str = "Monday"
    monthly_day: int = Field(1, ge=1, le=28)

class EmailConfig(BaseModel):
    provider: str = "protonmail"
    recipients: List[EmailStr] = []
    notifyOnCollection: bool = False
    notifyOnProcessing: bool = False
    notifyOnAnalysis: bool = True
    enabled: bool = False

class TestEmailRequest(BaseModel):
    recipient: EmailStr

@app.post("/email/send")
async def send_email(request: EmailNotificationRequest, db: Session = Depends(get_db)):
    """Send an email using the configured mail sender, requires DB session."""
    try:
        # Pass the db session to mail_sender
        success = mail_sender.send_email(
            db=db,
            recipients=request.recipients,
            subject=request.subject,
            message=request.message # Assuming send_email handles message param correctly
        )
        if success:
            return {"status": "success", "message": "Email sent successfully"}
        else:
            # Mail sender logs errors, return a generic failure
            raise HTTPException(status_code=500, detail="Failed to send email. Check logs for details.")
    except Exception as e:
        logger.error(f"Error in /email/send endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/email/config")
async def get_email_config(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Get the current email notification configuration for the authenticated user."""
    try:
        # Filter by user_id and get the latest one for that user
        # Assuming only one config per user is intended (due to unique constraint)
        logger.debug(f"get_email_config: Querying DB for EmailConfiguration with user_id = {user_id}")
        latest_config = db.query(models.EmailConfiguration)\
                          .filter(models.EmailConfiguration.user_id == user_id)\
                          .order_by(models.EmailConfiguration.created_at.desc())\
                          .first()
        
        logger.debug(f"get_email_config: DB query result: {latest_config}") # Log query result
        if not latest_config:
            # Return default values if no configuration is found
            default_config = EmailConfig( 
                provider="mailersend",
                recipients=[], 
                enabled=False,
                notifyOnCollection=False,
                notifyOnProcessing=False,
                notifyOnAnalysis=True
            )
            return JSONResponse(status_code=status.HTTP_200_OK, content=default_config.dict())
            
        # Convert DB model to Pydantic model
        config_data = EmailConfig(
            # Ensure provider from DB is returned, which should be 'mailersend' after a POST
            provider=latest_config.provider, 
            recipients=latest_config.recipients if latest_config.recipients else [], 
            enabled=latest_config.enabled,
            notifyOnCollection=latest_config.notify_on_collection,
            notifyOnProcessing=latest_config.notify_on_processing,
            notifyOnAnalysis=latest_config.notify_on_analysis
        )
        
        return JSONResponse(status_code=status.HTTP_200_OK, content=config_data.dict())
        
    except Exception as e:
        error_message = f"Failed to retrieve email configuration: {str(e)}"
        logger.error(f"Error getting email config: {e}", exc_info=True)
        # Return a JSON response with the error detail
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            content={"detail": error_message}
        )

@app.post("/email/config")
async def update_email_config(config: EmailConfig, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    """Update or create the email notification configuration for the authenticated user."""
    logger.debug(f"Updating email config for user: {user_id}")
    try:
        # --- Fetch SMTP server from environment --- 
        # --- Use EMAIL_SERVER as per user's .env --- 
        smtp_server_env = os.getenv("EMAIL_SERVER") 
        if not smtp_server_env:
             # --- Update error message to reflect correct variable name ---
             logger.error("CRITICAL: EMAIL_SERVER environment variable is not set. Cannot save email configuration.")
             raise HTTPException(status_code=500, detail="Email server (EMAIL_SERVER) is not configured on the backend.")
        # ------------------------------------------------------------

        provider_name = "env_configured" # Indicate config comes from .env

        # Check if config exists for the user
        existing_config = db.query(models.EmailConfiguration)\
                            .filter(models.EmailConfiguration.user_id == user_id)\
                            .first()

        if existing_config:
            # Update existing config
            existing_config.provider = provider_name
            existing_config.smtp_server = smtp_server_env # Update with value from env
            existing_config.enabled = config.enabled
            existing_config.recipients = config.recipients
            existing_config.notify_on_collection = config.notifyOnCollection
            existing_config.notify_on_processing = config.notifyOnProcessing
            existing_config.notify_on_analysis = config.notifyOnAnalysis
            db.commit()
            db.refresh(existing_config)
            config_id = existing_config.id
        else:
            # Create new configuration record, including the user_id
            new_config = models.EmailConfiguration(
                user_id=user_id, # Assign the authenticated user's ID
                provider=provider_name, 
                smtp_server=smtp_server_env, # Use value from env
                enabled=config.enabled,\
                recipients=config.recipients, 
                notify_on_collection=config.notifyOnCollection,\
                notify_on_processing=config.notifyOnProcessing,\
                notify_on_analysis=config.notifyOnAnalysis
            )
            db.add(new_config)
            db.commit()
            db.refresh(new_config)
            config_id = new_config.id
        
        return {"status": "success", "message": "Email configuration updated successfully.", "config_id": config_id}
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating email config: {e}", exc_info=True)
        # Return JSON error response
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
            content={"detail": f"Failed to update email configuration: {str(e)}"}
        )

@app.post("/email/test")
async def send_test_email(request: TestEmailRequest, db: Session = Depends(get_db)):
    """Send a test email to verify configuration, requires DB session."""
    try:
        # Pass the db session to mail_sender
        success = mail_sender.send_email(
            db=db, 
            recipients=[request.recipient], # send_email expects a list
            subject="Test Email from Sentiment Analysis System",
            body="This is a test email to verify that your email configuration is working correctly."
        )
        if success:
            return {"status": "success", "message": "Test email sent successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to send test email. Check logs for details.")
    except Exception as e:
        logger.error(f"Error in /email/test endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/email/protonmail-test")
async def test_protonmail_connection(request: TestEmailRequest, db: Session = Depends(get_db)):
    """Test specifically the ProtonMail connection, requires DB session."""
    # This test seems less relevant now as the server is fetched from DB. 
    # Keeping structure but relying on DB config.
    try:
        # We don't need to manually set provider/server anymore.
        # mail_sender.send_email will fetch the latest config (which includes the server)
        
        success = mail_sender.send_email(
            db=db,
            recipients=[request.recipient],
            subject="DB Config Test from Sentiment Analysis System", # Changed subject slightly
            body="This is a test email sent using the configuration currently stored in the database."
        )
        
        if success:
            return {"status": "success", "message": "Test email sent successfully using DB configuration"}
        else:
            raise HTTPException(status_code=500, detail="Failed to send test email using DB configuration. Check logs.")
            
    except Exception as e:
        logger.error(f"Error in /email/protonmail-test endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Test failed: {str(e)}")

@app.post("/email/send-report")
async def send_report_email(request: ReportEmailRequest, db: Session = Depends(get_db)):
    """Send a formatted report email, requires DB session."""
    try:
        attachment = request.attachment_path if request.include_attachment else None
        # Pass the db session to mail_sender
        success = mail_sender.send_report_email(
            db=db,
            recipients=request.recipients,
            subject=request.subject,
            report_content=request.report_content,
            report_file=attachment
        )
        if success:
            return {"status": "success", "message": "Report email sent successfully"}
        else:
            raise HTTPException(status_code=500, detail="Failed to send report email. Check logs.")
    except Exception as e:
        logger.error(f"Error in /email/send-report endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/email/schedule")
async def schedule_reports(config: ScheduleConfig, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    """Configure and start the email report scheduler, requires DB factory."""
    global report_scheduler
    
    try:
        # Stop existing scheduler if running
        if report_scheduler:
            logger.info("Stopping existing report scheduler...")
            report_scheduler.stop()
        
        logger.info(f"Creating new report scheduler with recipients: {config.recipients}")
        # Create new scheduler with DB factory and updated configuration (recipients)
        report_scheduler = ReportScheduler(db_factory=SessionLocal, recipients=config.recipients)
        
        report_scheduler.schedule_reports(
            daily_time=config.daily_time,
            weekly_day=config.weekly_day,
            monthly_day=config.monthly_day
        )
        
        # Start scheduler in background
        # Ensure start_scheduler function uses the global report_scheduler
        logger.info("Adding scheduler start task to background...")
        background_tasks.add_task(start_scheduler) 
        
        return {
            "status": "success", 
            "message": "Report scheduler configured and started",
            "config": config.dict()
        }
    except Exception as e:
        logger.error(f"Error configuring scheduler: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/email/schedule/status")
async def get_scheduler_status():
    """Get the current status of the report scheduler"""
    global report_scheduler
    
    if not report_scheduler:
        return {"status": "inactive", "message": "Scheduler has not been configured"}
    
    is_running = (report_scheduler.scheduler_thread and 
                 report_scheduler.scheduler_thread.is_alive())
    
    return {
        "status": "active" if is_running else "stopped",
        "recipients": report_scheduler.recipients,
        "message": "Scheduler is running" if is_running else "Scheduler is stopped"
    }

@app.post("/email/schedule/stop")
async def stop_scheduler():
    """Stop the email report scheduler"""
    global report_scheduler
    
    if not report_scheduler:
        return {"status": "inactive", "message": "Scheduler has not been configured"}
        
    report_scheduler.stop()
    return {"status": "success", "message": "Scheduler stopped successfully"}

def start_scheduler():
    """Start the report scheduler (called by background task)."""
    global report_scheduler
    if report_scheduler:
        try:
             logger.info("Starting report scheduler thread...")
             report_scheduler.start() # Ensure this is NOT commented out
             logger.info("Report scheduler started successfully.")
        except Exception as e:
             logger.error(f"Failed to start report scheduler thread: {e}", exc_info=True)

# Update model for target individual management
class TargetIndividualConfig(BaseModel):
    individual_name: str
    query_variations: List[str]

@app.get("/target")
async def get_target_individual(db: Session = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    """Get the target individual configuration for the authenticated user."""
    # --- Added detailed logging --- 
    try:
        # Filter by user_id
        logger.debug(f"get_target_individual: Querying DB for TargetIndividualConfiguration with user_id = {user_id}")
        config = db.query(models.TargetIndividualConfiguration)\
                 .filter(models.TargetIndividualConfiguration.user_id == user_id)\
                 .order_by(models.TargetIndividualConfiguration.created_at.desc())\
                 .first()
        
        logger.debug(f"get_target_individual: DB query result: {config}") # Log query result
        # --- End added logging ---

        if not config:
            # Return default values if no configuration is found
            default_data = TargetIndividualConfig(individual_name="Default", query_variations=[]).dict()
            return JSONResponse(content={"status": "success", "data": default_data})
            
        # Convert DB model to Pydantic model
        config_data = TargetIndividualConfig(
            individual_name=config.individual_name,
            query_variations=config.query_variations # Assumes query_variations is stored as JSON
        )
        
        # Return explicit success structure
        return JSONResponse(content={"status": "success", "data": config_data.dict()})
    except Exception as e:
        logger.error(f"Error getting target config: {e}", exc_info=True)
        # Keep raising HTTPException on error
        raise HTTPException(status_code=500, detail=f"Failed to retrieve target individual configuration: {str(e)}")

from uuid import UUID
from .models import User

@app.post("/target")
async def update_target_individual(target_config: TargetIndividualConfig, db: Session = Depends(get_db), user_id: UUID = Depends(get_current_user_id)):
    """Update or create the target individual configuration for the authenticated user."""
    logger.debug(f"Updating target config for user: {user_id}")
    try:
        # Check if a config already exists for this user
        # user = db.query(models.User).filter(models.User.id == user_id).first()
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        existing_config = db.query(models.TargetIndividualConfiguration)\
                            .filter(models.TargetIndividualConfiguration.user_id == user_id)\
                            .first()
       
        if existing_config:
            # Update existing config
            existing_config.individual_name = target_config.individual_name
            existing_config.query_variations = target_config.query_variations
            db.commit()
            db.refresh(existing_config)
            config_id = existing_config.id
        else:
            new_config = models.TargetIndividualConfiguration(\
                user_id=user_id, # Assign the authenticated user's ID
                individual_name=target_config.individual_name,\
                query_variations=target_config.query_variations,
                created_at=datetime.now()  # Manually set timestamp for SQLite compatibility
            )
            db.add(new_config)
            logger.info(f"Attempting to commit new target config for user {user_id}...") # Log before commit
            db.commit()
            logger.info(f"Successfully committed new target config for user {user_id}.") # Log after commit
            db.refresh(new_config)
            config_id = new_config.id
        
        # Broadcast the update via websocket
        await broadcast_update({
            'type': 'target_update',
            'data': target_config.dict() # Send the newly set config
        })
        
        return {
            "status": "success", 
            "message": "Target individual configuration updated successfully",
            "config_id": config_id,
            "data": target_config.dict()
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating target config: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update target individual configuration: {str(e)}")

@app.post("/agent/trigger-run", status_code=status.HTTP_202_ACCEPTED)
async def trigger_agent_run(background_tasks: BackgroundTasks, user_id: str = Depends(get_current_user_id)):
    """Triggers a data collection and analysis run for the authenticated user."""
    logger.info(f"Agent run triggered manually by user: {user_id}")
    if agent is None:
        raise HTTPException(status_code=503, detail="Agent is not initialized.")
        
    try:
        # Correctly call the run_single_cycle method
        background_tasks.add_task(agent.run_single_cycle, user_id=user_id)
        logger.info("Manual agent data collection task added to background via API.")
        return {"status": "success", "message": f"Agent run triggered for user {user_id}."}
        
    except Exception as e:
        # This exception would likely occur during task *scheduling*, not execution
        logger.error(f"Error scheduling agent run via API: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error scheduling agent run: {str(e)}")

class SupabaseSignupPayload(BaseModel):
    id: UUID
    email: EmailStr
          
class SupabaseSignupPayload(BaseModel):
    id: str                     # Supabase user.id (UUID)
    email: EmailStr
    name: str
    password: str               # You may ignore storing this
    is_admin: Optional[bool] = False

@app.post("/user/register")
async def register_user(payload: SupabaseSignupPayload, db: Session = Depends(get_db)):
    print(f"📥 Received register request for: {payload.email}")

    existing_user = db.query(models.User).filter(models.User.email == payload.email).first()
    if existing_user:
        print("⚠️ User already exists")
        return {"status": "success", "message": "User already exists"}

    try:
        new_user = models.User(
            id=payload.id,
            email=payload.email,
            created_at=datetime.utcnow(),
            last_login=datetime.utcnow(),
            is_admin=payload.is_admin,
            api_calls_count=0,
            data_entries_count=0
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        print(f"✅ New user created: {new_user.email}")
        return {"status": "success", "message": "User registered"}
    except Exception as e:
        db.rollback()
        print(f"❌ DB error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/admin/sync-users")
async def sync_users_from_supabase(db: Session = Depends(get_db), _: str = Depends(admin.admin_only)):
    """
    Synchronize users from Supabase auth to local database.
    This would typically call the Supabase admin API.
    """
    try:
        # In a real implementation, you would call the Supabase admin API here
        # For now, we'll just return a placeholder response
        return {"status": "success", "message": "User sync not implemented yet"}
    except Exception as e:
        logger.error(f"Error syncing users: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.on_event("startup")
async def startup_event():
    global report_scheduler
    logger.info("API Service starting up...")
    # Initialize scheduler at startup, passing DB factory 
    # Starts without specific recipients - they are configured via API
    try:
        logger.info("Initializing report scheduler at startup...")
        report_scheduler = ReportScheduler(db_factory=SessionLocal)
        # Optional: Start scheduler immediately? Or wait for config?
        # start_scheduler() # Uncomment if you want it running by default
        logger.info("Report scheduler initialized.")
    except Exception as e:
        logger.error(f"Failed to initialize report scheduler at startup: {e}", exc_info=True)
        
    # Set up initial admin user if none exists
    try:
        db = SessionLocal()
        admin_user = db.query(models.User).filter(models.User.is_admin == True).first()
        if not admin_user:
            try:
                # Create first admin user
                admin_id = uuid.uuid4()
                admin_email = "admin@example.com"  # You should change this in production
                admin_user = models.User(
                    id=admin_id,
                    email=admin_email,
                    is_admin=True
                )
                logger.info("Creating initial admin user")
                db.add(admin_user)
                db.commit()
                logger.info(f"Created initial admin user with ID: {admin_id}")
            except Exception as e:
                logger.error(f"Failed to create admin user: {e}")
                db.rollback()
        db.close()
    except Exception as e:
        logger.error(f"Error checking/creating admin user: {e}")

    # Optional: Start the agent if it has a background loop
    if agent and hasattr(agent, 'start'):
        try:
             logger.info("Ensuring SentimentAnalysisAgent background tasks are NOT started automatically.")
             # agent.start() # <<< MAKE SURE THIS LINE IS COMMENTED OUT
             logger.info("SentimentAnalysisAgent start() call is correctly commented out in startup_event.")
        except Exception as e:
             # This block should ideally not be reached if agent.start() is commented out
             logger.error(f"Unexpected error related to agent start in startup_event: {e}", exc_info=True)

    logger.info("API Service startup complete.")

def apply_target_filtering_to_media_data(db: Session, all_data: List, user_id: Optional[str], endpoint_name: str) -> List:
    """Helper function to apply target individual filtering to media data"""
    if not user_id:
        return all_data
    
    try:
        from uuid import UUID
        user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id
        target_config = db.query(models.TargetIndividualConfiguration)\
                         .filter(models.TargetIndividualConfiguration.user_id == user_uuid)\
                         .order_by(models.TargetIndividualConfiguration.created_at.desc())\
                         .first()
        
        if target_config:
            from .data_cache import sentiment_cache
            logger.info(f"Applying target filtering for {endpoint_name}: {target_config.individual_name}")
            filtered_data = sentiment_cache.filter_by_target_config(all_data, target_config)
            logger.info(f"Filtered {len(all_data)} to {len(filtered_data)} records for target individual")
            return filtered_data
        else:
            logger.info(f"No target config found for user {user_id} in {endpoint_name}")
    except Exception as e:
        logger.warning(f"Error applying target filtering in {endpoint_name}: {e}")
    
    return all_data

@app.get("/media-sources/newspapers")
async def get_newspaper_sources(
    db: Session = Depends(get_db), 
    user_id: Optional[str] = Query(None)
):
    """Get newspaper sources with sentiment analysis"""
    try:
        logger.info(f"Newspaper endpoint called with user_id: {user_id}")
        from .data_cache import sentiment_cache
        
        # Get all data from cache instead of multiple database queries
        logger.info("Loading data from cache...")
        all_data = sentiment_cache.get_all_data(db)
        
        # Apply target individual filtering if user_id provided
        all_data = apply_target_filtering_to_media_data(db, all_data, user_id, "newspapers")
        
        # Get cache statistics instead of separate database queries
        stats = sentiment_cache.get_stats(db)
        logger.info(f"Total records in cache: {stats.total_records}")
        logger.info(f"Available platforms: {len(stats.platforms)} platforms")
        logger.info(f"Available sources: {len(stats.sources)} sources")
        
        # Newspapers are typically identified by source names containing news-related keywords
        newspaper_keywords = [
            'guardian', 'times', 'post', 'tribune', 'herald', 'gazette', 'chronicle',
            'observer', 'independent', 'telegraph', 'express', 'mirror', 'mail',
            'punch', 'vanguard', 'thisday', 'premium', 'sun', 'business', 'daily',
            'gulf-times', 'peninsula', 'qatar tribune', 'qna', 'lusail', 'al-watan',
            'times of india', 'indian express', 'hindustan', 'the hindu', 'economic times',
            'the nation', 'nation'
        ]
        
        # Filter data using cache instead of complex SQL
        newspaper_data = sentiment_cache.filter_by_platform_keywords(all_data, newspaper_keywords)
        logger.info(f"Filtered to {len(newspaper_data)} newspaper records from {len(all_data)} total records")
        
        # Process the filtered data to aggregate by source
        from collections import defaultdict
        from datetime import datetime
        
        source_stats = defaultdict(lambda: {
            'coverage_count': 0,
            'sentiment_scores': [],
            'positive_count': 0,
            'negative_count': 0,
            'neutral_count': 0,
            'last_updated': None,
            'source_name': None,
            'source': None,
            'platform': None,
            'primary_source': None
        })
        
        # Aggregate data by normalized source name
        for record in newspaper_data:
            # Get source information
            source_name = getattr(record, 'source_name', None) or ''
            source = getattr(record, 'source', None) or ''
            platform = getattr(record, 'platform', None) or ''
            primary_source = source_name or source or platform or 'unknown'
            
            # Normalize source name for grouping
            primary_source_lower = primary_source.lower()
            normalized_source = None
            
            if 'tribune' in primary_source_lower:
                normalized_source = 'tribune'
            elif 'thisday' in primary_source_lower:
                normalized_source = 'thisdaylive'
            elif 'nation' in primary_source_lower:
                normalized_source = 'thenationonlineng'
            elif 'punch' in primary_source_lower:
                normalized_source = 'punchng'
            elif 'premium' in primary_source_lower:
                normalized_source = 'premiumtimesng'
            elif 'guardian' in primary_source_lower:
                normalized_source = 'guardian'
            elif 'vanguard' in primary_source_lower:
                normalized_source = 'vanguard'
            elif 'sun' in primary_source_lower:
                normalized_source = 'sunnewsonline'
            elif 'daily' in primary_source_lower:
                normalized_source = 'dailytrust'
            elif 'leadership' in primary_source_lower:
                normalized_source = 'leadership'
            elif 'complete' in primary_source_lower:
                normalized_source = 'completesports'
            elif 'business' in primary_source_lower:
                normalized_source = 'businessday'
            elif 'blueprint' in primary_source_lower:
                normalized_source = 'blueprint'
            elif 'cable' in primary_source_lower:
                normalized_source = 'thecable'
            else:
                normalized_source = primary_source_lower
            
            stats = source_stats[normalized_source]
            stats['coverage_count'] += 1
            
            # Store source information (use first occurrence)
            if not stats['primary_source']:
                stats['primary_source'] = primary_source
                stats['source_name'] = source_name
                stats['source'] = source
                stats['platform'] = platform
            
            # Aggregate sentiment data
            sentiment_score = getattr(record, 'sentiment_score', None)
            if sentiment_score is not None:
                stats['sentiment_scores'].append(float(sentiment_score))
            
            sentiment_label = getattr(record, 'sentiment_label', 'neutral')
            if sentiment_label == 'positive':
                stats['positive_count'] += 1
            elif sentiment_label == 'negative':
                stats['negative_count'] += 1
            else:
                stats['neutral_count'] += 1
            
            # Track last updated (safely handle None dates)
            record_date = getattr(record, 'date', None)
            if record_date:
                try:
                    if stats['last_updated'] is None:
                        stats['last_updated'] = record_date
                    elif record_date is not None:
                        # Safely compare dates by converting to strings if needed
                        if str(record_date) > str(stats['last_updated']):
                            stats['last_updated'] = record_date
                except (TypeError, ValueError):
                    # If date comparison fails, just use the first valid date
                    if stats['last_updated'] is None:
                        stats['last_updated'] = record_date
        
        # Convert to list format similar to SQL results
        class SourceRow:
            def __init__(self, data):
                self.primary_source = data['primary_source']
                self.source_name = data['source_name']
                self.source = data['source']
                self.platform = data['platform']
                self.coverage_count = data['coverage_count']
                self.avg_sentiment_score = sum(data['sentiment_scores']) / len(data['sentiment_scores']) if data['sentiment_scores'] else 0.0
                self.positive_count = data['positive_count']
                self.negative_count = data['negative_count']
                self.neutral_count = data['neutral_count']
                self.last_updated = data['last_updated']
        
        # Sort by coverage count and limit to top 15
        sorted_sources = sorted(source_stats.items(), key=lambda x: x[1]['coverage_count'], reverse=True)[:15]
        rows = [SourceRow(data) for source_key, data in sorted_sources]
        
        logger.info(f"Found {len(rows)} newspaper sources from filtered data")
        
        newspapers = []
        for row in rows:
            logger.info(f"Processing newspaper source: {row.source_name} / {row.source} / {row.platform}")
            total_articles = row.coverage_count
            positive_pct = (row.positive_count / total_articles * 100) if total_articles > 0 else 0
            negative_pct = (row.negative_count / total_articles * 100) if total_articles > 0 else 0
            neutral_pct = (row.neutral_count / total_articles * 100) if total_articles > 0 else 0
            
            # Determine bias level based on sentiment distribution
            if positive_pct > 60:
                bias_level = "Supportive"
            elif negative_pct > 60:
                bias_level = "Critical"
            else:
                bias_level = "Neutral"
            
            # Get recent articles for this source from the filtered data
            primary_source = row.primary_source or row.source_name or row.platform or row.source or ""
            primary_source_lower = primary_source.lower() if primary_source else ""
            
            # Filter the newspaper data for this specific source
            source_articles = []
            for article in newspaper_data:
                article_source_name = getattr(article, 'source_name', '') or ''
                article_source = getattr(article, 'source', '') or ''
                article_platform = getattr(article, 'platform', '') or ''
                
                # Check if this article belongs to the current source
                article_matches = False
                if 'tribune' in primary_source_lower:
                    article_matches = ('tribune' in article_source_name.lower() or 
                                     'tribune' in article_source.lower() or 
                                     'tribune' in article_platform.lower())
                elif 'thisday' in primary_source_lower:
                    article_matches = ('thisday' in article_source_name.lower() or 
                                     'thisday' in article_source.lower() or 
                                     'thisday' in article_platform.lower())
                elif 'nation' in primary_source_lower:
                    article_matches = ('nation' in article_source_name.lower() or 
                                     'nation' in article_source.lower() or 
                                     'nation' in article_platform.lower())
                elif 'punch' in primary_source_lower:
                    article_matches = ('punch' in article_source_name.lower() or 
                                     'punch' in article_source.lower() or 
                                     'punch' in article_platform.lower())
                elif 'premium' in primary_source_lower:
                    article_matches = ('premium' in article_source_name.lower() or 
                                     'premium' in article_source.lower() or 
                                     'premium' in article_platform.lower())
                elif 'guardian' in primary_source_lower:
                    article_matches = ('guardian' in article_source_name.lower() or 
                                     'guardian' in article_source.lower() or 
                                     'guardian' in article_platform.lower())
                elif 'vanguard' in primary_source_lower:
                    article_matches = ('vanguard' in article_source_name.lower() or 
                                     'vanguard' in article_source.lower() or 
                                     'vanguard' in article_platform.lower())
                elif 'sun' in primary_source_lower:
                    article_matches = ('sun' in article_source_name.lower() or 
                                     'sun' in article_source.lower() or 
                                     'sun' in article_platform.lower())
                elif 'daily' in primary_source_lower:
                    article_matches = ('daily' in article_source_name.lower() or 
                                     'daily' in article_source.lower() or 
                                     'daily' in article_platform.lower())
                else:
                    # For other sources, match the primary source name
                    article_matches = (primary_source_lower in article_source_name.lower() or 
                                     primary_source_lower in article_source.lower() or 
                                     primary_source_lower in article_platform.lower())
                
                if article_matches:
                    source_articles.append(article)
            
            # Sort by date and get the 3 most recent (handle None dates)
            def safe_date_sort(article):
                date_val = getattr(article, 'date', None)
                if date_val is None:
                    return ''  # Put None dates at the end
                return str(date_val)
            
            source_articles.sort(key=safe_date_sort, reverse=True)
            recent_result = source_articles[:3]
            
            recent_articles = []
            for article in recent_result:
                # Use getattr to safely access attributes for cached data objects
                title = getattr(article, 'title', None)
                text = getattr(article, 'text', None)
                headline = title if title and title.strip() else extract_headline_from_text(text) if text else "No title available"
                
                # Handle date field properly - it might be a string or datetime
                article_date = None
                date_value = getattr(article, 'date', None)
                if date_value:
                    if isinstance(date_value, str):
                        # If it's a string, use it directly or try to parse it
                        try:
                            parsed_date = parse_datetime(date_value)
                            article_date = parsed_date.isoformat() if parsed_date else date_value
                        except:
                            article_date = date_value
                    elif hasattr(date_value, 'isoformat'):
                        # If it's already a datetime object, use isoformat
                        article_date = date_value.isoformat()
                    else:
                        # Fallback: convert to string
                        article_date = str(date_value)
                
                recent_articles.append({
                    "id": getattr(article, 'entry_id', None) or getattr(article, 'id', 'unknown'),  # Add record ID for feedback
                    "title": headline,
                    "sentiment": getattr(article, 'sentiment_label', 'neutral') or "neutral",
                    "sentiment_score": float(getattr(article, 'sentiment_score', 0) or 0),
                    "sentiment_justification": getattr(article, 'sentiment_justification', None) or "No AI justification available",
                    "date": article_date,
                    "text": text or "No content available",
                    "url": getattr(article, 'url', None),
                    "source_name": getattr(article, 'source_name', None) or "Unknown Source",
                    "platform": getattr(article, 'platform', None) or "Unknown Platform"
                })
            
            # Generate consolidated name and website URL based on primary source
            primary_source = row.primary_source or row.source_name or row.platform or row.source or ""
            primary_source_lower = primary_source.lower() if primary_source else ""
            
            # Map to clean display names and official websites
            if 'tribune' in primary_source_lower:
                display_name = "Tribune Online"
                website_url = "https://www.tribuneonlineng.com"
            elif 'thisday' in primary_source_lower:
                display_name = "This Day Live"
                website_url = "https://www.thisdaylive.com"
            elif 'nation' in primary_source_lower:
                display_name = "The Nation Online"
                website_url = "https://www.thenationonlineng.net"
            elif 'punch' in primary_source_lower:
                display_name = "Punch Newspapers"
                website_url = "https://www.punchng.com"
            elif 'premium' in primary_source_lower:
                display_name = "Premium Times"
                website_url = "https://www.premiumtimesng.com"
            elif 'guardian' in primary_source_lower:
                display_name = "The Guardian Nigeria"
                website_url = "https://www.guardian.ng"
            elif 'vanguard' in primary_source_lower:
                display_name = "Vanguard News"
                website_url = "https://www.vanguardngr.com"
            elif 'sun' in primary_source_lower:
                display_name = "The Sun Nigeria"
                website_url = "https://www.sunnewsonline.com"
            elif 'daily' in primary_source_lower:
                display_name = "Daily Trust"
                website_url = "https://www.dailytrust.com"
            elif 'business day' in primary_source_lower or 'businessday' in primary_source_lower:
                display_name = "Business Day"
                website_url = "https://www.businessday.ng"
            elif 'daily post' in primary_source_lower or 'dailypost' in primary_source_lower:
                display_name = "Daily Post Nigeria"
                website_url = "https://www.dailypost.ng"
            elif 'legit' in primary_source_lower:
                display_name = "Legit.ng"
                website_url = "https://www.legit.ng"
            elif 'sahara reporters' in primary_source_lower or 'saharareporters' in primary_source_lower:
                display_name = "Sahara Reporters"
                website_url = "https://www.saharareporters.com"
            elif 'nairametrics' in primary_source_lower:
                display_name = "Nairametrics"
                website_url = "https://www.nairametrics.com"
            elif 'blueprint' in primary_source_lower:
                display_name = "Blueprint Newspapers"
                website_url = "https://www.blueprint.ng"
            elif 'the cable' in primary_source_lower or 'thecable' in primary_source_lower or 'cable' in primary_source_lower:
                display_name = "The Cable"
                website_url = "https://www.thecable.ng"
            elif 'independent' in primary_source_lower:
                display_name = "The Independent Nigeria"
                website_url = "https://www.independent.ng"
            elif 'nan' in primary_source_lower:
                display_name = "News Agency of Nigeria"
                website_url = "https://www.nannews.ng"
            elif 'leadership' in primary_source_lower:
                display_name = "Leadership Newspaper"
                website_url = "https://www.leadership.ng"
            elif 'complete' in primary_source_lower:
                display_name = "Complete Sports"
                website_url = "https://www.completesports.com"
            elif 'business' in primary_source_lower and 'day' in primary_source_lower:
                display_name = "Business Day"
                website_url = "https://www.businessday.ng"
            else:
                # For unknown newspapers, use the primary source name
                display_name = primary_source.title() if primary_source else "Unknown Newspaper"
                website_url = f"https://www.{primary_source.lower().replace(' ', '')}.com" if primary_source else "https://www.unknown.com"
            
            newspapers.append({
                "name": display_name,
                "logo": "📰",
                "sentiment_score": float(row.avg_sentiment_score) if row.avg_sentiment_score else 0.0,
                "bias_level": bias_level,
                "coverage_count": int(row.coverage_count) if row.coverage_count else 0,
                "last_updated": "2 hours ago",  # This would need to be calculated from actual data
                "top_headlines": [article["title"] for article in recent_articles[:2]],
                "recent_articles": recent_articles,
                "website_url": website_url
            })
        
        # Get target config info for response
        target_config = None
        target_individual_name = "No target configured"
        if user_id:
            try:
                from uuid import UUID
                user_uuid = UUID(user_id) if isinstance(user_id, str) else user_id
                target_config = db.query(models.TargetIndividualConfiguration)\
                                 .filter(models.TargetIndividualConfiguration.user_id == user_uuid)\
                                 .order_by(models.TargetIndividualConfiguration.created_at.desc())\
                                 .first()
                if target_config:
                    target_individual_name = target_config.individual_name
            except Exception as e:
                logger.warning(f"Error getting target config info: {e}")
        
        logger.info(f"Returning {len(newspapers)} newspaper sources")
        return {
            "status": "success", 
            "data": newspapers,
            "user_id": user_id,
            "target_individual": target_individual_name,
            "target_filtering": "ENABLED" if target_config else "DISABLED",
            "record_count": len(newspapers)
        }
        
    except Exception as e:
        logger.error(f"Error fetching newspaper sources: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/media-sources/twitter")
async def get_twitter_sources(db: Session = Depends(get_db), user_id: Optional[str] = Query(None)):
    """Get Twitter/X sources with sentiment analysis"""
    try:
        logger.info("Twitter endpoint called")
        from .data_cache import sentiment_cache
        from collections import defaultdict
        
        # Get all data from cache instead of multiple database queries
        logger.info("Loading data from cache...")
        all_data = sentiment_cache.get_all_data(db)
        
        # Apply target individual filtering if user_id provided
        all_data = apply_target_filtering_to_media_data(db, all_data, user_id, "twitter")
        
        # Get cache statistics instead of separate database queries
        stats = sentiment_cache.get_stats(db)
        logger.info(f"Total records in cache: {stats.total_records}")
        logger.info(f"Available platforms: {len(stats.platforms)} platforms")
        
        # Filter for Twitter/X data and apply Nigerian content filter using cache
        twitter_keywords = ['x', 'twitter']
        twitter_data = sentiment_cache.filter_by_platform_keywords(all_data, twitter_keywords)
        
        # Apply Nigerian content filter and exclude Indian content
        nigerian_keywords = ['nigeria', 'nigerian', 'lagos', 'abuja', 'tinubu']
        indian_exclude_keywords = ['india', 'indian', 'delhi', 'mumbai']
        
        filtered_twitter_data = []
        for record in twitter_data:
            text_content = (record.text or "") + (record.user_location or "")
            text_lower = text_content.lower()
            
            # Check for Nigerian content
            has_nigerian = any(keyword in text_lower for keyword in nigerian_keywords)
            
            # Check for Indian content (to exclude)
            has_indian = any(keyword in text_lower for keyword in indian_exclude_keywords)
            
            if has_nigerian and not has_indian:
                filtered_twitter_data.append(record)
        
        logger.info(f"Filtered to {len(filtered_twitter_data)} Twitter records with Nigerian content")
        
        # Group data by user/source and calculate statistics
        user_stats = defaultdict(lambda: {
            'records': [],
            'total_tweets': 0,
            'positive_count': 0,
            'negative_count': 0,
            'neutral_count': 0,
            'sentiment_scores': [],
            'last_updated': None
        })
        
        for record in filtered_twitter_data:
            # Determine primary user identifier
            primary_user = record.user_handle or record.user_name or record.source_name or record.source or "unknown"
            if primary_user.startswith('@'):
                primary_user = primary_user[1:]  # Remove @ symbol
            primary_user = primary_user.lower().replace(' ', '_')
            
            user_stats[primary_user]['records'].append(record)
            user_stats[primary_user]['total_tweets'] += 1
            
            if record.sentiment_label == 'positive':
                user_stats[primary_user]['positive_count'] += 1
            elif record.sentiment_label == 'negative':
                user_stats[primary_user]['negative_count'] += 1
            else:
                user_stats[primary_user]['neutral_count'] += 1
                
            if record.sentiment_score:
                user_stats[primary_user]['sentiment_scores'].append(record.sentiment_score)
                
            if record.date and (not user_stats[primary_user]['last_updated'] or record.date > user_stats[primary_user]['last_updated']):
                user_stats[primary_user]['last_updated'] = record.date
        
        # Sort by tweet count and limit to top 15
        sorted_users = sorted(user_stats.items(), key=lambda x: x[1]['total_tweets'], reverse=True)[:15]
        logger.info(f"Found {len(sorted_users)} Twitter sources")
        
        twitter_accounts = []
        for user_key, stats in sorted_users:
            logger.info(f"Processing Twitter source: {user_key}")
            
            # Get representative record for user info
            representative_record = stats['records'][0] if stats['records'] else None
            if not representative_record:
                continue
                
            total_tweets = stats['total_tweets']
            positive_pct = (stats['positive_count'] / total_tweets * 100) if total_tweets > 0 else 0
            negative_pct = (stats['negative_count'] / total_tweets * 100) if total_tweets > 0 else 0
            neutral_pct = (stats['neutral_count'] / total_tweets * 100) if total_tweets > 0 else 0
            
            # Calculate average sentiment score
            avg_sentiment_score = sum(stats['sentiment_scores']) / len(stats['sentiment_scores']) if stats['sentiment_scores'] else 0.0
            
            # Determine bias level based on sentiment distribution
            if positive_pct > 60:
                bias_level = "Supportive"
            elif negative_pct > 60:
                bias_level = "Critical"
            else:
                bias_level = "Neutral"
            
            # Determine category based on user name and handle
            user_name_lower = (representative_record.user_name or "").lower()
            user_handle_lower = (representative_record.user_handle or "").lower()
            
            if any(keyword in user_name_lower or keyword in user_handle_lower for keyword in ['gov', 'official', 'minister', 'president', 'vice']):
                category = "Government Official"
            elif any(keyword in user_name_lower or keyword in user_handle_lower for keyword in ['news', 'media', 'journalist', 'reporter']):
                category = "Media Personality"
            elif any(keyword in user_name_lower or keyword in user_handle_lower for keyword in ['ceo', 'business', 'entrepreneur']):
                category = "Business Leader"
            else:
                category = "Public Figure"
            
            # Get recent tweets from cached data (no additional DB query)
            recent_records = sorted(stats['records'], key=lambda x: x.date or datetime.min, reverse=True)[:5]
            recent_tweets = []
            for tweet_record in recent_records:
                # For Twitter data, prioritize text field over title, then try content field
                tweet_text = None
                if tweet_record.text and tweet_record.text.strip():
                    tweet_text = tweet_record.text.strip()
                elif tweet_record.title and tweet_record.title.strip():
                    tweet_text = tweet_record.title.strip()
                elif tweet_record.content and tweet_record.content.strip():
                    tweet_text = tweet_record.content.strip()
                else:
                    tweet_text = "No content available"
                
                # Calculate relative time from tweet date
                relative_time = "Recently"
                if tweet_record.date:
                    try:
                        # Ensure we have a datetime object
                        if hasattr(tweet_record.date, 'replace'):
                            tweet_datetime = tweet_record.date
                        else:
                            tweet_datetime = datetime.fromisoformat(str(tweet_record.date))
                        
                        # Make timezone-aware if not already
                        if tweet_datetime.tzinfo is None:
                            tweet_datetime = tweet_datetime.replace(tzinfo=timezone.utc)
                        
                        # Calculate time difference
                        now = datetime.now(timezone.utc)
                        time_diff = now - tweet_datetime
                        
                        if time_diff.days > 0:
                            relative_time = f"{time_diff.days}d ago"
                        elif time_diff.seconds > 3600:  # More than 1 hour
                            hours = time_diff.seconds // 3600
                            relative_time = f"{hours}h ago"
                        elif time_diff.seconds > 60:  # More than 1 minute
                            minutes = time_diff.seconds // 60
                            relative_time = f"{minutes}m ago"
                        else:
                            relative_time = "Just now"
                    except Exception as e:
                        logger.warning(f"Error calculating relative time: {e}")
                        relative_time = "Recently"
                
                recent_tweets.append({
                    "id": tweet_record.entry_id,  # Add record ID for feedback (using entry_id)
                    "text": tweet_text,
                    "sentiment": tweet_record.sentiment_label or "neutral",
                    "sentiment_score": float(tweet_record.sentiment_score) if tweet_record.sentiment_score is not None else 0.0,
                    "sentiment_justification": tweet_record.sentiment_justification if hasattr(tweet_record, 'sentiment_justification') else None,
                    "engagement": round(
                        1000 + (hash(tweet_text) % 5000) + 
                        (abs(tweet_record.sentiment_score or 0) * 2000) +  # Higher engagement for stronger sentiment
                        (len(tweet_text) * 2) if tweet_text != "No content available" else 1000,  # Longer tweets get more engagement
                        0
                    ),
                    "time": relative_time,
                    "date": tweet_record.date.isoformat() if tweet_record.date and hasattr(tweet_record.date, 'isoformat') else str(tweet_record.date) if tweet_record.date else None,
                    "url": tweet_record.url if hasattr(tweet_record, 'url') and tweet_record.url else None
                })
            
            # Generate top hashtags based on content
            top_hashtags = ['#Nigeria', '#News', '#Updates']
            if 'politics' in user_name_lower or 'politics' in user_handle_lower:
                top_hashtags = ['#Nigeria', '#Politics', '#Government']
            elif 'business' in user_name_lower or 'business' in user_handle_lower:
                top_hashtags = ['#Nigeria', '#Business', '#Economy']
            elif 'sports' in user_name_lower or 'sports' in user_handle_lower:
                top_hashtags = ['#Nigeria', '#Sports', '#Football']
            
            # Clean up the display name and handle
            if representative_record.user_handle:
                clean_handle = representative_record.user_handle.replace('@', '') if representative_record.user_handle.startswith('@') else representative_record.user_handle
                display_name = representative_record.user_name or clean_handle.replace('_', ' ').title()
                display_handle = f"@{clean_handle}"
                profile_url = f"https://twitter.com/{clean_handle}"
            elif representative_record.user_name:
                display_name = representative_record.user_name
                clean_name = representative_record.user_name.replace(' ', '')
                display_handle = f"@{clean_name}"
                profile_url = f"https://twitter.com/{clean_name}"
            else:
                display_name = user_key.title()
                clean_name = user_key.replace(' ', '').replace('@', '')
                display_handle = f"@{clean_name}"
                profile_url = f"https://twitter.com/{clean_name}"
            
            twitter_accounts.append({
                "name": display_name,
                "handle": display_handle,
                "logo": "🐦",
                "sentiment_score": float(avg_sentiment_score) if avg_sentiment_score is not None else 0.0,
                "bias_level": bias_level,
                "followers": f"{round(total_tweets * 1000 + (hash(representative_record.user_handle or representative_record.user_name or 'unknown') % 50000), 0):,}",
                "tweets_count": int(total_tweets) if total_tweets else 0,
                "coverage_count": int(total_tweets) if total_tweets else 0,  # Add for frontend compatibility
                "last_updated": "2 hours ago",  # This would need to be calculated from actual data
                "category": category,
                "verified": True,  # Mock verification status
                "recent_tweets": recent_tweets,
                "top_hashtags": top_hashtags,
                "profile_url": profile_url
            })
        
        logger.info(f"Returning {len(twitter_accounts)} Twitter accounts")
        return {"status": "success", "data": twitter_accounts}
        
    except Exception as e:
        logger.error(f"Error fetching Twitter sources: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/media-sources/television")
async def get_television_sources(db: Session = Depends(get_db), user_id: Optional[str] = Query(None)):
    """Get television sources with sentiment analysis"""
    try:
        logger.info("Television endpoint called")
        from .data_cache import sentiment_cache
        from collections import defaultdict
        
        # Get all data from cache instead of multiple database queries
        logger.info("Loading data from cache...")
        all_data = sentiment_cache.get_all_data(db)
        
        # Apply target individual filtering if user_id provided
        all_data = apply_target_filtering_to_media_data(db, all_data, user_id, "television")
        
        # Get cache statistics instead of separate database queries
        stats = sentiment_cache.get_stats(db)
        logger.info(f"Total records in cache: {stats.total_records}")
        logger.info(f"Available platforms: {len(stats.platforms)} platforms")
        logger.info(f"Available sources: {len(stats.sources)} sources")
        
        # TV sources are typically identified by source names containing TV-related keywords
        tv_keywords = [
            'tv', 'television', 'channel', 'broadcast', 
            # Qatar TV Channels (Priority 1)
            'al jazeera', 'aljazeera', 'al jazeera arabic', 'al jazeera english', 'al jazeera mubasher',
            'al jazeera documentary', 'bein sports', 'bein', 'qatar tv', 'qtv', 'al rayyan tv',
            # International TV Channels (Priority 2)
            'cnn', 'cable news network', 'bbc', 'british broadcasting corporation', 
            'fox', 'fox news', 'msnbc', 'sky', 'sky news', 'itv', 'independent television', 
            'channel 4', 'channel 4 news', 'ndtv', 'new delhi television', 'news18', 'news18 network', 
            'republic', 'republic tv', 'zee', 'zee news',
            # Nigerian TV Channels (Priority 3)
            'channels tv', 'channels.tv', 'tvc', 'television continental',
            'ait live', 'ait', 'africa independent television', 'nta', 'nigerian television authority',
            'stv', 'silverbird television', 'plus tv', 'plus tv africa', 'plus',
            'news central', 'news central nigeria', 'arise', 'arise news',
            'silverbird tv', 'silverbird', 'flip tv', 'trust tv', 'voice tv'
        ]
        
        # Filter data using cache instead of complex SQL
        tv_data = sentiment_cache.filter_by_platform_keywords(all_data, tv_keywords)
        logger.info(f"Filtered to {len(tv_data)} TV records")
        
        # Group data by source and calculate statistics
        source_stats = defaultdict(lambda: {
            'records': [],
            'total_programs': 0,
            'positive_count': 0,
            'negative_count': 0,
            'neutral_count': 0,
            'sentiment_scores': [],
            'last_updated': None
        })
        
        for record in tv_data:
            # Determine primary source identifier with priority mapping
            source_name_lower = (record.source_name or record.source or record.platform or "").lower()
            
            # Map to consolidated TV channel types for better grouping
            if 'aljazeera' in source_name_lower or 'al jazeera' in source_name_lower:
                primary_source = "Al Jazeera"
            elif 'bein' in source_name_lower:
                primary_source = "BeIN Sports"
            elif 'cnn' in source_name_lower:
                primary_source = "CNN"
            elif 'bbc' in source_name_lower:
                primary_source = "BBC"
            elif 'channels' in source_name_lower:
                primary_source = "Channels TV"
            elif 'arise' in source_name_lower:
                primary_source = "Arise News"
            elif 'ait' in source_name_lower:
                primary_source = "AIT"
            elif 'nta' in source_name_lower:
                primary_source = "NTA"
            else:
                primary_source = record.source_name or record.source or record.platform or "Unknown"
            
            source_stats[primary_source]['records'].append(record)
            source_stats[primary_source]['total_programs'] += 1
            
            if record.sentiment_label == 'positive':
                source_stats[primary_source]['positive_count'] += 1
            elif record.sentiment_label == 'negative':
                source_stats[primary_source]['negative_count'] += 1
            else:
                source_stats[primary_source]['neutral_count'] += 1
                
            if record.sentiment_score:
                source_stats[primary_source]['sentiment_scores'].append(record.sentiment_score)
                
            if record.date and (not source_stats[primary_source]['last_updated'] or record.date > source_stats[primary_source]['last_updated']):
                source_stats[primary_source]['last_updated'] = record.date
        
        # Sort by program count and limit to top 15
        sorted_sources = sorted(source_stats.items(), key=lambda x: x[1]['total_programs'], reverse=True)[:15]
        logger.info(f"Found {len(sorted_sources)} TV sources")
        
        television_channels = []
        for source_name, stats in sorted_sources:
            logger.info(f"Processing TV source: {source_name}")
            
            # Get representative record for source info
            representative_record = stats['records'][0] if stats['records'] else None
            if not representative_record:
                continue
                
            total_programs = stats['total_programs']
            positive_pct = (stats['positive_count'] / total_programs * 100) if total_programs > 0 else 0
            negative_pct = (stats['negative_count'] / total_programs * 100) if total_programs > 0 else 0
            neutral_pct = (stats['neutral_count'] / total_programs * 100) if total_programs > 0 else 0
            
            # Calculate average sentiment score
            avg_sentiment_score = sum(stats['sentiment_scores']) / len(stats['sentiment_scores']) if stats['sentiment_scores'] else 0.0
            
            # Determine bias level based on sentiment distribution
            if positive_pct > 60:
                bias_level = "Supportive"
            elif negative_pct > 60:
                bias_level = "Critical"
            else:
                bias_level = "Neutral"
            
            # Determine category based on source name
            source_name_lower = source_name.lower()
            if any(keyword in source_name_lower for keyword in ['government', 'official', 'state']):
                category = "Government Channel"
            elif any(keyword in source_name_lower for keyword in ['entertainment', 'show', 'movie']):
                category = "Entertainment Channel"
            else:
                category = "News Channel"
            
            # Get recent programs from cached data (no additional DB query)
            recent_records = sorted(stats['records'], key=lambda x: x.date or datetime.min, reverse=True)[:5]
            
            recent_programs = []
            for program in recent_records:
                # Enhanced content extraction for TV programs
                program_title = None
                program_content = None
                
                # Extract title - prioritize title field, then extract from text/content
                if program.title and program.title.strip():
                    program_title = program.title.strip()
                elif program.text and program.text.strip():
                    # For TV data, often the first line or sentence is the title
                    text_lines = program.text.strip().split('\n')
                    program_title = text_lines[0][:100] + "..." if len(text_lines[0]) > 100 else text_lines[0]
                elif program.content and program.content.strip():
                    content_lines = program.content.strip().split('\n')
                    program_title = content_lines[0][:100] + "..." if len(content_lines[0]) > 100 else content_lines[0]
                else:
                    program_title = f"Recent program from {source_name}"
                
                # Extract full content for program description
                if program.text and program.text.strip():
                    program_content = program.text.strip()
                elif program.content and program.content.strip():
                    program_content = program.content.strip()
                elif program.title and program.title.strip():
                    program_content = program.title.strip()
                else:
                    program_content = "No content available"
                
                # Use existing URL from database, prioritize url field over source_url
                program_url = program.url if program.url else program.source_url
                
                # Calculate relative time from program date
                relative_time = "Recently"
                program_date = None
                if program.date:
                    try:
                        # Ensure we have a datetime object
                        if hasattr(program.date, 'replace'):
                            program_datetime = program.date
                        else:
                            program_datetime = datetime.fromisoformat(str(program.date))
                        
                        # Make timezone-aware if not already
                        if program_datetime.tzinfo is None:
                            program_datetime = program_datetime.replace(tzinfo=timezone.utc)
                        
                        # Calculate time difference
                        now = datetime.now(timezone.utc)
                        time_diff = now - program_datetime
                        
                        if time_diff.days > 0:
                            relative_time = f"{time_diff.days}d ago"
                        elif time_diff.seconds > 3600:  # More than 1 hour
                            hours = time_diff.seconds // 3600
                            relative_time = f"{hours}h ago"
                        elif time_diff.seconds > 60:  # More than 1 minute
                            minutes = time_diff.seconds // 60
                            relative_time = f"{minutes}m ago"
                        else:
                            relative_time = "Just now"
                        
                        # Store the ISO date as well
                        program_date = program_datetime.isoformat()
                    except Exception as e:
                        logger.warning(f"Error calculating relative time for TV program: {e}")
                        relative_time = "Recently"
                        program_date = str(program.date) if program.date else None
                
                # Enhanced viewership calculation based on sentiment and content
                base_viewership = 1.0 + (hash(program_title) % 5)  # 1.0 to 6.0 base
                sentiment_boost = abs(program.sentiment_score or 0) * 2  # Strong sentiment = more viewers
                content_boost = len(program_content) / 1000 if program_content != "No content available" else 0  # Longer content = more engagement
                calculated_viewership = round(base_viewership + sentiment_boost + content_boost, 1)
                
                recent_programs.append({
                    "id": program.entry_id,  # Add record ID for feedback (using entry_id)
                    "title": program_title,
                    "content": program_content,
                    "sentiment": program.sentiment_label or "neutral",
                    "sentiment_score": float(program.sentiment_score) if program.sentiment_score is not None else 0.0,
                    "sentiment_justification": program.sentiment_justification if hasattr(program, 'sentiment_justification') else None,
                    "viewership": calculated_viewership,
                    "time": relative_time,
                    "date": program_date,
                    "url": program_url,
                    "youtube_url": program_url  # Keep for backward compatibility
                })
            
            # Generate top topics based on source name and recent content
            top_topics = []
            if 'news' in source_name_lower:
                top_topics = ['#BreakingNews', '#CurrentAffairs', '#Politics']
            elif 'business' in source_name_lower:
                top_topics = ['#Business', '#Economy', '#Markets']
            elif 'sports' in source_name_lower:
                top_topics = ['#Sports', '#Football', '#Athletics']
            else:
                top_topics = ['#News', '#Updates', '#Reports']
            
            # Map to clean display names and official websites based on source name
            if 'al jazeera' in source_name_lower or 'aljazeera' in source_name_lower:
                display_name = "Al Jazeera"
                website_url = "https://www.aljazeera.com"
            elif 'bein' in source_name_lower:
                display_name = "beIN Sports"
                website_url = "https://www.beinsports.com"
            elif 'cnn' in source_name_lower:
                display_name = "CNN"
                website_url = "https://www.cnn.com"
            elif 'bbc' in source_name_lower:
                display_name = "BBC"
                website_url = "https://www.bbc.com"
            elif 'channels' in source_name_lower:
                display_name = "Channels Television"
                website_url = "https://www.channelstv.com"
            elif 'tvc' in source_name_lower:
                display_name = "TVC News"
                website_url = "https://www.tvcnews.tv"
            elif 'ait' in source_name_lower:
                display_name = "AIT (Africa Independent Television)"
                website_url = "https://www.ait.live"
            elif 'nta' in source_name_lower:
                display_name = "NTA (Nigerian Television Authority)"
                website_url = "https://www.nta.ng"
            elif 'arise' in source_name_lower:
                display_name = "Arise News"
                website_url = "https://www.arise.tv"
            elif 'silverbird' in source_name_lower:
                display_name = "Silverbird Television"
                website_url = "https://www.silverbirdtv.com"
            elif 'plus' in source_name_lower:
                display_name = "Plus TV Africa"
                website_url = "https://www.plustvafrica.com"
            elif 'news central' in source_name_lower:
                display_name = "News Central TV"
                website_url = "https://www.newscentral.ng"
            else:
                # Use the source name as display name
                display_name = source_name
                website_url = f"https://www.{source_name.lower().replace(' ', '')}.com"
            
            television_channels.append({
                "name": display_name,
                "logo": "📺",
                "sentiment_score": float(avg_sentiment_score) if avg_sentiment_score is not None else 0.0,
                "bias_level": bias_level,
                "coverage_count": int(total_programs) if total_programs else 0,
                "last_updated": "1 hour ago",  # This would need to be calculated from actual data
                "category": category,
                "verified": True,  # Mock verification status
                "recent_programs": recent_programs,
                "top_topics": top_topics,
                "website_url": website_url
            })
        
        logger.info(f"Returning {len(television_channels)} television channels")
        return {"status": "success", "data": television_channels}
        
    except Exception as e:
        logger.error(f"Error fetching television sources: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/sentiment-feedback")
async def update_sentiment_feedback(
    request: Request,
    db: Session = Depends(get_db)
):
    """Update sentiment label based on user feedback"""
    try:
        data = await request.json()
        logger.info(f"Sentiment feedback received: {data}")
        
        # Extract required fields
        record_id = data.get('record_id')
        new_sentiment = data.get('new_sentiment')  # 'positive', 'negative', 'neutral'
        content_type = data.get('content_type')  # 'article', 'tweet', 'program'
        user_id = data.get('user_id', 'anonymous')
        
        if not record_id or not new_sentiment:
            return {"status": "error", "message": "record_id and new_sentiment are required"}
        
        if new_sentiment not in ['positive', 'negative', 'neutral']:
            return {"status": "error", "message": "new_sentiment must be one of: positive, negative, neutral"}
        
        # Find the record in the database
        from .models import SentimentData
        record = db.query(SentimentData).filter(SentimentData.entry_id == record_id).first()
        
        if not record:
            return {"status": "error", "message": "Record not found"}
        
        # Store the original AI sentiment for reference
        original_sentiment = record.sentiment_label
        
        # Update the sentiment label
        record.sentiment_label = new_sentiment
        
        # Add user feedback metadata (you might want to create a separate feedback table)
        # For now, we'll add it to a comment or metadata field
        feedback_note = f"User feedback: {original_sentiment} -> {new_sentiment} by {user_id}"
        if hasattr(record, 'user_feedback'):
            record.user_feedback = feedback_note
        elif hasattr(record, 'notes'):
            record.notes = feedback_note
        
        # Commit the changes
        db.commit()
        db.refresh(record)
        
        logger.info(f"Updated sentiment for record {record_id}: {original_sentiment} -> {new_sentiment}")
        
        # Clear relevant caches since the data has changed
        from .data_cache import sentiment_cache
        sentiment_cache.clear_cache()
        
        return {
            "status": "success", 
            "message": "Sentiment updated successfully",
            "data": {
                "record_id": record_id,
                "original_sentiment": original_sentiment,
                "new_sentiment": new_sentiment,
                "content_type": content_type
            }
        }
        
    except Exception as e:
        logger.error(f"Error updating sentiment feedback: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/media-sources/facebook")
async def get_facebook_sources(db: Session = Depends(get_db), user_id: Optional[str] = Query(None)):
    """Get Facebook sources with sentiment analysis"""
    try:
        logger.info("Facebook endpoint called")
        from .data_cache import sentiment_cache
        from collections import defaultdict
        
        # Get all data from cache instead of multiple database queries
        logger.info("Loading data from cache...")
        all_data = sentiment_cache.get_all_data(db)
        
        # Apply target individual filtering if user_id provided
        all_data = apply_target_filtering_to_media_data(db, all_data, user_id, "facebook")
        
        # Get cache statistics instead of separate database queries
        stats = sentiment_cache.get_stats(db)
        logger.info(f"Total records in cache: {stats.total_records}")
        logger.info(f"Available platforms: {len(stats.platforms)} platforms")
        logger.info(f"Available sources: {len(stats.sources)} sources")
        
        # Facebook sources are typically identified by platform being 'Facebook' or source containing Facebook-related keywords
        facebook_keywords = [
            'facebook', 'fb', 'meta', 'social media', 'social',
            # Nigerian Facebook pages (Priority 1)
            'legitng', 'vanguardngr', 'punchng', 'guardian_ng', 'dailytrust', 
            'thisday', 'nation_ng', 'premiumtimes', 'nairametrics', 'channelstv',
            # Qatar Facebook pages (Priority 2)
            'aljazeera', 'al jazeera', 'alrayyan', 'qatar tribune', 'qatar news',
            'peninsula qatar', 'alwatan doha', 'alsharq', 'qatar news agency',
            # International Facebook pages (Priority 3)
            'cnn', 'bbc', 'fox news', 'msnbc', 'sky news', 'reuters', 'ap'
        ]
        
        # Filter data using cache instead of complex SQL
        facebook_data = sentiment_cache.filter_by_platform_keywords(all_data, facebook_keywords)
        logger.info(f"Filtered to {len(facebook_data)} Facebook records")
        
        # Group data by source and calculate statistics
        source_stats = defaultdict(lambda: {
            'records': [],
            'total_posts': 0,
            'positive_count': 0,
            'negative_count': 0,
            'neutral_count': 0,
            'sentiment_scores': [],
            'last_updated': None
        })
        
        for record in facebook_data:
            # Determine primary source identifier
            source_name = record.source_name or record.source or record.platform or "Unknown"
            
            source_stats[source_name]['records'].append(record)
            source_stats[source_name]['total_posts'] += 1
            
            if record.sentiment_label == 'positive':
                source_stats[source_name]['positive_count'] += 1
            elif record.sentiment_label == 'negative':
                source_stats[source_name]['negative_count'] += 1
            else:
                source_stats[source_name]['neutral_count'] += 1
                
            if record.sentiment_score:
                source_stats[source_name]['sentiment_scores'].append(record.sentiment_score)
                
            if record.date and (not source_stats[source_name]['last_updated'] or record.date > source_stats[source_name]['last_updated']):
                source_stats[source_name]['last_updated'] = record.date
        
        # Sort by post count and limit to top 15
        sorted_sources = sorted(source_stats.items(), key=lambda x: x[1]['total_posts'], reverse=True)[:15]
        logger.info(f"Found {len(sorted_sources)} Facebook sources")
        
        facebook_pages = []
        for source_name, stats in sorted_sources:
            logger.info(f"Processing Facebook source: {source_name}")
            
            # Get representative record for source info
            representative_record = stats['records'][0] if stats['records'] else None
            if not representative_record:
                continue
                
            total_posts = stats['total_posts']
            positive_pct = (stats['positive_count'] / total_posts * 100) if total_posts > 0 else 0
            negative_pct = (stats['negative_count'] / total_posts * 100) if total_posts > 0 else 0
            neutral_pct = (stats['neutral_count'] / total_posts * 100) if total_posts > 0 else 0
            
            # Calculate average sentiment score
            avg_sentiment_score = sum(stats['sentiment_scores']) / len(stats['sentiment_scores']) if stats['sentiment_scores'] else 0.0
            
            # Determine bias level based on sentiment distribution
            if positive_pct > 60:
                bias_level = "Supportive"
            elif negative_pct > 60:
                bias_level = "Critical"
            else:
                bias_level = "Neutral"
            
            # Determine category based on source name
            source_name_lower = source_name.lower()
            if any(keyword in source_name_lower for keyword in ['news', 'media', 'channel']):
                category = "News Media"
            elif any(keyword in source_name_lower for keyword in ['government', 'official']):
                category = "Government Page"
            else:
                category = "Community Page"
            
            # Get recent posts from cached data (no additional DB query)
            recent_records = sorted(stats['records'], key=lambda x: x.date or datetime.min, reverse=True)[:3]
            recent_posts = []
            for post_record in recent_records:
                # Use title if available, otherwise extract from text
                post_text = post_record.title if post_record.title and post_record.title.strip() else (
                    post_record.text[:100] + "..." if post_record.text and len(post_record.text) > 100 
                    else post_record.text or "No content available"
                )
                
                # Handle date formatting safely  
                if post_record.date:
                    try:
                        if hasattr(post_record.date, 'isoformat'):
                            post_date = post_record.date.isoformat()
                        else:
                            post_date = str(post_record.date)
                    except:
                        post_date = str(post_record.date) if post_record.date else "Unknown"
                else:
                    post_date = "Unknown"
                
                recent_posts.append({
                    "text": post_text,
                    "sentiment": post_record.sentiment_label or "neutral", 
                    "engagement": round(100 + (hash(post_text) % 500), 0),  # Mock engagement
                    "time": "3 hours ago"  # This would need to be calculated from actual data
                })
            
            # Generate trending topics based on content
            trending_topics = ['#News', '#Updates', '#Discussion']
            if 'politics' in source_name_lower:
                trending_topics = ['#Politics', '#Government', '#Policy']
            elif 'business' in source_name_lower:
                trending_topics = ['#Business', '#Economy', '#Finance']
            elif 'sports' in source_name_lower:
                trending_topics = ['#Sports', '#Football', '#Athletics']
            
            facebook_pages.append({
                "name": source_name,
                "logo": "📘",
                "sentiment_score": float(avg_sentiment_score) if avg_sentiment_score is not None else 0.0,
                "bias_level": bias_level,
                "followers": f"{round(total_posts * 500 + (hash(source_name) % 10000), 0):,}",  # Mock followers
                "posts_count": int(total_posts) if total_posts else 0,
                "coverage_count": int(total_posts) if total_posts else 0,  # Add for frontend compatibility
                "last_updated": "1 hour ago",  # This would need to be calculated from actual data
                "category": category,
                "verified": True,  # Mock verification status
                "recent_posts": recent_posts,
                "trending_topics": trending_topics,
                "page_url": f"https://www.facebook.com/{source_name.lower().replace(' ', '')}"
            })
        
        logger.info(f"Returning {len(facebook_pages)} Facebook pages")
        return {"status": "success", "data": facebook_pages}
        
    except Exception as e:
        logger.error(f"Error fetching Facebook sources: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/policy-impact")
async def get_policy_impact_data(db: Session = Depends(get_db)):
    """Get policy impact analysis data based on sentiment analysis"""
    try:
        logger.info("Policy impact endpoint called")
        
        # Define policy keywords to search for in the data
        policy_keywords = [
            'fuel subsidy', 'subsidy removal', 'petrol price', 'diesel price',
            'exchange rate', 'currency policy', 'naira', 'forex',
            'security measures', 'security policy', 'insecurity',
            'economic reforms', 'economic policy', 'budget',
            'tax policy', 'tax reform', 'taxation',
            'education policy', 'school', 'university',
            'health policy', 'healthcare', 'hospital',
            'agriculture policy', 'farming', 'agricultural',
            'infrastructure', 'road', 'bridge', 'construction',
            'corruption', 'anti-corruption', 'transparency'
        ]
        
        # First, let's check what data exists in the database
        total_data_query = text("SELECT COUNT(*) as total FROM sentiment_data")
        total_result = db.execute(total_data_query)
        total_count = total_result.fetchone().total
        logger.info(f"Total records in database: {total_count}")
        
        # Check what platforms exist
        platforms_query = text("SELECT DISTINCT platform FROM sentiment_data WHERE platform IS NOT NULL")
        platforms_result = db.execute(platforms_query)
        platforms = [row.platform for row in platforms_result]
        logger.info(f"Available platforms: {platforms}")
        
        # Check what source_names exist
        sources_query = text("SELECT DISTINCT source_name FROM sentiment_data WHERE source_name IS NOT NULL LIMIT 10")
        sources_result = db.execute(sources_query)
        sources = [row.source_name for row in sources_result]
        logger.info(f"Sample source_names: {sources}")
        
        # Build the query to find policy-related mentions
        policy_conditions = []
        for keyword in policy_keywords:
            policy_conditions.append(f"LOWER(text) LIKE '%{keyword}%'")
            policy_conditions.append(f"LOWER(title) LIKE '%{keyword}%'")
            policy_conditions.append(f"LOWER(content) LIKE '%{keyword}%'")
        
        policy_condition = " OR ".join(policy_conditions)
        logger.info(f"Policy condition: {policy_condition}")
        
        # Query for policy-related data - load all data instead of just latest run
        query = text(f"""
            SELECT 
                date,
                sentiment_score,
                sentiment_label,
                source,
                platform,
                text,
                title,
                COUNT(*) as mention_count
            FROM sentiment_data 
            WHERE ({policy_condition})
            GROUP BY date, sentiment_score, sentiment_label, source, platform, text, title
            ORDER BY date DESC
        """)
        
        result = db.execute(query)
        rows = list(result)
        logger.info(f"Found {len(rows)} policy-related mentions")
        
        # Process the data to identify policies and their impact
        policies = []
        policy_groups = {}
        
        for row in rows:
            logger.info(f"Processing policy mention: {row.title[:50] if row.title else 'No title'} / {row.sentiment_label}")
            # Extract policy name from text/title
            policy_name = extract_policy_name(row.text or row.title or "")
            if not policy_name:
                continue
                
            if policy_name not in policy_groups:
                policy_groups[policy_name] = {
                    'mentions': [],
                    'total_mentions': 0,
                    'positive_mentions': 0,
                    'negative_mentions': 0,
                    'neutral_mentions': 0,
                    'avg_sentiment': 0,
                    'first_mention': None,
                    'last_mention': None
                }
            
            # Handle date field properly - it might be a string or datetime
            mention_date = None
            if row.date:
                if isinstance(row.date, str):
                    # If it's a string, use it directly or try to parse it
                    try:
                        parsed_date = parse_datetime(row.date)
                        mention_date = parsed_date.isoformat() if parsed_date else row.date
                    except:
                        mention_date = row.date
                elif hasattr(row.date, 'isoformat'):
                    # If it's already a datetime object, use isoformat
                    mention_date = row.date.isoformat()
                else:
                    # Fallback: convert to string
                    mention_date = str(row.date)
            
            mention_data = {
                'date': mention_date,
                'sentiment_score': float(row.sentiment_score) if row.sentiment_score else 0.0,
                'sentiment_label': row.sentiment_label or 'neutral',
                'source': row.source,
                'platform': row.platform,
                'text': row.text,
                'mention_count': int(row.mention_count)
            }
            
            policy_groups[policy_name]['mentions'].append(mention_data)
            policy_groups[policy_name]['total_mentions'] += mention_data['mention_count']
            
            if mention_data['sentiment_label'] == 'positive':
                policy_groups[policy_name]['positive_mentions'] += mention_data['mention_count']
            elif mention_data['sentiment_label'] == 'negative':
                policy_groups[policy_name]['negative_mentions'] += mention_data['mention_count']
            else:
                policy_groups[policy_name]['neutral_mentions'] += mention_data['mention_count']
            
            # Track first and last mention dates
            if mention_data['date']:  # Only process if date is not None
                if not policy_groups[policy_name]['first_mention'] or mention_data['date'] < policy_groups[policy_name]['first_mention']:
                    policy_groups[policy_name]['first_mention'] = mention_data['date']
                if not policy_groups[policy_name]['last_mention'] or mention_data['date'] > policy_groups[policy_name]['last_mention']:
                    policy_groups[policy_name]['last_mention'] = mention_data['date']
        
        # Convert policy groups to the format expected by the frontend
        for policy_name, data in policy_groups.items():
            logger.info(f"Processing policy group: {policy_name} with {data['total_mentions']} mentions")
            if data['total_mentions'] < 5:  # Only include policies with significant mentions
                continue
                
            # Calculate average sentiment
            total_sentiment = sum(m['sentiment_score'] * m['mention_count'] for m in data['mentions'])
            data['avg_sentiment'] = total_sentiment / data['total_mentions'] if data['total_mentions'] > 0 else 0
            
            # Determine policy status
            days_since_last_mention = 0
            if data['last_mention']:
                last_mention_date = datetime.fromisoformat(data['last_mention'].split('T')[0])
                days_since_last_mention = (datetime.now() - last_mention_date).days
            
            if days_since_last_mention <= 7:
                status = 'active'
            elif days_since_last_mention <= 30:
                status = 'recent'
            else:
                status = 'historical'
            
            # Calculate recovery rate (simplified)
            recovery_rate = 0.0
            if data['avg_sentiment'] > -0.3:
                recovery_rate = 0.3
            elif data['avg_sentiment'] > -0.6:
                recovery_rate = 0.15
            else:
                recovery_rate = 0.05
            
            # Determine public reaction
            if data['avg_sentiment'] > 0.3:
                public_reaction = 'positive'
            elif data['avg_sentiment'] < -0.6:
                public_reaction = 'high_negative'
            elif data['avg_sentiment'] < -0.3:
                public_reaction = 'moderate_negative'
            else:
                public_reaction = 'mixed'
            
            policies.append({
                'id': policy_name.lower().replace(' ', '_'),
                'name': policy_name,
                'announcement_date': data['first_mention'] or datetime.now().isoformat().split('T')[0],
                'status': status,
                'current_sentiment': data['avg_sentiment'],
                'pre_announcement': data['avg_sentiment'] - 0.1,  # Estimate
                'post_announcement': data['avg_sentiment'] - 0.2,  # Estimate
                'peak_negative': min(data['avg_sentiment'] - 0.3, -0.5),  # Estimate
                'recovery_rate': recovery_rate,
                'media_coverage': data['total_mentions'],
                'public_reaction': public_reaction,
                'mentions': data['mentions'][:10]  # Limit to recent mentions
            })
        
        # Sort policies by total mentions (most discussed first)
        policies.sort(key=lambda x: x['media_coverage'], reverse=True)
        
        logger.info(f"Returning {len(policies)} policies")
        return {"status": "success", "data": policies}
        
    except Exception as e:
        logger.error(f"Error fetching policy impact data: {e}")
        return {"status": "error", "message": str(e)}


def extract_policy_name(text):
    """Extract policy name from text content"""
    if not text:
        return None
    
    text_lower = text.lower()
    
    # Define policy patterns
    policy_patterns = [
        ('fuel subsidy', 'Fuel Subsidy Removal'),
        ('subsidy removal', 'Fuel Subsidy Removal'),
        ('petrol price', 'Fuel Price Policy'),
        ('diesel price', 'Fuel Price Policy'),
        ('exchange rate', 'Exchange Rate Policy'),
        ('currency policy', 'Exchange Rate Policy'),
        ('forex', 'Exchange Rate Policy'),
        ('security measures', 'Security Measures'),
        ('security policy', 'Security Measures'),
        ('insecurity', 'Security Measures'),
        ('economic reforms', 'Economic Reforms'),
        ('economic policy', 'Economic Reforms'),
        ('budget', 'Budget Policy'),
        ('tax policy', 'Tax Policy'),
        ('tax reform', 'Tax Policy'),
        ('taxation', 'Tax Policy'),
        ('education policy', 'Education Policy'),
        ('school', 'Education Policy'),
        ('university', 'Education Policy'),
        ('health policy', 'Healthcare Policy'),
        ('healthcare', 'Healthcare Policy'),
        ('hospital', 'Healthcare Policy'),
        ('agriculture policy', 'Agriculture Policy'),
        ('farming', 'Agriculture Policy'),
        ('agricultural', 'Agriculture Policy'),
        ('infrastructure', 'Infrastructure Policy'),
        ('road', 'Infrastructure Policy'),
        ('bridge', 'Infrastructure Policy'),
        ('construction', 'Infrastructure Policy'),
        ('corruption', 'Anti-Corruption Policy'),
        ('anti-corruption', 'Anti-Corruption Policy'),
        ('transparency', 'Anti-Corruption Policy')
    ]
    
    for pattern, policy_name in policy_patterns:
        if pattern in text_lower:
            return policy_name
    
    return None

def extract_headline_from_text(text: str, max_length: int = 100) -> str:
    """Extract a headline from article text by taking the first meaningful line"""
    if not text:
        return "No headline available"
    
    # Split by newlines and find the first non-empty line
    lines = text.strip().split('\n')
    for line in lines:
        line = line.strip()
        if line and len(line) > 10:  # Skip very short lines
            # Clean up the line and limit length
            headline = line[:max_length].strip()
            if len(line) > max_length:
                headline += "..."
            return headline
    
    # If no good line found, take first 100 characters of text
    return text[:max_length].strip() + ("..." if len(text) > max_length else "")

@app.post("/showcase/add-data")
async def add_showcase_data(db: Session = Depends(get_db)):
    """Add showcase data for The Nation newspaper and Arise TV channel"""
    try:
        from datetime import datetime, timedelta
        import uuid
        
        # Sample data for "The Nation" newspaper
        nation_data = [
            {
                "id": str(uuid.uuid4()),
                "source_name": "The Nation",
                "platform": "newspaper",
                "title": "President Tinubu Announces New Economic Reforms for 2025",
                "text": "President Bola Tinubu unveiled comprehensive economic reforms aimed at boosting Nigeria's economic growth. The reforms include tax incentives for businesses and infrastructure development plans.",
                "sentiment_label": "positive",
                "sentiment_score": 0.75,
                "date": (datetime.now() - timedelta(hours=2)).isoformat(),
                "url": "https://thenationonlineng.net/economic-reforms-2025",
                "source": "The Nation Online"
            },
            {
                "id": str(uuid.uuid4()),
                "source_name": "The Nation",
                "platform": "newspaper", 
                "title": "Senate Approves Budget for Youth Development Programs",
                "text": "The Nigerian Senate has approved a substantial budget allocation for youth development and job creation programs across the country. This initiative is expected to benefit millions of young Nigerians.",
                "sentiment_label": "positive",
                "sentiment_score": 0.68,
                "date": (datetime.now() - timedelta(hours=6)).isoformat(),
                "url": "https://thenationonlineng.net/youth-budget-approval",
                "source": "The Nation Online"
            },
            {
                "id": str(uuid.uuid4()),
                "source_name": "The Nation",
                "platform": "newspaper",
                "title": "Analysis: Nigeria's Infrastructure Development Progress",
                "text": "A comprehensive analysis of Nigeria's infrastructure development shows steady progress in road construction, power generation, and digital connectivity. However, challenges remain in rural areas.",
                "sentiment_label": "neutral",
                "sentiment_score": 0.45,
                "date": (datetime.now() - timedelta(hours=12)).isoformat(),
                "url": "https://thenationonlineng.net/infrastructure-analysis",
                "source": "The Nation Online"
            }
        ]
        
        # Sample data for "Arise TV" channel
        arise_data = [
            {
                "id": str(uuid.uuid4()),
                "source_name": "Arise TV",
                "platform": "television",
                "title": "Morning Show: President Tinubu's Economic Vision for Nigeria",
                "text": "In today's morning show, experts discussed President Tinubu's economic vision and its potential impact on Nigeria's development. The program featured analysis from leading economists.",
                "sentiment_label": "positive",
                "sentiment_score": 0.72,
                "date": (datetime.now() - timedelta(hours=3)).isoformat(),
                "url": "https://arisemediagroup.com/morning-show",
                "source": "Arise TV"
            },
            {
                "id": str(uuid.uuid4()),
                "source_name": "Arise TV",
                "platform": "television",
                "title": "News at 9: Updates on Government Policies",
                "text": "Tonight's news program covers the latest updates on government policies, including education reforms and healthcare initiatives. The report provides balanced coverage of ongoing developments.",
                "sentiment_label": "neutral",
                "sentiment_score": 0.55,
                "date": (datetime.now() - timedelta(hours=8)).isoformat(),
                "url": "https://arisemediagroup.com/news-9pm",
                "source": "Arise TV"
            },
            {
                "id": str(uuid.uuid4()),
                "source_name": "Arise TV",
                "platform": "television",
                "title": "Special Report: Nigeria's Democratic Progress",
                "text": "A special investigative report examining Nigeria's democratic progress since the last elections. The program highlights achievements in democratic governance and areas for improvement.",
                "sentiment_label": "positive",
                "sentiment_score": 0.65,
                "date": (datetime.now() - timedelta(hours=15)).isoformat(),
                "url": "https://arisemediagroup.com/special-report",
                "source": "Arise TV"
            }
        ]
        
        # Insert the sample data
        all_data = nation_data + arise_data
        
        for item in all_data:
            # Check if item already exists to avoid duplicates
            existing = db.execute(
                text("SELECT entry_id FROM sentiment_data WHERE title = :title"),
                {"title": item["title"]}
            ).fetchone()
            
            if not existing:
                # Add required fields
                item_with_timestamp = item.copy()
                item_with_timestamp['run_timestamp'] = datetime.now().isoformat()
                # Remove the id field since entry_id is auto-increment
                if 'id' in item_with_timestamp:
                    del item_with_timestamp['id']
                
                db.execute(
                    text("""
                        INSERT INTO sentiment_data 
                        (source_name, platform, title, text, sentiment_label, sentiment_score, date, url, source, run_timestamp)
                        VALUES (:source_name, :platform, :title, :text, :sentiment_label, :sentiment_score, :date, :url, :source, :run_timestamp)
                    """),
                    item_with_timestamp
                )
        
        db.commit()
        
        logger.info(f"Added {len(all_data)} showcase data entries")
        return {
            "status": "success", 
            "message": f"Successfully added showcase data for The Nation and Arise TV",
            "items_added": len(all_data)
        }
        
    except Exception as e:
        logger.error(f"Error adding showcase data: {e}")
        db.rollback()
        return {"status": "error", "message": str(e)}

