import logging
import pandas as pd
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import re
from difflib import SequenceMatcher
from datetime import datetime, timedelta

logger = logging.getLogger('DeduplicationService')

class DeduplicationService:
    """
    Service for deduplicating sentiment data by comparing newly collected data
    against existing data in the database.
    """
    
    def __init__(self):
        self.similarity_threshold = 0.85
        self.text_fields = ['text', 'content', 'title', 'description']
        
    def normalize_text(self, text: str) -> str:
        """Normalize text for consistent duplicate detection"""
        if not text or pd.isna(text):
            return ""
        
        # Convert to lowercase
        text = str(text).lower()
        
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        
        # Remove URLs
        text = re.sub(r'https?://\S+', '', text)
        
        # Remove special characters but keep basic punctuation
        text = re.sub(r'[^\w\s.,?!-]', '', text)
        
        return text
    
    def is_similar_text(self, text1: str, text2: str, threshold: float = None) -> bool:
        """Check if two texts are similar using sequence matcher"""
        if threshold is None:
            threshold = self.similarity_threshold
            
        if pd.isna(text1) or pd.isna(text2):
            return False
        
        # For very short texts, require exact match
        if len(text1) < 10 or len(text2) < 10:
            return text1 == text2
        
        # For longer texts, use sequence matcher
        similarity = SequenceMatcher(None, text1, text2).ratio()
        return similarity >= threshold
    
    def get_text_content(self, record: Dict[str, Any]) -> str:
        """Extract the main text content from a record"""
        for field in self.text_fields:
            if field in record and record[field] and not pd.isna(record[field]):
                return str(record[field])
        return ""
    
    def find_existing_duplicates(self, new_records: List[Dict[str, Any]], db: Session, user_id: str) -> Dict[str, List[int]]:
        """
        Find existing duplicates in the database for the new records.
        
        Args:
            new_records: List of new records to check
            db: Database session
            user_id: User ID to filter by
            
        Returns:
            Dictionary mapping new record index to list of existing duplicate entry_ids
        """
        from src.api.models import SentimentData
        
        duplicates_map = {}
        
        for i, new_record in enumerate(new_records):
            text_content = self.get_text_content(new_record)
            if not text_content:
                continue
                
            normalized_text = self.normalize_text(text_content)
            if not normalized_text:
                continue
            
            # Check for exact text matches
            existing_matches = db.query(SentimentData).filter(
                and_(
                    SentimentData.user_id == user_id,
                    or_(
                        SentimentData.text == text_content,
                        SentimentData.content == text_content,
                        SentimentData.title == text_content,
                        SentimentData.description == text_content
                    )
                )
            ).all()
            
            if existing_matches:
                duplicates_map[i] = [match.entry_id for match in existing_matches]
                continue
            
            # Check for similar content using normalized text
            # Query records with similar length (within 20% range)
            text_length = len(normalized_text)
            min_length = int(text_length * 0.8)
            max_length = int(text_length * 1.2)
            
            potential_matches = db.query(SentimentData).filter(
                and_(
                    SentimentData.user_id == user_id,
                    SentimentData.text.isnot(None),
                    SentimentData.text != ""
                )
            ).all()
            
            similar_matches = []
            for existing in potential_matches:
                existing_text = self.get_text_content(existing.__dict__)
                if existing_text:
                    existing_normalized = self.normalize_text(existing_text)
                    if (min_length <= len(existing_normalized) <= max_length and 
                        self.is_similar_text(normalized_text, existing_normalized)):
                        similar_matches.append(existing.entry_id)
            
            if similar_matches:
                duplicates_map[i] = similar_matches
        
        return duplicates_map
    
    def deduplicate_new_data(self, new_records: List[Dict[str, Any]], db: Session, user_id: str) -> Dict[str, Any]:
        """
        Deduplicate new records against existing database records.
        
        Args:
            new_records: List of new records to deduplicate
            db: Database session
            user_id: User ID to filter by
            
        Returns:
            Dictionary with deduplication results:
            - unique_records: List of records that are not duplicates
            - duplicate_records: List of records that are duplicates
            - duplicate_map: Mapping of new record indices to existing duplicate IDs
            - stats: Deduplication statistics
        """
        logger.info(f"Starting deduplication of {len(new_records)} new records for user {user_id}")
        
        if not new_records:
            return {
                'unique_records': [],
                'duplicate_records': [],
                'duplicate_map': {},
                'stats': {'total': 0, 'unique': 0, 'duplicates': 0}
            }
        
        # Find existing duplicates
        duplicate_map = self.find_existing_duplicates(new_records, db, user_id)
        
        # Separate unique and duplicate records
        unique_records = []
        duplicate_records = []
        
        for i, record in enumerate(new_records):
            if i in duplicate_map:
                duplicate_records.append(record)
            else:
                unique_records.append(record)
        
        # Additional deduplication within new records (remove internal duplicates)
        internal_duplicates = self._remove_internal_duplicates(unique_records)
        final_unique = internal_duplicates['unique']
        internal_duplicate_count = internal_duplicates['duplicate_count']
        
        stats = {
            'total': len(new_records),
            'unique': len(final_unique),
            'duplicates': len(duplicate_records) + internal_duplicate_count,
            'external_duplicates': len(duplicate_records),
            'internal_duplicates': internal_duplicate_count
        }
        
        logger.info(f"Deduplication completed: {stats['unique']} unique, {stats['duplicates']} duplicates")
        
        return {
            'unique_records': final_unique,
            'duplicate_records': duplicate_records,
            'duplicate_map': duplicate_map,
            'stats': stats
        }
    
    def _remove_internal_duplicates(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Remove duplicates within the new records themselves"""
        if len(records) <= 1:
            return {'unique': records, 'duplicate_count': 0}
        
        seen_texts = set()
        unique_records = []
        duplicate_count = 0
        
        for record in records:
            text_content = self.get_text_content(record)
            normalized_text = self.normalize_text(text_content)
            
            if normalized_text and normalized_text not in seen_texts:
                seen_texts.add(normalized_text)
                unique_records.append(record)
            else:
                duplicate_count += 1
        
        return {'unique': unique_records, 'duplicate_count': duplicate_count}
    
    def get_deduplication_summary(self, results: Dict[str, Any]) -> str:
        """Generate a human-readable summary of deduplication results"""
        stats = results['stats']
        
        summary = f"""
Deduplication Summary:
=====================
Total Records: {stats['total']}
Unique Records: {stats['unique']}
Duplicate Records: {stats['duplicates']}
  - External Duplicates (vs existing DB): {stats['external_duplicates']}
  - Internal Duplicates (within new data): {stats['internal_duplicates']}
Duplicate Rate: {(stats['duplicates'] / stats['total'] * 100):.1f}%
        """.strip()
        
        return summary
