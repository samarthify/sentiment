from fastapi import FastAPI, WebSocket, HTTPException, BackgroundTasks, Depends, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import json
import asyncio
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
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
    
    # Remove similar content (simplified version for performance)
    final_records = remove_similar_content(unique_records)
    
    logger.info(f"After similarity deduplication: {len(final_records)} records (removed {len(unique_records) - len(final_records)} similar records)")
    
    return final_records

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
    Remove records with similar content using a simplified approach.
    """
    if len(records) <= 1:
        return records
    
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

@app.get("/latest-data")
async def get_latest_data(db: Session = Depends(get_db)):
    """Get all processed data with AI justification containing 'Recommended Action' that mentions target individual - PUBLIC ACCESS"""
    try:
        logger.info("Latest data endpoint called (public access)")
        from sqlalchemy import text
        from sqlalchemy import or_
        
        # Test database connection first
        try:
            db.execute(text("SELECT 1"))
            logger.info("Database connection successful")
        except Exception as db_error:
            logger.error(f"Database connection failed: {str(db_error)}")
            return {"status": "error", "message": f"Database connection failed: {str(db_error)}"}
        
        # Get target individual configuration (use a default user ID for public access)
        default_user_id = "6440da7f-e630-4b2f-884e-a8721cc9a9c0"  # Your default user
        target_config = db.query(models.TargetIndividualConfiguration)\
                         .filter(models.TargetIndividualConfiguration.user_id == default_user_id)\
                         .order_by(models.TargetIndividualConfiguration.created_at.desc())\
                         .first()
        
        if not target_config:
            logger.warning("No target config found, returning all data with AI justification containing 'Recommended Action'")
            # Fallback: return all data with AI justification containing "Recommended Action"
            results = db.query(models.SentimentData)\
                        .filter(models.SentimentData.sentiment_justification.isnot(None))\
                        .filter(models.SentimentData.sentiment_justification != "")\
                        .filter(models.SentimentData.sentiment_justification.ilike("%Recommended Action%"))\
                        .all()
        else:
            logger.info(f"Found target config: {target_config.individual_name} with {len(target_config.query_variations)} variations")
            
            # Build search conditions for target individual
            search_terms = [target_config.individual_name] + target_config.query_variations
            
            # Create OR conditions for all search terms
            search_conditions = []
            for term in search_terms:
                if term and term.strip():  # Only add non-empty terms
                    search_conditions.append(
                        or_(
                            models.SentimentData.text.ilike(f"%{term}%"),
                            models.SentimentData.title.ilike(f"%{term}%"),
                            models.SentimentData.content.ilike(f"%{term}%")
                        )
                    )
            
            if search_conditions:
                # Combine all search conditions with OR
                combined_search = or_(*search_conditions)
                
                # Get data with AI justification containing "Recommended Action", mentions target individual
                results = db.query(models.SentimentData)\
                            .filter(models.SentimentData.sentiment_justification.isnot(None))\
                            .filter(models.SentimentData.sentiment_justification != "")\
                            .filter(models.SentimentData.sentiment_justification.ilike("%Recommended Action%"))\
                            .filter(combined_search)\
                            .all()
            else:
                # No valid search terms, return empty
                results = []
        
        logger.info(f"Found {len(results)} records with AI justification containing 'Recommended Action' and mentioning target individual")
        
        if not results:
            target_name = target_config.individual_name if target_config else "target individual"
            return {"status": "error", "message": f"No data with AI justification containing 'Recommended Action' and mentioning {target_name} available."}
        
        # Apply deduplication to remove duplicate content
        deduplicated_results = deduplicate_sentiment_data(results)
        logger.info(f"After deduplication: {len(deduplicated_results)} unique records")
        
        data_list = [row.to_dict() for row in deduplicated_results]

        return {
            "status": "success",
            "data": data_list, 
            "record_count": len(data_list),
            "note": f"Public access to data with AI justification containing 'Recommended Action' and mentioning {target_config.individual_name if target_config else 'target individual'}"
        }
    except Exception as e:
        logger.error(f"Error fetching data from DB: {str(e)}", exc_info=True)
        return {"status": "error", "message": f"Error fetching data: {str(e)}"}
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
                query_variations=target_config.query_variations
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

@app.get("/media-sources/newspapers")
async def get_newspaper_sources(db: Session = Depends(get_db)):
    """Get newspaper sources with sentiment analysis"""
    try:
        logger.info("Newspaper endpoint called")
        
        # Query newspaper sources from the database - load all data
        # Newspapers are typically identified by source names containing news-related keywords
        newspaper_keywords = [
            'guardian', 'times', 'post', 'tribune', 'herald', 'gazette', 'chronicle',
            'observer', 'independent', 'telegraph', 'express', 'mirror', 'mail',
            'punch', 'vanguard', 'thisday', 'premium', 'sun', 'business', 'daily',
            'gulf-times', 'peninsula', 'qatar tribune', 'qna', 'lusail', 'al-watan',
            'times of india', 'indian express', 'hindustan', 'the hindu', 'economic times',
            'the nation', 'nation'
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
        
        # Build the query to find newspaper sources
        newspaper_conditions = []
        for keyword in newspaper_keywords:
            newspaper_conditions.append(f"LOWER(source_name) LIKE '%{keyword}%'")
            newspaper_conditions.append(f"LOWER(source) LIKE '%{keyword}%'")
            newspaper_conditions.append(f"LOWER(platform) LIKE '%{keyword}%'")
        
        # If no newspaper-specific data found, try to get any data with news-like sources
        if not newspaper_conditions:
            newspaper_conditions = [
                "LOWER(source_name) LIKE '%news%'",
                "LOWER(source) LIKE '%news%'",
                "LOWER(platform) LIKE '%news%'",
                "LOWER(source_name) LIKE '%paper%'",
                "LOWER(source) LIKE '%paper%'",
                "LOWER(platform) LIKE '%paper%'"
            ]
        
        newspaper_condition = " OR ".join(newspaper_conditions)
        logger.info(f"Newspaper condition: {newspaper_condition}")
        
        query = text(f"""
            SELECT 
                source_name,
                source,
                platform,
                COUNT(*) as coverage_count,
                AVG(sentiment_score) as avg_sentiment_score,
                SUM(CASE WHEN sentiment_label = 'positive' THEN 1 ELSE 0 END) as positive_count,
                SUM(CASE WHEN sentiment_label = 'negative' THEN 1 ELSE 0 END) as negative_count,
                SUM(CASE WHEN sentiment_label = 'neutral' THEN 1 ELSE 0 END) as neutral_count,
                MAX(date) as last_updated
            FROM sentiment_data 
            WHERE ({newspaper_condition})
            GROUP BY source_name, source, platform
            ORDER BY coverage_count DESC
            LIMIT 10
        """)
        
        result = db.execute(query)
        rows = list(result)
        logger.info(f"Found {len(rows)} newspaper sources")
        
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
            
            # Get recent articles for this source with detailed information
            recent_articles_query = text("""
                SELECT title, sentiment_label, sentiment_score, sentiment_justification, date, text, url, source_name, platform
                FROM sentiment_data 
                WHERE (LOWER(source_name) LIKE :source_pattern OR LOWER(source) LIKE :source_pattern OR LOWER(platform) LIKE :source_pattern)
                ORDER BY date DESC
                LIMIT 3
            """)
            
            source_pattern = f"%{row.source_name.lower() if row.source_name else (row.platform.lower() if row.platform else row.source.lower())}%"
            recent_result = db.execute(recent_articles_query, {
                "source_pattern": source_pattern
            })
            
            recent_articles = []
            for article in recent_result:
                # Use title if available, otherwise extract headline from text
                headline = article.title if article.title and article.title.strip() else extract_headline_from_text(article.text)
                
                recent_articles.append({
                    "title": headline,
                    "sentiment": article.sentiment_label or "neutral",
                    "sentiment_score": float(article.sentiment_score) if article.sentiment_score else 0.0,
                    "sentiment_justification": article.sentiment_justification or "No AI justification available",
                    "date": article.date.isoformat() if article.date else None,
                    "text": article.text or "No content available",
                    "url": article.url or None,
                    "source_name": article.source_name or "Unknown Source",
                    "platform": article.platform or "Unknown Platform"
                })
            
            # Generate website URL based on source name
            source_name_lower = (row.source_name or row.platform or row.source or "").lower()
            website_url = ""
            
            # Map common newspapers to their official websites
            if 'punch' in source_name_lower:
                website_url = "https://www.punchng.com"
            elif 'vanguard' in source_name_lower:
                website_url = "https://www.vanguardngr.com"
            elif 'thisday' in source_name_lower:
                website_url = "https://www.thisdaylive.com"
            elif 'guardian' in source_name_lower:
                website_url = "https://www.guardian.ng"
            elif 'tribune' in source_name_lower:
                website_url = "https://www.tribuneonlineng.com"
            elif 'daily trust' in source_name_lower or 'dailytrust' in source_name_lower:
                website_url = "https://www.dailytrust.com"
            elif 'premium times' in source_name_lower or 'premiumtimes' in source_name_lower:
                website_url = "https://www.premiumtimesng.com"
            elif 'sun' in source_name_lower:
                website_url = "https://www.sunnewsonline.com"
            elif 'business day' in source_name_lower or 'businessday' in source_name_lower:
                website_url = "https://www.businessday.ng"
            elif 'daily post' in source_name_lower or 'dailypost' in source_name_lower:
                website_url = "https://www.dailypost.ng"
            elif 'legit' in source_name_lower:
                website_url = "https://www.legit.ng"
            elif 'sahara reporters' in source_name_lower or 'saharareporters' in source_name_lower:
                website_url = "https://www.saharareporters.com"
            elif 'nairametrics' in source_name_lower:
                website_url = "https://www.nairametrics.com"
            elif 'blueprint' in source_name_lower:
                website_url = "https://www.blueprint.ng"
            elif 'the cable' in source_name_lower or 'thecable' in source_name_lower:
                website_url = "https://www.thecable.ng"
            elif 'independent' in source_name_lower:
                website_url = "https://www.independent.ng"
            elif 'nan' in source_name_lower:
                website_url = "https://www.nannews.ng"
            else:
                # For unknown newspapers, construct a potential URL
                newspaper_name = row.source_name or row.platform or row.source or "Unknown Newspaper"
                website_url = f"https://www.{newspaper_name.lower().replace(' ', '')}.com"
            
            newspapers.append({
                "name": row.source_name or row.platform or row.source or "Unknown Newspaper",
                "logo": "📰",
                "sentiment_score": float(row.avg_sentiment_score) if row.avg_sentiment_score else 0.0,
                "bias_level": bias_level,
                "coverage_count": int(row.coverage_count),
                "last_updated": "2 hours ago",  # This would need to be calculated from actual data
                "top_headlines": [article["title"] for article in recent_articles[:2]],
                "recent_articles": recent_articles,
                "website_url": website_url
            })
        
        logger.info(f"Returning {len(newspapers)} newspaper sources")
        return {"status": "success", "data": newspapers}
        
    except Exception as e:
        logger.error(f"Error fetching newspaper sources: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/media-sources/twitter")
async def get_twitter_sources(db: Session = Depends(get_db)):
    """Get Twitter/X sources with sentiment analysis"""
    try:
        logger.info("Twitter endpoint called")
        
        # Query Twitter sources from the database - load all data
        # Twitter sources are typically identified by platform being 'X' or 'Twitter'
        # Add filtering to prioritize Nigerian content and exclude Indian content
        twitter_condition = """
            (LOWER(platform) LIKE '%x%' OR LOWER(platform) LIKE '%twitter%')
            AND (
                LOWER(text) LIKE '%nigeria%' OR 
                LOWER(text) LIKE '%nigerian%' OR 
                LOWER(text) LIKE '%lagos%' OR 
                LOWER(text) LIKE '%abuja%' OR 
                LOWER(text) LIKE '%tinubu%' OR
                LOWER(user_location) LIKE '%nigeria%' OR
                LOWER(user_location) LIKE '%lagos%' OR
                LOWER(user_location) LIKE '%abuja%'
            )
            AND NOT (
                LOWER(text) LIKE '%india%' OR 
                LOWER(text) LIKE '%indian%' OR 
                LOWER(text) LIKE '%delhi%' OR 
                LOWER(text) LIKE '%mumbai%' OR
                LOWER(user_location) LIKE '%india%' OR
                LOWER(user_location) LIKE '%delhi%' OR
                LOWER(user_location) LIKE '%mumbai%'
            )
        """
        
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
        
        logger.info(f"Twitter condition: {twitter_condition}")
        
        query = text(f"""
            SELECT 
                source_name,
                source,
                platform,
                user_name,
                user_handle,
                COUNT(*) as coverage_count,
                AVG(sentiment_score) as avg_sentiment_score,
                SUM(CASE WHEN sentiment_label = 'positive' THEN 1 ELSE 0 END) as positive_count,
                SUM(CASE WHEN sentiment_label = 'negative' THEN 1 ELSE 0 END) as negative_count,
                SUM(CASE WHEN sentiment_label = 'neutral' THEN 1 ELSE 0 END) as neutral_count,
                MAX(date) as last_updated
            FROM sentiment_data 
            WHERE ({twitter_condition})
            GROUP BY source_name, source, platform, user_name, user_handle
            ORDER BY coverage_count DESC
            LIMIT 10
        """)
        
        result = db.execute(query)
        rows = list(result)
        logger.info(f"Found {len(rows)} Twitter sources")
        
        twitter_accounts = []
        for row in rows:
            logger.info(f"Processing Twitter source: {row.user_name} / {row.user_handle} / {row.source_name} / {row.platform}")
            total_tweets = row.coverage_count
            positive_pct = (row.positive_count / total_tweets * 100) if total_tweets > 0 else 0
            negative_pct = (row.negative_count / total_tweets * 100) if total_tweets > 0 else 0
            neutral_pct = (row.neutral_count / total_tweets * 100) if total_tweets > 0 else 0
            
            # Determine bias level based on sentiment distribution
            if positive_pct > 60:
                bias_level = "Supportive"
            elif negative_pct > 60:
                bias_level = "Critical"
            else:
                bias_level = "Neutral"
            
            # Determine category based on user name and handle
            user_name_lower = (row.user_name or "").lower()
            user_handle_lower = (row.user_handle or "").lower()
            
            if any(keyword in user_name_lower or keyword in user_handle_lower for keyword in ['gov', 'official', 'minister', 'president', 'vice']):
                category = "Government Official"
            elif any(keyword in user_name_lower or keyword in user_handle_lower for keyword in ['news', 'media', 'journalist', 'reporter']):
                category = "Media Personality"
            elif any(keyword in user_name_lower or keyword in user_handle_lower for keyword in ['ceo', 'business', 'entrepreneur']):
                category = "Business Leader"
            else:
                category = "Public Figure"
            
            # Get recent tweets for this source
            recent_tweets_query = text("""
                SELECT title, sentiment_label, date, user_handle, user_name
                FROM sentiment_data 
                WHERE (LOWER(user_handle) LIKE :handle_pattern OR LOWER(user_name) LIKE :name_pattern)
                ORDER BY date DESC
                LIMIT 3
            """)
            
            handle_pattern = f"%{row.user_handle.lower() if row.user_handle else ''}%"
            name_pattern = f"%{row.user_name.lower() if row.user_name else ''}%"
            recent_result = db.execute(recent_tweets_query, {
                "handle_pattern": handle_pattern,
                "name_pattern": name_pattern
            })
            
            recent_tweets = []
            for tweet in recent_result:
                # Use title if available, otherwise extract headline from text
                tweet_text = tweet.title if tweet.title and tweet.title.strip() else "No content available"
                
                recent_tweets.append({
                    "text": tweet_text,
                    "sentiment": tweet.sentiment_label or "neutral",
                    "engagement": round(1000 + (hash(tweet_text) % 5000), 0) if tweet_text != "No content available" else 1000,  # Mock engagement
                    "time": "2 hours ago"  # This would need to be calculated from actual data
                })
            
            # Generate top hashtags based on content
            top_hashtags = ['#Nigeria', '#News', '#Updates']
            if 'politics' in user_name_lower or 'politics' in user_handle_lower:
                top_hashtags = ['#Nigeria', '#Politics', '#Government']
            elif 'business' in user_name_lower or 'business' in user_handle_lower:
                top_hashtags = ['#Nigeria', '#Business', '#Economy']
            elif 'sports' in user_name_lower or 'sports' in user_handle_lower:
                top_hashtags = ['#Nigeria', '#Sports', '#Football']
            
            # Generate Twitter profile URL
            profile_url = ""
            if row.user_handle:
                # Remove @ symbol if present and create Twitter profile URL
                handle = row.user_handle.replace('@', '') if row.user_handle.startswith('@') else row.user_handle
                profile_url = f"https://twitter.com/{handle}"
            elif row.user_name:
                # Use user name as fallback
                profile_url = f"https://twitter.com/{row.user_name.replace(' ', '')}"
            else:
                profile_url = ""
            
            twitter_accounts.append({
                "name": row.user_name or row.user_handle or row.source_name or row.platform or "Unknown Twitter User",
                "handle": row.user_handle or f"@{row.user_name}" if row.user_name else "@unknown",
                "logo": "🐦",
                "sentiment_score": float(row.avg_sentiment_score) if row.avg_sentiment_score else 0.0,
                "bias_level": bias_level,
                "followers": f"{round(total_tweets * 1000 + (hash(row.user_handle or row.user_name or 'unknown') % 50000), 0):,}" if row.user_handle or row.user_name else "Unknown",
                "tweets_count": int(row.coverage_count),
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
async def get_television_sources(db: Session = Depends(get_db)):
    """Get television sources with sentiment analysis"""
    try:
        logger.info("Television endpoint called")
        
        # Query television sources from the database - load all data
        # TV sources are typically identified by source names containing TV-related keywords
        tv_keywords = [
            'tv', 'television', 'channel', 'broadcast', 'cnn', 'bbc', 'fox', 'msnbc',
            'aljazeera', 'al jazeera', 'sky', 'itv', 'channel4', 'ndtv', 'news18',
            'republic', 'zee', 'channels tv', 'tvc', 'arise', 'silverbird',
            # Nigerian TV Channels
            'ait live', 'ait', 'nta', 'stv', 'plus tv', 'plus tv africa', 'plus', 'news central',
            'flip tv', 'trust tv', 'voice tv', 'silverbird tv', 'silverbird'
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
        
        # Check what source_names exist - EXPANDED DEBUGGING
        sources_query = text("SELECT DISTINCT source_name, COUNT(*) as count FROM sentiment_data WHERE source_name IS NOT NULL GROUP BY source_name ORDER BY count DESC LIMIT 20")
        sources_result = db.execute(sources_query)
        sources = [(row.source_name, row.count) for row in sources_result]
        logger.info(f"Top source_names with counts: {sources}")
        
        # Also check source and platform fields
        source_query = text("SELECT DISTINCT source, COUNT(*) as count FROM sentiment_data WHERE source IS NOT NULL GROUP BY source ORDER BY count DESC LIMIT 10")
        source_result = db.execute(source_query)
        source_list = [(row.source, row.count) for row in source_result]
        logger.info(f"Top sources with counts: {source_list}")
        
        platform_query = text("SELECT DISTINCT platform, COUNT(*) as count FROM sentiment_data WHERE platform IS NOT NULL GROUP BY platform ORDER BY count DESC LIMIT 10")
        platform_result = db.execute(platform_query)
        platform_list = [(row.platform, row.count) for row in platform_result]
        logger.info(f"Top platforms with counts: {platform_list}")
        
        # Build the query to find TV sources - make it more flexible
        tv_conditions = []
        for keyword in tv_keywords:
            # Escape the keyword for SQL LIKE pattern
            escaped_keyword = keyword.replace("'", "''")
            tv_conditions.append(f"LOWER(source_name) LIKE '%{escaped_keyword}%'")
            tv_conditions.append(f"LOWER(source) LIKE '%{escaped_keyword}%'")
            tv_conditions.append(f"LOWER(platform) LIKE '%{escaped_keyword}%'")
        
        # Only add fallback conditions if we have no TV keywords (which we do have now)
        # This fallback was causing generic "News" entries to appear
        # if not tv_conditions:
        #     tv_conditions = [
        #         "LOWER(source_name) LIKE '%news%'",
        #         "LOWER(source) LIKE '%news%'",
        #         "LOWER(platform) LIKE '%news%'",
        #         "LOWER(source_name) LIKE '%media%'",
        #         "LOWER(source) LIKE '%media%'",
        #         "LOWER(platform) LIKE '%media%'"
        #     ]
        
        tv_condition = " OR ".join(tv_conditions)
        logger.info(f"TV condition: {tv_condition}")
        
        # Debug: Let's see what TV sources we actually have in the database
        debug_query = text("""
            SELECT DISTINCT source_name, COUNT(*) as count 
            FROM sentiment_data 
            WHERE LOWER(source_name) LIKE '%tv%' 
               OR LOWER(source_name) LIKE '%television%'
               OR LOWER(source_name) LIKE '%channel%'
               OR LOWER(source_name) LIKE '%plus%'
               OR LOWER(source_name) LIKE '%ait%'
               OR LOWER(source_name) LIKE '%nta%'
               OR LOWER(source_name) LIKE '%tvc%'
            GROUP BY source_name 
            ORDER BY count DESC
        """)
        debug_result = db.execute(debug_query)
        debug_sources = [(row.source_name, row.count) for row in debug_result]
        logger.info(f"Debug - TV sources in database: {debug_sources}")

        # Create a priority-based query that favors specific TV channels over generic news sources
        query = text(f"""
            SELECT 
                source_name,
                source,
                platform,
                COUNT(*) as coverage_count,
                AVG(sentiment_score) as avg_sentiment_score,
                SUM(CASE WHEN sentiment_label = 'positive' THEN 1 ELSE 0 END) as positive_count,
                SUM(CASE WHEN sentiment_label = 'negative' THEN 1 ELSE 0 END) as negative_count,
                SUM(CASE WHEN sentiment_label = 'neutral' THEN 1 ELSE 0 END) as neutral_count,
                MAX(date) as last_updated,
                CASE 
                    WHEN LOWER(source_name) LIKE '%tvc%' THEN 1
                    WHEN LOWER(source_name) LIKE '%channels tv%' THEN 1
                    WHEN LOWER(source_name) LIKE '%ait%' THEN 1
                    WHEN LOWER(source_name) LIKE '%nta%' THEN 1
                    WHEN LOWER(source_name) LIKE '%plus tv%' THEN 1
                    WHEN LOWER(source_name) LIKE '%news central%' THEN 1
                    WHEN LOWER(source_name) LIKE '%trust tv%' THEN 1
                    WHEN LOWER(source_name) LIKE '%silverbird%' THEN 1
                    WHEN LOWER(source_name) LIKE '%stv%' THEN 1
                    WHEN LOWER(source_name) LIKE '%flip tv%' THEN 1
                    WHEN LOWER(source_name) LIKE '%voice tv%' THEN 1
                    WHEN LOWER(source_name) LIKE '%arise%' THEN 1
                    WHEN source_name != 'News' AND source_name IS NOT NULL THEN 2
                    ELSE 3
                END as priority
            FROM sentiment_data 
            WHERE ({tv_condition})
            AND source_name != 'News'  -- Exclude generic "News" entries
            GROUP BY source_name, source, platform
            ORDER BY priority ASC, coverage_count DESC
            LIMIT 10
        """)
        
        result = db.execute(query)
        rows = list(result)
        logger.info(f"Found {len(rows)} TV sources")
        
        television_channels = []
        for row in rows:
            logger.info(f"Processing TV source: {row.source_name} / {row.source} / {row.platform}")
            total_programs = row.coverage_count
            positive_pct = (row.positive_count / total_programs * 100) if total_programs > 0 else 0
            negative_pct = (row.negative_count / total_programs * 100) if total_programs > 0 else 0
            neutral_pct = (row.neutral_count / total_programs * 100) if total_programs > 0 else 0
            
            # Determine bias level based on sentiment distribution
            if positive_pct > 60:
                bias_level = "Supportive"
            elif negative_pct > 60:
                bias_level = "Critical"
            else:
                bias_level = "Neutral"
            
            # Determine category based on source name
            source_name_lower = (row.source_name or row.source or "").lower()
            if any(keyword in source_name_lower for keyword in ['government', 'official', 'state']):
                category = "Government Channel"
            elif any(keyword in source_name_lower for keyword in ['entertainment', 'show', 'movie']):
                category = "Entertainment Channel"
            else:
                category = "News Channel"
            
            # Get recent programs for this source
            recent_programs_query = text("""
                SELECT title, sentiment_label, date, url, source_url
                FROM sentiment_data 
                WHERE (LOWER(source_name) LIKE :source_pattern OR LOWER(source) LIKE :source_pattern)
                ORDER BY date DESC
                LIMIT 3
            """)
            
            source_pattern = f"%{row.source_name.lower() if row.source_name else row.source.lower()}%"
            recent_result = db.execute(recent_programs_query, {
                "source_pattern": source_pattern
            })
            
            recent_programs = []
            for program in recent_result:
                # Use title if available, otherwise extract headline from text
                program_title = program.title if program.title and program.title.strip() else "No title available"
                
                # Use existing URL from database, prioritize url field over source_url
                program_url = program.url if program.url else program.source_url
                
                recent_programs.append({
                    "title": program_title,
                    "sentiment": program.sentiment_label or "neutral",
                    "viewership": round(1.0 + (hash(program_title) % 3), 1) if program_title != "No title available" else 1.0,  # Mock viewership
                    "time": "2 hours ago",  # This would need to be calculated from actual data
                    "youtube_url": program_url
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
            
            # Generate website URL based on source name
            source_name_lower = (row.source_name or row.source or "").lower()
            website_url = ""
            
            # Map common TV channels to their official websites
            if 'tvc' in source_name_lower:
                website_url = "https://www.tvcnews.tv"
            elif 'channels tv' in source_name_lower:
                website_url = "https://www.channelstv.com"
            elif 'ait' in source_name_lower:
                website_url = "https://www.ait.live"
            elif 'nta' in source_name_lower:
                website_url = "https://www.nta.ng"
            elif 'plus tv' in source_name_lower:
                website_url = "https://www.plustvafrica.com"
            elif 'news central' in source_name_lower:
                website_url = "https://www.newscentral.ng"
            elif 'trust tv' in source_name_lower:
                website_url = "https://www.trusttv.ng"
            elif 'silverbird' in source_name_lower:
                website_url = "https://www.silverbirdtv.com"
            elif 'stv' in source_name_lower:
                website_url = "https://www.stv.ng"
            elif 'flip tv' in source_name_lower:
                website_url = "https://www.fliptv.ng"
            elif 'voice tv' in source_name_lower:
                website_url = "https://www.voicetv.ng"
            elif 'arise' in source_name_lower:
                website_url = "https://www.arise.tv"
            else:
                # For unknown channels, construct a potential URL
                channel_name = row.source_name or row.source or "Unknown TV Channel"
                website_url = f"https://www.{channel_name.lower().replace(' ', '')}.com"
            
            television_channels.append({
                "name": row.source_name or row.source or "Unknown TV Channel",
                "logo": "📺",
                "sentiment_score": float(row.avg_sentiment_score) if row.avg_sentiment_score else 0.0,
                "bias_level": bias_level,
                "coverage_count": int(row.coverage_count),
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
            
            mention_data = {
                'date': row.date.isoformat() if row.date else None,
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

