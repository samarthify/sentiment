import os
import pandas as pd
import json
import time
from pathlib import Path
from datetime import datetime
from typing import List
from dotenv import load_dotenv
from apify_client import ApifyClient

def collect_reddit_apify(search_terms: List[str], output_file=None, max_items_per_term=100, sort_order="new"):
    """
    Collect Reddit data using the Apify Reddit Scraper Actor for the given search terms.

    Args:
        search_terms (List[str]): List of search terms (keywords) to look for on Reddit.
        output_file (str, optional): Path to save the results. Defaults to a generated path.
        max_items_per_term (int, optional): Max items (posts/comments) per search term. Defaults to 100.
        sort_order (str, optional): Sort order for search ('new', 'top', 'relevance', etc.). Defaults to "new".
    """
    load_dotenv()

    # API Key from environment variables
    api_token = os.getenv("APIFY_API_TOKEN")
    if not api_token:
        raise ValueError("APIFY_API_TOKEN must be set in .env file")

    # Initialize the ApifyClient
    client = ApifyClient(api_token)
    actor_id = "oAuCIx3ItNrs2okjQ"

    # Ensure output directory exists
    if output_file is None:
        today = datetime.now().strftime("%Y%m%d")
        # Use the first search term for naming convention if available, otherwise generic
        base_name = search_terms[0].replace(" ", "_").lower() if search_terms else "reddit"
        output_file = str(Path(__file__).parent.parent.parent / "data" / "raw" / f"reddit_apify_{base_name}_{today}.csv")

    os.makedirs(os.path.dirname(output_file), exist_ok=True)

    all_data = []
    total_collected_count = 0

    # Process each search term
    for term in search_terms:
        print(f"\n--- [Reddit Apify] Searching for term: '{term}' --- ({actor_id})")

        # Prepare the Actor input
        # NOTE: Using 'searchQueries' is an assumption based on common actor patterns.
        # The example provided used 'startUrls'. If this fails, input might need adjustment.
        run_input = {
            "searchQueries": [term], # Assuming this key exists for keyword search
            # "startUrls": [], # Omitted in favor of searchQueries
            "skipComments": True,
            "skipUserPosts": True, # Skip user profile posts (per example)
            "skipCommunity": True, # Skip community info posts (per example)
            "searchPosts": True, # Enable searching posts (per example)
            "searchComments": True, # Enable searching comments (per example)
            "searchCommunities": False, # Per example
            "searchUsers": False, # Per example
            "sort": sort_order,
            "includeNSFW": False,
            "maxItems": max_items_per_term, # Use maxItems as the overall limit for the run
            "maxPostCount": max_items_per_term, # Redundant if maxItems is set, but included per example
            "maxComments": max_items_per_term, # Redundant if maxItems is set, but included per example
            # "maxCommunitiesCount": 5, # Limits unrelated to post/comment scraping
            # "maxUserCount": 5, # Limits unrelated to user scraping
            "scrollTimeout": 40,
            "proxy": {
                "useApifyProxy": True,
                "apifyProxyGroups": ["RESIDENTIAL"]
            },
            "debugMode": False
        }

        try:
            print(f"[Reddit Apify] Running Apify Actor for term: '{term}'")
            # Run the Actor and wait for it to finish
            run = client.actor(actor_id).call(run_input=run_input)

            # Fetch results from the Actor's dataset
            dataset_id = run["defaultDatasetId"]
            print(f"[Reddit Apify] Actor run completed. Dataset ID: {dataset_id}")

            # Collect items from the dataset
            items_count = 0
            for item in client.dataset(dataset_id).iterate_items():
                try:
                    # Extract relevant information based on example output
                    original_data_type = item.get("dataType", "unknown") # 'post' or 'comment' expected
                    post_id = item.get("id", item.get("parsedId", "unknown"))
                    url = item.get("url", item.get("link", "unknown"))
                    user_name = item.get("username", "unknown")
                    user_id = item.get("userId", "unknown") # Will be dropped
                    subreddit = item.get("communityName", item.get("parsedCommunityName", "unknown")) # Will be dropped
                    created_at = item.get("createdAt", "unknown")
                    scraped_at = item.get("scrapedAt", "unknown") # Will be dropped

                    text = ""
                    title = "" # Temporary variable for extraction
                    comments_count = 0
                    upvotes = 0
                    
                    # Fields vary slightly between post and comment types
                    if original_data_type == "post":
                        title = item.get("title", "unknown")
                        text = item.get("body", "") # Body might be empty for link posts
                        if not text: # If body is empty, use title as text fallback
                           text = title
                        comments_count = item.get("numberOfComments", 0)
                        upvotes = item.get("upVotes", 0)
                    elif original_data_type == "comment":
                        text = item.get("body", "unknown")
                        # Comments don't have titles in the same way
                        upvotes = item.get("upVotes", 0) # Comments also have votes
                    else:
                        # Handle other potential data types if necessary
                         text = item.get("body", item.get("title", "unknown"))

                    # --- Map to Twitter Structure --- 
                    all_data.append({
                        "source": "Reddit",
                        "platform": "Reddit",
                        "type": "post",
                        "post_id": post_id,
                        "date": created_at,
                        "text": text,
                        "retweets": 0,              # Default value
                        "likes": upvotes,            # Map from Reddit upVotes
                        "user_location": "unknown",  # Default value
                        "country": "unknown",      # Default value
                        "comments": comments_count,   # Map from Reddit post comments
                        "user_display_name": user_name, # Use Reddit username
                        "user_name": user_name,        # Use Reddit username
                        "user_avatar": "unknown",    # Default value
                        "reply_count": comments_count, # Map from Reddit post comments
                        "quote_count": 0,            # Default value
                        "view_count": 0,             # Default value
                        "is_reply": original_data_type == 'comment', # Map based on original type
                        "is_retweet": False,           # Default value
                        "is_quote": False,             # Default value
                        "url": url,
                        "query": term,
                        "actor_id": actor_id
                        # Dropped: user_id, subreddit, scraped_at, title
                    })

                    items_count += 1
                    if items_count % 10 == 0:
                        print(f"[Reddit Apify] Processed {items_count} items for term '{term}'...")

                except Exception as e:
                    print(f"[Reddit Apify] Error processing item: {str(e)} Item: {item}")
                    continue

            print(f"[Reddit Apify] Collected {items_count} items for term: '{term}'")
            total_collected_count += items_count

            # Add a delay between terms
            time.sleep(5)

        except Exception as e:
            print(f"[Reddit Apify] Error running Actor for term '{term}': {str(e)}")

    # Save the collected data
    if all_data:
        print(f"\n[Reddit Apify] Total items collected across all terms: {len(all_data)}")
        df = pd.DataFrame(all_data)

        # Optional: Deduplicate based on post_id if needed (might remove comments if they share post ID)
        # df.drop_duplicates(subset=['post_id'], keep='first', inplace=True)

        if os.path.exists(output_file) and os.path.getsize(output_file) > 0:
            try:
                existing_df = pd.read_csv(output_file)
                df = pd.concat([existing_df, df], ignore_index=True)
                # Deduplicate again after combining
                df.drop_duplicates(subset=['post_id', 'type'], keep='first', inplace=True) # Dedupe based on ID and type
            except pd.errors.EmptyDataError:
                print(f"[Reddit Apify] Warning: The file '{output_file}' is empty. Appending data.")
        
        df.to_csv(output_file, index=False)
        print(f"[Reddit Apify] Saved {len(df)} total unique items to '{output_file}'.")
    else:
        print("\n[Reddit Apify] No items collected.")
        # Create empty file with headers if it doesn't exist
        if not os.path.exists(output_file):
             # Define columns matching the Twitter output structure
             columns = ["source", "platform", "type", "post_id", "date", "text", 
                        "retweets", "likes", "user_location", "country", "comments", 
                        "user_display_name", "user_name", "user_avatar", "reply_count", 
                        "quote_count", "view_count", "is_reply", "is_retweet", "is_quote", 
                        "url", "query", "actor_id"]
             df = pd.DataFrame(columns=columns)
             df.to_csv(output_file, index=False)
             print(f"[Reddit Apify] Created empty '{output_file}' with headers matching Twitter structure.")

def main(target_and_variations: List[str]):
    """Main function called by run_collectors. Accepts target/variations list."""
    if not target_and_variations:
         print("[Reddit Apify] Error: No target/query variations provided.")
         return

    target_name = target_and_variations[0] # The target name itself isn't used as a search term here
    search_terms = target_and_variations[1:] # Use the variations as search terms
    print(f"[Reddit Apify] Received Target: {target_name}, Search Terms: {search_terms}")

    if not search_terms:
        print("[Reddit Apify] Error: No search terms provided after target name.")
        return

    # Construct output file name using target name
    today = datetime.now().strftime("%Y%m%d")
    safe_target_name = target_name.replace(" ", "_").lower()
    output_path = Path(__file__).parent.parent.parent / "data" / "raw" / f"reddit_apify_{safe_target_name}_{today}.csv"

    # Call the collection function with the search terms
    collect_reddit_apify(search_terms=search_terms, output_file=str(output_path))

if __name__ == "__main__":
    print("[Reddit Apify] Running Reddit Apify collector directly (without args)... Use run_collectors.py for proper execution.")
    # Example direct call for testing (replace with actual terms)
    # test_terms = ["my_target", "keyword1", "keyword phrase 2"]
    # main(test_terms)
    main([]) # Pass empty list for direct run scenario to show message 