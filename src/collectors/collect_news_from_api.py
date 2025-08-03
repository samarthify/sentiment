import requests
import pandas as pd
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
from pathlib import Path
import logging
from typing import List, Dict, Any
# from sqlalchemy.orm import Session
from src.api.database import get_db  # Make sure you have this utility for getting DB session
from src.api.models import User  # Assuming User is your model for the users table
# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NewsAPICollector:
    def __init__(self):
        load_dotenv()
        self.base_path = Path(__file__).parent.parent.parent
        
        # API Keys
        self.newsdata_io_key = os.getenv("NEWSDATA_IO_API_KEY")
        self.webz_io_key = os.getenv("WEBZ_IO_API_KEY")
        self.mediastack_key = os.getenv("MEDIASTACK_API_KEY")
        self.gnews_key = os.getenv("GNEWS_API_KEY")
        self.worldnews_key = os.getenv("WORLDNEWS_API_KEY")
        self.apitube_key = os.getenv("APITUBE_API_KEY")
        self.newsapi_key = os.getenv("NEWS_API_KEY")  # Add NewsAPI key
        self.supabase_url= os.getenv("REACT_APP_SUPABASE_URL")
        self.supabase_key = os.getenv("REACT_APP_SUPABASE_ANON_KEY")
        
        # Validate API keys
        self._validate_api_keys()

    def _validate_api_keys(self):
        """Validate that at least some API keys are available"""
        available_apis = []
        if self.newsdata_io_key:
            available_apis.append("NewsData.io")
        if self.webz_io_key:
            available_apis.append("Webz.io")
        if self.mediastack_key:
            available_apis.append("Mediastack")
        if self.gnews_key:
            available_apis.append("GNews")
        if self.worldnews_key:
            available_apis.append("WorldNewsAPI")
        if self.apitube_key:
            available_apis.append("APITube")
        if self.newsapi_key:
            available_apis.append("NewsAPI")
            
        if not available_apis:
            raise ValueError(
                "No API keys found. Please set at least one of the following in .env:\n"
                "NEWSDATA_IO_API_KEY\n"
                "WEBZ_IO_API_KEY\n"
                "MEDIASTACK_API_KEY\n"
                "GNEWS_API_KEY\n"
                "WORLDNEWS_API_KEY\n"
                "APITUBE_API_KEY\n"
                "NEWS_API_KEY"
            )
        logger.info(f"Available APIs: {', '.join(available_apis)}")

    def collect_newsdata_io(self, query: str) -> List[Dict[Any, Any]]:
        """Collect news from NewsData.io - Now collecting from multiple countries"""
        if not self.newsdata_io_key:
            # logger.warning("NewsData.io API key not found")
            return []
            
        articles = []
        countries = ['qa', 'us', 'gb', 'ae', 'ng', 'in']  # NewsData.io uses lowercase country codes, added Nigeria and India
        
        try:
            url = "https://newsdata.io/api/1/news"
            
            for country_code in countries:
                params = {
                    "apikey": self.newsdata_io_key,
                    "q": f'"{query}"',  # Exact phrase matching
                    "country": country_code,
                    "language": "en",
                    "category": "politics,world"  # Focus on political and world news
                }
                
                response = requests.get(url, params=params)
                if response.status_code != 200:
                    # logger.warning(f"NewsData.io error response for {country_code}: {response.status_code} - {response.text}") # Changed to warning
                    continue
                    
                data = response.json()
                
                if data.get("status") == "success":
                    results = data.get("results", [])
                    logger.info(f"NewsData.io returned {len(results)} articles for {country_code} - query: {query}")
                    for article in results:
                        # Only include articles that explicitly mention the Emir
                        content = f"{article.get('title', '')} {article.get('description', '')}".lower()
                        # if any(term.lower() in content for term in ["emir", "amir", "sheikh tamim", "al thani"]):
                        if query.lower() in content:
                            print(f"✅ Matched article: {article.get('title')}") 
                            # Map country codes to names
                            country_name = {
                                'qa': 'Qatar',
                                'us': 'US',
                                'gb': 'UK',
                                'ae': 'UAE',
                                'ng': 'Nigeria',
                                'in': 'India'
                            }.get(country_code, 'Unknown')
                            
                            articles.append({
                                "source": "News",
                                "platform": article.get("source_id", "NewsData.io"),
                                "type": "post",
                                "post_id": article.get("article_id"),
                                "date": article.get("pubDate"),
                                "text": f"{article.get('title', '')} {article.get('description', '')}",
                                "url": article.get("link"),
                                "country": country_name
                            })
                else:
                    # logger.warning(f"NewsData.io error in response for {country_code}: {data.get('message', 'Unknown error')}") # Changed to warning
                    pass # Added pass to avoid indentation error
            
            # Log breakdown by country
            country_breakdown = {}
            for article in articles:
                country = article['country']
                country_breakdown[country] = country_breakdown.get(country, 0) + 1
            logger.info(f"NewsData.io: {len(articles)} total articles matched Emir criteria")
            for country, count in country_breakdown.items():
                logger.info(f"  - {country}: {count} articles")
                
        except Exception as e:
            # logger.warning(f"Error collecting from NewsData.io: {e}") # Changed to warning
            pass # Added pass to avoid indentation error
        
        return articles

    def collect_webz_io(self, query: str) -> List[Dict[Any, Any]]:
        """Collect news from Webz.io News API Lite - Limited to 1,000 monthly API calls with 10 results per call"""
        if not self.webz_io_key:
            # logger.warning("Webz.io API key not found")
            return []
            
        articles = []
        try:
            # Base URL for News API Lite
            url = "https://api.webz.io/newsApiLite"
            
            # Calculate timestamp for 30 days ago (maximum allowed historical data)
            thirty_days_ago = int((datetime.now() - timedelta(days=30)).timestamp())
            
            # Define countries to search
            countries = ['QA', 'US', 'GB', 'AE', 'NG', 'IN']  # Added Nigeria and India, GB is used for UK in ISO format
            
            all_results = []
            
            # Search for each country separately to stay within query limit
            for country_code in countries:
                # Construct query for each country
                query_params = f'"{query}" site_type:news language:english country:{country_code}'
                
                # Trim query if it exceeds 100 characters
                if len(query_params) > 100:
                    # logger.warning(f"Query exceeds 100 characters ({len(query_params)}), truncating...")
                    query_params = f'"""{query}""" country:{country_code}'
                
                logger.info(f"Using query for {country_code} ({len(query_params)} chars): {query_params}")
                
                params = {
                    "token": self.webz_io_key,
                    "q": query_params,
                    "ts": thirty_days_ago
                }
                
                next_url = None
                
                # Handle pagination (limited to 1,000 monthly API calls)
                for page in range(3):  # Limit to 3 pages per country to be conservative with API calls
                    try:
                        # Use next_url if available, otherwise use base URL with params
                        if next_url:
                            response = requests.get(next_url)
                        else:
                            response = requests.get(url, params=params)
                        
                        if response.status_code != 200:
                            # logger.warning(f"Webz.io error response for {country_code}: {response.status_code} - {response.text}") # Changed to warning
                            break
                        
                        data = response.json()
                        posts = data.get("posts", [])
                        if not posts:
                            break
                            
                        all_results.extend(posts)
                        logger.info(f"{country_code} - Page {page + 1}: Fetched {len(posts)} articles")
                        
                        # Get next page URL from response
                        next_url = data.get("next")
                        if not next_url:
                            break
                        
                    except Exception as e:
                        # logger.warning(f"Error fetching page {page + 1} for {country_code}: {e}") # Changed to warning
                        break
            
            logger.info(f"Webz.io returned {len(all_results)} total articles for query: {query}")
            
            # Country code to full name mapping
            country_names = {
                'QA': 'Qatar',
                'US': 'US',
                'GB': 'UK',
                'AE': 'UAE',
                'NG': 'Nigeria',
                'IN': 'India'
            }
            
            for post in all_results:
                # Only include articles that explicitly mention the Emir
                # Note: API Lite only provides snippets, not full text
                title = post.get('title', '')
                snippet = post.get('snippet', '')  # Using snippet instead of full text
                content = f"{title} {snippet}".lower()
                
                if any(term.lower() in content for term in ["emir", "amir", "sheikh tamim", "al thani"]):
                    # Determine country from the post data or default to source country
                    country_code = post.get('country', '').upper()
                    country = country_names.get(country_code, 'Unknown')
                    
                    articles.append({
                        "source": "News",
                        "platform": post.get("source", {}).get("name", "Webz.io"),
                        "type": "post",
                        "post_id": post.get("uuid", ""),
                        "date": post.get("published"),
                        "text": f"{title} {snippet}",  # Using available snippet
                        "url": post.get("url", ""),
                        "country": country,
                        "sentiment": post.get("sentiment", {}).get("title", "neutral")  # Include sentiment if available
                    })
            
            logger.info(f"Webz.io: {len(articles)} articles matched Emir criteria")
            # Log breakdown by country
            country_breakdown = {}
            for article in articles:
                country = article['country']
                country_breakdown[country] = country_breakdown.get(country, 0) + 1
            for country, count in country_breakdown.items():
                logger.info(f"  - {country}: {count} articles")
                
        except requests.exceptions.RequestException as e:
            # logger.warning(f"Network error collecting from Webz.io: {e}") # Changed to warning
            pass # Added pass to avoid indentation error
        except ValueError as e:
            # logger.warning(f"JSON parsing error from Webz.io: {e}") # Changed to warning
            pass # Added pass to avoid indentation error
        except Exception as e:
            # logger.warning(f"Unexpected error collecting from Webz.io: {e}") # Changed to warning
            # logger.warning(f"Full error details: {str(e)}") # Changed to warning
            pass # Added pass to avoid indentation error
        
        return articles

    def collect_mediastack(self, query: str) -> List[Dict[Any, Any]]:
        """Collect news from Mediastack - Now collecting from multiple countries"""
        if not self.mediastack_key:
            # logger.warning("Mediastack API key not found")
            return []
            
        articles = []
        countries = ['qa', 'us', 'gb', 'ae', 'ng', 'in']  # Mediastack uses lowercase country codes, added Nigeria and India
        
        try:
            url = "http://api.mediastack.com/v1/news"
            
            for country_code in countries:
                params = {
                    "access_key": self.mediastack_key,
                    "keywords": f'"{query}"',  # Exact phrase matching
                    "countries": country_code,
                    "languages": "en",
                    "limit": 100,
                    "sort": "published_desc"
                }
                
                response = requests.get(url, params=params)
                if response.status_code != 200:
                    # logger.warning(f"Mediastack error response for {country_code}: {response.status_code} - {response.text}") # Changed to warning
                    continue
                    
                data = response.json()
                
                if "error" in data:
                    error = data["error"]
                    if error.get("code") == "usage_limit_reached":
                        # logger.warning("Mediastack monthly usage limit reached") # Changed to warning
                        break
                    elif error.get("code") == "rate_limit_reached":
                        # logger.warning("Mediastack rate limit reached") # Changed to warning
                        continue
                    else:
                        # logger.warning(f"Mediastack API error for {country_code}: {error.get('code')} - {error.get('message')}") # Changed to warning
                        continue
                
                results = data.get("data", [])
                logger.info(f"Mediastack returned {len(results)} articles for {country_code} - query: {query}")
                
                for article in results:
                    # Only include articles that explicitly mention the Emir
                    content = f"{article.get('title', '')} {article.get('description', '')}".lower()
                    if any(term.lower() in content for term in ["emir", "amir", "sheikh tamim", "al thani"]):
                        # Map country codes to names
                        country_name = {
                            'qa': 'Qatar',
                            'us': 'US',
                            'gb': 'UK',
                            'ae': 'UAE',
                            'ng': 'Nigeria',
                            'in': 'India'
                        }.get(country_code, 'Unknown')
                        
                        articles.append({
                            "source": "News",
                            "platform": article.get("source", "Mediastack"),
                            "type": "post",
                            "post_id": article.get("url", "").split("/")[-1],
                            "date": article.get("published_at"),
                            "text": f"{article.get('title', '')} {article.get('description', '')}",
                            "url": article.get("url"),
                            "country": country_name
                        })
            
            # Log breakdown by country
            country_breakdown = {}
            for article in articles:
                country = article['country']
                country_breakdown[country] = country_breakdown.get(country, 0) + 1
            logger.info(f"Mediastack: {len(articles)} total articles matched Emir criteria")
            for country, count in country_breakdown.items():
                logger.info(f"  - {country}: {count} articles")
                
        except Exception as e:
            # logger.warning(f"Error collecting from Mediastack: {e}") # Changed to warning
            pass # Added pass to avoid indentation error
        
        return articles

    def collect_gnews(self, query: str) -> List[Dict[Any, Any]]:
        """Collect news from GNews - Now collecting from multiple countries"""
        if not self.gnews_key:
            # logger.warning("GNews API key not found")
            return []
            
        articles = []
        countries = ['QA', 'US', 'GB', 'AE', 'NG', 'IN']  # GNews uses uppercase country codes, added Nigeria and India
        
        try:
            url = "https://gnews.io/api/v4/search"
            
            for country_code in countries:
                params = {
                    "q": f'"{query}"',  # Exact phrase matching
                    "token": self.gnews_key,
                    "lang": "en",
                    "country": country_code,
                    "max": 100,
                    "sortby": "publishedAt",
                    "in": "title,description"  # Search in both title and description
                }
                
                response = requests.get(url, params=params)
                if response.status_code != 200:
                    # logger.warning(f"GNews error response for {country_code}: {response.status_code} - {response.text}") # Changed to warning
                    continue
                    
                data = response.json()
                results = data.get("articles", [])
                logger.info(f"GNews returned {len(results)} articles for {country_code} - query: {query}")
                
                for article in results:
                    # Only include articles that explicitly mention the Emir
                    content = f"{article.get('title', '')} {article.get('description', '')}".lower()
                    if any(term.lower() in content for term in ["emir", "amir", "sheikh tamim", "al thani"]):
                        # Map country codes to names
                        country_name = {
                            'QA': 'Qatar',
                            'US': 'US',
                            'GB': 'UK',
                            'AE': 'UAE',
                            'NG': 'Nigeria',
                            'IN': 'India'
                        }.get(country_code, 'Unknown')
                        
                        articles.append({
                            "source": "News",
                            "platform": article.get("source", {}).get("name", "GNews"),
                            "type": "post",
                            "post_id": article.get("url", "").split("/")[-1],
                            "date": article.get("publishedAt"),
                            "text": f"{article.get('title', '')} {article.get('description', '')}",
                            "url": article.get("url"),
                            "country": country_name
                        })
            
            # Log breakdown by country
            country_breakdown = {}
            for article in articles:
                country = article['country']
                country_breakdown[country] = country_breakdown.get(country, 0) + 1
            logger.info(f"GNews: {len(articles)} total articles matched Emir criteria")
            for country, count in country_breakdown.items():
                logger.info(f"  - {country}: {count} articles")
                
        except Exception as e:
            # logger.warning(f"Error collecting from GNews: {e}") # Changed to warning
            pass # Added pass to avoid indentation error
        
        return articles

    def collect_worldnews(self, query: str) -> List[Dict[Any, Any]]:
        """Collect news from WorldNewsAPI - Now collecting from multiple countries"""
        if not self.worldnews_key:
            # logger.warning("WorldNewsAPI key not found")
            return []
            
        articles = []
        countries = ['QA', 'US', 'GB', 'AE', 'NG', 'IN']  # WorldNewsAPI uses uppercase country codes, added Nigeria and India
        
        try:
            url = "https://api.worldnewsapi.com/search-news"
            
            for country_code in countries:
                params = {
                    "api-key": self.worldnews_key,
                    "text": query,
                    "source-country": country_code.lower(),  # WorldNewsAPI uses lowercase for this parameter
                    "language": "en",
                    "number": 100,  # Maximum number of results
                    "sort": "publish-time",
                    "sort-direction": "desc",
                    "earliest-publish-date": (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
                }
                
                response = requests.get(url, params=params)
                if response.status_code != 200:
                    # logger.warning(f"WorldNewsAPI error response for {country_code}: {response.status_code} - {response.text}") # Changed to warning
                    continue
                    
                data = response.json()
                news_items = data.get("news", [])
                logger.info(f"WorldNewsAPI returned {len(news_items)} articles for {country_code} - query: {query}")
                
                for article in news_items:
                    # Only include articles that explicitly mention the Emir
                    content = f"{article.get('title', '')} {article.get('text', '')}".lower()
                    if any(term.lower() in content for term in ["emir", "amir", "sheikh tamim", "al thani"]):
                        # Map country codes to names
                        country_name = {
                            'QA': 'Qatar',
                            'US': 'US',
                            'GB': 'UK',
                            'AE': 'UAE',
                            'NG': 'Nigeria',
                            'IN': 'India'
                        }.get(country_code, 'Unknown')
                        
                        articles.append({
                            "source": "News",
                            "platform": article.get("source_country", "WorldNewsAPI"),
                            "type": "post",
                            "post_id": article.get("id"),
                            "date": article.get("publish_date"),
                            "text": f"{article.get('title', '')} {article.get('text', '')}",
                            "url": article.get("url"),
                            "country": country_name
                        })
            
            # Log breakdown by country
            country_breakdown = {}
            for article in articles:
                country = article['country']
                country_breakdown[country] = country_breakdown.get(country, 0) + 1
            logger.info(f"WorldNewsAPI: {len(articles)} total articles matched Emir criteria")
            for country, count in country_breakdown.items():
                logger.info(f"  - {country}: {count} articles")
                
        except Exception as e:
            # logger.warning(f"Error collecting from WorldNewsAPI: {e}") # Changed to warning
            pass # Added pass to avoid indentation error
        
        return articles

    def collect_apitube(self, query: str) -> List[Dict[Any, Any]]:
        """Collect news from APITube - Now collecting from multiple countries"""
        if not self.apitube_key:
            # logger.warning("APITube key not found")
            return []
            
        articles = []
        countries = ['qa', 'us', 'gb', 'ae', 'ng', 'in']  # APITube uses lowercase country codes, added Nigeria and India
        
        try:
            url = "https://api.apitube.io/v1/news/articles"
            
            for country_code in countries:
                params = {
                    "api_key": self.apitube_key,
                    "search": query,
                    "country": country_code,
                    "language": "en",
                    "limit": 100,
                    "sort_by": "date",
                    "sort_direction": "desc"
                }
                
                response = requests.get(url, params=params)
                if response.status_code != 200:
                    # logger.warning(f"APITube error response for {country_code}: {response.status_code} - {response.text}") # Changed to warning
                    continue
                    
                data = response.json()
                news_items = data.get("articles", [])
                logger.info(f"APITube returned {len(news_items)} articles for {country_code} - query: {query}")
                
                for article in news_items:
                    # Only include articles that explicitly mention the Emir
                    content = f"{article.get('title', '')} {article.get('description', '')}".lower()
                    if any(term.lower() in content for term in ["emir", "amir", "sheikh tamim", "al thani"]):
                        # Map country codes to names
                        country_name = {
                            'qa': 'Qatar',
                            'us': 'US',
                            'gb': 'UK',
                            'ae': 'UAE',
                            'ng': 'Nigeria',
                            'in': 'India'
                        }.get(country_code, 'Unknown')
                        
                        articles.append({
                            "source": "News",
                            "platform": article.get("source", {}).get("name", "APITube"),
                            "type": "post",
                            "post_id": article.get("id"),
                            "date": article.get("published_at"),
                            "text": f"{article.get('title', '')} {article.get('description', '')}",
                            "url": article.get("url"),
                            "country": country_name
                        })
            
            # Log breakdown by country
            country_breakdown = {}
            for article in articles:
                country = article['country']
                country_breakdown[country] = country_breakdown.get(country, 0) + 1
            logger.info(f"APITube: {len(articles)} total articles matched Emir criteria")
            for country, count in country_breakdown.items():
                logger.info(f"  - {country}: {count} articles")
                
        except Exception as e:
            # logger.warning(f"Error collecting from APITube: {e}") # Changed to warning
            pass # Added pass to avoid indentation error
        
        return articles

    def collect_newsapi(self, query: str) -> List[Dict[Any, Any]]:
        """Collect news from NewsAPI - Now collecting from multiple countries"""
        if not self.newsapi_key:
            # logger.warning("NewsAPI key not found")
            return []
            
        articles = []
        try:
            from newsapi import NewsApiClient
            newsapi = NewsApiClient(api_key=self.newsapi_key)
            
            # Define news sources by country
            uk_sources = [
                "bbc.co.uk", "theguardian.com", "telegraph.co.uk", "independent.co.uk", "dailymail.co.uk",
                "thetimes.co.uk", "ft.com", "standard.co.uk", "mirror.co.uk", "express.co.uk",
                "sky.com", "itv.com", "channel4.com",
                "manchestereveningnews.co.uk", "liverpoolecho.co.uk", "birminghammail.co.uk",
                "walesonline.co.uk", "scotsman.com", "heraldscotland.com", "belfasttelegraph.co.uk",
                "economist.com", "newstatesman.com", "spectator.co.uk"
            ]
            us_sources = [
                "nytimes.com", "washingtonpost.com", "cnn.com", "usatoday.com", "foxnews.com",
                "wsj.com", "latimes.com", "nypost.com", "chicagotribune.com", "bostonglobe.com",
                "time.com", "newsweek.com", "bloomberg.com", "forbes.com", "reuters.com",
                "abcnews.go.com", "nbcnews.com", "cbsnews.com", "msnbc.com", "pbs.org",
                "sfgate.com", "miamiherald.com", "denverpost.com", "dallasnews.com", "seattletimes.com",
                "philly.com", "ajc.com", "houstonchronicle.com", "startribune.com", "tampabay.com",
                "vox.com", "slate.com", "theatlantic.com", "politico.com", "buzzfeednews.com",
                "huffpost.com", "axios.com", "thedailybeast.com"
            ]
            uae_sources = [
                "gulfnews.com", "khaleejtimes.com", "thenationalnews.com", "arabianbusiness.com",
                "emirateswoman.com", "dubaiweek.ae", "whatson.ae", "timeoutdubai.com",
                "emiratesnews247.com", "dubaieye.ae", "zawya.com", "thenational.ae"
            ]
            qatar_sources = [
                "gulf-times.com", "thepeninsulaqatar.com", "qatarliving.com", "iloveqatar.net",
                "dohanews.co", "qatarobserver.com", "aljazeera.com", "qatar-tribune.com",
                "marhaba.qa", "qatarday.com", "lusailnews.net", "alarab.qa",
                "al-sharq.com", "raya.com", "al-watan.com", "qna.org.qa",
                "thepeninsulaqatar.qa", "qatargazette.com", "qatarchronicle.com"
            ]
            
            # Add Nigeria news sources
            nigeria_sources = [
                "punchng.com", "vanguardngr.com", "thenationonlineng.net", "dailytrust.com",
                "thisdaylive.com", "guardian.ng", "channelstv.com", "tribuneonlineng.com",
                "leadership.ng", "premiumtimesng.com", "sunnewsonline.com", "businessday.ng",
                "dailypost.ng", "legit.ng", "saharareporters.com", "nairametrics.com",
                "blueprint.ng", "thecable.ng", "independent.ng", "nannews.ng"
            ]
            
            # Add India news sources
            india_sources = [
                "timesofindia.indiatimes.com", "indianexpress.com", "hindustantimes.com", "ndtv.com",
                "thehindu.com", "livemint.com", "news18.com", "economictimes.indiatimes.com",
                "financialexpress.com", "outlookindia.com", "business-standard.com", "dnaindia.com",
                "telegraphindia.com", "deccanherald.com", "republicworld.com", "firstpost.com",
                "theprint.in", "scroll.in", "indiatoday.in", "thequint.com", "zeenews.india.com"
            ]
            
            # TV-specific domains for source type identification
            tv_domains = [
                "bbc.co.uk", "sky.com", "itv.com", "channel4.com",  # UK TV
                "cnn.com", "abcnews.go.com", "nbcnews.com", "cbsnews.com", "msnbc.com", "foxnews.com", "pbs.org",  # US TV
                "ndtv.com", "news18.com", "republicworld.com", "zeenews.india.com",  # India TV
                "channelstv.com"  # Nigeria TV
            ]
            
            # Calculate date range (28 days ago to now)
            today = datetime.now()
            days_ago_28 = today - timedelta(days=28)
            from_date = days_ago_28.strftime("%Y-%m-%d")
            
            # Combine all sources
            all_sources = ",".join(uk_sources + us_sources + uae_sources + qatar_sources + nigeria_sources + india_sources)
            
            logger.info(f"\nFetching articles for query: '{query}'")
            logger.info(f"Date range: from {from_date} to {today.strftime('%Y-%m-%d')}")
            
            response = newsapi.get_everything(
                q=query,
                language="en",
                sort_by="publishedAt",
                page_size=100,
                domains=all_sources,
                from_param=from_date
            )
            
            logger.info(f"API response status: {response['status']}")
            logger.info(f"Total results available: {response.get('totalResults', 0)}")
            results = response.get("articles", [])
            logger.info(f"Articles returned: {len(results)}")
            
            if results:
                logger.info("Sample article titles:", [a["title"] for a in results[:3]])
            
            for article in results:
                # Only include articles that explicitly mention the Emir
                content = f"{article.get('title', '')} {article.get('description', '')}".lower()
                if any(term.lower() in content for term in ["emir", "amir", "sheikh tamim", "al thani"]):
                    domain = article["url"].split("/")[2].lower()
                    
                    # Determine country based on domain
                    country = "UK" if any(uk in domain for uk in uk_sources) else \
                             "US" if any(us in domain for us in us_sources) else \
                             "UAE" if any(uae in domain for uae in uae_sources) else \
                             "Qatar" if any(qatar in domain for qatar in qatar_sources) else \
                             "Nigeria" if any(ng in domain for ng in nigeria_sources) else \
                             "India" if any(ind in domain for ind in india_sources) else "Unknown"
                    
                    # Determine source type (Television or News)
                    source_type = "Television" if domain in tv_domains else "News"
                    
                    articles.append({
                        "source": source_type,
                        "platform": article["source"]["name"],
                        "type": "post",
                        "post_id": article["url"].split("/")[-1],
                        "date": article["publishedAt"],
                        "text": (article["title"] or "") + " " + (article["description"] or ""),
                        "url": article["url"],
                        "country": country
                    })
            
            # Log breakdown by country
            country_breakdown = {}
            for article in articles:
                country = article['country']
                country_breakdown[country] = country_breakdown.get(country, 0) + 1
            logger.info(f"NewsAPI: {len(articles)} total articles matched Emir criteria")
            for country, count in country_breakdown.items():
                logger.info(f"  - {country}: {count} articles")
                
        except Exception as e:
            # logger.warning(f"Error collecting from NewsAPI: {e}") # Changed to warning
            pass # Added pass to avoid indentation error
        
        return articles

    def collect_all(self, queries: List[str], output_file: str = None) -> None:
        """Collect news from all available sources"""
        if output_file is None:
            today = datetime.now().strftime("%Y%m%d")
            output_file = str(self.base_path / "data" / "raw" / f"news_data_{today}.csv")
        
        os.makedirs(os.path.dirname(output_file), exist_ok=True)
        
        all_articles = []
        source_counts = {
            "NewsData.io": 0, 
            "Webz.io": 0, 
            "Mediastack": 0, 
            "GNews": 0,
            "WorldNewsAPI": 0,
            "APITube": 0,
            "NewsAPI": 0
        }
        
        for query in queries:
            logger.info(f"\nCollecting news for query: {query}")
            
            # Collect from all sources
            newsdata_articles = self.collect_newsdata_io(query)
            source_counts["NewsData.io"] += len(newsdata_articles)
            all_articles.extend(newsdata_articles)
            
            webz_articles = self.collect_webz_io(query)
            source_counts["Webz.io"] += len(webz_articles)
            all_articles.extend(webz_articles)
            
            mediastack_articles = self.collect_mediastack(query)
            source_counts["Mediastack"] += len(mediastack_articles)
            all_articles.extend(mediastack_articles)
            
            gnews_articles = self.collect_gnews(query)
            source_counts["GNews"] += len(gnews_articles)
            all_articles.extend(gnews_articles)
            
            worldnews_articles = self.collect_worldnews(query)
            source_counts["WorldNewsAPI"] += len(worldnews_articles)
            all_articles.extend(worldnews_articles)
            
            apitube_articles = self.collect_apitube(query)
            source_counts["APITube"] += len(apitube_articles)
            all_articles.extend(apitube_articles)
            
            newsapi_articles = self.collect_newsapi(query)
            source_counts["NewsAPI"] += len(newsapi_articles)
            all_articles.extend(newsapi_articles)
        
        if all_articles:
            df = pd.DataFrame(all_articles)
            
            # Remove duplicates based on URL and text
            initial_count = len(df)
            df = df.drop_duplicates(subset=['url'])
            url_dedup_count = len(df)
            df = df.drop_duplicates(subset=['text'])
            final_count = len(df)
            
            # Save to CSV
            if os.path.exists(output_file):
                existing_df = pd.read_csv(output_file)
                df = pd.concat([existing_df, df], ignore_index=True)
                df = df.drop_duplicates(subset=['url'])
                df = df.drop_duplicates(subset=['text'])
            
            df.to_csv(output_file, index=False)
            
            logger.info("\nCollection Summary:")
            logger.info(f"Total articles collected by source:")
            for source, count in source_counts.items():
                logger.info(f"  - {source}: {count} articles")
            logger.info(f"Initial article count: {initial_count}")
            logger.info(f"After URL deduplication: {url_dedup_count}")
            logger.info(f"After text deduplication: {final_count}")
            logger.info(f"Saved {final_count} unique articles to {output_file}")
        else:
            # logger.warning("No articles collected from any source")
            pass # Added pass to avoid indentation error

# def main(target_and_variations: List[str]):
#     """Main function called by run_collectors. Accepts target/variations list."""
#     if not target_and_variations:
#         print("[News API] Error: No target/query variations provided.")
#         return
        
#     target_name = target_and_variations[0]
#     queries = target_and_variations[1:]
#     print(f"[News API] Received Target: {target_name}, Queries: {queries}")

#     # Instantiate the collector
#     collector = NewsAPICollector()
    
#     # Construct the output file path
#     today = datetime.now().strftime("%Y%m%d")
#     safe_target_name = target_name.replace(" ", "_").lower()
#     output_dir = Path(__file__).parent.parent.parent / "data" / "raw"
#     output_dir.mkdir(parents=True, exist_ok=True)
#     output_file = output_dir / f"news_api_{safe_target_name}_{today}.csv"

#     # Call the collector's collect_all method
#     collector.collect_all(queries=queries, output_file=str(output_file))

def main(target_and_variations: List[str]):
    """Main function called by run_collectors. Accepts target/variations list."""
    if not target_and_variations:
        print("[News API] Error: No target/query variations provided.")
        return
        
    target_name = target_and_variations[0]
    queries = target_and_variations[1:]
    print(f"[News API] Received Target: {target_name}, Queries: {queries}")
    db = next(get_db())
    user = db.query(User).first()  # Replace with logic to get the current user
    if not user:
        print("[News API] Error: No user found in the database.")
        return

    user_id = user.id  # Get the user_id of the first user (or implement logic for current user)
    
    print(f"[News API] Using user_id: {user_id}")
    # Instantiate the collector
    collector = NewsAPICollector()
    
    # Construct the output file path
    today = datetime.now().strftime("%Y%m%d")
    safe_target_name = target_name.replace(" ", "_").lower()
    output_dir = Path(__file__).parent.parent.parent / "data" / "raw"
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / f"news_api_{safe_target_name}_{today}.csv"

    # Call the collector's collect_all method
    collector.collect_all(queries=queries, output_file=str(output_file))

    # ✅ Load collected articles from CSV
    df = pd.read_csv(output_file)

    # ✅ Convert to dict list
    articles = df.to_dict(orient="records")

    # ✅ Insert into DB using hardcoded user_id
    insert_articles_into_db(articles, user_id=user_id)

from uuid import UUID
from src.api.database import SessionLocal
from src.api.models import SentimentData

def insert_articles_into_db(articles, user_id):
    # db = SessionLocal()
    db = next(get_db())
    for a in articles:
        db_entry = SentimentData(
            run_timestamp=datetime.utcnow(),
            user_id=UUID(user_id),
            platform=a.get("platform") or "News",
            text=a.get("text") or "",
            sentiment_label="Positive",  # 🔁 TEMP hardcoded: Positive/Negative (not Neutral)
            country=a.get("country") or "IN",  # optional but useful
            published_date=a.get("published_date") or datetime.utcnow().isoformat()
        )
        db.add(db_entry)
    db.commit()
    db.close()
    print(f"✅ Inserted {len(articles)} articles into the database.")

# Keep __main__ block for testing
if __name__ == "__main__":
    print("Running News API collector directly (without args)... Use run_collectors.py for proper execution.")
    # main([]) # Pass empty list
    # main(["Modi", "India", "BJP"])
    main([
    "Modi", "India", "BJP", "Election", "Politics",
    ])

    #   ["Artificial Intelligence", "Tech Trends", "Data Science", "AI news"])

    
