import os
import pandas as pd
from datetime import datetime
import glob
import random
import re
import logging
import sys
from pathlib import Path
from .presidential_sentiment_analyzer import PresidentialSentimentAnalyzer
from dateutil import parser
from difflib import SequenceMatcher
from typing import Optional, Dict, Any, List

# Add this import for file rotation
sys.path.insert(0, str(Path(__file__).parent.parent))
from utils.file_rotation import rotate_processed_files

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('PresidentialDataProcessor')

class PresidentialDataProcessor:
    """
    A data processor that analyzes content from the President's strategic perspective.
    Instead of general sentiment analysis, it evaluates how content affects the President's agenda.
    """
    
    def __init__(self, president_name: str = "the President", country: str = "Nigeria"):
        logger.debug("PresidentialDataProcessor.__init__: Initializing...")
        self.base_path = Path(__file__).parent.parent.parent
        logger.debug(f"PresidentialDataProcessor.__init__: Base path set to {self.base_path}")
        logger.debug("PresidentialDataProcessor.__init__: Initializing PresidentialSentimentAnalyzer...")
        self.presidential_analyzer = PresidentialSentimentAnalyzer(president_name, country)
        random.seed(42)  # For consistent random values
        logger.debug("PresidentialDataProcessor.__init__: Initialization finished.")

    def get_presidential_sentiment(self, text: str) -> Dict[str, Any]:
        """
        Analyze text from the President's strategic perspective.
        
        Returns presidential sentiment analysis with strategic insights.
        """
        logger.debug(f"PresidentialDataProcessor.get_presidential_sentiment: Analyzing text (first 50 chars): '{str(text)[:50]}...'")
        result = self.presidential_analyzer.analyze(text)
        logger.debug(f"PresidentialDataProcessor.get_presidential_sentiment: Result: {result}")
        return result

    def process_files(self) -> Optional[pd.DataFrame]:
        """
        Process all data files and apply presidential sentiment analysis.
        
        Returns a DataFrame with presidential sentiment analysis using existing fields:
        - sentiment_label: positive/negative/neutral (presidential perspective)
        - sentiment_score: 0.0-1.0 (presidential confidence)
        - sentiment_justification: Strategic reasoning + recommended action
        """
        logger.info("PresidentialDataProcessor.process_files: Starting presidential data processing...")
        
        # Get all CSV files from the raw data directory
        raw_data_path = self.base_path / "data" / "raw"
        processed_data_path = self.base_path / "data" / "processed"
        
        if not raw_data_path.exists():
            logger.warning(f"Raw data directory does not exist: {raw_data_path}")
            return None
        
        # Create processed directory if it doesn't exist
        processed_data_path.mkdir(parents=True, exist_ok=True)
        
        # Get all CSV files
        csv_files = list(raw_data_path.glob("*.csv"))
        logger.info(f"Found {len(csv_files)} CSV files to process")
        
        if not csv_files:
            logger.warning("No CSV files found in raw data directory")
            return None
        
        all_data = []
        
        for file_path in csv_files:
            logger.info(f"Processing file: {file_path.name}")
            
            try:
                # Read the CSV file
                df = pd.read_csv(file_path)
                logger.info(f"Loaded {len(df)} rows from {file_path.name}")
                
                # Ensure we have a text column for analysis
                text_column = None
                for col in ['text', 'content', 'description', 'title']:
                    if col in df.columns:
                        text_column = col
                        break
                
                if text_column is None:
                    logger.warning(f"No text column found in {file_path.name}. Skipping presidential analysis.")
                    continue
                
                # Apply presidential sentiment analysis
                logger.info(f"Applying presidential sentiment analysis to {len(df)} texts...")
                
                presidential_results = []
                for idx, row in df.iterrows():
                    text = str(row[text_column]) if pd.notna(row[text_column]) else ""
                    result = self.presidential_analyzer.analyze(text)
                    presidential_results.append(result)
                
                # Update existing sentiment fields with presidential analysis
                df['sentiment_label'] = [r['sentiment_label'] for r in presidential_results]
                df['sentiment_score'] = [r['sentiment_score'] for r in presidential_results]
                df['sentiment_justification'] = [r['sentiment_justification'] for r in presidential_results]
                
                # Add processing metadata
                df['presidential_analysis_timestamp'] = datetime.now().isoformat()
                df['presidential_analysis_version'] = '1.0'
                
                # Save processed file
                processed_file_path = processed_data_path / f"presidential_{file_path.name}"
                df.to_csv(processed_file_path, index=False)
                logger.info(f"Saved presidential analysis to: {processed_file_path}")
                
                all_data.append(df)
                
            except Exception as e:
                logger.error(f"Error processing {file_path}: {e}", exc_info=True)
                continue
        
        if not all_data:
            logger.warning("No data was successfully processed")
            return None
        
        # Combine all processed data
        combined_df = pd.concat(all_data, ignore_index=True)
        logger.info(f"Combined presidential analysis data: {len(combined_df)} total rows")
        
        return combined_df

    def get_presidential_insights(self, data: pd.DataFrame) -> Dict[str, Any]:
        """
        Generate strategic insights from presidential sentiment analysis.
        
        Returns insights like:
        - Most threatening topics
        - Most supportive sources
        - Priority areas requiring attention
        - Strategic recommendations
        """
        if data.empty:
            return {"error": "No data provided for presidential insights"}
        
        insights = self.presidential_analyzer.get_presidential_insights(data)
        
        # Add additional strategic insights
        if 'presidential_sentiment_label' in data.columns:
            # Source analysis
            if 'source' in data.columns:
                source_analysis = data.groupby('source')['presidential_sentiment_label'].value_counts().unstack(fill_value=0)
                insights['source_sentiment_analysis'] = source_analysis.to_dict()
            
            # High priority items (negative with high confidence)
            high_priority = data[
                (data['presidential_sentiment_label'] == 'negative') & 
                (data['presidential_confidence_score'] > 0.8)
            ]
            insights['high_priority_items'] = high_priority.to_dict('records')
            
            # Strategic recommendations
            recommendations = []
            if len(high_priority) > 0:
                recommendations.append("Immediate response required to negative content")
            
            positive_count = len(data[data['presidential_sentiment_label'] == 'positive'])
            if positive_count > 0:
                recommendations.append(f"Amplify {positive_count} positive content pieces")
            
            neutral_count = len(data[data['presidential_sentiment_label'] == 'neutral'])
            if neutral_count > 0:
                recommendations.append(f"Monitor {neutral_count} neutral items closely")
            
            insights['strategic_recommendations'] = recommendations
        
        return insights

    def generate_presidential_report(self, data: pd.DataFrame) -> str:
        """
        Generate a strategic presidential report from the analyzed data.
        """
        if data.empty:
            return "No data available for presidential report generation."
        
        insights = self.get_presidential_insights(data)
        
        report = f"""
PRESIDENTIAL STRATEGIC ANALYSIS REPORT
Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
Total Items Analyzed: {insights.get('total_items', 0)}

SENTIMENT DISTRIBUTION:
"""
        
        if 'sentiment_distribution' in insights:
            for sentiment, count in insights['sentiment_distribution'].items():
                report += f"- {sentiment.title()}: {count}\n"
        
        report += "\nSTRATEGIC IMPACT ASSESSMENT:\n"
        
        if 'high_impact_items' in insights:
            report += f"- High Impact Items Requiring Attention: {len(insights['high_impact_items'])}\n"
        
        if 'priority_topics' in insights:
            report += "\nPRIORITY TOPICS:\n"
            for topic, count in insights['priority_topics'].items():
                report += f"- {topic}: {count} mentions\n"
        
        if 'strategic_recommendations' in insights:
            report += "\nSTRATEGIC RECOMMENDATIONS:\n"
            for rec in insights['strategic_recommendations']:
                report += f"- {rec}\n"
        
        return report

    def update_presidential_priorities(self, new_priorities: Dict[str, List[str]]):
        """Update the presidential priorities and keywords."""
        self.presidential_analyzer.update_presidential_priorities(new_priorities)
        logger.info(f"Updated presidential priorities: {list(new_priorities.keys())}")

    def export_presidential_data(self, data: pd.DataFrame, output_path: str = None) -> str:
        """
        Export presidential analysis data to CSV with strategic insights.
        """
        if data.empty:
            return "No data to export"
        
        if output_path is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            output_path = f"presidential_analysis_{timestamp}.csv"
        
        # Ensure we have all presidential columns
        required_columns = [
            'presidential_sentiment_label',
            'presidential_confidence_score', 
            'presidential_justification',
            'presidential_relevant_topics',
            'presidential_strategic_impact',
            'presidential_recommended_action'
        ]
        
        for col in required_columns:
            if col not in data.columns:
                data[col] = 'N/A'
        
        data.to_csv(output_path, index=False)
        logger.info(f"Exported presidential analysis data to: {output_path}")
        
        return output_path


