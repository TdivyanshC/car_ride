from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

# Custom ObjectId field for Pydantic
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")

# Base models with common fields
class MongoBaseModel(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

# Location model
class Location(BaseModel):
    name: str
    lat: float
    lng: float

# Route info model
class RouteInfo(BaseModel):
    distance: float  # in meters
    duration: float  # in seconds
    route: Optional[Dict[str, Any]] = None

# User model
class User(MongoBaseModel):
    email: EmailStr
    password: str  # hashed password
    name: str
    phone: str
    is_rider: bool = False
    is_passenger: bool = True
    profile_image: Optional[str] = None

# Ride model
class Ride(MongoBaseModel):
    rider_id: str
    rider_name: str
    origin: Location
    destination: Location
    departure_time: datetime
    available_seats: int
    price_per_seat: float
    description: Optional[str] = ""
    route_info: Optional[RouteInfo] = None
    status: str = "active"  # active, completed, cancelled

# Booking model
class Booking(MongoBaseModel):
    ride_id: str
    passenger_id: str
    passenger_name: str
    seats_booked: int
    total_price: float
    status: str = "confirmed"  # confirmed, cancelled

# Message model for chat
class Message(MongoBaseModel):
    ride_id: str
    sender_id: str
    sender_name: str
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# API request/response models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: User

class RideCreate(BaseModel):
    origin: Location
    destination: Location
    departure_time: datetime
    available_seats: int
    price_per_seat: float
    description: Optional[str] = ""
    route_info: Optional[RouteInfo] = None

class BookingCreate(BaseModel):
    ride_id: str
    seats_requested: int

class ChatMessage(BaseModel):
    ride_id: str
    message: str

# Database connection and collections
class Database:
    client: AsyncIOMotorClient = None
    db = None

    @classmethod
    async def connect_to_mongo(cls, mongo_url: str, db_name: str):
        """Connect to MongoDB Atlas"""
        cls.client = AsyncIOMotorClient(mongo_url)
        cls.db = cls.client[db_name]

        # Test the connection
        try:
            await cls.client.admin.command('ping')
            print("SUCCESS: Connected to MongoDB Atlas successfully!")
        except Exception as e:
            print(f"ERROR: MongoDB connection failed: {e}")
            raise

    @classmethod
    async def close_mongo_connection(cls):
        """Close MongoDB connection"""
        if cls.client:
            cls.client.close()
            print("SUCCESS: MongoDB connection closed")

    @classmethod
    def get_collection(cls, collection_name: str):
        """Get a collection from the database"""
        if cls.db is None:
            raise Exception("Database not initialized")
        return cls.db[collection_name]

# Collection names
COLLECTIONS = {
    "users": "users",
    "rides": "rides",
    "bookings": "bookings",
    "messages": "messages"
}