#!/usr/bin/env python3
"""
End-to-end test for user login and ride booking
Tests the complete booking flow and verifies database updates
"""

import asyncio
import os
import aiohttp
from dotenv import load_dotenv
from pathlib import Path
from models import Database, COLLECTIONS

async def test_full_booking_flow():
    """Test complete booking flow: login -> book ride -> verify updates"""

    # Load environment variables
    ROOT_DIR = Path(__file__).parent
    load_dotenv(ROOT_DIR / '.env')

    MONGO_URL = os.environ.get('MONGO_URL')
    DB_NAME = os.environ.get('DB_NAME', 'car_ride_app')
    BACKEND_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'http://localhost:8001')

    print("=== Testing Full Booking Flow ===")
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
                is_rider=False,
                is_passenger=True
            )
            user_dict = test_user.dict(by_alias=True)
            result = await users_collection.insert_one(user_dict)
            test_user.id = result.inserted_id
            print(f"Created test user with ID: {test_user.id}")
        else:
            print(f"Using existing test user with ID: {test_user['_id']}")

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
                    print(f"Token: {token[:20]}...")
                else:
                    print(f"Login failed: {response.status}")
                    return

            # Set auth header for subsequent requests
            headers = {"Authorization": f"Bearer {token}"}

            # Get available rides
            print("\n=== Getting Available Rides ===")
            async with session.get(f"{BACKEND_URL}/api/rides", headers=headers) as response:
                if response.status == 200:
                    rides = await response.json()
                    print(f"Found {len(rides)} rides")
                    if rides:
                        ride = rides[0]  # Use first ride
                        ride_id = ride["_id"]
                        print(f"Using ride ID: {ride_id} (Rider: {ride['rider_name']})")
                    else:
                        print("No rides available!")
                        return
                else:
                    print(f"Failed to get rides: {response.status}")
                    return

            # Book the ride
            print("\n=== Booking Ride ===")
            booking_data = {
                "ride_id": ride_id,
                "seats_requested": 1
            }

            async with session.post(f"{BACKEND_URL}/api/bookings", json=booking_data, headers=headers) as response:
                if response.status == 200:
                    booking_result = await response.json()
                    print("Booking successful!")
                    print(f"Seats booked: {booking_result['seats_booked']}")
                    print(f"Total price: ${booking_result['total_price']}")
                    print(f"Ride ID: {booking_result['ride_id']}")
                    print(f"Passenger: {booking_result['passenger_name']}")
                else:
                    error_text = await response.text()
                    print(f"Booking failed: {response.status} - {error_text}")
                    return

        # Verify database updates
        print("\n=== Verifying Database Updates ===")

        # Check ride updates
        rides_collection = Database.get_collection(COLLECTIONS["rides"])
        updated_ride = await rides_collection.find_one({"_id": ride_id})
        if updated_ride:
            other_riders = updated_ride.get("other_riders", [])
            available_seats = updated_ride.get("available_seats", 0)
            print(f"Ride {ride_id}:")
            print(f"  Available seats: {available_seats} (should be decreased)")
            print(f"  Other riders: {other_riders}")
            if str(test_user["_id"]) in other_riders:
                print("  ✓ User added to other_riders")
            else:
                print("  ✗ User NOT found in other_riders")
        else:
            print("  ✗ Ride not found in database")

        # Check user updates
        updated_user = await users_collection.find_one({"_id": test_user["_id"]})
        if updated_user:
            booked_rides = updated_user.get("booked_rides", [])
            print(f"\nUser {test_user['_id']}:")
            print(f"  Booked rides: {booked_rides}")
            if ride_id in booked_rides:
                print("  ✓ Ride added to user's booked_rides")
            else:
                print("  ✗ Ride NOT found in user's booked_rides")

        # Check booking collection
        bookings_collection = Database.get_collection(COLLECTIONS["bookings"])
        user_bookings = await bookings_collection.find({"passenger_id": str(test_user["_id"])}).to_list(10)
        print(f"\nUser's bookings: {len(user_bookings)}")
        for booking in user_bookings:
            print(f"  Booking {booking['_id']}: Ride {booking['ride_id']}, Seats: {booking['seats_booked']}")

        print("\n=== Test Complete ===")

    except Exception as e:
        print(f"ERROR: {e}")
        import traceback
        traceback.print_exc()

    finally:
        # Close connection
        await Database.close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(test_full_booking_flow())