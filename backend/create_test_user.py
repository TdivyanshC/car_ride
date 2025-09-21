#!/usr/bin/env python3
"""
Create a test user directly in MongoDB Atlas for login testing
"""

import asyncio
import os
from dotenv import load_dotenv
from pathlib import Path
from models import Database, COLLECTIONS, User
from passlib.context import CryptContext

# Load environment variables
load_dotenv(Path(__file__).parent / '.env')

# Password hashing setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def create_test_user():
    """Create a test user in MongoDB Atlas"""
    try:
        # Connect to MongoDB
        MONGO_URL = os.environ.get('MONGO_URL')
        DB_NAME = os.environ.get('DB_NAME', 'ride_app')

        print("Connecting to MongoDB Atlas...")
        await Database.connect_to_mongo(MONGO_URL, DB_NAME)

        # Get users collection
        users_collection = Database.get_collection(COLLECTIONS["users"])

        # Test user data
        test_email = "test@example.com"
        test_password = "password123"
        test_name = "Test User"
        test_phone = "1234567890"

        # Check if user already exists
        existing_user = await users_collection.find_one({"email": test_email})
        if existing_user:
            print(f"User {test_email} already exists. Deleting...")
            await users_collection.delete_one({"email": test_email})

        # Hash password
        hashed_password = pwd_context.hash(test_password)

        # Create user object
        user = User(
            email=test_email,
            password=hashed_password,
            name=test_name,
            phone=test_phone,
            is_rider=False,
            is_passenger=True
        )

        # Save to MongoDB
        user_dict = user.dict(by_alias=True)
        result = await users_collection.insert_one(user_dict)

        print("SUCCESS: Test user created successfully!")
        print(f"   ID: {result.inserted_id}")
        print(f"   Email: {test_email}")
        print(f"   Password: {test_password}")
        print(f"   Name: {test_name}")
        print(f"   Phone: {test_phone}")
        print()
        print("Check MongoDB Atlas dashboard - you should now see this user in the 'users' collection!")
        print()
        print("Test login in the app with:")
        print(f"   Email: {test_email}")
        print(f"   Password: {test_password}")

    except Exception as e:
        print(f"ERROR: Failed to create test user: {e}")
        import traceback
        traceback.print_exc()

    finally:
        await Database.close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(create_test_user())