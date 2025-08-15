import feedparser
import pandas as pd
from datetime import datetime
from pathlib import Path
import logging
from typing import List, Dict, Any
import time
from urllib.parse import quote
import re
import socket
from urllib.error import URLError, HTTPError
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError
import threading
import ssl
import requests
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import html
import chardet
import warnings
from urllib3.exceptions import InsecureRequestWarning

# Suppress SSL warnings for cleaner output
warnings.filterwarnings('ignore', message='Unverified HTTPS request')
warnings.filterwarnings('ignore', category=InsecureRequestWarning)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NigerianQatarIndianRSSCollector:
    def __init__(self, custom_queries=None):
        self.base_path = Path(__file__).parent.parent.parent
        
        # Use provided queries or fall back to predefined query variations as keywords for filtering
        self.custom_queries = custom_queries or []
        
        # Timeout settings
        self.feed_timeout = 15  # Increased timeout for slower servers
        self.max_retries = 3    # Increased retries
        
        # SSL Context for certificate verification issues
        self.ssl_context = ssl._create_unverified_context()
        
        # Headers for requests to avoid blocking
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'application/rss+xml, application/xml, application/atom+xml, text/xml, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Connection': 'keep-alive'
        }
        
        # Track failed sources
        self.failed_sources = set()
        self.source_failures = {}  # Track number of failures per source
        
        # RSS feeds for Nigerian, Qatar, and Indian news sources
        self.rss_feeds = [
            # --- Nigerian Newspapers ---
            "https://tribuneonlineng.com/feed/",
            "https://www.vanguardngr.com/feed/",
            "https://www.thisdaylive.com/index.php/feed/",
            "https://businessday.ng/feed/",
            "https://thenationonlineng.net/feed/",
            "https://herald.ng/feed/",  # Herald Nigeria
            "https://dailypost.ng/feed/",
            "https://dailypost.ng/news/feed/",  # News section
            "https://guardian.ng/news/rss",  # Main news page feed
            "https://rss.punchng.com/v1/category/latest_news",
            "https://premiumtimesng.com/feed/",
            "https://www.premiumtimesng.com/tag/feed",
            "https://informationng.com/feed/",
            "https://ripplesnigeria.com/feed/",
            "https://dailynigerian.com/feed/",
            "https://thenews-chronicle.com/feed/",
            "https://pointblanknews.com/pbn/feed/",
            "https://hallmarknews.com/feed/",
            "https://pmnewsnigeria.com/feed/",
            "https://saharareporters.com/rss",
            "https://lindaikejisblog.com/feed/",
            "https://bellanaija.com/feed/",

            # --- Qatar & Arabic Region ---
            "https://qna.org.qa/en/RSS-Feeds",  # Qatar News Agency
            "https://alwatannews.net/rss",  # Al-Watan Qatar (Arabic)
            "https://aljazeera.com/xml/rss/all.xml",  # Al Jazeera
            "https://dohanews.co/feed/",
            "https://www.gulf-times.com/Rss/Index",  # Gulf Times RSS index

            # --- Indian Newspapers ---
            "https://indianexpress.com/feed/",
            "https://www.nationalheraldindia.com/stories.rss",
            "https://health.economictimes.indiatimes.com/rss/topstories",
            "https://www.thehindu.com/feeder/default.rss",
            "https://feeds.hindustantimes.com/",
            "https://www.tribuneindia.com/rss/news/nation.xml",

            # --- UK / International Newspapers ---
            "https://www.telegraph.co.uk/rss.xml",
            "https://www.mirror.co.uk/?service=rss",
            "https://hulldailymail.co.uk/news/?service=rss",
            "https://feeds.feedburner.com/daily-express-sport-news"
        ]

    def _clean_text(self, text: str) -> str:
        """Clean the text by removing extra whitespace and HTML tags"""
        if not text:
            return ""
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', text)
        # Remove extra whitespace
        text = text.replace('\n', ' ').replace('\r', ' ')
        text = ' '.join(text.split())
        return text

    def _is_relevant_article(self, title: str, description: str, query: str) -> bool:
        """
        Check if the article is relevant based on title and description
        """
        text = (title + " " + description).lower()
        
        # Check if any of the custom queries are present
        for keyword in self.custom_queries:
            if keyword.lower() in text:
                return True
                
        # Also check the original query if it's not in the custom queries
        if query.lower() not in [var.lower() for var in self.custom_queries]:
            if query.lower() in text:
                return True
            
        # If no custom queries, accept all articles from these specific sources
        if not self.custom_queries:
            return True
            
        return False

    def _clean_xml(self, xml_content: str) -> str:
        """Clean problematic XML content"""
        if not xml_content:
            return None
            
        try:
            # Detect encoding if not UTF-8
            detected = chardet.detect(xml_content.encode())
            if detected['encoding'] and detected['encoding'].lower() != 'utf-8':
                xml_content = xml_content.encode(detected['encoding']).decode('utf-8', errors='ignore')
            
            # Remove invalid XML characters
            xml_content = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', xml_content)
            
            # Fix common HTML entities
            xml_content = html.unescape(xml_content)
            
            # Fix unclosed CDATA sections
            xml_content = re.sub(r'<!\[CDATA\[([^\]]*)(?!\]\])>', r'<![CDATA[\1]]>', xml_content)
            
            # Fix malformed tags
            soup = BeautifulSoup(xml_content, 'xml')
            xml_content = str(soup)
            
            return xml_content
        except Exception as e:
            logger.warning(f"Error cleaning XML: {str(e)}")
            return None

    def _fetch_feed_with_requests(self, feed_url: str) -> str:
        """Fetch feed content using requests with better error handling and SSL verification"""
        try:
            # Try different variations of the URL if initial one fails
            urls_to_try = [
                feed_url,
                feed_url.rstrip('/') + '/feed',
                feed_url.rstrip('/') + '/rss',
                feed_url.replace('feed', 'rss')
            ]
            
            for url in urls_to_try:
                try:
                    # First try with SSL verification enabled
                    try:
                        response = requests.get(
                            url,
                            headers=self.headers,
                            timeout=self.feed_timeout,
                            verify=True  # Try with SSL verification first
                        )
                    except (requests.exceptions.SSLError, requests.exceptions.ConnectionError):
                        # If SSL verification fails, try without it
                        logger.debug(f"SSL verification failed for {url}, trying without verification")
                        response = requests.get(
                            url,
                            headers=self.headers,
                            timeout=self.feed_timeout,
                            verify=False  # Fallback to unverified
                        )
                    
                    if response.status_code == 200:
                        content_type = response.headers.get('content-type', '').lower()
                        if any(t in content_type for t in ['xml', 'rss', 'atom']):
                            return response.text
                        
                        # If content type is HTML, try to find RSS link
                        if 'html' in content_type:
                            soup = BeautifulSoup(response.text, 'html.parser')
                            rss_link = soup.find('link', type='application/rss+xml')
                            if rss_link and rss_link.get('href'):
                                return self._fetch_feed_with_requests(rss_link['href'])
                                
                except requests.RequestException:
                    continue
                    
            return None
        except Exception as e:
            logger.warning(f"Request failed for {feed_url}: {str(e)}")
            return None

    def _parse_feed_with_timeout(self, feed_url: str) -> Any:
        """Parse feed with timeout handling and multiple parsing attempts"""
        # Set socket timeout for the request
        original_timeout = socket.getdefaulttimeout()
        socket.setdefaulttimeout(self.feed_timeout)
        
        try:
            # First try: Direct feedparser approach with SSL context
            try:
                feed = feedparser.parse(feed_url, handlers=[], request_headers=self.headers)
            except (socket.timeout, ssl.SSLError, URLError, OSError) as e:
                logger.debug(f"Direct feedparser failed for {feed_url}: {str(e)}")
                feed = None
            
            # If failed or empty, try with requests
            if not feed or feed.get('bozo', 0) == 1 or not feed.get('entries', []):
                xml_content = self._fetch_feed_with_requests(feed_url)
                if xml_content:
                    # Clean the XML content
                    cleaned_content = self._clean_xml(xml_content)
                    if cleaned_content:
                        # Try parsing the cleaned content
                        try:
                            feed = feedparser.parse(cleaned_content)
                        except Exception as e:
                            logger.debug(f"Failed to parse cleaned XML for {feed_url}: {str(e)}")
                            feed = None
            
            return feed
        except Exception as e:
            logger.debug(f"Error in _parse_feed_with_timeout for {feed_url}: {str(e)}")
            return None
        finally:
            # Restore original timeout
            socket.setdefaulttimeout(original_timeout)

    def _should_retry_source(self, feed_url: str, error: Exception) -> bool:
        """Determine if we should retry a failed source"""
        # Initialize failure count if not exists
        if feed_url not in self.source_failures:
            self.source_failures[feed_url] = 0
            
        self.source_failures[feed_url] += 1
        
        # Don't retry if we've hit the maximum retries
        if self.source_failures[feed_url] > self.max_retries:
            return False
            
        # Don't retry for certain types of errors
        if isinstance(error, (HTTPError, URLError)):
            if isinstance(error, HTTPError) and error.code in [403, 404, 410]:  # Permanent errors
                return False
                
        return True

    def _parse_feed(self, feed_url: str, query: str) -> List[Dict[Any, Any]]:
        """Parse a single RSS feed and return relevant articles"""
        if feed_url in self.failed_sources:
            logger.debug(f"Skipping previously failed source: {feed_url}")
            return []
            
        try:
            # Try to parse the feed with timeout and better error handling
            feed = self._parse_feed_with_timeout(feed_url)
            
            # Additional validation for feed structure
            if not feed or not hasattr(feed, 'entries'):
                raise ValueError("Invalid feed structure")
            
            # Check if feed parsing was successful
            if hasattr(feed, 'status') and feed.status >= 400:
                raise HTTPError(feed_url, feed.status, f"HTTP Error: {feed.status}", {}, None)
                
            if feed.get('bozo', 0) == 1 and hasattr(feed, 'bozo_exception'):
                # Only raise if it's a serious error
                if not isinstance(feed.bozo_exception, (feedparser.CharacterEncodingOverride)):
                    raise feed.bozo_exception
            
            articles = []
            entries = feed.get('entries', [])
            
            if not entries and hasattr(feed, 'feed') and not feed.feed:
                raise ValueError("Empty or invalid feed")
            
            for entry in entries:
                title = entry.get('title', '')
                description = entry.get('description', '')
                
                if self._is_relevant_article(title, description, query):
                    # Get the full content if available
                    content = entry.get('content', [{}])[0].get('value', '') if 'content' in entry else ''
                    if not content:
                        content = entry.get('summary', description)
                    
                    # Determine source region based on URL
                    source_region = self._determine_source_region(feed_url)
                    
                    article = {
                        'title': self._clean_text(title),
                        'description': self._clean_text(description),
                        'content': self._clean_text(content),
                        'url': entry.get('link', ''),
                        'published_date': entry.get('published', datetime.now().strftime('%Y-%m-%d %H:%M:%S')),
                        'source': feed.feed.get('title', feed_url),
                        'source_url': feed_url,
                        'source_region': source_region,
                        'query': query,
                        'language': entry.get('language', 'en')
                    }
                    articles.append(article)
            
            # Reset failure count on success
            self.source_failures.pop(feed_url, None)
            return articles
            
        except Exception as e:
            error_type = type(e).__name__
            error_msg = str(e)
            logger.warning(f"Error parsing feed {feed_url}: {error_type} - {error_msg}")
            
            if not self._should_retry_source(feed_url, e):
                logger.error(f"Marking source as failed after multiple attempts: {feed_url}")
                self.failed_sources.add(feed_url)
                
            return []

    def _determine_source_region(self, feed_url: str) -> str:
        """Determine the source region based on the feed URL"""
        feed_url_lower = feed_url.lower()
        
        if any(domain in feed_url_lower for domain in ['nigeria', 'ng', 'tribuneonlineng', 'vanguardngr', 'thisdaylive', 'businessday.ng', 'thenationonlineng', 'herald.ng', 'dailypost.ng', 'guardian.ng', 'punchng', 'premiumtimesng', 'informationng', 'ripplesnigeria', 'dailynigerian', 'thenews-chronicle', 'pointblanknews', 'hallmarknews', 'pmnewsnigeria', 'saharareporters', 'lindaikejisblog', 'bellanaija']):
            return 'Nigeria'
        elif any(domain in feed_url_lower for domain in ['qatar', 'qa', 'qna.org.qa', 'alwatannews', 'aljazeera', 'dohanews', 'gulf-times']):
            return 'Qatar'
        elif any(domain in feed_url_lower for domain in ['india', 'indianexpress', 'nationalheraldindia', 'economictimes.indiatimes', 'thehindu', 'hindustantimes', 'tribuneindia']):
            return 'India'
        elif any(domain in feed_url_lower for domain in ['uk', 'telegraph.co.uk', 'mirror.co.uk', 'hulldailymail.co.uk', 'feedburner.com']):
            return 'UK'
        else:
            return 'International'

    def collect_from_feeds(self, query: str) -> List[Dict[Any, Any]]:
        """Collect news from all RSS feeds for a given query"""
        all_articles = []
        
        for feed_url in self.rss_feeds:
            if feed_url in self.failed_sources:
                continue
                
            try:
                logger.info(f"Collecting from {feed_url}")
                articles = self._parse_feed(feed_url, query)
                all_articles.extend(articles)
                
                # Be nice to the servers
                time.sleep(1)
            except Exception as e:
                logger.error(f"Error collecting from {feed_url}: {str(e)}")
                continue
        
        # Log summary of failed sources
        if self.failed_sources:
            logger.warning(f"Failed sources in this run: {len(self.failed_sources)}")
            for failed_url in self.failed_sources:
                logger.warning(f"Failed source: {failed_url}")
        
        return all_articles

    def collect_all(self, queries: List[str] = None, output_file: str = None, target_name: str = None) -> None:
        """
        Collect news for all queries and save to CSV
        
        Args:
            queries: Optional list of additional search queries
            output_file: Optional output file path. If not provided, will use default path.
            target_name: Name of the target individual for file naming
        """
        all_articles = []
        
        # Use custom queries as the base if available, otherwise use empty list
        search_queries = self.custom_queries.copy() if self.custom_queries else []
        
        # Add any additional queries if provided
        if queries:
            search_queries.extend(queries)
        
        # If no queries are available, use a default set of relevant keywords
        if not search_queries:
            # Default keywords for Nigerian, Qatar, and Indian news
            search_queries = [
                "nigeria", "qatar", "india", "africa", "middle east", "gulf", 
                "arab", "nigerian", "qatari", "indian", "politics", "business", 
                "economy", "oil", "gas", "energy", "trade", "diplomacy"
            ]
        
        # Remove duplicates while preserving order
        search_queries = list(dict.fromkeys(search_queries))
        
        for query in search_queries:
            logger.info(f"Collecting RSS feed news for query: {query}")
            articles = self.collect_from_feeds(query)
            all_articles.extend(articles)
        
        if all_articles:
            df = pd.DataFrame(all_articles)
            
            # Remove duplicates based on URL and title
            df = df.drop_duplicates(subset=['url', 'title'])
            
            # Sort by published date
            df['published_date'] = pd.to_datetime(df['published_date'])
            df = df.sort_values('published_date', ascending=False)
            
            # Save to CSV
            if output_file is None:
                # Use target name in filename if provided
                filename_prefix = f"nigerian_qatar_indian_rss_{target_name.replace(' ', '_').lower()}" if target_name else "nigerian_qatar_indian_rss"
                output_file = self.base_path / 'data' / 'raw' / f"{filename_prefix}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
            
            output_file = Path(output_file)
            output_file.parent.mkdir(parents=True, exist_ok=True)
            
            df.to_csv(output_file, index=False)
            logger.info(f"Saved {len(df)} articles to {output_file}")
            
            # Print summary by region
            if 'source_region' in df.columns:
                region_summary = df['source_region'].value_counts()
                logger.info("Articles collected by region:")
                for region, count in region_summary.items():
                    logger.info(f"  {region}: {count} articles")
        else:
            logger.warning("No articles found for any query")

def main(target_and_variations: List[str] = None, user_id: str = None):
    """
    Main function called by run_collectors. Accepts target/variations list.
    
    Args:
        target_and_variations: List containing target name as first element and query variations as remaining elements
        user_id: Optional user ID for database queries
    """
    if not target_and_variations or len(target_and_variations) == 0:
        print("[Nigerian Qatar Indian RSS Collector] Error: No target/query variations provided.")
        return
    
    target_name = target_and_variations[0]
    queries = target_and_variations[1:]
    print(f"[Nigerian Qatar Indian RSS Collector] Received Target: {target_name}, Queries: {queries}")
    
    # Construct output file name
    today = datetime.now().strftime("%Y%m%d")
    safe_target_name = target_name.replace(" ", "_").lower()
    output_path = Path(__file__).parent.parent.parent / "data" / "raw" / f"nigerian_qatar_indian_rss_{safe_target_name}_{today}.csv"
    
    # Initialize collector with the provided queries
    collector = NigerianQatarIndianRSSCollector(custom_queries=queries)
    
    # Collect data using the provided queries
    collector.collect_all(queries=queries, output_file=output_path, target_name=target_name)

if __name__ == "__main__":
    print("Running Nigerian Qatar Indian RSS collector directly (without args)... Use run_collectors.py for proper execution.")
    main([]) # Pass empty list for direct run scenario
