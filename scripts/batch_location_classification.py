#!/usr/bin/env python3
"""
Batch Location Classification Script - More Efficient Version

This script processes location classification in batches to avoid memory issues
and provides better progress tracking.
"""

import pandas as pd
import numpy as np
import re
import logging
from pathlib import Path
from typing import Dict, List, Tuple, Optional, Any
import json
from datetime import datetime
import sys
import os

# Add src to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from api.database import SessionLocal
from api.models import SentimentData
from sqlalchemy import func

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('BatchLocationClassifier')

class BatchLocationClassifier:
    """
    Efficient batch location classifier
    """
    
    def __init__(self):
        # Simplified country definitions for faster processing
        self.country_patterns = {
            'Nigeria': {
                'keywords': ['nigeria', 'nigerian', 'naija', 'lagos', 'abuja', 'kano', 'ibadan', 
                           'port harcourt', 'tinubu', 'buhari', 'apc', 'pdp', 'nigerian government'],
                'sources': ['punch', 'guardian nigeria', 'vanguard', 'thisday', 'daily trust',
                          'leadership', 'tribune', 'premium times', 'sahara reporters'],
                'domains': ['punchng.com', 'guardian.ng', 'vanguardngr.com', 'thisdaylive.com']
            },
            'US': {
                'keywords': ['america', 'american', 'washington', 'new york', 'california', 'texas', 'usa', 
                           'united states', 'white house', 'congress', 'nfl', 'nba'],
                'sources': ['cnn', 'fox news', 'nbc', 'abc', 'cbs', 'usa today', 'new york times',
                          'washington post', 'wall street journal'],
                'domains': ['cnn.com', 'foxnews.com', 'nbcnews.com', 'usatoday.com', 'nytimes.com']
            },
            'UK': {
                'keywords': ['britain', 'british', 'london', 'manchester', 'liverpool', 'uk', 'united kingdom',
                           'england', 'scotland', 'wales', 'bbc', 'nhs', 'parliament'],
                'sources': ['bbc', 'guardian', 'telegraph', 'independent', 'daily mail', 'mirror'],
                'domains': ['bbc.co.uk', 'theguardian.com', 'telegraph.co.uk', 'dailymail.co.uk']
            },
            'Qatar': {
                'keywords': ['qatar', 'doha', 'qatari', 'al thani', 'emir', 'lusail', 'al wakrah',
                           'gulf', 'middle east', 'arabian'],
                'sources': ['al jazeera', 'gulf times', 'peninsula', 'qatar tribune'],
                'domains': ['aljazeera.com', 'gulf-times.com', 'thepeninsulaqatar.com']
            },
            'India': {
                'keywords': ['india', 'indian', 'bharat', 'hindustan', 'mumbai', 'delhi', 'bangalore',
                           'hyderabad', 'chennai', 'kolkata', 'bollywood', 'cricket', 'modi'],
                'sources': ['times of india', 'the hindu', 'hindustan times', 'indian express', 'ndtv'],
                'domains': ['timesofindia.indiatimes.com', 'thehindu.com', 'hindustantimes.com']
            }
        }
        
        logger.info("Batch Location Classifier initialized")

    def extract_domain(self, url: str) -> str:
        """Extract domain from URL"""
        if not url or pd.isna(url):
            return ""
        
        # Remove protocol
        domain = re.sub(r'^https?://', '', str(url).lower())
        # Remove path and query parameters
        domain = domain.split('/')[0]
        # Remove www.
        domain = re.sub(r'^www\.', '', domain)
        
        return domain

    def detect_country_simple(self, record) -> Tuple[str, float]:
        """
        Simple but fast country detection
        Returns: (country, confidence_score)
        """
        # If country already exists and is valid, return it
        if record.country and record.country.lower() not in ['none', 'unknown', '', 'null']:
            return record.country.lower(), 0.9
        
        # Initialize text for analysis
        text = str(record.text or '').lower()
        platform = str(record.platform or '').lower()
        source = str(record.source or '').lower()
        user_location = str(record.user_location or '').lower()
        user_name = str(record.user_name or '').lower()
        user_handle = str(record.user_handle or '').lower()
        
        # Extract domain from user_location if it looks like a URL
        domain = self.extract_domain(user_location)
        
        # Initialize country scores
        country_scores = {country: 0.0 for country in self.country_patterns.keys()}
        
        # 1. Source/Platform Analysis (highest weight)
        for country, patterns in self.country_patterns.items():
            # Check source names
            for source_name in patterns['sources']:
                if source_name in source or source_name in platform:
                    country_scores[country] += 5.0
            
            # Check domains
            for domain_name in patterns['domains']:
                if domain_name in domain or domain_name in user_location:
                    country_scores[country] += 5.0
        
        # 2. Text Content Analysis
        for country, patterns in self.country_patterns.items():
            for keyword in patterns['keywords']:
                if keyword in text:
                    country_scores[country] += 1.0
        
        # 3. User Location Analysis
        if user_location:
            for country, patterns in self.country_patterns.items():
                if country.lower() in user_location:
                    country_scores[country] += 3.0
                for keyword in patterns['keywords']:
                    if keyword in user_location:
                        country_scores[country] += 2.0
        
        # 4. Username/Handle Analysis
        for name in [user_name, user_handle]:
            if name:
                for country, patterns in self.country_patterns.items():
                    for keyword in patterns['keywords'][:5]:  # Use first 5 keywords
                        if keyword in name:
                            country_scores[country] += 2.0
        
        # Determine the country with the highest score
        max_score = max(country_scores.values())
        if max_score >= 2.0:  # Minimum threshold
            # Get the country with the highest score
            for country, score in country_scores.items():
                if score == max_score:
                    confidence = min(1.0, score / 10.0)  # Normalize confidence
                    return country.lower(), confidence
        
        return 'unknown', 0.0

    def process_batch(self, db_session, offset: int, limit: int) -> Dict[str, Any]:
        """
        Process a batch of records
        """
        records = db_session.query(SentimentData).offset(offset).limit(limit).all()
        
        batch_stats = {
            'processed': 0,
            'updated': 0,
            'unchanged': 0,
            'country_changes': {},
            'confidence_scores': []
        }
        
        for record in records:
            try:
                # Detect country
                new_country, confidence = self.detect_country_simple(record)
                
                # Track confidence
                batch_stats['confidence_scores'].append(confidence)
                
                # Check if country classification changed
                old_country = record.country.lower() if record.country else 'unknown'
                if new_country != old_country:
                    record.country = new_country.title()
                    batch_stats['updated'] += 1
                    
                    # Track changes
                    change_key = f"{old_country} -> {new_country}"
                    batch_stats['country_changes'][change_key] = batch_stats['country_changes'].get(change_key, 0) + 1
                else:
                    batch_stats['unchanged'] += 1
                
                batch_stats['processed'] += 1
                
            except Exception as e:
                logger.error(f"Error processing record {record.entry_id}: {e}")
                continue
        
        return batch_stats

    def update_all_records(self, db_session, batch_size: int = 100) -> Dict[str, Any]:
        """
        Update all records in batches
        """
        logger.info("Starting batch location classification update...")
        
        # Get total count
        total_records = db_session.query(SentimentData).count()
        logger.info(f"Total records to process: {total_records}")
        
        # Calculate number of batches
        num_batches = (total_records + batch_size - 1) // batch_size
        logger.info(f"Processing in {num_batches} batches of {batch_size}")
        
        overall_stats = {
            'total_records': total_records,
            'total_updated': 0,
            'total_unchanged': 0,
            'all_country_changes': {},
            'all_confidence_scores': [],
            'batches_processed': 0
        }
        
        try:
            for batch_num in range(num_batches):
                offset = batch_num * batch_size
                
                logger.info(f"Processing batch {batch_num + 1}/{num_batches} (offset: {offset})")
                
                # Process batch
                batch_stats = self.process_batch(db_session, offset, batch_size)
                
                # Update overall stats
                overall_stats['total_updated'] += batch_stats['updated']
                overall_stats['total_unchanged'] += batch_stats['unchanged']
                overall_stats['all_confidence_scores'].extend(batch_stats['confidence_scores'])
                overall_stats['batches_processed'] += 1
                
                # Merge country changes
                for change, count in batch_stats['country_changes'].items():
                    overall_stats['all_country_changes'][change] = overall_stats['all_country_changes'].get(change, 0) + count
                
                # Commit after each batch
                db_session.commit()
                logger.info(f"Batch {batch_num + 1} completed: {batch_stats['updated']} updated, {batch_stats['unchanged']} unchanged")
                
                # Show some examples of changes
                if batch_stats['country_changes']:
                    logger.info(f"Batch {batch_num + 1} changes: {dict(list(batch_stats['country_changes'].items())[:3])}")
            
            # Calculate final stats
            overall_stats['total_unchanged'] = total_records - overall_stats['total_updated']
            overall_stats['average_confidence'] = np.mean(overall_stats['all_confidence_scores']) if overall_stats['all_confidence_scores'] else 0
            overall_stats['high_confidence_count'] = sum(1 for score in overall_stats['all_confidence_scores'] if score >= 0.7)
            overall_stats['medium_confidence_count'] = sum(1 for score in overall_stats['all_confidence_scores'] if 0.4 <= score < 0.7)
            overall_stats['low_confidence_count'] = sum(1 for score in overall_stats['all_confidence_scores'] if score < 0.4)
            
            logger.info("All batches completed successfully!")
            return overall_stats
            
        except Exception as e:
            logger.error(f"Error during batch processing: {e}")
            db_session.rollback()
            return {'error': str(e)}

    def get_current_distribution(self, db_session) -> Dict[str, int]:
        """Get current country distribution"""
        country_counts = db_session.query(SentimentData.country, func.count(SentimentData.entry_id)).group_by(SentimentData.country).all()
        return {country or 'None': count for country, count in country_counts}

def main():
    """Main function"""
    logger.info("Starting Batch Location Classification Update")
    
    # Initialize classifier
    classifier = BatchLocationClassifier()
    
    # Create database session
    db = SessionLocal()
    
    try:
        # Show current distribution
        current_dist = classifier.get_current_distribution(db)
        logger.info("Current country distribution:")
        for country, count in sorted(current_dist.items(), key=lambda x: x[1], reverse=True):
            logger.info(f"  {country}: {count}")
        
        # Ask for confirmation
        response = input("\nDo you want to proceed with updating all records? (y/N): ")
        if response.lower() != 'y':
            logger.info("Update cancelled by user")
            return
        
        # Update all records
        stats = classifier.update_all_records(db, batch_size=200)
        
        if 'error' in stats:
            logger.error(f"Error: {stats['error']}")
            return
        
        # Save detailed report
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_path = Path("data/processed") / f"batch_location_classification_report_{timestamp}.json"
        report_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(report_path, 'w') as f:
            json.dump({
                'timestamp': timestamp,
                'stats': stats,
                'current_distribution': current_dist
            }, f, indent=2)
        
        logger.info(f"Detailed report saved to: {report_path}")
        
        # Print summary
        print("\n" + "="*50)
        print("BATCH LOCATION CLASSIFICATION SUMMARY")
        print("="*50)
        print(f"Total records processed: {stats['total_records']}")
        print(f"Records updated: {stats['total_updated']}")
        print(f"Records unchanged: {stats['total_unchanged']}")
        print(f"Batches processed: {stats['batches_processed']}")
        print(f"Average confidence: {stats['average_confidence']:.2f}")
        print(f"High confidence classifications: {stats['high_confidence_count']}")
        print(f"Medium confidence classifications: {stats['medium_confidence_count']}")
        print(f"Low confidence classifications: {stats['low_confidence_count']}")
        
        print("\nTop Country Changes:")
        for change, count in sorted(stats['all_country_changes'].items(), key=lambda x: x[1], reverse=True)[:10]:
            print(f"  {change}: {count}")
        
        print("="*50)
        
    except Exception as e:
        logger.error(f"Error during batch location classification: {e}", exc_info=True)
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()



