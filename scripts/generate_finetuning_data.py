import sys
import csv
from pathlib import Path
import time
import logging

# Configure basic logging for the script
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

# Add the src directory to the Python path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

try:
    from src.processing.sentiment_analyzer import ImprovedSentimentAnalyzer
except ImportError as e:
    logging.error(f"Failed to import ImprovedSentimentAnalyzer: {e}")
    logging.error("Ensure src directory is in PYTHONPATH or script is run from root.")
    sys.exit(1)


def get_example_texts():
    """Returns a list of diverse example texts."""
    return [
        # Product Reviews (Positive)
        "Absolutely love this! Works perfectly and looks great.",
        "Fantastic quality, exceeded my expectations.",
        "Highly recommend this product, worth every penny.",
        "So easy to use and very effective.",
        "Excellent customer service and fast shipping.",
        "Five stars! Best purchase I've made all year.",
        "Incredible value for the price.",
        "Works like a charm, couldn't be happier.",
        "Well-designed and durable.",
        "A truly outstanding item.",

        # Product Reviews (Negative)
        "Terrible quality, broke after one use.",
        "Does not work as advertised, very disappointed.",
        "Waste of money, do not buy.",
        "Poorly made and arrived damaged.",
        "Customer service was unhelpful and rude.",
        "Significantly smaller than expected.",
        "Difficult to assemble and instructions were unclear.",
        "Stopped working after just a week.",
        "Not worth the price tag at all.",
        "I regret buying this product.",

        # Product Reviews (Neutral/Mixed)
        "It's okay, does the job but nothing special.",
        "Works fine, but the design could be better.",
        "Average quality for an average price.",
        "Neither impressed nor disappointed.",
        "Has some good features, but also some drawbacks.",
        "Delivery was quick, but the item is just mediocre.",
        "Serves its purpose, but I wouldn't rave about it.",
        "The color is slightly different than pictured.",
        "It functions, though it feels a bit flimsy.",
        "Met expectations, but didn't exceed them.",

        # General Statements (Positive)
        "What a beautiful day for a walk in the park.",
        "I'm really looking forward to the holidays.",
        "That was a delicious meal, thank you!",
        "Congratulations on your promotion, well deserved!",
        "It's great to see you again after so long.",
        "Learning new things is always exciting.",
        "Volunteering for a good cause feels rewarding.",
        "This music always puts me in a good mood.",
        "Spending time with family is the best.",
        "I achieved my goal, I feel so proud!",

        # General Statements (Negative)
        "I'm stuck in traffic and running late.",
        "I seem to have caught a cold.",
        "This constant noise is giving me a headache.",
        "I can't believe I lost my wallet.",
        "The project deadline is stressful.",
        "It's frustrating when technology doesn't work.",
        "I'm worried about the upcoming exam.",
        "Another rainy day, I wish the sun would come out.",
        "Dealing with bureaucracy is exhausting.",
        "I made a mistake and feel bad about it.",

        # General Statements (Neutral)
        "The train is scheduled to arrive at platform 3.",
        "Please turn off the lights when leaving the room.",
        "The library is open from 9 AM to 5 PM on weekdays.",
        "Mount Everest is the highest mountain on Earth.",
        "The human body is composed of trillions of cells.",
        "He drove the car to the mechanic for a check-up.",
        "The meeting agenda was distributed yesterday.",
        "Binary code uses sequences of 0s and 1s.",
        "The history of the internet dates back several decades.",
        "Water is essential for all known forms of life.",
        "The earth revolves around the sun.",
        "Remember to lock the door.",
        "The store is located on Main Street.",
        "Is the report ready for review?",
        "The presentation lasted for approximately one hour.",
        "This chair requires assembly.",
        "Results are expected by the end of the week.",
        "The user manual provides detailed instructions.",
        "The company policy was updated last month.",
        "What is the capital of France?",

        # More Ambiguous/Complex
        "Well, that was certainly... an experience.",
        "I'm not sure how I feel about the new changes.",
        "It could have been worse, I suppose.",
        "Interesting approach, though unconventional.",
        "He gave a very long and detailed explanation.",
        "The situation is complex and has many factors.",
        "It wasn't what I expected, but it wasn't necessarily bad.",
        "There are arguments both for and against this decision.",
        "The outcome remains uncertain at this point.",
        "Let's just say it left an impression.",
        "The film was visually stunning, but the plot was weak.", # Mixed
        "Great service, but the food was disappointing.", # Mixed
        "Loved the location, hated the noise.", # Mixed
        "The beginning was slow, but the ending was fantastic.", # Mixed
        "Expensive, but probably worth it in the long run.", # Mixed
        "It's a bit complicated to explain right now.",
        "I guess we'll just have to wait and see.",
        "That's one way of looking at it.",
        "The discussion covered a lot of ground.",
        "Opinions seem to be divided on this topic."
    ]

def generate_data(output_filename="finetuning_candidates.csv"):
    logging.info("--- Initializing Sentiment Analyzer for Data Generation ---")
    start_time = time.time()
    try:
        # IMPORTANT: Assumes the analyzer is now configured for the nlptown model
        analyzer = ImprovedSentimentAnalyzer()
    except Exception as e:
        logging.error(f"Failed to initialize analyzer: {e}")
        return
    init_time = time.time() - start_time
    logging.info(f"--- Analyzer initialized in {init_time:.2f} seconds ---")

    texts = get_example_texts()
    logging.info(f"Processing {len(texts)} example texts...")

    results = []
    processed_count = 0
    batch_size = 32 # Process in batches for efficiency

    for i in range(0, len(texts), batch_size):
        batch_texts = texts[i:i+batch_size]
        logging.info(f"Analyzing batch {i//batch_size + 1} ({len(batch_texts)} texts)")
        try:
            # Use batch_analyze which expects list, returns list of tuples
            batch_raw_results = analyzer.sentiment_pipeline(batch_texts) 
            
            # Need to map each result in the batch
            for j, all_star_results in enumerate(batch_raw_results):
                # Sort results by score descending
                all_star_results.sort(key=lambda x: x['score'], reverse=True)
                top_result = all_star_results[0]
                star_label = top_result["label"]
                score = top_result["score"]
                # Use the original text from the batch
                original_text = batch_texts[j]
                results.append({
                    "text": original_text,
                    "predicted_stars": star_label,
                    "confidence_score": score
                })
                processed_count += 1

        except Exception as e:
            logging.error(f"Error processing batch starting at index {i}: {e}", exc_info=True)
            # Add placeholders for failed batch items
            for text in batch_texts:
                 results.append({
                    "text": text,
                    "predicted_stars": "ERROR",
                    "confidence_score": 0.0
                })
                 processed_count += 1

    logging.info(f"Finished processing {processed_count} texts.")

    # Write to CSV
    output_path = Path(__file__).resolve().parent.parent / output_filename
    logging.info(f"Writing results to {output_path}...")
    try:
        with open(output_path, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ['text', 'predicted_stars', 'confidence_score']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

            writer.writeheader()
            writer.writerows(results)
        logging.info("Successfully wrote results to CSV.")
    except IOError as e:
        logging.error(f"Failed to write CSV file: {e}")

if __name__ == "__main__":
    # Make sure the model directory is clean before the first run
    logging.warning("Ensure the model directory is clean before the first run to download the correct model.")
    generate_data() 