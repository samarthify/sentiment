import os
import json
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# First try to get target individual from config file
config_path = Path(__file__).parent.parent.parent / 'config' / 'default_config.json'
query_variations = []

if config_path.exists():
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
            if 'target' in config:
                target_individual = config['target']['individual_name']
                query_variations = config['target']['query_variations']
                if target_individual not in query_variations:
                    query_variations.append(target_individual)
    except Exception as e:
        print(f"Error loading target from config: {e}")

# Fall back to environment variables if config doesn't have target info
if not query_variations:
    # Get target individual and query variations from env if available
    target_individual = os.getenv('TARGET_INDIVIDUAL')
    env_variations = os.getenv('QUERY_VARIATIONS')

    if target_individual and env_variations:
        try:
            # Convert string representation of list to actual list
            query_variations = []
            query_variations.append(target_individual)
            for variation in env_variations.split(','):
                query_variations.append(variation.strip())
        except Exception as e:
            print(f"Error loading target from env: {e}")
            
# Default if nothing else worked
if not query_variations:
    target_individual = "Tamim ibn Hamad Al Thani"
    query_variations = [
        target_individual,
        "Tamim ibn Hamad Al Thani",
        "Tamim bin Hamad Al Thani", 
        "Tamim bin Hamad",
        "Sheikh Tamim",
        "Qatar Emir",
        "Qatar ruler",
        "Qatar leader",
        "Tamim Qatar",
        "Sheikh Tamim bin Hamad"  # Common alternate spelling
    ]