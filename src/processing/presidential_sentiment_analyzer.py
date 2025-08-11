import logging
from pathlib import Path
from transformers import pipeline, AutoModelForSequenceClassification, AutoTokenizer
import os
import openai
import requests
import json
from typing import Dict, List, Tuple, Optional, Any
import pandas as pd

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('PresidentialSentimentAnalyzer')

class PresidentialSentimentAnalyzer:
    """
    A sentiment analyzer that evaluates content from the President's strategic perspective.
    Instead of general positive/negative sentiment, it classifies content based on:
    - How it affects the President's agenda, image, or political capital
    - Whether it's supportive, threatening, requires attention, or is irrelevant
    """
    
    def __init__(self, president_name: str = "the President", country: str = "Nigeria"):
        self.president_name = president_name
        self.country = country
        
        # Presidential sentiment categories (using traditional labels with strategic reasoning)
        self.sentiment_categories = {
            "positive": "Strengthens presidential image, agenda, or political capital",
            "negative": "Threatens presidential image, credibility, or agenda", 
            "neutral": "No material impact on presidency or requires monitoring"
        }
        
        # Initialize OpenAI client
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        if not self.openai_api_key:
            logger.warning("OPENAI_API_KEY environment variable not set. Presidential analysis will not function.")
            self.openai_client = None
        else:
            try:
                self.openai_client = openai.OpenAI(api_key=self.openai_api_key)
                logger.info("OpenAI client initialized successfully for presidential analysis.")
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client: {e}", exc_info=True)
                self.openai_client = None
        
        # Presidential priorities and keywords (can be updated dynamically)
        self.presidential_priorities = {
            "fuel_subsidy": ["fuel", "subsidy", "petrol", "diesel", "energy", "pump", "price"],
            "security": ["security", "terrorism", "banditry", "kidnapping", "police", "military", "defense"],
            "youth_employment": ["youth", "employment", "jobs", "unemployment", "skills", "training"],
            "foreign_relations": ["diplomacy", "foreign", "international", "trade", "partnership"],
            "infrastructure": ["roads", "bridges", "railways", "airports", "infrastructure", "development"],
            "economy": ["economy", "gdp", "inflation", "growth", "investment", "business"],
            "corruption": ["corruption", "transparency", "accountability", "anti-corruption"],
            "healthcare": ["health", "hospital", "medical", "vaccine", "disease", "healthcare"],
            "education": ["education", "school", "university", "students", "teachers", "learning"]
        }
        
        logger.info(f"Presidential Sentiment Analyzer initialized for {president_name} of {country}")

    def _call_openai_for_presidential_sentiment(self, text: str) -> Tuple[str, float, str, List[str]]:
        """
        Analyze text from the President's strategic perspective using OpenAI.
        Returns: (sentiment_label, sentiment_score, justification, relevant_topics)
        """
        if not self.openai_client:
            logger.warning("OpenAI client not available. Cannot perform presidential analysis.")
            return "neutral", 0.5, "OpenAI client not available", []
        
        prompt = f"""You are a strategic advisor analyzing media content from the perspective of {self.president_name} of {self.country}.

Your task is to evaluate this content solely through the lens of the President's self-interest: 
Does this help or hurt the President's power, reputation, or ability to govern effectively?

THINK LIKE A PRESIDENTIAL STRATEGIST:
- What's in it for the current President?
- Does this strengthen or weaken their position?
- Can the President use this to their advantage?
- Does this create problems they need to address?

SENTIMENT CATEGORIES (ONLY USE THESE THREE - DO NOT USE "IRRELEVANT"):
🟩 POSITIVE: Content that strengthens the President's image, furthers their agenda, or builds political capital
🟥 NEGATIVE: Content that threatens the President's image, credibility, or agenda  
⚪ NEUTRAL: Content with no material impact on presidency or requires monitoring

CRITICAL: You must ONLY use POSITIVE, NEGATIVE, or NEUTRAL. Never use "irrelevant" or any other label.

ANALYSIS GUIDELINES:
- Consider the President's current priorities and political context
- Evaluate strategic impact, not just emotional tone or surface-level sentiment
- Consider timing and potential public reaction
- Identify relevant policy areas or topics
- IMPORTANT: If content mentions the President or affects their political position, it's likely POSITIVE or NEGATIVE, not NEUTRAL
- NEUTRAL should only be used for content that truly has no impact on the presidency

SPECIAL CASES TO CONSIDER:
- Death of former presidents/officials: Usually NEUTRAL unless it creates political opportunities or challenges for current president
- Natural disasters: NEUTRAL unless they affect presidential policies or create governance challenges
- Celebrity news: NEUTRAL unless it involves presidential family or creates political implications
- Sports events: NEUTRAL unless they have national significance or involve presidential policies
- Economic news: Evaluate based on impact on presidential economic policies and public perception
- Security incidents: Evaluate based on impact on presidential security policies and public confidence

EXAMPLES:
- "Former president dies" → NEUTRAL (score: 0.0, no direct impact on current president)
- "Former president's death creates political vacuum" → NEGATIVE (score: -0.7, creates challenges for current president)
- "President pays tribute to late former president" → POSITIVE (score: 0.6, shows leadership and unity)
- "President's economic policy praised" → POSITIVE (score: 0.8, strengthens presidential image)
- "President's policy criticized" → NEGATIVE (score: -0.6, threatens presidential agenda)
- "Celebrity wedding trends" → NEUTRAL (score: 0.0, no political impact)
- "Fuel prices rise after presidential policy" → NEGATIVE (score: -0.5, policy criticism)

SCORING DIRECTION:
- +1.0 = Maximum positive impact for President
- +0.5 = Moderate positive impact for President  
- 0.0 = No impact on President (neutral)
- -0.5 = Moderate negative impact for President
- -1.0 = Maximum negative impact for President

RESPONSE FORMAT:
Sentiment: [POSITIVE/NEGATIVE/NEUTRAL]
Sentiment Score: [-1.0 to 1.0]
Justification: [Strategic reasoning]
Topics: [comma-separated list of relevant topics]

SCORE GUIDELINES:
- POSITIVE: Use scores 0.2 to 1.0 (strong positive impact)
- NEGATIVE: Use scores -1.0 to -0.2 (strong negative impact)  
- NEUTRAL: Use scores -0.2 to 0.2 (no significant impact)

IMPORTANT: Higher scores (closer to 1.0) = More positive for the President
Lower scores (closer to -1.0) = More negative for the President
Zero (0.0) = Neutral/no impact

Text to analyze: "{text[:1000]}"
"""
        
        try:
            response = self.openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": f"You are a strategic advisor to {self.president_name} analyzing media impact."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=300,
                temperature=0.3
            )
            
            content = response.choices[0].message.content.strip()
            logger.debug(f"OpenAI response: {content}")
            
            # Parse the response
            sentiment = "neutral"  # Default to neutral instead of irrelevant
            confidence = 0.0  # Default to neutral (0.0) instead of 0.5
            justification = "Analysis failed"
            topics = []
            
            lines = content.split('\n')
            for line in lines:
                line = line.strip()
                if line.lower().startswith("sentiment:"):
                    sentiment_value = line.split(":", 1)[1].strip().lower()
                    if sentiment_value in ["positive", "negative", "neutral"]:
                        sentiment = sentiment_value
                elif line.lower().startswith("sentiment score:"):
                    try:
                        confidence = float(line.split(":", 1)[1].strip())
                        # Ensure confidence is between -1.0 and 1.0
                        confidence = max(-1.0, min(1.0, confidence))
                    except:
                        confidence = 0.0  # Default to neutral (0.0) instead of 0.5
                elif line.lower().startswith("justification:"):
                    justification = line.split(":", 1)[1].strip()
                elif line.lower().startswith("topics:"):
                    topics_str = line.split(":", 1)[1].strip()
                    topics = [t.strip() for t in topics_str.split(",") if t.strip()]
            
            return sentiment, confidence, justification, topics
            
        except Exception as e:
            logger.error(f"Error in presidential sentiment analysis: {e}", exc_info=True)
            return "neutral", 0.0, f"Analysis failed: {str(e)}", []

    def _identify_relevant_topics(self, text: str) -> List[str]:
        """Identify which presidential priorities are mentioned in the text."""
        text_lower = text.lower()
        relevant_topics = []
        
        for topic, keywords in self.presidential_priorities.items():
            if any(keyword in text_lower for keyword in keywords):
                relevant_topics.append(topic)
        
        return relevant_topics

    def analyze(self, text: str, source_type: str = None) -> Dict[str, Any]:
        """
        Analyze text from the President's strategic perspective.
        
        Returns:
        {
            'sentiment_label': str,  # positive/negative/neutral (using existing field)
            'sentiment_score': float,  # -1.0 to 1.0 (using existing field)
            'sentiment_justification': str,  # Strategic reasoning + recommended action (using existing field)
        }
        """
        if not text or str(text).strip() == "" or str(text).lower() == "none":
            return {
                'sentiment_label': 'neutral',
                'sentiment_score': 0.0,
                'sentiment_justification': 'Empty or null content - No action required'
            }
        
        # Get presidential sentiment analysis
        sentiment, confidence, justification, topics = self._call_openai_for_presidential_sentiment(str(text))
        
        # Generate recommended action
        recommended_action = self._generate_recommended_action(sentiment, topics, confidence)
        
        # Combine justification and recommended action for the existing sentiment_justification field
        full_justification = f"{justification}\n\nRecommended Action: {recommended_action}"
        
        return {
            'sentiment_label': sentiment,  # Use existing field
            'sentiment_score': confidence,  # Use existing field
            'sentiment_justification': full_justification  # Use existing field with combined content
        }

    def _generate_recommended_action(self, sentiment: str, topics: List[str], sentiment_score: float) -> str:
        """Generate recommended presidential action based on sentiment and topics."""
        if sentiment == "positive":
            if sentiment_score > 0.6:
                return "Amplify and share this content through official channels"
            else:
                return "Monitor and potentially acknowledge this positive coverage"
        elif sentiment == "negative":
            if sentiment_score < -0.6:
                return "Prepare immediate response and counter-narrative"
            else:
                return "Monitor closely and prepare contingency response"
        else:  # neutral
            return "Monitor for potential developments"
    
    def batch_analyze(self, texts: List[str], source_types: List[str] = None) -> List[Dict[str, Any]]:
        """Analyze multiple texts from the President's perspective."""
        results = []
        
        for i, text in enumerate(texts):
            source_type = source_types[i] if source_types and i < len(source_types) else None
            result = self.analyze(text, source_type)
            results.append(result)
        
        return results
    
    def update_presidential_priorities(self, new_priorities: Dict[str, List[str]]):
        """Update the presidential priorities and keywords."""
        self.presidential_priorities.update(new_priorities)
        logger.info(f"Updated presidential priorities: {list(new_priorities.keys())}")
    
    def get_presidential_insights(self, data: pd.DataFrame) -> Dict[str, Any]:
        """
        Generate presidential insights from a dataset of analyzed content.
        
        Returns strategic insights like:
        - Most threatening topics
        - Most supportive sources
        - Priority areas requiring attention
        """
        if data.empty:
            return {"error": "No data provided"}
        
        insights = {
            "total_items": len(data),
            "sentiment_distribution": {},
            "high_impact_items": [],
            "priority_topics": {},
            "recommended_focus_areas": []
        }
        
        # Sentiment distribution
        if 'sentiment_label' in data.columns:
            sentiment_counts = data['sentiment_label'].value_counts()
            insights["sentiment_distribution"] = sentiment_counts.to_dict()
        
        # High impact items (negative with high confidence)
        high_impact_mask = (
            (data['sentiment_label'] == 'negative') & 
            (data['sentiment_score'] < -0.2)
        )
        high_impact_items = data[high_impact_mask]
        insights["high_impact_items"] = high_impact_items.to_dict('records')
        
        # Priority topics analysis
        if 'relevant_topics' in data.columns:
            all_topics = []
            for topics in data['relevant_topics']:
                if isinstance(topics, list):
                    all_topics.extend(topics)
            
            topic_counts = pd.Series(all_topics).value_counts()
            insights["priority_topics"] = topic_counts.head(5).to_dict()
        
        # Recommended focus areas
        if len(high_impact_items) > 0:
            insights["recommended_focus_areas"] = [
                "Immediate response to negative content",
                "Strategic communication on neutral topics",
                "Amplification of positive content"
            ]
        
        return insights

    def test_specific_case(self, text: str, expected_sentiment: str = None) -> Dict[str, Any]:
        """
        Test the analyzer with a specific case and optionally compare with expected sentiment.
        Useful for validating the analyzer's handling of edge cases.
        """
        logger.info(f"Testing presidential analyzer with text: {text[:100]}...")
        
        result = self.analyze(text)
        
        test_result = {
            "input_text": text,
            "analyzed_sentiment": result['sentiment_label'],
            "sentiment_score": result['sentiment_score'],
            "justification": result['sentiment_justification'],
            "expected_sentiment": expected_sentiment,
            "match": expected_sentiment is None or result['sentiment_label'] == expected_sentiment
        }
        
        if expected_sentiment:
            if test_result["match"]:
                logger.info(f"✅ Test PASSED: Expected {expected_sentiment}, got {result['sentiment_label']}")
            else:
                logger.warning(f"❌ Test FAILED: Expected {expected_sentiment}, got {result['sentiment_label']}")
        else:
            logger.info(f"📊 Test result: {result['sentiment_label']} (sentiment_score: {result['sentiment_score']:.2f})")
        
        return test_result

    def batch_test_cases(self, test_cases: List[Dict[str, str]]) -> List[Dict[str, Any]]:
        """
        Test multiple cases at once.
        
        Args:
            test_cases: List of dicts with 'text' and optional 'expected_sentiment' keys
        
        Returns:
            List of test results
        """
        results = []
        
        for i, test_case in enumerate(test_cases):
            logger.info(f"Testing case {i+1}/{len(test_cases)}")
            result = self.test_specific_case(
                test_case['text'], 
                test_case.get('expected_sentiment')
            )
            results.append(result)
        
        # Summary
        if any('expected_sentiment' in case for case in test_cases):
            passed = sum(1 for r in results if r['match'])
            total = len([case for case in test_cases if 'expected_sentiment' in case])
            logger.info(f"📈 Test Summary: {passed}/{total} cases passed")
        
        return results


