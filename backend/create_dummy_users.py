#!/usr/bin/env python3
"""
Script to create dummy users for testing the car ride sharing app
"""
import asyncio
import sys
import os
from pathlib import Path

# Add the backend directory to the path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from models import Database, COLLECTIONS, User
from server import get_password_hash

async def create_dummy_users():
    """Create registered users for dummy rides"""
    print("Creating dummy users for ride testing...")

    # Connect to database
    mongo_url = os.environ.get('MONGO_URL')
    db_name = os.environ.get('DB_NAME', 'ride_app')

    if not mongo_url:
        print("ERROR: MONGO_URL not found in environment")
        return

    await Database.connect_to_mongo(mongo_url, db_name)

    users_collection = Database.get_collection(COLLECTIONS["users"])

    dummy_users = [
        {
            "email": "john.doe@example.com",
            "password": get_password_hash("password123"),
            "name": "John Doe",
            "phone": "1234567890",
            "is_rider": True,
            "is_passenger": False
        },
        {
            "email": "sarah.wilson@example.com",
            "password": get_password_hash("password123"),
            "name": "Sarah Wilson",
            "phone": "1234567891",
            "is_rider": True,
            "is_passenger": False
        },
        {
            "email": "mike.johnson@example.com",
            "password": get_password_hash("password123"),
            "name": "Mike Johnson",
            "phone": "1234567892",
            "is_rider": True,
            "is_passenger": False
        },
        {
            "email": "emma.davis@example.com",
            "password": get_password_hash("password123"),
            "name": "Emma Davis",
            "phone": "1234567893",
            "is_rider": True,
            "is_passenger": False
        }
    ]

    user_ids = []
    for user_data in dummy_users:
        # Check if user already exists
        existing_user = await users_collection.find_one({"email": user_data["email"]})
        if not existing_user:
            result = await users_collection.insert_one(user_data)
            user_id = str(result.inserted_id)
            user_ids.append(user_id)
            print(f"Created user: {user_data['name']} with ID: {user_id}")
        else:
            user_id = str(existing_user["_id"])
            user_ids.append(user_id)
            print(f"User already exists: {user_data['name']} (ID: {user_id})")

    print(f"\nUser IDs for rides: {user_ids}")

    # Update existing rides with proper user IDs
    rides_collection = Database.get_collection(COLLECTIONS["rides"])

    ride_updates = [
        {"rider_name": "John Doe", "new_rider_id": user_ids[0]},
        {"rider_name": "Sarah Wilson", "new_rider_id": user_ids[1]},
        {"rider_name": "Mike Johnson", "new_rider_id": user_ids[2]},
        {"rider_name": "Emma Davis", "new_rider_id": user_ids[3]},
    ]

    for update in ride_updates:
        result = await rides_collection.update_many(
            {"rider_name": update["rider_name"]},
            {"$set": {"rider_id": update["new_rider_id"]}}
        )
        if result.modified_count > 0:
            print(f"Updated {result.modified_count} rides for {update['rider_name']}")

    print("\nDummy users created and rides updated successfully!")
    print("You can now test booking rides with these user accounts:")
    print("- john.doe@example.com / password123")
    print("- sarah.wilson@example.com / password123")
    print("- mike.johnson@example.com / password123")
    print("- emma.davis@example.com / password123")

    await Database.close_mongo_connection()

if __name__ == "__main__":
    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv(backend_dir / '.env')

    asyncio.run(create_dummy_users())