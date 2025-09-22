#!/usr/bin/env python3
"""
Test script to check rides in database and test booking
"""

import asyncio
import os
from dotenv import load_dotenv
from pathlib import Path
from models import Database, COLLECTIONS, BookingCreate

async def test_rides_and_booking():
    """Test rides in database and booking functionality"""

    # Load environment variables
    ROOT_DIR = Path(__file__).parent
    load_dotenv(ROOT_DIR / '.env')

    MONGO_URL = os.environ.get('MONGO_URL')
    DB_NAME = os.environ.get('DB_NAME', 'car_ride_app')

    try:
        # Connect to MongoDB
        await Database.connect_to_mongo(MONGO_URL, DB_NAME)

        rides_collection = Database.get_collection(COLLECTIONS["rides"])

        # Get all rides
        all_rides = await rides_collection.find({}).to_list(10)
        print(f"Found {len(all_rides)} rides in database:")
        for ride in all_rides:
            print(f"  ID: {ride.get('_id')} (type: {type(ride.get('_id'))})")
            print(f"  Rider: {ride.get('rider_name')}")
            print(f"  Route: {ride.get('origin', {}).get('name')} -> {ride.get('destination', {}).get('name')}")
            print()

        # Test booking with correct ride ID
        if all_rides:
            test_ride_id = str(all_rides[0]['_id'])
            print(f"Testing booking with ride ID: {test_ride_id}")

            # Try to find the ride
            ride_doc = await rides_collection.find_one({"_id": test_ride_id})
            if ride_doc:
                print("Ride found successfully!")
                print(f"   Available seats: {ride_doc.get('available_seats')}")
            else:
                print("Ride not found")

            # Test with ObjectId lookup (what the frontend is doing wrong)
            wrong_id = "68d141c33c3161112ee43a22"
            print(f"Testing with wrong ObjectId: {wrong_id}")
            from bson import ObjectId
            ride_doc_wrong = await rides_collection.find_one({"_id": ObjectId(wrong_id)})
            if ride_doc_wrong:
                print("Wrong ID found (unexpected!)")
            else:
                print("Wrong ID not found (expected)")

    except Exception as e:
        print(f"ERROR: {e}")

    finally:
        # Close connection
        await Database.close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(test_rides_and_booking())