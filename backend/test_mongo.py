#!/usr/bin/env python3
"""
Test script for MongoDB Atlas connection
Run this to verify your MongoDB Atlas setup is working
"""

import asyncio
import os
from dotenv import load_dotenv
from pathlib import Path
from models import Database, COLLECTIONS

async def test_mongo_connection():
    """Test MongoDB Atlas connection and basic operations"""

    # Load environment variables
    ROOT_DIR = Path(__file__).parent
    load_dotenv(ROOT_DIR / '.env')

    MONGO_URL = os.environ.get('MONGO_URL')
    DB_NAME = os.environ.get('DB_NAME', 'car_ride_app')

    if not MONGO_URL:
        print("ERROR: MONGO_URL not found in .env file")
        print("Please set up your MongoDB Atlas connection string")
        return

    print("Testing MongoDB Atlas connection...")
    print("URL: " + MONGO_URL.replace("mongodb+srv://", "mongodb+srv://[HIDDEN]@"))
    print("Database: " + DB_NAME)

    try:
        # Connect to MongoDB
        await Database.connect_to_mongo(MONGO_URL, DB_NAME)

        # Test basic operations
        users_collection = Database.get_collection(COLLECTIONS["users"])
        rides_collection = Database.get_collection(COLLECTIONS["rides"])

        # Count documents
        users_count = await users_collection.count_documents({})
        rides_count = await rides_collection.count_documents({})

        print("SUCCESS: MongoDB Atlas connection successful!")
        print("Users in database: " + str(users_count))
        print("Rides in database: " + str(rides_count))

        print("SUCCESS: MongoDB Atlas connection successful!")
        print("Users in database: " + str(users_count))
        print("Rides in database: " + str(rides_count))

        # Test inserting a sample document
        test_doc = {
            "test_field": "connection_test",
            "timestamp": "2025-09-21T04:00:00Z"
        }

        # Insert into a test collection
        test_collection = Database.get_collection("test_connection")
        result = await test_collection.insert_one(test_doc)
        print("Test document inserted with ID: " + str(result.inserted_id))

        # Clean up test document
        await test_collection.delete_one({"_id": result.inserted_id})
        print("Test document cleaned up")

        print("\nMongoDB Atlas is ready for your Car Ride Sharing app!")

    except Exception as e:
        print("ERROR: MongoDB connection failed: " + str(e))
        print("\nTroubleshooting tips:")
        print("1. Check your MongoDB Atlas connection string")
        print("2. Ensure your IP address is whitelisted in Atlas")
        print("3. Verify your database user credentials")
        print("4. Make sure your cluster is running")

    finally:
        # Close connection
        await Database.close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(test_mongo_connection())