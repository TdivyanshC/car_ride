#!/usr/bin/env python3
"""
Test script for ride publishing functionality
"""

import asyncio
import os
import aiohttp
from dotenv import load_dotenv
from pathlib import Path
from models import Database, COLLECTIONS

async def test_publish_ride():
    """Test publishing a ride and verifying it appears in database"""

    # Load environment variables
    ROOT_DIR = Path(__file__).parent
    load_dotenv(ROOT_DIR / '.env')

    MONGO_URL = os.environ.get('MONGO_URL')
    DB_NAME = os.environ.get('DB_NAME', 'car_ride_app')
    BACKEND_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'http://localhost:8001')

    print("=== Testing Ride Publishing ===")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"Database: {DB_NAME}")

    try:
        # Connect to MongoDB
        await Database.connect_to_mongo(MONGO_URL, DB_NAME)

        # Check if test user exists, create if not
        users_collection = Database.get_collection(COLLECTIONS["users"])
        test_user = await users_collection.find_one({"email": "test@example.com"})

        if not test_user:
            print("Creating test user...")
            from models import User
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

            test_user = User(
                email="test@example.com",
                password=pwd_context.hash("password123"),
                name="Test User",
                phone="1234567890",
                is_rider=True,  # Make this user a rider
                is_passenger=True
            )
            user_dict = test_user.dict(by_alias=True)
            result = await users_collection.insert_one(user_dict)
            test_user.id = result.inserted_id
            print(f"Created test user with ID: {test_user.id}")
        else:
            print(f"Using existing test user with ID: {test_user['_id']}")
            # Update user to be a rider if not already
            if not test_user.get('is_rider', False):
                await users_collection.update_one(
                    {"_id": test_user["_id"]},
                    {"$set": {"is_rider": True}}
                )
                print("Updated user to be a rider")
                test_user['is_rider'] = True

        # Login via API
        print("\n=== Testing Login ===")
        async with aiohttp.ClientSession() as session:
            login_data = {
                "email": "test@example.com",
                "password": "password123"
            }

            async with session.post(f"{BACKEND_URL}/api/auth/login", json=login_data) as response:
                if response.status == 200:
                    login_result = await response.json()
                    token = login_result["access_token"]
                    user_info = login_result["user"]
                    print(f"Login successful! User: {user_info['name']}")
                else:
                    print(f"Login failed: {response.status}")
                    return

            # Set auth header for subsequent requests
            headers = {"Authorization": f"Bearer {token}"}

            # Publish a ride
            print("\n=== Publishing Ride ===")
            import datetime
            departure_time = (datetime.datetime.utcnow() + datetime.timedelta(hours=2)).isoformat() + 'Z'

            ride_data = {
                "origin": {
                    "name": "Test Origin",
                    "lat": 37.7749,
                    "lng": -122.4194
                },
                "destination": {
                    "name": "Test Destination",
                    "lat": 37.7849,
                    "lng": -122.4094
                },
                "departure_time": departure_time,
                "available_seats": 3,
                "price_per_seat": 25.0
            }

            async with session.post(f"{BACKEND_URL}/api/rides", json=ride_data, headers=headers) as response:
                if response.status == 200:
                    ride_result = await response.json()
                    print("Ride published successfully!")
                    print(f"Response: {ride_result}")
                else:
                    error_text = await response.text()
                    print(f"Ride publishing failed: {response.status} - {error_text}")
                    return

        # Verify ride appears in database
        print("\n=== Verifying Ride in Database ===")

        # Check rides collection
        rides_collection = Database.get_collection(COLLECTIONS["rides"])
        user_rides = await rides_collection.find({"rider_id": str(test_user["_id"])}).to_list(10)
        print(f"User's published rides: {len(user_rides)}")

        if user_rides:
            for ride in user_rides:
                print(f"Ride ID: {ride['_id']}")
                print(f"  From: {ride['origin']['name']}")
                print(f"  To: {ride['destination']['name']}")
                print(f"  Price: ${ride['price_per_seat']}")
                print(f"  Seats: {ride['available_seats']}")
                print(f"  Status: {ride['status']}")

        print("\n=== Test Complete ===")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

    finally:
        # Close connection
        await Database.close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(test_publish_ride())