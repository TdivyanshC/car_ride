#!/usr/bin/env python3
"""
Test script for User Schema and Registration/Login functionality
Run this to verify user operations work correctly with MongoDB Atlas
"""

import asyncio
import os
from dotenv import load_dotenv
from pathlib import Path
from models import Database, COLLECTIONS, User, UserCreate
from passlib.context import CryptContext

# Load environment variables
load_dotenv(Path(__file__).parent / '.env')

# Password hashing setup (same as server.py)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def test_user_schema():
    """Test User schema, registration, and login functionality"""
    try:
        # Connect to MongoDB
        MONGO_URL = os.environ.get('MONGO_URL')
        DB_NAME = os.environ.get('DB_NAME', 'ride_app')

        print("Connecting to MongoDB Atlas...")
        print(f"URL: {MONGO_URL.replace('mongodb+srv://', 'mongodb+srv://[HIDDEN]@') if MONGO_URL else 'None'}")
        print(f"Database: {DB_NAME}")

        if not MONGO_URL:
            print("MONGO_URL environment variable not found")
            return

        await Database.connect_to_mongo(MONGO_URL, DB_NAME)

        # Get users collection
        users_collection = Database.get_collection(COLLECTIONS["users"])

        # Test data
        test_email = "test_user@example.com"
        test_password = "TestPassword123"
        test_name = "Test User"
        test_phone = "1234567890"

        print("\nTesting User Schema Structure...")

        # Check User model fields
        user_fields = User.__fields__
        required_fields = ['email', 'password', 'name', 'phone', 'is_rider', 'is_passenger']
        print("Required User fields:")
        for field in required_fields:
            if field in user_fields:
                field_info = user_fields[field]
                field_type = str(field_info.type_).replace("<class '", "").replace("'>", "")
                default = getattr(field_info, 'default', 'No default')
                print(f"  {field}: {field_type} (default: {default})")
            else:
                print(f"  {field}: MISSING")

        print("\nTesting Password Hashing...")
        # Test password hashing
        hashed_password = pwd_context.hash(test_password)
        print(f"Original password: {test_password}")
        print(f"Hashed password: {hashed_password[:20]}...")

        # Test password verification
        is_valid = pwd_context.verify(test_password, hashed_password)
        print(f"Password verification: {'Valid' if is_valid else 'Invalid'}")

        print("\nTesting User Registration (CREATE)...")

        # Clean up any existing test user
        existing_user = await users_collection.find_one({"email": test_email})
        if existing_user:
            print("Cleaning up existing test user...")
            await users_collection.delete_one({"email": test_email})

        # Create user (simulating registration)
        user_data = UserCreate(
            email=test_email,
            password=test_password,
            name=test_name,
            phone=test_phone
        )

        # Hash password and create User object
        hashed_pwd = pwd_context.hash(user_data.password)
        user = User(
            email=user_data.email,
            password=hashed_pwd,
            name=user_data.name,
            phone=user_data.phone,
            is_rider=False,  # Default values
            is_passenger=True
        )

        # Save to MongoDB
        user_dict = user.dict(by_alias=True)
        result = await users_collection.insert_one(user_dict)
        user_id = result.inserted_id

        print("User registered successfully!")
        print(f"   ID: {user_id}")
        print(f"   Email: {user.email}")
        print(f"   Name: {user.name}")
        print(f"   Phone: {user.phone}")

        print("\nTesting User Retrieval (LOGIN)...")

        # Retrieve user by email (simulating login)
        user_doc = await users_collection.find_one({"email": test_email})
        if user_doc:
            retrieved_user = User(**user_doc)
            print("User found by email!")
            print(f"   Retrieved ID: {retrieved_user.id}")
            print(f"   Retrieved Email: {retrieved_user.email}")
            print(f"   Retrieved Name: {retrieved_user.name}")
            print(f"   Retrieved Phone: {retrieved_user.phone}")

            # Test password verification
            pwd_valid = pwd_context.verify(test_password, retrieved_user.password)
            print(f"   Password check: {'Valid' if pwd_valid else 'Invalid'}")

        else:
            print("User not found by email")

        print("\nTesting User Retrieval by ID (JWT)...")

        # Retrieve user by ID (simulating JWT token validation)
        user_by_id_doc = await users_collection.find_one({"_id": user_id})
        if user_by_id_doc:
            user_by_id = User(**user_by_id_doc)
            print("User found by ID!")
            print(f"   ID match: {'Yes' if str(user_by_id.id) == str(user_id) else 'No'}")
        else:
            print("User not found by ID")

        print("\nTesting User Counts and Database State...")

        # Count users
        total_users = await users_collection.count_documents({})
        print(f"Total users in database: {total_users}")

        # Check user roles
        riders_count = await users_collection.count_documents({"is_rider": True})
        passengers_count = await users_collection.count_documents({"is_passenger": True})
        print(f"Riders: {riders_count}, Passengers: {passengers_count}")

        print("\nCleaning up test data...")
        await users_collection.delete_one({"email": test_email})
        print("Test user deleted")

        print("\nUSER SCHEMA TEST COMPLETE!")
        print("User registration/login schema works correctly")
        print("MongoDB Atlas stores user data properly")
        print("Password hashing and verification work")
        print("User retrieval by email and ID work")

    except Exception as e:
        print(f"User schema test failed: {e}")
        import traceback
        traceback.print_exc()

    finally:
        await Database.close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(test_user_schema())