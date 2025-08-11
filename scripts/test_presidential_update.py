#!/usr/bin/env python3
"""
Test script for presidential update - processes all entries
"""

import requests
import json
import time
from datetime import datetime

def test_presidential_update():
    """Test the presidential update endpoint with all entries."""
    
    print("🎯 TESTING PRESIDENTIAL UPDATE (ALL entries)")
    print("=" * 50)
    
    # API endpoint
    base_url = "http://localhost:8000"
    endpoint = f"{base_url}/presidential/update-latest"
    
    print(f"Endpoint: {endpoint}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print()
    
    try:
        # Make the request
        print("🔄 Making request to presidential update endpoint...")
        print("⏳ This may take a while for processing all entries...")
        start_time = time.time()
        
        response = requests.post(
            endpoint,
            headers={
                "Content-Type": "application/json",
                "Authorization": "Bearer YOUR_AUTH_TOKEN"  # Replace with actual token if needed
            }
            # No timeout - allow unlimited processing time
        )
        
        end_time = time.time()
        duration = end_time - start_time
        
        print(f"⏱️  Request completed in {duration:.2f} seconds")
        print(f"📊 Status Code: {response.status_code}")
        print()
        
        if response.status_code == 200:
            result = response.json()
            
            print("✅ SUCCESS - Presidential Update Results:")
            print("-" * 40)
            print(f"Message: {result.get('message', 'N/A')}")
            print(f"User ID: {result.get('user_id', 'N/A')}")
            print(f"Processed Count: {result.get('processed_count', 0)}")
            print(f"Total Records Found: {result.get('total_records_found', 0)}")
            print(f"Unique Records After Dedup: {result.get('unique_records_after_dedup', 'N/A')}")
            print(f"Target Individual: {result.get('target_individual', 'N/A')}")
            print(f"CSV Backup File: {result.get('csv_backup_file', 'N/A')}")
            print(f"Timestamp: {result.get('timestamp', 'N/A')}")
            
            # Show sample of updated records
            updated_records = result.get('updated_records', [])
            if updated_records:
                print(f"\n📋 Sample Updated Records ({len(updated_records)} shown):")
                for i, record in enumerate(updated_records[:5]):  # Show first 5
                    print(f"  {i+1}. Entry ID: {record.get('entry_id')}")
                    print(f"     Text: {record.get('text', 'N/A')[:80]}...")
                    print(f"     Source: {record.get('source', 'N/A')}")
                    print(f"     Original Sentiment: {record.get('original_sentiment', 'N/A')}")
                    print(f"     New Sentiment: {record.get('new_sentiment', 'N/A')}")
                    print(f"     Original Score: {record.get('original_score', 'N/A')}")
                    print(f"     New Score: {record.get('new_score', 'N/A')}")
                    print()
            
            # Summary
            processed = result.get('processed_count', 0)
            total = result.get('total_records_found', 0)
            unique_after_dedup = result.get('unique_records_after_dedup', 0)
            if total > 0:
                success_rate = (processed / unique_after_dedup) * 100 if unique_after_dedup else (processed / total) * 100
                print(f"📈 SUMMARY:")
                print(f"   Success Rate: {success_rate:.1f}% ({processed}/{unique_after_dedup if unique_after_dedup else total})")
                print(f"   Processing Time: {duration:.2f} seconds")
                print(f"   Records per Second: {processed/duration:.1f}")
                if unique_after_dedup and unique_after_dedup != total:
                    print(f"   Deduplication: Removed {total - unique_after_dedup} duplicate records")
            
        else:
            print("❌ ERROR - Presidential Update Failed:")
            print("-" * 40)
            print(f"Status Code: {response.status_code}")
            try:
                error_data = response.json()
                print(f"Error: {error_data.get('detail', 'Unknown error')}")
            except:
                print(f"Error: {response.text}")
    
    except requests.exceptions.Timeout:
        print("❌ TIMEOUT - Request took too long")
        print("This is expected when processing all entries. The process may still be running on the server.")
    except requests.exceptions.ConnectionError:
        print("❌ CONNECTION ERROR - Could not connect to server")
        print("Make sure the FastAPI server is running on localhost:8000")
    except Exception as e:
        print(f"❌ UNEXPECTED ERROR: {str(e)}")
    
    print("\n" + "=" * 50)
    print("🏁 Test completed!")

if __name__ == "__main__":
    test_presidential_update()
