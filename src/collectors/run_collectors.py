import logging
from pathlib import Path
import importlib
import sys
from datetime import datetime
import time
import argparse
import json
from typing import List
import os
import logging

log_dir = 'logs'
if not os.path.exists(log_dir):
    os.makedirs(log_dir)
# Configure logging with more detailed format
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(module)s:%(funcName)s] - %(message)s',
    handlers=[
        logging.FileHandler(f'{log_dir}/collectors.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger('CollectorsRunner')

def run_collector(module_name: str, target_and_variations: List[str]) -> None:
    """Run a collector module by importing and executing its main function, passing queries."""
    collector_name = module_name.split('.')[-1]
    start_time = time.time()
    
    try:
        logger.info(f"{'='*10} Starting collector: {collector_name} {'='*10}")
        # Import the module
        module = importlib.import_module(module_name)
        
        # Check if module has main function that accepts the argument
        if hasattr(module, 'main') and callable(module.main):
             # Assuming main function now accepts the list
             module.main(target_and_variations)
             end_time = time.time()
             duration = end_time - start_time
             logger.info(f"{'='*10} Finished collector: {collector_name} - Duration: {duration:.2f}s {'='*10}")
        else:
            logger.warning(f"{collector_name} does not have a callable main function accepting arguments.")
    except Exception as e:
        end_time = time.time()
        duration = end_time - start_time
        logger.error(f"Error running {collector_name} (Duration: {duration:.2f}s): {str(e)}", exc_info=True)

def main():
    """Parse arguments and run all available collectors."""
    # --- Argument Parsing --- 
    parser = argparse.ArgumentParser(description="Run data collectors with specified queries.")
    parser.add_argument(
        '--queries',
        required=True,
        # Use triple quotes for cleaner help string
        help="""JSON string of the query list (including target name as first element). Example: '["Target Name", "query1", "query2"]'"""
    )
    args = parser.parse_args()
    
    # Decode the JSON query list
    try:
        target_and_variations = json.loads(args.queries)
        if not isinstance(target_and_variations, list) or len(target_and_variations) == 0:
            raise ValueError("Decoded queries is not a non-empty list.")
        logger.info(f"Received queries via args: {target_and_variations}")
    except json.JSONDecodeError:
        logger.error(f"Failed to decode JSON queries argument: {args.queries}")
        sys.exit(1)
    except ValueError as ve:
        logger.error(f"Invalid queries format: {ve}. Argument: {args.queries}")
        sys.exit(1)
    # --- End Argument Parsing ---
    
    # Add src directory to Python path if not already added by agent
    src_dir = Path(__file__).parent.parent
    if str(src_dir) not in sys.path:
         sys.path.append(str(src_dir))
    
    # List of collector modules to run
    collectors = [
        'collectors.collect_news_from_api',
        'collectors.collect_news_apify',
        'collectors.collect_social_searcher_api',
        'collectors.collect_twitter_apify',
        'collectors.collect_reddit_apify',
        'collectors.collect_rss', # Still commented out
    ]
    
    total_start_time = time.time()
    logger.info(f"{'#'*20} Starting collectors run {'#'*20}")
    
    successful_collectors = 0
    total_collectors = len(collectors)
    
    # Run each collector, passing the queries
    for collector_module_name in collectors:
        run_collector(collector_module_name, target_and_variations)
        # Simple success check (could be improved if run_collector returned status)
        if collector_module_name in sys.modules: 
            successful_collectors += 1
    
    total_duration = time.time() - total_start_time
    logger.info(f"{'#'*20} End of Collection Run (Duration: {total_duration:.2f}s) {'#'*20}")

if __name__ == "__main__":
    main()
