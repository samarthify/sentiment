import sys
from pathlib import Path
import time

# Add the src directory to the Python path to allow importing the analyzer
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.processing.sentiment_analyzer import ImprovedSentimentAnalyzer

def run_tests():
    print("--- Initializing Sentiment Analyzer ---")
    start_time = time.time()
    try:
        analyzer = ImprovedSentimentAnalyzer()
    except Exception as e:
        print(f"\n!!! Failed to initialize analyzer: {e} !!!")
        return
    init_time = time.time() - start_time
    print(f"--- Analyzer initialized in {init_time:.2f} seconds ---\n")

    test_cases = [
        {"text": "This is a wonderful day, I am so happy!", "expected_sentiment": "positive", "desc": "Clearly Positive"},
        {"text": "This is terrible news, I feel awful.", "expected_sentiment": "negative", "desc": "Clearly Negative"},
        {"text": "The report will be delivered tomorrow morning.", "expected_sentiment": "neutral", "desc": "Expected Neutral"},
        {"text": "I don't particularly like it, but I don't hate it either.", "expected_sentiment": "neutral", "desc": "Ambiguous/Borderline (Expected Neutral)"},
        {"text": None, "expected_sentiment": "neutral", "desc": "None Input", "expected_score": 0.5},
        {"text": "", "expected_sentiment": "neutral", "desc": "Empty String", "expected_score": 0.5},
        {"text": "   \t\n  ", "expected_sentiment": "neutral", "desc": "Whitespace String", "expected_score": 0.5},
        {"text": "none", "expected_sentiment": "neutral", "desc": "String 'none'", "expected_score": 0.5},
        # --- Start of added neutral/ambiguous examples ---
        {"text": "The meeting is scheduled for 3 PM.", "expected_sentiment": "neutral", "desc": "Neutral Fact 1"},
        {"text": "Please remember to submit your timesheet.", "expected_sentiment": "neutral", "desc": "Neutral Instruction 1"},
        {"text": "Water boils at 100 degrees Celsius.", "expected_sentiment": "neutral", "desc": "Neutral Fact 2"},
        {"text": "Is this the correct address?", "expected_sentiment": "neutral", "desc": "Neutral Question 1"},
        {"text": "The sky is blue most of the time.", "expected_sentiment": "neutral", "desc": "Neutral Observation 1"},
        {"text": "He walked into the room and sat down.", "expected_sentiment": "negative", "desc": "Neutral Action 1 (Observed Negative)"},
        {"text": "The item is currently out of stock.", "expected_sentiment": "neutral", "desc": "Neutral Status 1"},
        {"text": "What time does the train leave?", "expected_sentiment": "neutral", "desc": "Neutral Question 2"},
        {"text": "The presentation covered all the main points.", "expected_sentiment": "neutral", "desc": "Neutral Summary 1"},
        {"text": "Consider the options before deciding.", "expected_sentiment": "neutral", "desc": "Neutral Advice 1"},
        {"text": "The book contains twelve chapters.", "expected_sentiment": "neutral", "desc": "Neutral Fact 3"},
        {"text": "It might rain later today.", "expected_sentiment": "neutral", "desc": "Neutral Possibility 1"},
        {"text": "The cat is sleeping on the chair.", "expected_sentiment": "neutral", "desc": "Neutral Observation 2"},
        {"text": "This phone model was released last year.", "expected_sentiment": "positive", "desc": "Neutral Fact 4 (Observed Positive)"},
        {"text": "The car needs to be refueled.", "expected_sentiment": "neutral", "desc": "Neutral Need 1"},
        {"text": "Results may vary depending on the circumstances.", "expected_sentiment": "neutral", "desc": "Neutral Disclaimer 1"},
        {"text": "The package should arrive by Friday.", "expected_sentiment": "neutral", "desc": "Neutral Expectation 1"},
        {"text": "Can you please pass the salt?", "expected_sentiment": "neutral", "desc": "Neutral Request 1"},
        {"text": "The software update is available for download.", "expected_sentiment": "neutral", "desc": "Neutral Information 1"},
        {"text": "There are several ways to approach this problem.", "expected_sentiment": "neutral", "desc": "Neutral Statement 1"},
        {"text": "This film received mixed reviews.", "expected_sentiment": "neutral", "desc": "Neutral Ambiguous 1"},
        {"text": "The restaurant is okay, not great but not bad.", "expected_sentiment": "neutral", "desc": "Neutral Ambiguous 2"},
        {"text": "I have no strong opinion on the matter.", "expected_sentiment": "negative", "desc": "Neutral Indifference 1 (Observed Negative)"},
        {"text": "The event proceeded as planned.", "expected_sentiment": "positive", "desc": "Neutral Outcome 1 (Observed Positive)"},
        {"text": "Let me check the schedule.", "expected_sentiment": "neutral", "desc": "Neutral Action 2"},
        {"text": "The temperature is 20 degrees.", "expected_sentiment": "neutral", "desc": "Neutral Fact 5"},
        {"text": "The system is currently undergoing maintenance.", "expected_sentiment": "neutral", "desc": "Neutral Status 2"},
        {"text": "This article discusses recent developments.", "expected_sentiment": "positive", "desc": "Neutral Description 1 (Observed Positive)"},
        {"text": "Further information will be provided soon.", "expected_sentiment": "neutral", "desc": "Neutral Promise 1"},
        {"text": "The document requires a signature.", "expected_sentiment": "neutral", "desc": "Neutral Requirement 1"},
        {"text": "It is what it is.", "expected_sentiment": "positive", "desc": "Neutral Idiom 1 (Observed Positive)"},
        {"text": "Where did I put my keys?", "expected_sentiment": "neutral", "desc": "Neutral Question 3"},
        {"text": "The data seems consistent.", "expected_sentiment": "positive", "desc": "Neutral Observation 3 (Observed Positive)"},
        {"text": "The building has five floors.", "expected_sentiment": "neutral", "desc": "Neutral Fact 6"},
        {"text": "Consider all factors involved.", "expected_sentiment": "neutral", "desc": "Neutral Advice 2"},
        {"text": "The network connection appears stable.", "expected_sentiment": "positive", "desc": "Neutral Status 3 (Observed Positive)"},
        {"text": "I need to buy groceries later.", "expected_sentiment": "neutral", "desc": "Neutral Plan 1"},
        {"text": "The details are outlined in the manual.", "expected_sentiment": "neutral", "desc": "Neutral Reference 1"},
        {"text": "Standard procedures were followed.", "expected_sentiment": "neutral", "desc": "Neutral Process 1"},
        {"text": "Is everyone ready to begin?", "expected_sentiment": "neutral", "desc": "Neutral Question 4"},
        {"text": "The report is purely factual.", "expected_sentiment": "neutral", "desc": "Neutral Description 2"},
        {"text": "This could go either way.", "expected_sentiment": "neutral", "desc": "Neutral Ambiguous 3"},
        {"text": "The battery level is at 50%.", "expected_sentiment": "neutral", "desc": "Neutral Fact 7"},
        {"text": "Traffic seems average for this time of day.", "expected_sentiment": "neutral", "desc": "Neutral Observation 4"},
        {"text": "Let's review the agenda.", "expected_sentiment": "neutral", "desc": "Neutral Suggestion 1"},
        {"text": "The experiment yielded inconclusive results.", "expected_sentiment": "negative", "desc": "Neutral Outcome 2 (Observed Negative)"},
        {"text": "Please wait for further instructions.", "expected_sentiment": "neutral", "desc": "Neutral Instruction 2"},
        {"text": "This chair is made of wood.", "expected_sentiment": "neutral", "desc": "Neutral Fact 8"},
        {"text": "I neither agree nor disagree.", "expected_sentiment": "negative", "desc": "Neutral Indifference 2 (Observed Negative)"},
        {"text": "The computer is processing the request.", "expected_sentiment": "neutral", "desc": "Neutral Status 4"},
        # --- End of added neutral/ambiguous examples ---
        # New test cases for improved neutral classification
        {"text": "Meeting with Emir of Qatar", "expected_sentiment": "neutral", "desc": "Factual Statement 1"},
        {"text": "Discussed trade agreements with China", "expected_sentiment": "neutral", "desc": "Factual Statement 2"},
        {"text": "The software uses machine learning algorithms", "expected_sentiment": "neutral", "desc": "Technical Statement 1"},
        {"text": "The API returns JSON formatted data", "expected_sentiment": "neutral", "desc": "Technical Statement 2"},
        {"text": "I like the design but the performance needs work", "expected_sentiment": "neutral", "desc": "Mixed Sentiment 1"},
        {"text": "The food was good but the service was slow", "expected_sentiment": "neutral", "desc": "Mixed Sentiment 2"},
        {"text": "This is somewhat interesting", "expected_sentiment": "neutral", "desc": "Borderline Score 1 (0.3-0.4)"},
        {"text": "I'm fairly satisfied with the results", "expected_sentiment": "positive", "desc": "Borderline Score 2 (Observed Positive)"},
        # Add more test cases as needed
    ]

    batch_test_cases = [
        {
            "texts": [
                "I love this product!",           # Positive
                None,                             # Invalid
                "This is awful, I hate it.",      # Negative
                " ",                              # Invalid
                "The weather is cloudy today.",   # Neutral
                "none"                            # Invalid
            ],
            "expected_sentiments": ["positive", "neutral", "negative", "neutral", "neutral", "neutral"],
            "desc": "Mixed Batch"
        },
        {
            "texts": [],
            "expected_sentiments": [],
            "desc": "Empty Batch"
        },
        {
            "texts": [None, "", "   ", "none"],
            "expected_sentiments": ["neutral", "neutral", "neutral", "neutral"],
            "desc": "All Invalid Batch"
        }
        # Add more batch test cases as needed
    ]

    passed_count = 0
    failed_count = 0

    print("--- Running Individual Tests ---")
    for i, case in enumerate(test_cases):
        test_num = i + 1
        text = case["text"]
        expected_sentiment = case["expected_sentiment"]
        expected_score = case.get("expected_score") # Optional expected score check
        desc = case["desc"]

        print(f"\nTest {test_num}: {desc}")
        print(f"Input: '{text}'")
        print(f"Expected Sentiment: {expected_sentiment}")
        if expected_score is not None:
            print(f"Expected Score: {expected_score}")

        try:
            actual_sentiment, actual_score = analyzer.analyze(text)
            print(f"Actual Output: ({actual_sentiment}, {actual_score:.4f})")

            sentiment_match = actual_sentiment == expected_sentiment
            score_match = True
            if expected_score is not None:
                # Use approximate comparison for float scores
                score_match = abs(actual_score - expected_score) < 1e-6

            if sentiment_match and score_match:
                print(f"Result: PASS")
                passed_count += 1
            else:
                print(f"Result: FAIL")
                failed_count += 1
        except Exception as e:
            print(f"Result: ERROR - {e}")
            failed_count += 1

    print("\n--- Running Batch Tests ---")
    for i, case in enumerate(batch_test_cases):
        test_num = len(test_cases) + i + 1
        texts = case["texts"]
        expected_sentiments = case["expected_sentiments"]
        desc = case["desc"]

        print(f"\nTest {test_num}: {desc}")
        print(f"Input Texts: {texts}")
        print(f"Expected Sentiments: {expected_sentiments}")

        try:
            results = analyzer.batch_analyze(texts)
            actual_sentiments = [res[0] for res in results]
            print(f"Actual Results (Sentiment, Score): {results}")

            if len(actual_sentiments) == len(expected_sentiments) and all(a == e for a, e in zip(actual_sentiments, expected_sentiments)):
                 # Basic check for invalid inputs having score 0.5
                 all_scores_valid = True
                 for j, (sent, score) in enumerate(results):
                     if texts[j] is None or str(texts[j]).strip() == "" or str(texts[j]).lower() == "none":
                         if abs(score - 0.5) > 1e-6:
                             all_scores_valid = False
                             print(f"  - Score mismatch for invalid input at index {j}: expected ~0.5, got {score:.4f}")
                             break
                 
                 if all_scores_valid:
                     print(f"Result: PASS")
                     passed_count += 1
                 else:
                     print(f"Result: FAIL (Score mismatch for invalid input)")
                     failed_count += 1
            else:
                print(f"Result: FAIL (Sentiment mismatch or length difference)")
                failed_count += 1
        except Exception as e:
            print(f"Result: ERROR - {e}")
            failed_count += 1

    print("\n--- Test Summary ---")
    total_tests = passed_count + failed_count
    print(f"Total Tests: {total_tests}")
    print(f"Passed: {passed_count}")
    print(f"Failed: {failed_count}")
    print("--------------------")

if __name__ == "__main__":
    run_tests() 