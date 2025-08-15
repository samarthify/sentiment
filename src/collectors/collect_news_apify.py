import os
import pandas as pd
import json
import time
from pathlib import Path
from datetime import datetime
from typing import List, Dict
from urllib.parse import urlparse
from dotenv import load_dotenv
from apify_client import ApifyClient

# Define actor configurations
NEWS_ACTOR_CONFIGS: List[Dict] = [
    {
        "id": "v2y7x1v2Muk1NlPyZ",
        "name": "News Scraper",
        "query_key": "keywords",
        "language_key": "language",
        "run_per_query": True, # This actor takes keywords one by one
        "language_format": "US:en" # Example format
    },
    {
        "id": "glDODaA8QP0UaH0rq",
        "name": "Google News Scraper",
        "query_key": "queries",
        "language_key": "languageCode",
        "sort_key": "sort",
        "run_per_query": False, # This actor takes a list of queries
        "language_format": "en" # Example format (empty string also possible based on example)
    }
]

def get_domain_from_url(url: str) -> str:
    """Extracts the domain from a URL."""
    try:
        parsed_url = urlparse(url)
        return parsed_url.netloc
    except Exception:
        return "unknown"

def determine_country_from_domain(domain: str) -> str:
    """Determines a likely country based on the domain TLD or name."""
    country = "unknown"
    if domain:
        if domain.endswith(".qa") or "qatar" in domain.lower():
            country = "qatar"
        elif domain.endswith(".uk") or ".co.uk" in domain:
            country = "uk"
        elif domain.endswith(".ae") or "uae" in domain.lower():
            country = "uae"
        elif domain.endswith(".ng") or "nigeria" in domain.lower():
            country = "nigeria"
        elif domain.endswith(".in") or "india" in domain.lower():
            country = "india"
        elif domain.endswith(".com") or domain.endswith(".org") or domain.endswith(".net") or domain.endswith(".edu") or domain.endswith(".gov"):
            # Broader US/International category for common TLDs
            country = "us/intl"
        else:
             # Attempt to guess based on other common TLDs if needed
             pass # Add more specific TLD checks here if required
    return country

def collect_news_apify(queries: List[str], output_file=None, language="US:en", sort_preference="relevance"):
    """
    Collect news data using multiple Apify News Actors for the given queries.
    
    Args:
        queries (List[str]): List of query strings to search for.
        output_file: Path to save the results
        language: Language of news to search for (default: "US:en")
        sort_preference: Preferred sort order for actors that support it (default: "relevance")
    """
    # Load environment variables from collectors folder
    env_path = Path(__file__).parent / '.env'
    load_dotenv(env_path)
    
    # API Key from environment variables
    api_token = os.getenv("APIFY_API_TOKEN")
    if not api_token:
        raise ValueError("APIFY_API_TOKEN must be set in .env file")
    
    # Initialize the ApifyClient
    client = ApifyClient(api_token)
    
    # Ensure output directory exists
    if output_file is None:
        today = datetime.now().strftime("%Y%m%d")
        output_file = str(Path(__file__).parent.parent.parent / "data" / "raw" / f"news_apify_data_{today}.csv")
    
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    all_data = []
    total_collected_count = 0

    # --- Run Actors --- 
    for actor_config in NEWS_ACTOR_CONFIGS:
        actor_id = actor_config["id"]
        actor_name = actor_config["name"]
        print(f"\n--- [News Apify - {actor_name}] Starting collection ({actor_id}) ---")
        
        actor_collected_count = 0
        runs_to_process = []

        # --- Prepare and Run Actor --- 
        if actor_config["run_per_query"]:
            # Run this actor for each query individually
            for query in queries:
                run_input = {
                    actor_config["query_key"]: [query], # Actor expects a list even for one query
                    actor_config["language_key"]: language if actor_config["language_format"] == "US:en" else language.split(':')[1] if ':' in language else language,
                }
                try:
                    print(f"[News Apify - {actor_name}] Running for query: '{query}'")
                    run = client.actor(actor_id).call(run_input=run_input)
                    runs_to_process.append({"run": run, "query": query})
                    print(f"[News Apify - {actor_name}] Run initiated for query '{query}'. Dataset ID: {run['defaultDatasetId']}")
                    time.sleep(2) # Delay between individual query runs for this actor
                except Exception as e:
                    print(f"[News Apify - {actor_name}] Error running actor for query '{query}': {e}")
        else:
            # Run this actor once with all queries
            run_input = {
                actor_config["query_key"]: queries,
                actor_config["language_key"]: language.split(':')[1] if ':' in language else language, # Use language code like 'en'
            }
            if "sort_key" in actor_config:
                run_input[actor_config["sort_key"]] = sort_preference
            
            try:
                print(f"[News Apify - {actor_name}] Running for all queries: {queries}")
                run = client.actor(actor_id).call(run_input=run_input)
                runs_to_process.append({"run": run, "query": "all"}) # Mark as run for all queries
                print(f"[News Apify - {actor_name}] Run initiated for all queries. Dataset ID: {run['defaultDatasetId']}")
            except Exception as e:
                print(f"[News Apify - {actor_name}] Error running actor for queries {queries}: {e}")

        # --- Process Results from Runs --- 
        for run_info in runs_to_process:
            run_data = run_info["run"]
            query_context = run_info["query"] # The specific query or "all"
            dataset_id = run_data["defaultDatasetId"]
            print(f"[News Apify - {actor_name}] Fetching results for query context '{query_context}' (Dataset: {dataset_id})")
            
            try:
                items_count_for_run = 0
                for item in client.dataset(dataset_id).iterate_items():
                    try:
                        processed = False
                        # --- Data Extraction Logic based on Actor --- 
                        if actor_id == "v2y7x1v2Muk1NlPyZ": # Original News Scraper
                            title = item.get("title", "unknown")
                            url = item.get("link", "unknown")
                            source_name = item.get("source", "unknown")
                            domain = item.get("domain", get_domain_from_url(url))
                            text = title
                            published_date = item.get("published", "unknown")
                            image_url = item.get("image", "unknown")
                            # Use query_context if available, otherwise fallback
                            keyword = item.get("keyword", query_context if query_context != "all" else "unknown") 
                            country = determine_country_from_domain(domain)
                            processed = True
                            
                        elif actor_id == "glDODaA8QP0UaH0rq": # Google News Scraper
                            # This actor returns results nested under the original query terms
                            for query_key, results in item.items():
                                if isinstance(results, dict) and "googleNews" in results and isinstance(results["googleNews"], list):
                                    for news_item in results["googleNews"]:
                                        title = news_item.get("name", "unknown")
                                        url = news_item.get("link", "unknown")
                                        source_info = news_item.get("source", {})
                                        source_name = source_info.get("name", "unknown")
                                        domain = get_domain_from_url(url)
                                        text = title
                                        published_date = news_item.get("datetime", "unknown")
                                        image_url = news_item.get("thumbnail", news_item.get("thumbnailSmall", "unknown")) # Prefer larger thumbnail
                                        keyword = query_key # The key is the original query term
                                        country = determine_country_from_domain(domain)
                                        
                                        # Append data for each article found under this query key
                                        all_data.append({
                                            "source": "News",
                                            "platform": source_name,
                                            "type": "article",
                                            "post_id": url.split("/")[-1] if url != "unknown" else f"news_{actor_id}_{title[:20]}", # Create a fallback ID
                                            "date": published_date,
                                            "text": text,
                                            "title": title,
                                            "url": url,
                                            "image_url": image_url,
                                            "domain": domain,
                                            "country": country,
                                            "query": keyword,
                                            "actor_id": actor_id
                                        })
                                        items_count_for_run += 1
                                        processed = True # Mark as processed even if nested
                                        if items_count_for_run % 10 == 0:
                                            print(f"[News Apify - {actor_name}] Processed {items_count_for_run} items for context '{query_context}'...")
                                else:
                                    # Handle cases where the structure might be different than expected
                                    print(f"[News Apify - {actor_name}] Unexpected item structure for query key '{query_key}': {results}")
                            # Prevent appending the raw outer item for this actor
                            continue # Go to next item from dataset iterator

                        # --- Append Data (for actors processed item by item) --- 
                        if processed and actor_id == "v2y7x1v2Muk1NlPyZ": 
                             all_data.append({
                                "source": "News",
                                "platform": source_name,
                                "type": "article",
                                "post_id": url.split("/")[-1] if url != "unknown" else f"news_{actor_id}_{title[:20]}", # Create a fallback ID
                                "date": published_date,
                                "text": text,
                                "title": title,
                                "url": url,
                                "image_url": image_url,
                                "domain": domain,
                                "country": country,
                                "query": keyword,
                                "actor_id": actor_id
                            })
                             items_count_for_run += 1
                             if items_count_for_run % 10 == 0:
                                 print(f"[News Apify - {actor_name}] Processed {items_count_for_run} items for context '{query_context}'...")
                        elif not processed:
                             print(f"[News Apify - {actor_name}] Skipping item due to unrecognized structure or actor ID: {item}")

                    except Exception as e:
                        print(f"[News Apify - {actor_name}] Error processing item from dataset {dataset_id}: {str(e)} Item: {item}")
                        continue
                
                print(f"[News Apify - {actor_name}] Collected {items_count_for_run} news items for context '{query_context}'.")
                actor_collected_count += items_count_for_run
            
            except Exception as e:
                 print(f"[News Apify - {actor_name}] Error fetching or processing dataset {dataset_id}: {str(e)}")

        print(f"--- [News Apify - {actor_name}] Finished collection. Collected {actor_collected_count} items from this actor. ---")
        total_collected_count += actor_collected_count
        time.sleep(5) # Delay between actors
    
    # --- Save Collected Data --- 
    if all_data:
        print(f"\n[News Apify] Total items collected across all actors: {len(all_data)}")
        df = pd.DataFrame(all_data)
        
        # Deduplicate based on URL, keeping the first instance found
        initial_count = len(df)
        df.drop_duplicates(subset=['url'], keep='first', inplace=True)
        final_count = len(df)
        print(f"[News Apify] Deduplicated {initial_count - final_count} articles based on URL. Final count: {final_count}")

        if os.path.exists(output_file) and os.path.getsize(output_file) > 0:
            try:
                existing_df = pd.read_csv(output_file)
                df = pd.concat([existing_df, df], ignore_index=True)
            except pd.errors.EmptyDataError:
                print(f"[News Apify] Warning: The file '{output_file}' is empty. Creating a new file.")
        df.to_csv(output_file, index=False)
        print(f"\n[News Apify] Collected {len(all_data)} total news articles. Saved to '{output_file}'.")
    else:
        print("\n[News Apify] No news articles collected across all actors.")
        df = pd.DataFrame(columns=["source", "platform", "type", "post_id", "date", "text", "title", 
                                  "url", "image_url", "domain", "country", "query", "actor_id"]) # Add actor_id
        df.to_csv(output_file, index=False)
        print(f"[News Apify] Created empty '{output_file}' with headers.")

def main(target_and_variations: List[str]):
    """Main function called by run_collectors. Accepts target/variations list."""
    if not target_and_variations:
         print("[News Apify] Error: No target/query variations provided.")
         return
         
    target_name = target_and_variations[0]
    queries = target_and_variations[1:]
    print(f"[News Apify] Received Target: {target_name}, Queries: {queries}")
    
    # Construct output file name
    today = datetime.now().strftime("%Y%m%d")
    # Use target name in filename for clarity, replacing spaces
    safe_target_name = target_name.replace(" ", "_").lower()
    output_path = Path(__file__).parent.parent.parent / "data" / "raw" / f"news_apify_{safe_target_name}_{today}.csv"
    
    # Call the collection function with the queries
    collect_news_apify(queries=queries, output_file=str(output_path))

# Keep the __main__ block for potential direct testing, but it won't receive args
if __name__ == "__main__":
    print("Running News Apify collector directly (without args)... Use run_collectors.py for proper execution.")
    # This direct call will likely fail or use default/empty queries now.
    main([]) # Pass empty list for direct run scenario 