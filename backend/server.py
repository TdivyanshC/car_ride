from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import socketio
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import bcrypt
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Socket.IO setup
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins="*")

# Create the main app
app = FastAPI()

# Socket.IO integration
socket_app = socketio.ASGIApp(sio, app)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    name: str
    phone: str
    is_rider: bool = False
    is_passenger: bool = True
    profile_image: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: User

class RideCreate(BaseModel):
    origin: Dict[str, Any]  # {name, lat, lng}
    destination: Dict[str, Any]  # {name, lat, lng}
    departure_time: datetime
    available_seats: int
    price_per_seat: float
    description: Optional[str] = ""
    route_info: Optional[Dict[str, Any]] = None  # Distance, duration from Mapbox

class Ride(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    rider_id: str
    rider_name: str
    origin: Dict[str, Any]
    destination: Dict[str, Any]
    departure_time: datetime
    available_seats: int
    price_per_seat: float
    description: str
    route_info: Optional[Dict[str, Any]] = None
    status: str = "active"  # active, completed, cancelled
    created_at: datetime = Field(default_factory=datetime.utcnow)

class BookingCreate(BaseModel):
    ride_id: str
    seats_requested: int

class Booking(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ride_id: str
    passenger_id: str
    passenger_name: str
    seats_booked: int
    total_price: float
    status: str = "confirmed"  # confirmed, cancelled
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Message(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ride_id: str
    sender_id: str
    sender_name: str
    message: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

class ChatMessage(BaseModel):
    ride_id: str
    message: str

# Utility functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
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
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise credentials_exception
    return User(**user)

# Authentication routes
@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password and create user
    hashed_password = get_password_hash(user_data.password)
    user_dict = user_data.dict()
    user_dict.pop("password")
    user_obj = User(**user_dict)
    
    # Save to database
    user_doc = user_obj.dict()
    user_doc["password"] = hashed_password
    await db.users.insert_one(user_doc)
    
    # Create token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_obj.id}, expires_delta=access_token_expires
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_obj
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    user_obj = User(**user)
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user_obj.id}, expires_delta=access_token_expires
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_obj
    )

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# User routes
@api_router.put("/users/toggle-role")
async def toggle_user_role(current_user: User = Depends(get_current_user)):
    # Toggle between rider and passenger
    new_is_rider = not current_user.is_rider
    new_is_passenger = not new_is_rider or current_user.is_passenger
    
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"is_rider": new_is_rider, "is_passenger": new_is_passenger}}
    )
    
    return {"message": "Role updated successfully", "is_rider": new_is_rider}

# Ride routes
@api_router.post("/rides", response_model=Ride)
async def create_ride(ride_data: RideCreate, current_user: User = Depends(get_current_user)):
    if not current_user.is_rider:
        raise HTTPException(status_code=403, detail="Only riders can create rides")
    
    ride_dict = ride_data.dict()
    ride_dict["rider_id"] = current_user.id
    ride_dict["rider_name"] = current_user.name
    ride_obj = Ride(**ride_dict)
    
    await db.rides.insert_one(ride_obj.dict())
    return ride_obj

@api_router.get("/rides", response_model=List[Ride])
async def search_rides(
    origin_lat: Optional[float] = None,
    origin_lng: Optional[float] = None,
    destination_lat: Optional[float] = None,
    destination_lng: Optional[float] = None,
    date: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {"status": "active", "available_seats": {"$gt": 0}}
    
    # Add date filter if provided
    if date:
        try:
            target_date = datetime.fromisoformat(date.replace('Z', '+00:00'))
            next_day = target_date + timedelta(days=1)
            query["departure_time"] = {"$gte": target_date, "$lt": next_day}
        except:
            pass
    
    rides = await db.rides.find(query).to_list(100)
    return [Ride(**ride) for ride in rides]

@api_router.get("/rides/my", response_model=List[Ride])
async def get_my_rides(current_user: User = Depends(get_current_user)):
    rides = await db.rides.find({"rider_id": current_user.id}).to_list(100)
    return [Ride(**ride) for ride in rides]

# Booking routes
@api_router.post("/bookings", response_model=Booking)
async def create_booking(booking_data: BookingCreate, current_user: User = Depends(get_current_user)):
    # Get ride details
    ride = await db.rides.find_one({"id": booking_data.ride_id})
    if not ride:
        raise HTTPException(status_code=404, detail="Ride not found")
    
    if ride["available_seats"] < booking_data.seats_requested:
        raise HTTPException(status_code=400, detail="Not enough available seats")
    
    # Create booking
    total_price = ride["price_per_seat"] * booking_data.seats_requested
    booking_dict = booking_data.dict()
    booking_dict.update({
        "passenger_id": current_user.id,
        "passenger_name": current_user.name,
        "total_price": total_price
    })
    booking_obj = Booking(**booking_dict)
    
    # Update ride available seats
    new_available_seats = ride["available_seats"] - booking_data.seats_requested
    
    # Save booking and update ride in transaction-like manner
    await db.bookings.insert_one(booking_obj.dict())
    await db.rides.update_one(
        {"id": booking_data.ride_id},
        {"$set": {"available_seats": new_available_seats}}
    )
    
    return booking_obj

@api_router.get("/bookings/my", response_model=List[Booking])
async def get_my_bookings(current_user: User = Depends(get_current_user)):
    bookings = await db.bookings.find({"passenger_id": current_user.id}).to_list(100)
    return [Booking(**booking) for booking in bookings]

# Chat routes
@api_router.get("/chat/{ride_id}/messages", response_model=List[Message])
async def get_chat_messages(ride_id: str, current_user: User = Depends(get_current_user)):
    messages = await db.messages.find({"ride_id": ride_id}).sort("timestamp", 1).to_list(100)
    return [Message(**message) for message in messages]

# Socket.IO events
@sio.event
async def connect(sid, environ):
    print(f"Client {sid} connected")

@sio.event
async def disconnect(sid):
    print(f"Client {sid} disconnected")

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
        
        # Save message to database
        message_obj = Message(
            ride_id=ride_id,
            sender_id=sender_id,
            sender_name=sender_name,
            message=message_text
        )
        
        await db.messages.insert_one(message_obj.dict())
        
        # Broadcast message to room
        await sio.emit('new_message', message_obj.dict(), room=f"ride_{ride_id}")
        
    except Exception as e:
        print(f"Error sending message: {e}")

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Use socket_app as the main application
# But we need to preserve the original app for health checks
main_app = socket_app