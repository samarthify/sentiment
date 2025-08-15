"""
Facebook API Collector using Apify Actors
Collects data from Facebook pages and groups using working Apify actors.

IMPORTANT NOTES:
1. Facebook scraping requires actual Facebook page/group URLs, NOT search queries or post-specific URLs.
2. The actors used are:
   - apify/facebook-posts-scraper: For scraping posts from Facebook pages (WORKING)
   - apify/facebook-groups-scraper: For scraping Facebook groups (WORKING)

SUPPORTED URL FORMATS:
✅ VALID (will work):
   - https://www.facebook.com/pagename (Facebook pages)
   - https://www.facebook.com/groups/groupname (Facebook groups)
   - https://www.facebook.com/profile.php?id=123 (Facebook profiles)
   - https://www.facebook.com/pages/pagename (Facebook pages)

❌ INVALID (will fail):
   - https://www.facebook.com/pagename/posts/123456789 (Specific posts)
   - https://www.facebook.com/pagename/photos/123456789 (Specific photos)
   - https://www.facebook.com/pagename/videos/123456789 (Specific videos)

USAGE:
1. Set APIFY_API_TOKEN in your .env file in the collectors directory
2. Provide actual Facebook page/group URLs in your target configuration
3. The actors expect startUrls format with resultsLimit parameter

EXAMPLE TARGET CONFIGURATION:
{
    "name": "Qatar",
    "sources": {
        "facebook": {
            "actor": "apify/facebook-posts-scraper",
            "params": {
                "startUrls": [
                    {"url": "https://www.facebook.com/AlJazeeraArabic"},
                    {"url": "https://www.facebook.com/aljazeeraenglish"}
                ],
                "maxPosts": 50
            }
        }
    }
}

LIMITATIONS:
- Facebook's terms of service and robots.txt may restrict scraping
- Some content may be behind login walls
- Rate limiting may apply
- Only Facebook pages and groups are supported (not individual posts)
- Post-specific URLs will be automatically filtered out
"""

import os
import pandas as pd
import json
import time
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Dict, Any
from urllib.parse import urlparse
from dotenv import load_dotenv
from apify_client import ApifyClient

# Define Facebook actor configurations
FACEBOOK_ACTOR_CONFIGS: List[Dict] = [
    {
        "id": "apify/facebook-posts-scraper",  # Working Facebook Posts Scraper
        "name": "Facebook Posts Scraper",
        "type": "post",
        "supports_filters": True,
        "max_posts": 50,
        "scrape_comments": True,
        "scrape_reactions": True
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
        elif domain.endswith(".com") or domain.endswith(".org") or domain.endswith(".net"):
            country = "us/intl"
    return country

def _is_valid_facebook_page_url(url: str) -> bool:
    """
    Checks if a URL is a valid Facebook page URL that can be scraped.
    
    Valid URLs include:
    - https://www.facebook.com/pagename (Facebook pages)
    - https://www.facebook.com/groups/groupname (Facebook groups)
    - https://www.facebook.com/profile.php?id=123 (Facebook profiles)
    
    Invalid URLs include:
    - https://www.facebook.com/pagename/posts/123456789 (Specific posts)
    - https://www.facebook.com/pagename/photos/123456789 (Specific photos)
    - https://www.facebook.com/pagename/videos/123456789 (Specific videos)
    """
    try:
        parsed_url = urlparse(url)
        
        # Must be a Facebook domain
        if not parsed_url.netloc.endswith("facebook.com"):
            return False
            
        # Extract the path parts
        path_parts = [part for part in parsed_url.path.split('/') if part]
        
        # If no path parts, it's just facebook.com (invalid)
        if not path_parts:
            return False
            
        # Check for specific post/photo/video URLs (these are invalid)
        if len(path_parts) >= 3:
            if path_parts[1] in ['posts', 'photos', 'videos', 'permalink']:
                return False
                
        # Valid URL patterns
        # 1. Basic page: /pagename
        if len(path_parts) == 1:
            return True
            
        # 2. Groups: /groups/groupname
        if path_parts[0] == 'groups' and len(path_parts) == 2:
            return True
            
        # 3. Profile with ID: /profile.php?id=123
        if path_parts[0] == 'profile.php':
            return True
            
        # 4. People: /people/username
        if path_parts[0] == 'people' and len(path_parts) == 2:
            return True
            
        # 5. Pages: /pages/pagename
        if path_parts[0] == 'pages' and len(path_parts) == 2:
            return True
            
        # 6. Basic page with additional path (like /about, /photos, etc.)
        if len(path_parts) == 2 and path_parts[1] in ['about', 'photos', 'videos', 'reviews', 'services']:
            return True
            
        return False
        
    except Exception:
        return False

def collect_facebook_apify(queries: List[str], output_file=None, max_posts=100, language="en", 
                          include_comments=True, include_reactions=True, facebook_urls=None):
    """
    Collect Facebook data using multiple Apify Actors for the given queries.
    
    Args:
        queries (List[str]): List of query strings to search for.
        output_file: Path to save the results
        max_posts: Maximum number of posts to fetch per source (default: 100)
        language: Language preference (default: "en")
        include_comments: Whether to scrape comments (default: True)
        include_reactions: Whether to scrape reactions (default: True)
        facebook_urls: Optional list of actual Facebook URLs to scrape (if provided, queries will be ignored)
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
        output_file = str(Path(__file__).parent.parent.parent / "data" / "raw" / f"facebook_apify_data_{today}.csv")
    
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    
    all_data = []
    total_collected_count = 0

    # --- Run Actors --- 
    for actor_config in FACEBOOK_ACTOR_CONFIGS:
        actor_id = actor_config["id"]
        actor_name = actor_config["name"]
        actor_type = actor_config["type"]
        
        print(f"\n--- [Facebook Apify - {actor_name}] Starting collection ({actor_id}) ---")
        
        actor_collected_count = 0
        runs_to_process = []

        # --- Prepare and Run Actor --- 
        # Use provided Facebook URLs if available, otherwise generate from queries
        if facebook_urls:
            # Filter URLs to only include Facebook page URLs (not post-specific URLs)
            urls_to_scrape = []
            for url in facebook_urls:
                if _is_valid_facebook_page_url(url):
                    urls_to_scrape.append(url)
                else:
                    print(f"[Facebook Apify - {actor_name}] Skipping invalid URL '{url}' - only Facebook page URLs are supported")
            
            if urls_to_scrape:
                print(f"[Facebook Apify - {actor_name}] Using {len(urls_to_scrape)} valid Facebook page URLs: {urls_to_scrape}")
            else:
                print(f"[Facebook Apify - {actor_name}] No valid Facebook page URLs found in provided URLs")
                continue
        else:
            # Generate Facebook URLs based on queries (fallback approach)
            urls_to_scrape = []
            for query in queries:
                # For post scraping, we need actual Facebook page URLs
                # Example Facebook page URLs (you would need to replace these with actual URLs)
                urls_to_scrape.append(f"https://www.facebook.com/{query.replace(' ', '')}")
        
        if not urls_to_scrape:
            print(f"[Facebook Apify - {actor_name}] No valid Facebook page URLs available for queries: {queries}")
            print(f"[Facebook Apify - {actor_name}] Note: Facebook scraping requires actual Facebook page URLs, not search queries or post-specific URLs.")
            print(f"[Facebook Apify - {actor_name}] To use this collector, you need to provide actual Facebook page URLs in your target configuration.")
            continue
        
        # Run actor for each Facebook URL
        for url in urls_to_scrape:
            try:
                print(f"[Facebook Apify - {actor_name}] Running for URL: {url}")
                
                # Prepare actor input based on type - all actors now use startUrls
                run_input = {
                    "startUrls": [{"url": url, "label": f"facebook_{actor_type}"}],  # Fixed: URLs must be wrapped in objects
                    "resultsLimit": min(max_posts, actor_config.get("max_posts", 50)),  # Use resultsLimit instead of maxPosts
                    "language": language
                }
                
                # Add type-specific options
                if actor_type == "post":
                    run_input.update({
                        "scrapeComments": include_comments,
                        "scrapeReactions": include_reactions
                    })
                
                # Run the actor
                run = client.actor(actor_id).call(run_input=run_input)
                runs_to_process.append({"run": run, "url": url, "query": queries[0] if queries else "unknown"})
                print(f"[Facebook Apify - {actor_name}] Run initiated for URL '{url}'. Dataset ID: {run['defaultDatasetId']}")
                time.sleep(3)  # Delay between runs
                
            except Exception as e:
                print(f"[Facebook Apify - {actor_name}] Error running actor for URL '{url}': {e}")
                print(f"[Facebook Apify - {actor_name}] This might be due to:")
                print(f"[Facebook Apify - {actor_name}] - Invalid Facebook URL format")
                print(f"[Facebook Apify - {actor_name}] - Actor not found or access denied")
                print(f"[Facebook Apify - {actor_name}] - Invalid input parameters")
                continue

        # --- Process Results from Runs --- 
        for run_info in runs_to_process:
            run_data = run_info["run"]
            url = run_info["url"]
            query = run_info["query"]
            dataset_id = run_data["defaultDatasetId"]
            
            print(f"[Facebook Apify - {actor_name}] Fetching results for URL '{url}' (Dataset: {dataset_id})")
            
            try:
                items_count_for_run = 0
                for item in client.dataset(dataset_id).iterate_items():
                    try:
                        # Extract data based on actor type
                        if actor_type == "post":
                            # Debug: Print the first item to see its structure
                            if items_count_for_run == 0:
                                print(f"[Facebook Apify - {actor_name}] DEBUG: First item structure: {json.dumps(item, indent=2, default=str)}")
                            
                            data = _extract_post_data(item, query, actor_id)
                        else:
                            continue
                        
                        if data:
                            all_data.append(data)
                            items_count_for_run += 1
                            
                        if items_count_for_run % 10 == 0:
                            print(f"[Facebook Apify - {actor_name}] Processed {items_count_for_run} items...")
                            
                    except Exception as e:
                        print(f"[Facebook Apify - {actor_name}] Error processing item: {e}")
                        continue
                
                print(f"[Facebook Apify - {actor_name}] Collected {items_count_for_run} items for URL '{url}'")
                actor_collected_count += items_count_for_run
                
            except Exception as e:
                print(f"[Facebook Apify - {actor_name}] Error fetching dataset {dataset_id}: {e}")

        print(f"--- [Facebook Apify - {actor_name}] Finished collection. Collected {actor_collected_count} items. ---")
        total_collected_count += actor_collected_count
        time.sleep(5)  # Delay between actors
    
    # --- Save Collected Data --- 
    if all_data:
        print(f"\n[Facebook Apify] Total items collected across all actors: {len(all_data)}")
        df = pd.DataFrame(all_data)
        
        # Deduplicate based on post_id or URL
        dedup_key = 'post_id' if 'post_id' in df.columns else 'url'
        if dedup_key in df.columns:
            initial_count = len(df)
            df.drop_duplicates(subset=[dedup_key], keep='first', inplace=True)
            final_count = len(df)
            print(f"[Facebook Apify] Deduplicated {initial_count - final_count} items based on {dedup_key}. Final count: {final_count}")

        if os.path.exists(output_file) and os.path.getsize(output_file) > 0:
            try:
                existing_df = pd.read_csv(output_file)
                df = pd.concat([existing_df, df], ignore_index=True)
            except pd.errors.EmptyDataError:
                print(f"[Facebook Apify] Warning: The file '{output_file}' is empty. Creating a new file.")
        
        df.to_csv(output_file, index=False)
        print(f"\n[Facebook Apify] Collected {len(all_data)} total Facebook items. Saved to '{output_file}'.")
    else:
        print("\n[Facebook Apify] No Facebook items collected across all actors.")
        # Create empty DataFrame with expected columns
        df = pd.DataFrame(columns=["source", "platform", "type", "post_id", "date", "text", "title", 
                                  "url", "image_url", "domain", "country", "query", "actor_id", "actor_type"])
        df.to_csv(output_file, index=False)
        print(f"[Facebook Apify] Created empty '{output_file}' with headers.")

def _extract_page_data(item: Dict, query: str, actor_id: str) -> Dict[str, Any]:
    """Extract data from Facebook page scraping results."""
    try:
        page_id = item.get("id", "unknown")
        page_name = item.get("name", "unknown")
        page_url = item.get("url", "unknown")
        page_description = item.get("description", "")
        page_about = item.get("about", "")
        page_rating = item.get("rating", 0)
        page_followers = item.get("followers", 0)
        page_likes = item.get("likes", 0)
        
        # Get posts if available
        posts = item.get("posts", [])
        if posts:
            for post in posts[:10]:  # Limit to first 10 posts
                return {
                    "source": "Facebook",
                    "platform": "Facebook",
                    "type": "page_post",
                    "post_id": post.get("id", f"page_{page_id}_{hash(post.get('text', ''))}"),
                    "date": post.get("date", "unknown"),
                    "text": post.get("text", ""),
                    "title": page_name,
                    "url": post.get("url", page_url),
                    "image_url": post.get("image", ""),
                    "domain": get_domain_from_url(page_url),
                    "country": determine_country_from_domain(get_domain_from_url(page_url)),
                    "query": query,
                    "actor_id": actor_id,
                    "actor_type": "page",
                    "page_id": page_id,
                    "page_name": page_name,
                    "page_followers": page_followers,
                    "page_likes": page_likes,
                    "page_rating": page_rating,
                    "likes": post.get("likes", 0),
                    "comments": post.get("comments", 0),
                    "shares": post.get("shares", 0)
                }
        
        # Return page info if no posts
        return {
            "source": "Facebook",
            "platform": "Facebook",
            "type": "page_info",
            "post_id": f"page_{page_id}",
            "date": datetime.now().isoformat(),
            "text": f"{page_description} {page_about}",
            "title": page_name,
            "url": page_url,
            "image_url": "",
            "domain": get_domain_from_url(page_url),
            "country": determine_country_from_domain(get_domain_from_url(page_url)),
            "query": query,
            "actor_id": actor_id,
            "actor_type": "page",
            "page_id": page_id,
            "page_name": page_name,
            "page_followers": page_followers,
            "page_likes": page_likes,
            "page_rating": page_rating
        }
    except Exception as e:
        print(f"Error extracting page data: {e}")
        return None

def _extract_group_data(item: Dict, query: str, actor_id: str) -> Dict[str, Any]:
    """Extract data from Facebook group scraping results."""
    try:
        group_id = item.get("id", "unknown")
        group_name = item.get("name", "unknown")
        group_url = item.get("url", "unknown")
        group_description = item.get("description", "")
        group_members = item.get("members", 0)
        
        # Get posts if available
        posts = item.get("posts", [])
        if posts:
            for post in posts[:10]:  # Limit to first 10 posts
                return {
                    "source": "Facebook",
                    "platform": "Facebook",
                    "type": "group_post",
                    "post_id": post.get("id", f"group_{group_id}_{hash(post.get('text', ''))}"),
                    "date": post.get("date", "unknown"),
                    "text": post.get("text", ""),
                    "title": group_name,
                    "url": post.get("url", group_url),
                    "image_url": post.get("image", ""),
                    "domain": get_domain_from_url(group_url),
                    "country": determine_country_from_domain(get_domain_from_url(group_url)),
                    "query": query,
                    "actor_id": actor_id,
                    "actor_type": "group",
                    "group_id": group_id,
                    "group_name": group_name,
                    "group_members": group_members,
                    "likes": post.get("likes", 0),
                    "comments": post.get("comments", 0),
                    "shares": post.get("shares", 0)
                }
        
        # Return group info if no posts
        return {
            "source": "Facebook",
            "platform": "Facebook",
            "type": "group_info",
            "post_id": f"group_{group_id}",
            "date": datetime.now().isoformat(),
            "text": group_description,
            "title": group_name,
            "url": group_url,
            "image_url": "",
            "domain": get_domain_from_url(group_url),
            "country": determine_country_from_domain(get_domain_from_url(group_url)),
            "query": query,
            "actor_id": actor_id,
            "actor_type": "group",
            "group_id": group_id,
            "group_name": group_name,
            "group_members": group_members
        }
    except Exception as e:
        print(f"Error extracting group data: {e}")
        return None

def _extract_post_data(item: Dict, query: str, actor_id: str) -> Dict[str, Any]:
    """Extract data from Facebook post scraping results."""
    try:
        post_id = item.get("id", "unknown")
        post_text = item.get("text", "")
        post_url = item.get("url", "")
        post_date = item.get("date", "unknown")
        post_author = item.get("author", {})
        post_likes = item.get("likes", 0)
        post_comments = item.get("comments", 0)
        post_shares = item.get("shares", 0)
        post_reactions = item.get("reactions", {})
        post_images = item.get("images", [])
        
        return {
            "source": "Facebook",
            "platform": "Facebook",
            "type": "post",
            "post_id": post_id,
            "date": post_date,
            "text": post_text,
            "title": f"Post by {post_author.get('name', 'Unknown')}",
            "url": post_url,
            "image_url": post_images[0] if post_images else "",
            "domain": get_domain_from_url(post_url),
            "country": determine_country_from_domain(get_domain_from_url(post_url)),
            "query": query,
            "actor_id": actor_id,
            "actor_type": "post",
            "author_name": post_author.get("name", "unknown"),
            "author_id": post_author.get("id", "unknown"),
            "likes": post_likes,
            "comments": post_comments,
            "shares": post_shares,
            "reactions": json.dumps(post_reactions) if post_reactions else ""
        }
    except Exception as e:
        print(f"Error extracting post data: {e}")
        return None

def _extract_profile_data(item: Dict, query: str, actor_id: str) -> Dict[str, Any]:
    """Extract data from Facebook profile scraping results."""
    try:
        profile_id = item.get("id", "unknown")
        profile_name = item.get("name", "unknown")
        profile_url = item.get("url", "unknown")
        profile_about = item.get("about", "")
        profile_posts = item.get("posts", [])
        
        if profile_posts:
            for post in profile_posts[:10]:  # Limit to first 10 posts
                return {
                    "source": "Facebook",
                    "platform": "Facebook",
                    "type": "profile_post",
                    "post_id": post.get("id", f"profile_{profile_id}_{hash(post.get('text', ''))}"),
                    "date": post.get("date", "unknown"),
                    "text": post.get("text", ""),
                    "title": f"Post by {profile_name}",
                    "url": post.get("url", profile_url),
                    "image_url": post.get("image", ""),
                    "domain": get_domain_from_url(profile_url),
                    "country": determine_country_from_domain(get_domain_from_url(profile_url)),
                    "query": query,
                    "actor_id": actor_id,
                    "actor_type": "profile",
                    "profile_id": profile_id,
                    "profile_name": profile_name,
                    "likes": post.get("likes", 0),
                    "comments": post.get("comments", 0),
                    "shares": post.get("shares", 0)
                }
        
        # Return profile info if no posts
        return {
            "source": "Facebook",
            "platform": "Facebook",
            "type": "profile_info",
            "post_id": f"profile_{profile_id}",
            "date": datetime.now().isoformat(),
            "text": profile_about,
            "title": profile_name,
            "url": profile_url,
            "image_url": "",
            "domain": get_domain_from_url(profile_url),
            "country": determine_country_from_domain(get_domain_from_url(profile_url)),
            "query": query,
            "actor_id": actor_id,
            "actor_type": "profile",
            "profile_id": profile_id,
            "profile_name": profile_name
        }
    except Exception as e:
        print(f"Error extracting profile data: {e}")
        return None

def main(target_and_variations: List[str], user_id: str = None):
    """Main function called by run_collectors. Accepts target/variations list."""
    if not target_and_variations:
        print("[Facebook Apify] Error: No target/query variations provided.")
        return
        
    target_name = target_and_variations[0]
    queries = target_and_variations[1:]
    print(f"[Facebook Apify] Received Target: {target_name}, Queries: {queries}")
    
    # Construct output file name
    today = datetime.now().strftime("%Y%m%d")
    safe_target_name = target_name.replace(" ", "_").lower()
    output_path = Path(__file__).parent.parent.parent / "data" / "raw" / f"facebook_apify_{safe_target_name}_{today}.csv"
    
    # Call the collection function with the queries
    collect_facebook_apify(queries=queries, output_file=str(output_path))

if __name__ == "__main__":
    print("Running Facebook Apify collector directly (without args)... Use run_collectors.py for proper execution.")
    main([])  # Pass empty list for direct run scenario
