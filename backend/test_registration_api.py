#!/usr/bin/env python3
"""
Test registration API endpoint and verify MongoDB Atlas storage
"""

import asyncio
import requests
import json
from models import Database, COLLECTIONS
from datetime import datetime

API_BASE_URL = "http://192.168.1.7:8001"

async def test_registration_api():
    """Test the registration API and verify MongoDB storage"""
    try:
        # Connect to MongoDB to check before/after
        from dotenv import load_dotenv
        import os
        from pathlib import Path

        load_dotenv(Path(__file__).parent / '.env')
        MONGO_URL = os.environ.get('MONGO_URL')
        DB_NAME = os.environ.get('DB_NAME', 'ride_app')

        print("Connecting to MongoDB Atlas...")
        await Database.connect_to_mongo(MONGO_URL, DB_NAME)

        users_collection = Database.get_collection(COLLECTIONS["users"])

        # Check users before registration
        users_before = await users_collection.count_documents({})
        print(f"Users in database before registration: {users_before}")

        # Test registration data
        test_data = {
            "email": f"api_test_{int(datetime.now().timestamp())}@example.com",
            "password": "testpass123",
            "name": "API Test User",
            "phone": "1111111111"
        }

        print(f"\nTesting registration API with data: {test_data}")

        # Make API request
        response = requests.post(
            f"{API_BASE_URL}/api/auth/register",
            json=test_data,
            headers={"Content-Type": "application/json"}
        )

        print(f"API Response Status: {response.status_code}")

        if response.status_code == 200:
            response_data = response.json()
            print("✅ Registration successful!")
            print(f"Response: {json.dumps(response_data, indent=2)}")

            # Check users after registration
            users_after = await users_collection.count_documents({})
            print(f"\nUsers in database after registration: {users_after}")

            if users_after > users_before:
                print("✅ User successfully added to MongoDB Atlas!")

                # Verify the user exists
                user_doc = await users_collection.find_one({"email": test_data["email"]})
                if user_doc:
                    print("✅ User document found in MongoDB:")
                    print(f"   ID: {user_doc['_id']}")
                    print(f"   Email: {user_doc['email']}")
                    print(f"   Name: {user_doc['name']}")
                    print(f"   Phone: {user_doc['phone']}")
                    print(f"   Is Rider: {user_doc.get('is_rider', False)}")
                    print(f"   Is Passenger: {user_doc.get('is_passenger', True)}")

                    # Clean up test user
                    await users_collection.delete_one({"email": test_data["email"]})
                    print("✅ Test user cleaned up")
                else:
                    print("❌ User document not found in MongoDB")
            else:
                print("❌ User count did not increase in MongoDB")

        else:
            print(f"❌ Registration failed with status {response.status_code}")
            print(f"Response: {response.text}")

    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

    finally:
        await Database.close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(test_registration_api())