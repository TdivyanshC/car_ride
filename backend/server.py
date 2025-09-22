from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import socketio
import os
import logging
from pathlib import Path
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt

# Import our custom models and database
from models import (
    Database, COLLECTIONS,
    User, UserCreate, UserLogin, TokenResponse,
    Ride, RideCreate, Booking, BookingCreate,
    Message, ChatMessage, Location, RouteInfo
)

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL')
DB_NAME = os.environ.get('DB_NAME', 'car_ride_app')

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.environ.get('SECRET_KEY', "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Security
security = HTTPBearer()

# Socket.IO setup
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins="*")

# Create the main app
app = FastAPI(title="Car Ride Sharing API", version="1.0.0")

# Socket.IO integration
socket_app = socketio.ASGIApp(sio, app)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Utility functions
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Find user in MongoDB - convert string user_id back to ObjectId
    users_collection = Database.get_collection(COLLECTIONS["users"])
    from bson import ObjectId
    user_doc = await users_collection.find_one({"_id": ObjectId(user_id)})

    if user_doc is None:
        raise credentials_exception

    return User(**user_doc)

# Authentication routes - Clean and simple
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    """Register a new user"""
    try:
        users_collection = Database.get_collection(COLLECTIONS["users"])

        # Check if user already exists
        existing_user = await users_collection.find_one({"email": user_data.email})
        if existing_user:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Hash password
        hashed_password = get_password_hash(user_data.password)

        # Create user object
        user = User(
            email=user_data.email,
            password=hashed_password,
            name=user_data.name,
            phone=user_data.phone,
            is_rider=False,
            is_passenger=True
        )

        # Save to database
        user_dict = user.dict(by_alias=True)
        result = await users_collection.insert_one(user_dict)

        # Create JWT token
        access_token = create_access_token(data={"sub": str(result.inserted_id)})

        # Return simple response to avoid Unicode issues
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "phone": user.phone,
                "is_rider": user.is_rider,
                "is_passenger": user.is_passenger
            }
        }

    except Exception as e:
        print(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")

@api_router.post("/auth/login")
async def login(login_data: UserLogin):
    """Login user"""
    try:
        users_collection = Database.get_collection(COLLECTIONS["users"])

        # Find user by email
        user_doc = await users_collection.find_one({"email": login_data.email})
        if not user_doc:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Verify password
        if not verify_password(login_data.password, user_doc["password"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")

        # Create user object
        user = User(**user_doc)

        # Create JWT token
        access_token = create_access_token(data={"sub": str(user.id)})

        # Return simple response to avoid Unicode issues
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "id": str(user.id),
                "email": user.email,
                "name": user.name,
                "phone": user.phone,
                "is_rider": user.is_rider,
                "is_passenger": user.is_passenger
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"Login error: {e}")
        raise HTTPException(status_code=500, detail="Login failed")

@api_router.get("/auth/me")
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    # Return simple dict to avoid Unicode encoding issues
    return {
        "id": str(current_user.id),
        "email": current_user.email,
        "name": current_user.name,
        "phone": current_user.phone,
        "is_rider": current_user.is_rider,
        "is_passenger": current_user.is_passenger,
        "profile_image": current_user.profile_image
    }

# User routes
@api_router.put("/users/toggle-role")
async def toggle_user_role(current_user: User = Depends(get_current_user)):
    users_collection = Database.get_collection(COLLECTIONS["users"])

    # Toggle between rider and passenger
    new_is_rider = not current_user.is_rider
    new_is_passenger = not new_is_rider or current_user.is_passenger

    # Update user in MongoDB
    await users_collection.update_one(
        {"_id": current_user.id},
        {"$set": {"is_rider": new_is_rider, "is_passenger": new_is_passenger}}
    )

    return {"message": "Role updated successfully", "is_rider": bool(new_is_rider)}

# Ride routes
@api_router.post("/rides", response_model=Ride)
async def create_ride(ride_data: RideCreate, current_user: User = Depends(get_current_user)):
    if not current_user.is_rider:
        raise HTTPException(status_code=403, detail="Only riders can create rides")

    rides_collection = Database.get_collection(COLLECTIONS["rides"])

    # Create ride object
    ride = Ride(
        rider_id=str(current_user.id),
        rider_name=current_user.name,
        origin=Location(**ride_data.origin),
        destination=Location(**ride_data.destination),
        departure_time=ride_data.departure_time,
        available_seats=ride_data.available_seats,
        price_per_seat=ride_data.price_per_seat,
        description=ride_data.description or "",
        route_info=RouteInfo(**ride_data.route_info) if ride_data.route_info else None
    )

    # Save to MongoDB
    ride_dict = ride.dict(by_alias=True)
    result = await rides_collection.insert_one(ride_dict)

    print(f"Ride created: {ride.origin.name} -> {ride.destination.name} (${ride.price_per_seat})")
    return ride

@api_router.get("/rides", response_model=List[Ride])
async def search_rides(
    origin_lat: Optional[float] = None,
    origin_lng: Optional[float] = None,
    destination_lat: Optional[float] = None,
    destination_lng: Optional[float] = None,
    date: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    rides_collection = Database.get_collection(COLLECTIONS["rides"])

    # Base query for active rides with available seats
    query = {"status": "active", "available_seats": {"$gt": 0}}

    # Add date filter if provided
    if date:
        try:
            from datetime import datetime, timedelta
            target_date = datetime.fromisoformat(date.replace('Z', '+00:00'))
            next_day = target_date + timedelta(days=1)
            query["departure_time"] = {"$gte": target_date, "$lt": next_day}
        except Exception as e:
            print(f"Date parsing error: {e}")

    rides_docs = await rides_collection.find(query).to_list(100)
    rides = [Ride(**ride_doc) for ride_doc in rides_docs]

    print(f"Found {len(rides)} rides matching criteria")
    return rides

@api_router.get("/rides/my", response_model=List[Ride])
async def get_my_rides(current_user: User = Depends(get_current_user)):
    rides_collection = Database.get_collection(COLLECTIONS["rides"])

    rides_docs = await rides_collection.find({"rider_id": str(current_user.id)}).to_list(100)
    rides = [Ride(**ride_doc) for ride_doc in rides_docs]

    return rides

# Booking routes
@api_router.post("/bookings", response_model=Booking)
async def create_booking(booking_data: BookingCreate, current_user: User = Depends(get_current_user)):
    rides_collection = Database.get_collection(COLLECTIONS["rides"])
    bookings_collection = Database.get_collection(COLLECTIONS["bookings"])

    # Get ride details
    from bson import ObjectId
    print(f"Looking for ride with ID: {booking_data.ride_id}")
    try:
        ride_object_id = ObjectId(booking_data.ride_id)
        print(f"Converted to ObjectId: {ride_object_id}")
        ride_doc = await rides_collection.find_one({"_id": ride_object_id})
        print(f"Ride found: {ride_doc is not None}")
        if not ride_doc:
            # Let's see what rides are actually in the database
            all_rides = await rides_collection.find({}).to_list(10)
            print(f"Available rides in DB: {[str(r.get('_id')) for r in all_rides]}")
            raise HTTPException(status_code=404, detail="Ride not found")
    except Exception as e:
        print(f"Error finding ride: {e}")
        raise HTTPException(status_code=404, detail="Ride not found")

    ride = Ride(**ride_doc)

    if ride.available_seats < booking_data.seats_requested:
        raise HTTPException(status_code=400, detail="Not enough available seats")

    # Create booking
    total_price = ride.price_per_seat * booking_data.seats_requested
    booking = Booking(
        ride_id=booking_data.ride_id,
        passenger_id=str(current_user.id),
        passenger_name=current_user.name,
        seats_booked=booking_data.seats_requested,
        total_price=total_price
    )

    # Update ride available seats and save booking
    new_available_seats = ride.available_seats - booking_data.seats_requested

    # Use MongoDB transaction-like operations
    booking_dict = booking.dict(by_alias=True)
    await bookings_collection.insert_one(booking_dict)

    await rides_collection.update_one(
        {"_id": ObjectId(booking_data.ride_id)},
        {"$set": {"available_seats": new_available_seats}}
    )

    print(f"Booking created: {booking.seats_booked} seats for ${booking.total_price}")
    return booking

@api_router.get("/bookings/my", response_model=List[Booking])
async def get_my_bookings(current_user: User = Depends(get_current_user)):
    bookings_collection = Database.get_collection(COLLECTIONS["bookings"])

    bookings_docs = await bookings_collection.find({"passenger_id": str(current_user.id)}).to_list(100)
    bookings = [Booking(**booking_doc) for booking_doc in bookings_docs]

    return bookings

# Chat routes
@api_router.get("/chat/{ride_id}/messages", response_model=List[Message])
async def get_chat_messages(ride_id: str, current_user: User = Depends(get_current_user)):
    messages_collection = Database.get_collection(COLLECTIONS["messages"])

    messages_docs = await messages_collection.find({"ride_id": ride_id}).sort("timestamp", 1).to_list(100)
    messages = [Message(**msg_doc) for msg_doc in messages_docs]

    return messages

# Socket.IO events
@sio.event
async def connect(sid, environ):
    print(f"Client {sid} connected to chat")

@sio.event
async def disconnect(sid):
    print(f"Client {sid} disconnected from chat")

@sio.event
async def join_ride_chat(sid, data):
    ride_id = data.get("ride_id")
    if ride_id:
        await sio.enter_room(sid, f"ride_{ride_id}")
        print(f"Client {sid} joined ride {ride_id} chat")

@sio.event
async def send_message(sid, data):
    try:
        ride_id = data.get("ride_id")
        sender_id = data.get("sender_id")
        sender_name = data.get("sender_name")
        message_text = data.get("message")

        if not all([ride_id, sender_id, sender_name, message_text]):
            return

        messages_collection = Database.get_collection(COLLECTIONS["messages"])

        # Save message to MongoDB
        message = Message(
            ride_id=ride_id,
            sender_id=sender_id,
            sender_name=sender_name,
            message=message_text
        )

        message_dict = message.dict(by_alias=True)
        await messages_collection.insert_one(message_dict)

        # Broadcast message to room
        await sio.emit('new_message', message_dict, room=f"ride_{ride_id}")
        print(f"Message sent in ride {ride_id}: {sender_name}")

    except Exception as e:
        print(f"Error sending message: {e}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],  # Allow all origins for development
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Database connection and dummy data
async def add_dummy_rides():
    """Add some sample rides for testing purposes"""
    rides_collection = Database.get_collection(COLLECTIONS["rides"])

    dummy_rides = [
        {
            "_id": "ride_001",
            "rider_id": "user_demo",
            "rider_name": "John Doe",
            "origin": {
                "name": "New York City",
                "lat": 40.7128,
                "lng": -74.0060
            },
            "destination": {
                "name": "Boston",
                "lat": 42.3601,
                "lng": -71.0589
            },
            "departure_time": "2025-09-25T10:00:00Z",
            "available_seats": 3,
            "price_per_seat": 45.00,
            "description": "Comfortable ride with AC. Music allowed.",
            "route_info": {
                "distance": 380000,
                "duration": 14400
            },
            "status": "active",
            "created_at": "2025-09-20T10:00:00Z",
            "updated_at": "2025-09-20T10:00:00Z"
        },
        {
            "_id": "ride_002",
            "rider_id": "user_demo2",
            "rider_name": "Sarah Wilson",
            "origin": {
                "name": "Los Angeles",
                "lat": 34.0522,
                "lng": -118.2437
            },
            "destination": {
                "name": "San Francisco",
                "lat": 37.7749,
                "lng": -122.4194
            },
            "departure_time": "2025-09-26T14:30:00Z",
            "available_seats": 2,
            "price_per_seat": 35.00,
            "description": "Scenic route along the coast. Great conversation!",
            "route_info": {
                "distance": 615000,
                "duration": 21600
            },
            "status": "active",
            "created_at": "2025-09-20T11:00:00Z",
            "updated_at": "2025-09-20T11:00:00Z"
        },
        {
            "_id": "ride_003",
            "rider_id": "user_demo3",
            "rider_name": "Mike Johnson",
            "origin": {
                "name": "Chicago",
                "lat": 41.8781,
                "lng": -87.6298
            },
            "destination": {
                "name": "Detroit",
                "lat": 42.3314,
                "lng": -83.0458
            },
            "departure_time": "2025-09-24T16:00:00Z",
            "available_seats": 4,
            "price_per_seat": 25.00,
            "description": "Direct route, stops for coffee. Pet-friendly!",
            "route_info": {
                "distance": 430000,
                "duration": 16200
            },
            "status": "active",
            "created_at": "2025-09-20T12:00:00Z",
            "updated_at": "2025-09-20T12:00:00Z"
        },
        {
            "_id": "ride_004",
            "rider_id": "user_demo4",
            "rider_name": "Emma Davis",
            "origin": {
                "name": "Seattle",
                "lat": 47.6062,
                "lng": -122.3321
            },
            "destination": {
                "name": "Portland",
                "lat": 45.5152,
                "lng": -122.6784
            },
            "departure_time": "2025-09-27T09:15:00Z",
            "available_seats": 1,
            "price_per_seat": 30.00,
            "description": "Early morning ride. Coffee provided!",
            "route_info": {
                "distance": 235000,
                "duration": 9000
            },
            "status": "active",
            "created_at": "2025-09-20T13:00:00Z",
            "updated_at": "2025-09-20T13:00:00Z"
        }
    ]

    # Check if rides already exist
    existing_count = await rides_collection.count_documents({})
    if existing_count == 0:
        await rides_collection.insert_many(dummy_rides)
        print("Added " + str(len(dummy_rides)) + " dummy rides to MongoDB Atlas")
    else:
        print(str(existing_count) + " rides already exist in MongoDB Atlas")

@app.on_event("startup")
async def startup_event():
    print("Starting Car Ride Sharing API...")
    print("MongoDB URL: " + MONGO_URL.replace("mongodb+srv://", "mongodb+srv://[HIDDEN]@"))
    print("Database: " + DB_NAME)

    # Connect to MongoDB Atlas
    await Database.connect_to_mongo(MONGO_URL, DB_NAME)

    # Add dummy data
    await add_dummy_rides()

    print("API ready with MongoDB Atlas!")

@app.on_event("shutdown")
async def shutdown_event():
    print("Shutting down Car Ride Sharing API...")
    await Database.close_mongo_connection()

# Use socket_app as the main application
main_app = socket_app

if __name__ == "__main__":
    import uvicorn
    print("Starting server on http://0.0.0.0:8001")
    print("Accessible from mobile devices at http://192.168.1.7:8001")
    print("Socket.IO enabled for real-time chat")
    print("MongoDB Atlas integration active")
    uvicorn.run(main_app, host="0.0.0.0", port=8001)