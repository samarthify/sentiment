import os
import time
import schedule
import logging
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Callable, Optional
import json
from pathlib import Path
import subprocess
import signal
import sys
import glob
import threading
import queue
import asyncio
import re
import threading
import requests
from src.utils.mail_config import NOTIFY_ON_ANALYSIS
from src.utils.notification_service import send_analysis_report, send_processing_notification, send_collection_notification
from .brain import AgentBrain
from .autogen_agents import AutogenAgentSystem
import inspect
from src.processing.sentiment_analyzer import ImprovedSentimentAnalyzer
from src.processing.data_processor import DataProcessor
from uuid import UUID
# Add necessary DB imports
from sqlalchemy.orm import sessionmaker, Session 
from src.api.models import TargetIndividualConfiguration, EmailConfiguration

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/agent.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger('AgentCore')

# Define API endpoint URL (Best practice: move to config or env var)
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000") # Default for local dev
DATA_UPDATE_ENDPOINT = f"{API_BASE_URL}/data/update"


def convert_uuid_to_str(obj):
    """Convert UUID fields in the object to strings."""
    if isinstance(obj, dict):
        return {key: convert_uuid_to_str(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_uuid_to_str(item) for item in obj]
    elif isinstance(obj, UUID):
        return str(obj)  # Convert UUID to string
    return obj


class SentimentAnalysisAgent:
    """Core agent responsible for data collection, processing, analysis, and scheduling."""

    def __init__(self, db_factory: sessionmaker, config_path="config/agent_config.json"):
        """
        Initialize the agent.

        Args:
            db_factory (sessionmaker): SQLAlchemy session factory.
            config_path (str): Path to the agent's configuration file.
        """
        self.db_factory = db_factory
        self.config_path = Path(config_path)
        logger.debug(f"SentimentAnalysisAgent.__init__ started. db_factory: {db_factory}, config_path: {config_path}")
        self.config = self.load_config() # Load config from file (excluding target)
        self.status = "idle"
        self.last_run_times = {"collect": None, "process": None, "cleanup": None}
        self.data_history = {
            "collected": [], 
            "processed": [], 
            "sentiment_trends": [], 
            "events": [], 
            "data_quality_metrics": [],
            "system_health": []
        }
        
        # --- Initialize task_status --- 
        self.task_status = {
            'is_busy': False,
            'current_task': None,
            'last_run': {
                 # Store details of the last run for each task type
                 'collect': None, 
                 'process': None, 
                 'cleanup': None,
                 'optimize': None 
            },
            'suggestions': [] # Placeholder for brain suggestions
        }
        # --- End Initialize task_status ---
        
        self.agent_registry = {} # Placeholder for Autogen integration
        self.brain = None # Placeholder for Brain integration
        self.stop_event = threading.Event()
        self.scheduler_thread = None

        # Initialize processor and analyzer
        self.data_processor = DataProcessor()
        self.sentiment_analyzer = ImprovedSentimentAnalyzer()

        # --- Initialize base_path and is_running --- 
        # Assuming core.py is in src/agent, base_path goes up three levels to project root
        self.base_path = Path(__file__).resolve().parent.parent.parent 
        self.is_running = True # Flag to control the main loop in run()
        # --- End initializations ---

        # Ensure the config directory exists
        self.config_path.parent.mkdir(parents=True, exist_ok=True)

        # Placeholder: Initialize Brain/Autogen if needed
        # self.brain = Brain(...)
        # self.initialize_autogen_agents()

        logger.info(f"Agent initialized. Config loaded from {self.config_path}. Base path: {self.base_path}")
        logger.info(f"Database session factory provided: {db_factory}")
        logger.debug(f"SentimentAnalysisAgent.__init__ finished. Initial config: {self.config}")

    def load_config(self) -> Dict[str, Any]:
        """Load agent configuration from JSON file, excluding the 'target' key."""
        logger.debug(f"load_config: Attempting to load config from {self.config_path}")
        default_config = {
            "collection_interval_minutes": 60,
            "processing_interval_minutes": 120,
            "data_retention_days": 30,
            "sentiment_model": "default",
            "analysis_level": "medium",
            "sources": {"twitter": True, "news": True, "blogs": False},
            "keywords": ["important person"], # General keywords, not target specific
            "adaptive_scheduling": True,
            "auto_optimization": True,
            "rate_limits": {"twitter": 100, "news": 50}
            # 'target' key is intentionally omitted - fetched from DB
        }
        try:
            if self.config_path.exists():
                with open(self.config_path, 'r') as f:
                    loaded_conf = json.load(f)
                    # Explicitly remove 'target' if it exists from old file
                    loaded_conf.pop('target', None) 
                    # Merge with defaults, loaded keys take precedence
                    # We should ensure defaults cover all *expected* keys now
                    merged_config = default_config.copy()
                    merged_config.update(loaded_conf)
                    logger.debug(f"load_config: Loaded config: {merged_config}")
                    return merged_config
            else:
                logger.warning(f"Config file {self.config_path} not found. Using default configuration.")
                # Save default config if file doesn't exist
                with open(self.config_path, 'w') as f:
                    json.dump(default_config, f, indent=4)
                return default_config
        except Exception as e:
            logger.error(f"Error loading config from {self.config_path}: {e}. Using default configuration.", exc_info=True)
            return default_config

    def _get_latest_target_config(self, db: Session, user_id: str) -> Optional[TargetIndividualConfiguration]:
        """Fetches the latest target config model object from DB for a specific user."""
        if not user_id:
            logger.warning("_get_latest_target_config: No user_id provided.")
            return None
        try:
            # Query for the specific user's configuration
            latest_config = db.query(TargetIndividualConfiguration)\
                              .filter(TargetIndividualConfiguration.user_id == user_id)\
                              .order_by(TargetIndividualConfiguration.created_at.desc())\
                              .first()
            logger.debug(f"_get_latest_target_config: Found config for user {user_id}: {latest_config}")
            return latest_config
        except Exception as e:
            logger.error(f"Error getting target config for user {user_id}: {e}", exc_info=True)
            return None

    def _get_email_config_for_user(self, db: Session, user_id: str) -> Optional[EmailConfiguration]:
        """Fetches the latest email config model object from DB for a specific user."""
        if not user_id:
            logger.warning("_get_email_config_for_user: No user_id provided.")
            return None
        try:
            latest_config = db.query(EmailConfiguration)\
                              .filter(EmailConfiguration.user_id == user_id)\
                              .order_by(EmailConfiguration.created_at.desc())\
                              .first()
            logger.debug(f"_get_email_config_for_user: Found config for user {user_id}: {latest_config}")
            return latest_config
        except Exception as e:
            logger.error(f"Error getting email config for user {user_id}: {e}", exc_info=True)
            return None

    # --- Example of using target config ---
    def collect_data(self, user_id: str):
        """Collect data by running the external run_collectors.py script for a specific user."""
        if not user_id:
            logger.error("collect_data: Called without a user_id. Aborting.")
            return False
        logger.info(f"Starting data collection cycle for user {user_id}...")
        self.status = "collecting"
        target_name = "Default Target"
        query_variations = []
        collection_metrics = {
            "start_time": datetime.now(),
            "sources_attempted": "N/A", # Cannot determine from external script easily
            "sources_successful": "N/A", # Cannot determine from external script easily
            "records_collected": "N/A"  # Cannot determine from external script easily
        }
        collection_success = False
        target_and_variations = [] # Initialize
        
        try:
            # Get target config from DB
            with self.db_factory() as db:
                logger.debug("collect_data: Fetching target config...")
                target_config = self._get_latest_target_config(db, user_id)
                if target_config:
                    target_name = target_config.individual_name
                    query_variations = target_config.query_variations
                    logger.debug(f"[DB Target Config] Using Name: {target_name}")
                    logger.debug(f"[DB Target Config] Using Variations: {query_variations}")
                else:
                    logger.warning("[DB Target Config] Not found. Using defaults.")
                    # Keep defaults target_name = "Default Target", query_variations = []
                    logger.debug(f"[DB Target Config] Using Name: {target_name}")
                    logger.debug(f"[DB Target Config] Using Variations: {query_variations}")
            
            # --- Prepare query list and JSON encode it ---
            target_and_variations = [target_name] + (query_variations if query_variations else [])
            queries_json = json.dumps(target_and_variations)
            logger.debug(f"Passing queries as JSON string: {queries_json}")
            # --- End prepare --- 

            # --- Execute run_collectors.py --- 
            script_path = self.base_path / "src" / "collectors" / "run_collectors.py"
            if not script_path.exists():
                 logger.error(f"Collector script not found at: {script_path}")
                 raise FileNotFoundError(f"Collector script not found: {script_path}")
            
            # Construct command with --queries argument
            command = [sys.executable, "-m", "src.collectors.run_collectors", "--queries", queries_json]
            logger.info(f"Executing command: {' '.join(command)}") # Note: this won't show quotes around json correctly
            
            process = subprocess.run(
                command,
                capture_output=True,
                text=True,
                check=False, 
                cwd=self.base_path
            )
            
            # Log stdout and stderr from the script
            if process.stdout:
                logger.info(f"run_collectors.py stdout:\n{process.stdout.strip()}")
            if process.stderr:
                logger.error(f"run_collectors.py stderr:\n{process.stderr.strip()}")
            
            if process.returncode == 0:
                logger.info("run_collectors.py executed successfully.")
                collection_success = True
                collection_metrics["records_collected"] = "Unknown (External Script)"
            else:
                logger.error(f"run_collectors.py failed with return code {process.returncode}")
                collection_success = False
            # --- End Execute run_collectors.py --- 

            self.data_history["collected"].append({"timestamp": time.time(), "success": collection_success})
            self.last_run_times["collect"] = time.time()

        except FileNotFoundError as fnf_err:
            logger.error(f"Error during data collection: {fnf_err}")
            collection_success = False
        except Exception as e:
            logger.error(f"Error during data collection: {e}", exc_info=True)
            collection_success = False
        finally:
            self.status = "idle"
            collection_metrics["end_time"] = datetime.now()
            collection_metrics["duration_seconds"] = (collection_metrics["end_time"] - collection_metrics["start_time"]).total_seconds()
            # Approximation - success rate cannot be calculated accurately here
            collection_metrics["collection_success_rate"] = 1.0 if collection_success else 0.0 

        # --- Send Collection Notification (Using DB Config for specific user) ---
        if collection_success: 
            try:
                recipients = []
                notify_collection_enabled = False
                with self.db_factory() as db:
                    # --- Fetch email config specifically for this user_id ---
                    latest_email_config = self._get_email_config_for_user(db, user_id)
                    # ---------------------------------------------------------
                    if latest_email_config:
                         logger.debug(f"[DB Email Config - Collection Check for user {user_id}] Found config ID: {latest_email_config.id}")
                         logger.debug(f"[DB Email Config - Collection Check for user {user_id}] Enabled: {latest_email_config.enabled}")
                         logger.debug(f"[DB Email Config - Collection Check for user {user_id}] Notify on Collection: {latest_email_config.notify_on_collection}")
                         logger.debug(f"[DB Email Config - Collection Check for user {user_id}] Recipients: {latest_email_config.recipients}")
                    else:
                         logger.debug(f"[DB Email Config - Collection Check for user {user_id}] No config found.")

                    if latest_email_config and latest_email_config.enabled:
                        if latest_email_config.notify_on_collection:
                            notify_collection_enabled = True
                            if latest_email_config.recipients:
                                recipients = latest_email_config.recipients
                            else:
                                logger.warning(f"Collection notifications enabled for user {user_id}, but no recipients configured.")
                        else:
                             logger.info(f"Collection notifications are disabled for user {user_id} (notify_on_collection=False).")
                
                if notify_collection_enabled and recipients:
                    logger.info(f"Attempting to send collection completion email for user {user_id} to DB recipients: {recipients}")
                    try:
                        # Prepare data for the notification function (use approximated metrics)
                        notification_data = {
                            "collection_success_rate": collection_metrics["collection_success_rate"],
                            "active_sources": collection_metrics["sources_successful"], # N/A
                            "total_sources": collection_metrics["sources_attempted"], # N/A
                            "total_records": collection_metrics["records_collected"], # N/A or Unknown
                            "duration_seconds": collection_metrics["duration_seconds"]
                        }
                        send_collection_notification(notification_data, recipients, self.db_factory)
                        logger.info("Collection completion email triggered successfully.")
                    except Exception as e:
                        logger.error(f"Error triggering collection completion email: {str(e)}", exc_info=True)
            
            except Exception as e:
                logger.error(f"Error checking DB or sending collection notification: {str(e)}", exc_info=True)
        
        logger.debug("collect_data: Finished method.")
        return collection_success

    # Update other methods like process_data, run_analysis etc. similarly 
    # if they need the target configuration. Create a DB session using 
    # 'with self.db_factory() as db:' and call self._get_latest_target_config(db).

    # --- Command Execution ---
    # update_config needs to change as 'target' is no longer managed here
    def execute_command(self, command: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Execute a command on the agent."""
        params = params or {}
        logger.info(f"Executing command: {command} with params: {params}")
        try:
            if command == "start":
                self.start()
                return {"success": True, "message": "Agent started"}
            elif command == "stop":
                self.stop()
                return {"success": True, "message": "Agent stopped"}
            elif command == "status":
                return {"success": True, "data": self.get_status()}
            # Update config - remove target handling
            elif command == "update_config":
                # Remove 'target' from params if present, as it's handled by API/DB now
                params.pop('target', None) 
                if not params:
                     return {"success": False, "message": "No valid configuration parameters provided for update."}
                self.config.update(params)
                self._save_config() # Save the updated config (without target)
                # Maybe re-initialize parts of the agent if needed based on config change?
                logger.info(f"Agent configuration updated (excluding target): {params}")
                return {"success": True, "message": "Agent configuration updated successfully (target is managed separately via API)."}
            elif command == "get_config":
                 # Return current config (which no longer includes target)
                 return {"success": True, "data": self.config}
            elif command == "run_collection":
                # --- Requires user_id now ---
                if 'user_id' not in params:
                    return {"success": False, "message": "run_collection command requires 'user_id' parameter."}
                # You might want to ensure this runs in a separate thread or async
                self._run_task(lambda: self.collect_data(params['user_id']), f"collect_cmd_{params['user_id']}") 
                return {"success": True, "message": f"Collection task triggered for user {params['user_id']}."}
            elif command == "run_processing":
                # --- Requires user_id now ---
                if 'user_id' not in params:
                    return {"success": False, "message": "run_processing command requires 'user_id' parameter."}
                # Similar thread/async consideration for processing
                self._run_task(lambda: self.process_data(params['user_id']), f"process_cmd_{params['user_id']}") 
                return {"success": True, "message": f"Processing task triggered for user {params['user_id']}."}
            # Add other commands as needed
            else:
                return {"success": False, "message": f"Unknown command: {command}"}
        except Exception as e:
            logger.error(f"Error executing command {command}: {e}", exc_info=True)
            return {"success": False, "message": str(e)}

    def _save_config(self):
        """Save the current agent configuration (excluding target) to the JSON file."""
        try:
            # Ensure target is not accidentally saved
            config_to_save = self.config.copy()
            config_to_save.pop('target', None) 
            with open(self.config_path, 'w') as f:
                json.dump(config_to_save, f, indent=4, default=str)
            logger.info(f"Agent configuration saved to {self.config_path}")
        except Exception as e:
            logger.error(f"Failed to save config to {self.config_path}: {e}", exc_info=True)

    # --- Placeholder methods for agent lifecycle and tasks ---
    def start(self):
        # Logic to start the agent's main loop/scheduler
        logger.debug("start: Entering method.")
        logger.info("Agent starting... (Scheduler disabled)") # Modified log message
        # self.stop_event.clear() 
        # # Example: Start scheduler thread if using 'schedule' library
        # self.scheduler_thread = threading.Thread(target=self._run_scheduler)
        # logger.debug("start: Starting scheduler thread.")
        # self.scheduler_thread.start()
        logger.debug("start: Finished method (No scheduler started).")

    def stop(self):
        # Logic to gracefully stop the agent
        logger.debug("stop: Entering method.")
        logger.info("Agent stopping... (Scheduler disabled)") # Modified log message
        # self.stop_event.set()
        # # Example: Wait for threads to join
        # if self.scheduler_thread:
        #     self.scheduler_thread.join()
        # logger.debug("stop: Stop event set.")
        pass # Add actual stop logic if needed (e.g., closing resources)
        logger.debug("stop: Finished method.")

    def process_data(self, user_id: str):
        """Process collected raw data, perform analysis, and send to API for a specific user."""
        if not user_id:
            logger.error("process_data: Called without a user_id. Aborting.")
            return False
        logger.info(f"Starting data processing for user {user_id}...")
        # --- [RESTORED] Original data processing logic --- 
        logger.info("Starting data processing...")
        raw_data_path = self.base_path / 'data' / 'raw'
        processed_data_path = self.base_path / 'data' / 'processed'
        processed_data_path.mkdir(parents=True, exist_ok=True)

        all_raw_files = list(raw_data_path.glob('*.csv'))
        if not all_raw_files:
            logger.warning("No raw data files found to process.")
            return False # Indicate no processing happened

        # Aggregate raw data
        try:
            # Read CSVs individually and parse dates afterwards
            all_data_list = []
            potential_date_columns = ['published_date', 'date', 'published_at', 'timestamp'] # Possible date column names across all formats
            
            logger.info(f"Reading and processing {len(all_raw_files)} raw files...")
            for f in all_raw_files:
                try:
                    # Read without initial date parsing
                    df = pd.read_csv(f, on_bad_lines='warn')
                    logger.debug(f"Read {len(df)} rows from {f.name}. Columns: {list(df.columns)}")
                    
                    # Identify and parse existing date columns for this specific file
                    dates_to_parse_in_this_df = [col for col in potential_date_columns if col in df.columns]
                    if dates_to_parse_in_this_df:
                        logger.debug(f"Attempting to parse date columns {dates_to_parse_in_this_df} in {f.name} using custom parser.")
                        for date_col in dates_to_parse_in_this_df:
                            # Apply custom parser
                            df[date_col] = df[date_col].apply(self.data_processor.parse_date)
                            # Check how many dates failed parsing (optional) - result will be None
                            parse_failures = df[date_col].isnull().sum() # Count None values
                            original_count = len(df[date_col])
                            # We need a baseline of non-null before parsing to calculate actual failures
                            # This is tricky as the input could be mixed types. Let's just log null count.
                            if parse_failures > 0:
                                 logger.debug(f"Column '{date_col}' in {f.name} has {parse_failures}/{original_count} null/unparsed values after custom parsing.")
                    else:
                         logger.debug(f"No standard date columns found in {f.name}")
                         
                    all_data_list.append(df)
                    
                except pd.errors.EmptyDataError:
                     logger.warning(f"Raw file {f.name} is empty. Skipping.")
                except Exception as e_read:
                    logger.warning(f"Could not read or process file {f.name}: {e_read}. Skipping file.")
            
            if not all_data_list:
                 logger.error("No valid raw data could be aggregated from any files.")
                 return False
                 
            # Concatenate all processed dataframes
            all_data = pd.concat(all_data_list, ignore_index=True)
            logger.info(f"Successfully aggregated {len(all_data)} records from {len(all_data_list)} non-empty files.")

        except Exception as e:
            logger.error(f"Error aggregating raw data: {e}", exc_info=True)
            return False # Indicate failure

        # --- Data Cleaning & Preprocessing ---
        initial_count = len(all_data)
        # Define potential identifier columns for deduplication
        # Use 'url' or 'text' + 'timestamp'/'published_date' as potential keys
        dedup_subset = []
        if 'url' in all_data.columns:
             dedup_subset.append('url')
        elif 'text' in all_data.columns:
             dedup_subset.append('text')
             # Try to find a reliable timestamp column for deduplication
             if 'published_date' in all_data.columns:
                 dedup_subset.append('published_date')
             elif 'timestamp' in all_data.columns:
                 dedup_subset.append('timestamp')
             elif 'date' in all_data.columns:
                 dedup_subset.append('date')
        
        if dedup_subset:
             try:
                # Ensure subset columns actually exist before dropping
                valid_dedup_subset = [col for col in dedup_subset if col in all_data.columns]
                if valid_dedup_subset:
                     all_data.drop_duplicates(subset=valid_dedup_subset, inplace=True, keep='first')
                     cleaned_count = len(all_data)
                     logger.info(f"Removed {initial_count - cleaned_count} duplicate records based on {valid_dedup_subset}.")
                else:
                     logger.warning(f"Could not perform deduplication, subset columns {dedup_subset} not found after aggregation.")
                     cleaned_count = initial_count
             except KeyError:
                 # This shouldn't happen with the check above, but keep for safety
                 logger.warning(f"KeyError during deduplication using {valid_dedup_subset}. Columns might not exist after aggregation.")
                 cleaned_count = initial_count # Assume no duplicates removed
        else:
             logger.warning("Could not determine suitable columns for deduplication (e.g., 'url' or 'text' + timestamp).")
             cleaned_count = initial_count
        # ... other cleaning steps ...

        # --- Sentiment Analysis ---
        try:
            logger.info("Performing sentiment analysis...")
            target_individual_name_for_analysis = "the subject" # Default perspective
            with self.db_factory() as db_session: # Changed variable name for clarity
                target_config = self._get_latest_target_config(db_session, user_id)
                if target_config and target_config.individual_name:
                    target_individual_name_for_analysis = target_config.individual_name
                    logger.info(f"Sentiment analysis will use perspective of: {target_individual_name_for_analysis}")
                else:
                    logger.warning(f"No specific target individual found for user {user_id} or name is empty. Using default perspective for sentiment analysis.")

            if 'text' in all_data.columns:
                 if hasattr(self, 'sentiment_analyzer') and self.sentiment_analyzer is not None:
                     sentiment_results = all_data['text'].apply(
                        lambda x: self.sentiment_analyzer.analyze(x, target_individual_name=target_individual_name_for_analysis) if isinstance(x, str) and pd.notna(x) else ('neutral', 0.5, None)
                     )
                     # Assign label, score, and justification from the results
                     all_data['sentiment_label'] = sentiment_results.apply(lambda res: res[0])
                     all_data['sentiment_score'] = sentiment_results.apply(lambda res: res[1])
                     all_data['sentiment_justification'] = sentiment_results.apply(lambda res: res[2])
                     logger.info("Sentiment analysis completed.")
                     processed_df = all_data
                 else:
                     logger.error("Sentiment analyzer is not initialized. Skipping sentiment analysis.")
                     # Decide if processing should continue without sentiment - for now, let's stop.
                     return False
            else:
                 logger.error("Column 'text' not found for sentiment analysis.")
                 # Decide if processing should continue without sentiment - for now, let's stop.
                 return False
        except Exception as e:
            logger.error(f"Error during sentiment analysis: {e}", exc_info=True)
            return False

        # --- Prepare Data for API (Ensure user_id is included) ---
        if processed_df.empty:
             logger.warning("Processed data is empty after cleaning/analysis. Nothing to send to API.")
             # Clean up raw files? Let's do it here as well.
             logger.info("Cleaning up raw data files as processed data is empty...")
             for f in all_raw_files:
                 try: os.remove(f)
                 except Exception: pass
             return True # Processing technically succeeded, just no output

        try:
            logger.info(f"Preparing {len(processed_df)} records for API update...")
            processed_df_copy = processed_df.copy()

            # **Rename identifier column to 'id' for the API payload**
            if 'original_id' in processed_df_copy.columns:
                processed_df_copy.rename(columns={'original_id': 'id'}, inplace=True)
                logger.info("Renamed DataFrame column 'original_id' to 'id' for API.")
            elif 'post_id' in processed_df_copy.columns and 'id' not in processed_df_copy.columns:
                processed_df_copy.rename(columns={'post_id': 'id'}, inplace=True)
                logger.info("Renamed DataFrame column 'post_id' to 'id' for API as 'original_id' was missing.")
            elif 'id' not in processed_df_copy.columns:
                 logger.warning("Column 'id', 'original_id', or 'post_id' not found in processed data. API might require an 'id'.")
                 # Optionally add an 'id' column with None if strictly required by API
                 # processed_df_copy['id'] = None

            # **Ensure 'id' column is string type**
            if 'id' in processed_df_copy.columns:
                 logger.debug(f"Converting 'id' column to string type. Original dtype: {processed_df_copy['id'].dtype}")
                 # Use astype(str) which handles numbers; None/NaN becomes 'None'/'nan' string
                 processed_df_copy['id'] = processed_df_copy['id'].astype(str)
                 # Replace 'nan' string resulting from NaN conversion with None if necessary 
                 # (Depends if API allows 'nan' string or requires actual null/None)
                 # processed_df_copy['id'] = processed_df_copy['id'].replace('nan', None)
                 logger.debug(f"Converted 'id' column to string type. New dtype: {processed_df_copy['id'].dtype}")
            else:
                 logger.warning("Could not convert 'id' to string as column doesn't exist.")

            # **Convert ALL specified datetime columns to ISO format string**
            datetime_cols = ['published_date', 'date', 'published_at', 'timestamp'] # Match DataRecord fields + legacy timestamp
            for col in datetime_cols:
                if col in processed_df_copy.columns:
                    # Ensure column is actually datetime type (it should be if parsing worked)
                    if pd.api.types.is_datetime64_any_dtype(processed_df_copy[col]):
                         logger.debug(f"Processing datetime column '{col}'.")
                         # Remove timezone info if present (API/DB expects naive)
                         if hasattr(processed_df_copy[col].dt, 'tz') and processed_df_copy[col].dt.tz is not None:
                            processed_df_copy[col] = processed_df_copy[col].dt.tz_localize(None)
                            logger.debug(f"Made column '{col}' timezone-naive.")
                            
                         # Convert valid datetimes to ISO format, leave NaT/None as None
                         processed_df_copy[col] = processed_df_copy[col].apply(
                            lambda x: x.isoformat(timespec='seconds') if pd.notna(x) else None
                         )
                         logger.debug(f"Converted column '{col}' to ISO format string for API.")
                    else:
                         # If the column exists but isn't datetime, it might be strings that failed parsing earlier
                         # We'll nullify them to avoid sending bad data to the API
                         logger.warning(f"Column '{col}' exists but is not datetime type ({processed_df_copy[col].dtype}). Nullifying values for API.")
                         processed_df_copy[col] = None 
                else:
                     logger.debug(f"Expected datetime column '{col}' not found in DataFrame. Skipping conversion.")

            # **Convert NaNs/NaTs to None for JSON compatibility (handles all columns)**
            # This is crucial for numeric/boolean columns that might have NaNs
            processed_df_copy = processed_df_copy.where(pd.notnull(processed_df_copy), None)
            logger.debug("Converted NaN/NaT values to None using .where().")

            # **Additionally, replace np.inf, -np.inf, and potentially explicit np.nan with None**
            # This covers cases .where might miss or if NaN representation is unusual
            processed_df_copy = processed_df_copy.replace([np.inf, -np.inf, np.nan], None)
            logger.debug("Replaced np.inf, -np.inf, and np.nan with None using .replace().")

            # Select only columns that match the DataRecord model fields to avoid sending extra data
            # Get fields from the DataRecord model (requires importing it or defining the list)
            # For simplicity, define the list here based on service.py DataRecord
            expected_api_fields = [
                'title', 'description', 'content', 'url', 'published_date', 'source',
                'source_url', 'query', 'language', 'platform', 'date', 'text',
                'file_source', 'id', 'alert_id', 'published_at', 'source_type',
                'country', 'favorite', 'tone', 'source_name', 'parent_url', 'parent_id',
                'children', 'direct_reach', 'cumulative_reach', 'domain_reach', 'tags',
                'score', 'alert_name', 'type', 'post_id', 'retweets', 'likes',
                'user_location', 'comments', 'user_name', 'user_handle', 'user_avatar',
                'sentiment_label', 'sentiment_score', 'sentiment_justification'
            ]
            
            # Filter DataFrame columns to only include expected fields
            columns_to_send = [col for col in expected_api_fields if col in processed_df_copy.columns]
            processed_df_for_api = processed_df_copy[columns_to_send]
            logger.info(f"Filtered DataFrame to include {len(columns_to_send)} columns matching API model.")

            # Convert the filtered DataFrame to list of dicts
            data_list = processed_df_for_api.to_dict(orient='records')
            # --- Add user_id to the payload --- 
            payload = {
                "user_id": user_id, 
                "data": convert_uuid_to_str(data_list)
            }
            # ----------------------------------

            # --- DEBUGGING: Log first few records of the payload (KEEP THIS) ---
            try:
                 log_sample_size = min(3, len(data_list))
                 if log_sample_size > 0:
                     logger.debug(f"Sample of first {log_sample_size} records being sent to API:")
                     for i in range(log_sample_size):
                         # Use json.dumps for cleaner representation of None vs NaN etc.
                         # This will now include sentiment_justification if present in data_list[i]
                         logger.debug(f"Record {i+1}: {json.dumps(data_list[i], indent=2, default=str)}")
                 else:
                     logger.debug("Payload contains no records.")
            except Exception as log_e:
                 logger.error(f"Error logging payload sample: {log_e}")
            # --- END DEBUGGING ---

        except Exception as e:
            logger.error(f"Error preparing data for API: {e}", exc_info=True)
            return False

        # --- Send Data to API ---
        api_call_successful = False # Flag to track success
        api_message = "Unknown API status"
        try:
            logger.info(f"Sending {len(data_list)} records to API endpoint: {DATA_UPDATE_ENDPOINT}")
            # response = requests.post(DATA_UPDATE_ENDPOINT, json=payload, timeout=120) 
            response = requests.post(DATA_UPDATE_ENDPOINT, json=convert_uuid_to_str(payload), timeout=120)
            # response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)

            # Check HTTP status code first
            if 200 <= response.status_code < 300:
                 try:
                     api_response_json = response.json()
                     api_message = api_response_json.get('message', f"OK (Status {response.status_code})")
                     # Explicit check for success key, defaulting to True if status is OK and key missing
                     # Treat as failure ONLY if 'success' is explicitly false
                     api_call_successful = api_response_json.get('success', True) 
                     if api_call_successful:
                          logger.info(f"API update successful: {api_message}")
                     else:
                          # API returned 2xx but 'success: false' in body
                          logger.error(f"API returned success status ({response.status_code}) but indicated failure in response body: {api_message}")
                          
                 except json.JSONDecodeError:
                      # Successful status code but couldn't parse JSON response
                      logger.warning(f"API returned success status ({response.status_code}) but response body was not valid JSON. Treating as success based on status code.")
                      api_message = f"OK (Status {response.status_code}, Non-JSON response)"
                      api_call_successful = True # Assume success based on HTTP status
            else:
                 # Handle non-2xx status codes
                 logger.error(f"API request failed with status code {response.status_code}.")
                 try:
                     error_detail = response.json()
                     # Use .get with a default for message key
                     api_message = error_detail.get('message', f"Error (Status {response.status_code}, JSON body present but no message)")
                     logger.error(f"API Error Response Body: {json.dumps(error_detail, indent=2)}")
                 except json.JSONDecodeError:
                     api_message = f"Error (Status {response.status_code}, Non-JSON response)"
                     logger.error(f"API Error Response Body (non-JSON): {response.text}")
                 api_call_successful = False # Explicitly false

            # --- Post-processing based on api_call_successful (Use DB Config for specific user) --- 
            if api_call_successful:
                # Clean up raw files only on success
                logger.info("Cleaning up raw data files...")
                for f in all_raw_files:
                    try:
                        os.remove(f)
                    except Exception as e_rm:
                        logger.warning(f"Could not remove raw file {f}: {e_rm}")
                logger.info("Raw data files cleaned up.")

                # Post-Processing Notifications (Using DB Config for specific user)
                logger.info(f"Data processing finished successfully for user {user_id}. Processed {len(processed_df)} records.") 
                try:
                    # Check DB config for processing notifications
                    recipients = []
                    notify_processing_enabled = False
                    with self.db_factory() as db:
                        # --- Fetch email config specifically for this user_id ---
                        latest_email_config = self._get_email_config_for_user(db, user_id)
                        # ---------------------------------------------------------
                        if latest_email_config:
                             logger.debug(f"[DB Email Config - Processing Check for user {user_id}] Found config ID: {latest_email_config.id}")
                             logger.debug(f"[DB Email Config - Processing Check for user {user_id}] Enabled: {latest_email_config.enabled}")
                             logger.debug(f"[DB Email Config - Processing Check for user {user_id}] Notify on Processing: {latest_email_config.notify_on_processing}")
                             logger.debug(f"[DB Email Config - Processing Check for user {user_id}] Recipients: {latest_email_config.recipients}")
                        else:
                             logger.debug(f"[DB Email Config - Processing Check for user {user_id}] No config found.")

                        if latest_email_config and latest_email_config.enabled:
                            if latest_email_config.notify_on_processing:
                                notify_processing_enabled = True
                                if latest_email_config.recipients:
                                    recipients = latest_email_config.recipients
                                else:
                                    logger.warning(f"Processing notifications enabled for user {user_id}, but no recipients configured.")
                            else:
                                logger.info(f"Processing notifications are disabled for user {user_id} (notify_on_processing=False).")
                        elif not latest_email_config:
                             logger.warning(f"No email configuration found in the database for user {user_id} processing notification check.")

                    # Send notification if enabled and recipients exist
                    if notify_processing_enabled and recipients:
                        logger.info(f"Attempting to send processing completion email for user {user_id} to DB recipients: {recipients}")
                        try:
                            # Define processing_data for the notification function
                            processing_data = {
                                "status": "success",
                                "processed_count": len(processed_df),
                                "raw_file_count": len(all_raw_files),
                                "timestamp": datetime.now().isoformat()
                            }
                            # Assuming send_processing_notification exists and accepts db_factory
                            send_processing_notification(processing_data, recipients, self.db_factory)
                            logger.info("Processing completion email triggered successfully.")
                        except Exception as e:
                            logger.error(f"Error triggering processing completion email: {str(e)}", exc_info=True)

                except Exception as e:
                    logger.error(f"Error checking DB or sending processing notification: {str(e)}", exc_info=True)
            else: # API call failed 
                 logger.error(f"Data processing failed for user {user_id}. API Status: {api_message}")
                 # Optionally send a failure notification here if desired
                 # Save data locally on failure
                 timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
                 failed_api_path = processed_data_path / f'failed_api_update_{timestamp_str}.csv'
                 try:
                     # Save the data *before* it was converted to dict list
                     processed_df.to_csv(failed_api_path, index=False)
                     logger.info(f"Saved data locally due to API failure: {failed_api_path}")
                 except Exception as e_save:
                     logger.error(f"Failed to save backup data locally: {e_save}")
            
            return api_call_successful # Return the determined success status

        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to send data to API: {e}")
            # Log the specific error if possible
            if e.response is not None:
                 try:
                     error_detail = e.response.json()
                     logger.error(f"API Error Response Body: {json.dumps(error_detail, indent=2)}")
                 except json.JSONDecodeError:
                     logger.error(f"API Error Response Body (non-JSON): {e.response.text}")
            # Decide how to handle failure: Maybe save locally as backup?
            timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
            failed_api_path = processed_data_path / f'failed_api_update_{timestamp_str}.csv'
            try:
                # Save the data *before* it was converted to dict list
                processed_df.to_csv(failed_api_path, index=False)
                logger.info(f"Saved data locally due to API failure: {failed_api_path}")
            except Exception as e_save:
                logger.error(f"Failed to save backup data locally: {e_save}")
            return False # Indicate failure
        except Exception as e:
             logger.error(f"An unexpected error occurred after preparing data: {e}", exc_info=True)
             return False

    def _run_task(self, task_func: Callable, task_name: str) -> bool:
        """Runs a given task function, updates status, and handles basic timing/errors."""
        logger.debug(f"_run_task: Preparing to run task '{task_name}'. Current busy status: {self.task_status['is_busy']}")
        if self.task_status['is_busy']:
            logger.warning(f"Agent is already busy with task: {self.task_status['current_task']}. Cannot start '{task_name}'.")
            return False # Indicate task did not run
            
        logger.debug(f"_run_task: Starting task '{task_name}'...")
        self.task_status['is_busy'] = True
        self.task_status['current_task'] = task_name
        start_time = datetime.now()
        success = False 
        error_info = None

        try:
            # Assuming tasks are synchronous for now
            # If async tasks are needed, inspect.iscoroutinefunction and event loop logic would be required here
            result = task_func() 
            # We assume the task function returns True on success, False or raises Exception on failure
            if isinstance(result, bool):
                success = result
            else:
                 # If task doesn't return boolean, assume success if no exception occurred
                 success = True 
                 logger.debug(f"Task '{task_name}' completed but did not return explicit boolean status.")

        except Exception as e:
            logger.error(f"Error during task '{task_name}': {e}", exc_info=True)
            success = False
            error_info = str(e)

        finally:
            duration = (datetime.now() - start_time).total_seconds()
            self.task_status['last_run'][task_name] = {
                'time': start_time.isoformat(),
                'success': success,
                'duration': duration,
                'error': error_info
            }
            self.task_status['is_busy'] = False
            self.task_status['current_task'] = None
            logger.info(f"Finished task: {task_name}. Success: {success}. Duration: {duration:.2f}s.")
            
        logger.debug(f"_run_task: Task '{task_name}' finished with status: {success}")
        return success # Return the success status of the task

    # --- Added method for user-triggered runs --- 
    def run_single_cycle(self, user_id: str):
        """Runs a single collection and processing cycle for a specific user."""
        if not user_id:
            logger.error("run_single_cycle: Called without user_id. Aborting.")
            return

        # Check if agent is already busy (optional, depends on desired concurrency)
        # if self.task_status['is_busy']:
        #     logger.warning(f"run_single_cycle: Agent busy with {self.task_status['current_task']}, cannot start cycle for user {user_id}.")
        #     # Raise an exception or return a status?
        #     return

        try:
            # Run collection for the user
            collect_success = self._run_task(lambda: self.collect_data(user_id), f'collect_user_{user_id}')

            # Run processing for the user (consider if it should run even if collection failed)
            process_success = self._run_task(lambda: self.process_data(user_id), f'process_user_{user_id}')

            # --- Send Analysis Notification (Using DB Config) ---
            if process_success:
                logger.debug(f"Processing task succeeded for user {user_id}, checking for analysis notification.")
                try:
                    recipients = []
                    notify_analysis_enabled = False
                    with self.db_factory() as db:
                        # --- Fetch email config specifically for this user_id ---
                        latest_email_config = self._get_email_config_for_user(db, user_id)
                        # ---------------------------------------------------------
                        if latest_email_config:
                            logger.debug(f"[DB Email Config - Analysis Check for user {user_id}] Found config ID: {latest_email_config.id}")
                            logger.debug(f"[DB Email Config - Analysis Check for user {user_id}] Enabled: {latest_email_config.enabled}")
                            logger.debug(f"[DB Email Config - Analysis Check for user {user_id}] Notify on Analysis: {latest_email_config.notify_on_analysis}")
                            logger.debug(f"[DB Email Config - Analysis Check for user {user_id}] Recipients: {latest_email_config.recipients}")
                        else:
                            logger.debug(f"[DB Email Config - Analysis Check for user {user_id}] No config found.")

                        if latest_email_config and latest_email_config.enabled:
                            if latest_email_config.notify_on_analysis:
                                notify_analysis_enabled = True
                                if latest_email_config.recipients:
                                    recipients = latest_email_config.recipients
                                else:
                                    logger.warning(f"[DB Email Config - Analysis Check for user {user_id}] Analysis notifications enabled, but no recipients configured.")
                            else:
                                logger.info(f"[DB Email Config - Analysis Check for user {user_id}] Analysis notifications disabled in DB config.")

                    if notify_analysis_enabled and recipients:
                        logger.info(f"Attempting to send analysis report email for user {user_id} to DB recipients: {recipients}")
                        try:
                            from src.utils.notification_service import send_analysis_report 
                            send_analysis_report(recipients, self.db_factory) # Pass user_id if report needs filtering
                            logger.info(f"Analysis report email triggered successfully for user {user_id}.") 
                        except Exception as e:
                            logger.error(f"Error triggering analysis notification email for user {user_id}: {str(e)}", exc_info=True)

                except ImportError as e:
                    logger.warning(f"Could not import notification service for user {user_id}: {e}. Analysis notification skipped.")
                except Exception as e:
                    logger.error(f"Error checking email configuration or sending analysis notification for user {user_id}: {str(e)}", exc_info=True)
            else:
                logger.warning(f"Skipping analysis notification for user {user_id} because the data processing step failed.")

        except Exception as e:
            logger.error(f"Unexpected error during run_single_cycle for user {user_id}: {e}", exc_info=True)
        finally:
            # Ensure busy status is reset if run_task didn't handle it (e.g., if we add concurrency check)
            pass

    # --- Modified: Old scheduled run - Adapt or remove later --- 
    def _run_collect_and_process(self, user_id: Optional[str] = None): # Add optional user_id
        """Run collection and processing in sequence. Requires user_id for multi-user setup."""
        # --- THIS METHOD IS LIKELY DEPRECATED for user-triggered runs --- 
        # --- Needs logic to iterate users or handle default if run without user_id ---
        if not user_id:
             logger.error("_run_collect_and_process: Called without user_id. Cannot run in multi-user mode without a target user. Aborting.")
             return # Or handle a default user? For now, just abort.

        # Use the new run_single_cycle logic if appropriate, or keep separate?
        # Let's call the individual tasks directly for now, passing user_id.
        collect_success = self._run_task(lambda: self.collect_data(user_id), f'collect_scheduled_{user_id}')
        process_success = self._run_task(lambda: self.process_data(user_id), f'process_scheduled_{user_id}')

        # --- Send Analysis Notification (Logic is duplicated from run_single_cycle - refactor later?) ---
        if process_success:
            # ... (Copy or refactor the analysis notification logic from run_single_cycle) ...
            logger.debug(f"Processing task succeeded for scheduled run user {user_id}, checking for analysis notification.")
            # ... (rest of analysis notification logic) ...
        else:
            logger.warning(f"Skipping analysis notification for scheduled run user {user_id} because processing failed.")

    def update_metrics(self, latest_data: pd.DataFrame, analysis_result: Dict[str, Any]):
        """Update system metrics and performance indicators with Autogen insights"""
        try:
            # Calculate basic metrics
            metrics = {
                'timestamp': datetime.now().isoformat(),
                'total_records': len(latest_data),
                'sentiment_distribution': latest_data['sentiment_label'].value_counts().to_dict(),
                'average_sentiment_score': latest_data['sentiment_score'].mean(),
                'data_sources': latest_data['source'].value_counts().to_dict()
            }
            
            # Add Autogen insights
            if 'insights' in analysis_result:
                metrics.update({
                    'autogen_insights': analysis_result['insights'],
                    'data_quality': analysis_result['insights'].get('data_quality', {}),
                    'analysis_recommendations': analysis_result['insights'].get('recommendations', [])
                })
            
            # Update history
            self.data_history['sentiment_trends'].append(metrics)
            
            # Keep only last 30 days of metrics
            cutoff = len(self.data_history['sentiment_trends']) - (self.config['data_retention_days'] * 48)
            if cutoff > 0:
                self.data_history['sentiment_trends'] = self.data_history['sentiment_trends'][cutoff:]
            
            # Save metrics
            metrics_file = self.base_path / 'data' / 'metrics' / 'history.json'
            with open(metrics_file, 'w') as f:
                json.dump(self.data_history, f, indent=4)
            
            # Update task status with Autogen suggestions
            if 'recommendations' in analysis_result.get('insights', {}):
                self.task_status['suggestions'] = analysis_result['insights']['recommendations']
            
            logger.info("Metrics updated successfully with Autogen insights")
        except Exception as e:
            logger.error(f"Failed to update metrics: {str(e)}")

    async def optimize_system(self):
        """Optimize system parameters using Autogen based on performance data."""
        logger.debug("optimize_system: Entering async method.")
        logger.info("Starting system optimization...")
        try:
            # Gather performance data
            latest_sentiment_metrics = self.data_history['sentiment_trends'][-1] if self.data_history['sentiment_trends'] else {}
            latest_health_metrics = self.data_history['system_health'][-1] if self.data_history['system_health'] else {}
            latest_data_quality = latest_sentiment_metrics.get('data_quality', {}) # Get quality from sentiment metrics
            last_collection_run = self.task_status['last_run'].get('collect', {}) # Get overall collection status
            
            performance_data = {
                'overall_collection_status': {
                    'timestamp': last_collection_run.get('timestamp'),
                    'duration_seconds': last_collection_run.get('duration'),
                    'success': last_collection_run.get('success')
                 },
                'latest_sentiment_analysis': {
                    'timestamp': latest_sentiment_metrics.get('timestamp'),
                    'total_records_processed': latest_sentiment_metrics.get('total_records'),
                    'average_sentiment_score': latest_sentiment_metrics.get('average_sentiment_score'),
                    'sentiment_distribution': latest_sentiment_metrics.get('sentiment_distribution'),
                    'autogen_insights_summary': latest_sentiment_metrics.get('autogen_insights', {}).get('summary', [])[:3] # Sample of insights
                },
                'latest_data_quality': latest_data_quality,
                'system_health': latest_health_metrics, # e.g., memory usage if tracked
                'current_collection_interval_minutes': self.config.get('collection_interval_minutes'),
                'current_processing_interval_minutes': self.config.get('processing_interval_minutes')
            }

            # Remove collection_stats which is often empty/unavailable
            # 'collection_stats': {
            #     source: self.task_status['last_run'].get(f'collect_{source}', {})
            #     for source in self.config['sources']
            #     if self.config['sources'][source]
            # }

            # Clean up None values before sending to LLM
            performance_data = json.loads(json.dumps(performance_data, default=str)) # Convert non-serializable first

            logger.info(f"Sending performance data to Autogen for optimization: {json.dumps(performance_data, indent=2)}")

            # Get optimization suggestions from Autogen - now awaited
            optimization_result = await self.autogen_system.optimize_collection(performance_data)

            if optimization_result and 'optimizations' in optimization_result:
                logger.info(f"Received optimization suggestions: {optimization_result['optimizations']}")
                # Update collection frequency if suggested and valid
                new_frequency = optimization_result['optimizations'].get('collection_frequency')
                if isinstance(new_frequency, (int, float)) and 15 <= new_frequency <= 1440:  # Check type and reasonable bounds (15 min to 1 day)
                    self.config['collection_interval_minutes'] = int(new_frequency)
                    schedule.clear('collect-task') # Clear existing collection schedule
                    schedule.every(self.config['collection_interval_minutes']).minutes.do(
                        lambda: self._run_task(self.collect_data, 'collect')
                    ).tag('collect-task') # Re-add with new interval and tag
                    logger.info(f"Updated collection frequency to {int(new_frequency)} minutes based on optimization.")
                elif new_frequency is not None:
                     logger.warning(f"Received invalid collection frequency suggestion: {new_frequency}. Ignoring.")

                # --- Placeholder for applying other suggested changes --- 
                # Example: Adjusting data sources based on quality/performance
                suggested_changes = optimization_result['optimizations'].get('suggested_changes', [])
                for change in suggested_changes:
                     # Implement logic to apply changes to self.config or elsewhere
                     logger.info(f"Applying suggested change: {change}")
                     pass # Add actual implementation later
                # -----------------------------------------------------------

                # Save updated config if changes were made (e.g., frequency)
                if new_frequency is not None: # Check if frequency was actually updated
                    self._save_config()
                    logger.info("Configuration saved after applying optimizations.")

                logger.info("System optimization processing completed.")
                return True
            else:
                logger.warning("No valid optimization suggestions received from Autogen.")
                return False

        except Exception as e:
            logger.error(f"Error in system optimization: {str(e)}", exc_info=True)
            return False

    def save_config(self):
        """Save the current agent configuration to file."""
        try:
            config_path = self.base_path / 'config' / 'default_config.json'
            with open(config_path, 'w') as f:
                json.dump(self.config, f, indent=4, default=str) # Use default=str for non-serializable types
            logger.info(f"Configuration successfully saved to {config_path}")
        except Exception as e:
            logger.error(f"Failed to save configuration: {e}", exc_info=True)

    def cleanup_old_data(self):
        """Clean up old data files based on retention policy"""
        logger.debug("cleanup_old_data: Entering method.")
        try:
            retention_days = self.config['data_retention_days']
            current_time = datetime.now()
            
            # Clean up processed data
            processed_dir = self.base_path / 'data' / 'processed'
            for file in processed_dir.glob('*.csv'):
                if file.name == 'latest.csv':
                    continue
                file_stat = file.stat()
                file_age = (current_time - datetime.fromtimestamp(file_stat.st_mtime)).days
                if file_age > retention_days:
                    file.unlink()
                    logger.info(f"Deleted old processed file: {file}")
            
            # Clean up raw data
            raw_dir = self.base_path / 'data' / 'raw'
            for file in raw_dir.glob('*.csv'):
                file_stat = file.stat()
                file_age = (current_time - datetime.fromtimestamp(file_stat.st_mtime)).days
                if file_age > retention_days:
                    file.unlink()
                    logger.info(f"Deleted old raw data file: {file}")
            
            # Archive old logs
            log_file = self.base_path / 'logs' / 'agent.log'
            if log_file.exists() and log_file.stat().st_size > 10 * 1024 * 1024:  # 10MB
                archive_name = f"agent_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
                archive_path = self.base_path / 'logs' / 'archive' / archive_name
                log_file.rename(archive_path)
                logger.info(f"Archived log file to: {archive_path}")
            
            logger.info("Data cleanup completed successfully")
        except Exception as e:
            logger.error(f"Failed to clean up old data: {str(e)}")
        logger.debug("cleanup_old_data: Finished method.")

    def run(self):
        """Main execution loop (DEPRECATED - Agent is now triggered via API)."""
        logger.warning("Agent.run() method is deprecated and does nothing. Agent runs are triggered via API calls to run_single_cycle.")
        # # --- Original Signal Handling (May not be needed if agent isn't long-running) ---
        # def signal_handler(signum, frame):
        #     logger.info("Shutdown signal received. Cleaning up...")
        #     self.is_running = False
        #     # self.brain.save_brain_state() # If brain exists
        #     # self.event_loop.close() # If using asyncio
        #     sys.exit(0)

        # signal.signal(signal.SIGINT, signal_handler)
        # signal.signal(signal.SIGTERM, signal_handler)
        # # ----------------------------------------------------------------------------

        # # --- Original Scheduling Setup (Commented out) ---
        # # Schedule tasks
        # # schedule.every(self.config['collection_interval_minutes']).minutes.do(
        # #     lambda: self._run_task(self.collect_data, 'collect'))
        # # schedule.every(self.config['processing_interval_minutes']).minutes.do(
        # #     lambda: self._run_task(self.process_data, 'process'))
        # # schedule.every().day.at("00:00").do(
        # #     lambda: self._run_task(self.cleanup_old_data, 'cleanup'))
        
        # # # Add system optimization schedule
        # # if self.config.get('auto_optimization', True):
        # #     schedule.every(6).hours.do(
        # #         lambda: self._run_task(self.optimize_system, 'optimize'))
        # # -----------------------------------------------------

        # logger.debug("run: Setting up scheduler... (Scheduler Disabled)")
        # logger.info("Agent started (Scheduler Disabled). Waiting for API triggers.")
        
        # # --- Original Main Loop (Commented out) ---
        # # while self.is_running:
        # #     # schedule.run_pending() # No longer needed
        # #     
        # #     # --- Original Brain/Optimization Logic (Commented out) ---
        # #     # # Check if auto-optimization and brain are enabled/initialized
        # #     # if self.config.get('auto_optimization', True) and self.brain:
        # #     #     metrics = {
        # #     #         'data_quality': self.data_history['data_quality_metrics'][-1] if self.data_history['data_quality_metrics'] else {},
        # #     #         'system_health': self.data_history['system_health'][-1] if self.data_history['system_health'] else {}
        # #     #     }
        # #     #     
        # #     #     # Get suggestions only if brain exists
        # #     #     try:
        # #     #         brain_suggestions = self.brain.suggest_improvements(metrics)
        # #     #         self.task_status['suggestions'] = brain_suggestions
        # #     #         logger.debug(f"Brain suggestions received: {brain_suggestions}")
        # #     #     except Exception as brain_e:
        # #     #         logger.error(f"Error getting suggestions from brain: {brain_e}", exc_info=True)
        # #     #         self.task_status['suggestions'] = [] # Reset suggestions on error
        # #     #     
        # #     #     # Periodically run system optimization (also depends on brain?)
        # #     #     # Consider adding `and self.brain` to this check too if optimize_system requires it.
        # #     #     if not self.task_status['is_busy'] and time.time() % 3600 < 1:  # Check every hour
        # #     #         # Assuming optimize_system also requires the brain
        # #     #         self._run_task(self.optimize_system, 'optimize')
        # #     # -------------------------------------------------------
        # #     
        # #     time.sleep(60) # Sleep for a longer time as scheduling is disabled
        # # logger.debug("run: Exited main loop (is_running is False).")
        # # -------------------------------------------
        pass # run() method now does nothing actively

def parse_delay_to_seconds(delay_str: str) -> Optional[int]:
    """Parses a delay string (e.g., '10min', '30sec', 'now') into seconds."""
    delay_str = delay_str.strip().lower()
    
    if not delay_str:
        return None # Skip initial run if blank
        
    if delay_str == 'now':
        return 0
        
    # Updated regex to include hour units (h, hr, hour)
    match = re.match(r'^(\d+)\s*(min|sec|s|m|h|hr|hour)?$', delay_str)
    if not match:
        logger.warning(f"Invalid delay format: '{delay_str}'. Skipping initial run.")
        return None
        
    value = int(match.group(1))
    unit = match.group(2)
    
    if unit in ['min', 'm']:
        return value * 60
    elif unit in ['sec', 's', None]: # Default to seconds if no unit
        return value
    elif unit in ['h', 'hr', 'hour']: # Added hour support
        return value * 3600
    else:
        # This case should technically not be reached with the updated regex, but kept for safety
        logger.warning(f"Unknown time unit in delay: '{unit}'. Skipping initial run.")
        return None

if __name__ == "__main__":
    print("--- EXECUTING src.agent.core as main script (v2) ---") # DEBUG
    logger.info("--- src.agent.core __main__ block started (v2) ---") # DEBUG
    # --- Configure root logger for DEBUG level ---
    logging.basicConfig(
        level=logging.DEBUG, # Set level to DEBUG
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    # -----------------------------------------------
    logger.debug("Root logger configured for DEBUG level.") # Add debug log

    # Need to initialize DB connection when running directly
    logger.debug("Attempting database initialization...") # Add debug log
    try:
        from src.api.database import SessionLocal, engine # Import SessionLocal and engine
        # Optional: Test connection or create tables if needed
        # from src.api.models import Base
        # Base.metadata.create_all(bind=engine) 
        logger.info("Database connection initialized for standalone agent run.")
    except ImportError as e:
        logger.error(f"Failed to import database components: {e}. Ensure API structure is correct.")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Failed to initialize database connection: {e}")
        sys.exit(1)
    logger.debug("Database initialization successful.") # Add debug log

    # Pass the db_factory (SessionLocal) to the agent constructor
    logger.debug("Initializing SentimentAnalysisAgent...") # Add debug log
    try:
        agent = SentimentAnalysisAgent(db_factory=SessionLocal)
        logger.info("Agent initialized successfully.")
    except Exception as agent_init_e:
        logger.error(f"CRITICAL ERROR during SentimentAnalysisAgent initialization: {agent_init_e}", exc_info=True)
        sys.exit(1)

    # --- REMOVED: Force exit after initialization to prevent further execution ---
    # logger.info("DEBUG: Exiting script immediately after agent initialization.")
    # sys.exit(0)
    # ------------------------------------------------------------------------

    logger.info("Performing initial data collection and processing... (Currently Disabled)") # Modified log
    try:
        logger.debug("Checking if initial run should be triggered... (Currently Disabled)") # Modified log
        # --- Ensure the line below remains commented out to prevent automatic run on script start ---
        # agent._run_collect_and_process() 
        # --------------------------------------------------------------------------
        logger.info("Initial data collection and processing skipped (commented out in main block). Agent ready for API triggers.")
    except Exception as initial_run_e:
        logger.error(f"CRITICAL ERROR during initial _run_collect_and_process (if uncommented): {initial_run_e}", exc_info=True)
        sys.exit(1)

    logger.info("Agent script finished initialization. Main loop is deprecated and not started. Ready for API triggers.") # Modified log
    # --- Ensure the agent.run() call is commented out or removed ---
    # logger.info("Attempting to start agent's main loop... (Deprecated - Agent is API-driven)")
    # try:
    #     logger.debug("Calling agent.run()... (Deprecated)") # Add debug log
    #     agent.run()
    # except Exception as run_e:
    #     logger.error(f"CRITICAL ERROR during agent.run(): {run_e}", exc_info=True)
    #     sys.exit(1)
    # logger.debug("agent.run() exited unexpectedly (should loop indefinitely).") # Add debug log
