#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Ride-Sharing App
Tests all authentication, user management, ride management, booking, and chat endpoints
"""

import requests
import json
import time
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "https://ridesync-7.preview.emergentagent.com/api"
HEADERS = {"Content-Type": "application/json"}

class RideSharingAPITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.headers = HEADERS.copy()
        self.auth_token = None
        self.current_user = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test results"""
        result = {
            "test": test_name,
            "success": success,
            "details": details,
            "response_data": response_data,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}: {details}")
        
    def set_auth_token(self, token: str):
        """Set authentication token for subsequent requests"""
        self.auth_token = token
        self.headers["Authorization"] = f"Bearer {token}"
        
    def make_request(self, method: str, endpoint: str, data: Dict = None, params: Dict = None) -> tuple:
        """Make HTTP request and return (success, response_data, status_code)"""
        url = f"{self.base_url}{endpoint}"
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=self.headers, params=params, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, headers=self.headers, json=data, timeout=30)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=self.headers, json=data, timeout=30)
            else:
                return False, f"Unsupported method: {method}", 0
                
            return response.status_code < 400, response.json() if response.content else {}, response.status_code
        except requests.exceptions.RequestException as e:
            return False, f"Request failed: {str(e)}", 0
        except json.JSONDecodeError:
            return False, "Invalid JSON response", response.status_code if 'response' in locals() else 0
            
    def test_user_registration(self):
        """Test user registration endpoint"""
        test_user = {
            "email": "sarah.johnson@example.com",
            "password": "SecurePass123!",
            "name": "Sarah Johnson",
            "phone": "+1-555-0123"
        }
        
        success, response_data, status_code = self.make_request("POST", "/auth/register", test_user)
        
        if success and "access_token" in response_data:
            self.set_auth_token(response_data["access_token"])
            self.current_user = response_data["user"]
            self.log_test("User Registration", True, f"User registered successfully with ID: {self.current_user['id']}", response_data)
            return True
        else:
            self.log_test("User Registration", False, f"Registration failed: {response_data} (Status: {status_code})", response_data)
            return False
            
    def test_user_login(self):
        """Test user login endpoint"""
        login_data = {
            "email": "sarah.johnson@example.com",
            "password": "SecurePass123!"
        }
        
        success, response_data, status_code = self.make_request("POST", "/auth/login", login_data)
        
        if success and "access_token" in response_data:
            self.set_auth_token(response_data["access_token"])
            self.current_user = response_data["user"]
            self.log_test("User Login", True, f"Login successful for user: {self.current_user['name']}", response_data)
            return True
        else:
            self.log_test("User Login", False, f"Login failed: {response_data} (Status: {status_code})", response_data)
            return False
            
    def test_invalid_login(self):
        """Test login with invalid credentials"""
        invalid_login = {
            "email": "sarah.johnson@example.com",
            "password": "WrongPassword123!"
        }
        
        success, response_data, status_code = self.make_request("POST", "/auth/login", invalid_login)
        
        if not success and status_code == 401:
            self.log_test("Invalid Login Test", True, "Correctly rejected invalid credentials", response_data)
            return True
        else:
            self.log_test("Invalid Login Test", False, f"Should have rejected invalid credentials: {response_data} (Status: {status_code})", response_data)
            return False
            
    def test_get_current_user(self):
        """Test get current user endpoint"""
        if not self.auth_token:
            self.log_test("Get Current User", False, "No auth token available")
            return False
            
        success, response_data, status_code = self.make_request("GET", "/auth/me")
        
        if success and "id" in response_data:
            self.log_test("Get Current User", True, f"Retrieved user info for: {response_data['name']}", response_data)
            return True
        else:
            self.log_test("Get Current User", False, f"Failed to get user info: {response_data} (Status: {status_code})", response_data)
            return False
            
    def test_role_toggle(self):
        """Test user role toggle endpoint"""
        if not self.auth_token:
            self.log_test("Role Toggle", False, "No auth token available")
            return False
            
        # First toggle to rider
        success, response_data, status_code = self.make_request("PUT", "/users/toggle-role")
        
        if success and "is_rider" in response_data:
            is_rider = response_data["is_rider"]
            self.log_test("Role Toggle", True, f"Role toggled successfully. Is rider: {is_rider}", response_data)
            return True
        else:
            self.log_test("Role Toggle", False, f"Role toggle failed: {response_data} (Status: {status_code})", response_data)
            return False
            
    def test_create_ride(self):
        """Test ride creation endpoint"""
        if not self.auth_token:
            self.log_test("Create Ride", False, "No auth token available")
            return False
            
        # Ensure user is a rider first
        self.make_request("PUT", "/users/toggle-role")
        
        ride_data = {
            "origin": {
                "name": "Downtown San Francisco",
                "lat": 37.7749,
                "lng": -122.4194
            },
            "destination": {
                "name": "San Jose Airport",
                "lat": 37.3639,
                "lng": -121.9289
            },
            "departure_time": (datetime.now() + timedelta(days=1)).isoformat(),
            "available_seats": 3,
            "price_per_seat": 25.50,
            "description": "Comfortable ride with AC and music. Non-smoking vehicle.",
            "route_info": {
                "distance": "48.2 miles",
                "duration": "1 hour 15 minutes"
            }
        }
        
        success, response_data, status_code = self.make_request("POST", "/rides", ride_data)
        
        if success and "id" in response_data:
            self.created_ride_id = response_data["id"]
            self.log_test("Create Ride", True, f"Ride created successfully with ID: {self.created_ride_id}", response_data)
            return True
        else:
            self.log_test("Create Ride", False, f"Ride creation failed: {response_data} (Status: {status_code})", response_data)
            return False
            
    def test_search_rides(self):
        """Test ride search endpoint"""
        if not self.auth_token:
            self.log_test("Search Rides", False, "No auth token available")
            return False
            
        # Test basic search
        success, response_data, status_code = self.make_request("GET", "/rides")
        
        if success and isinstance(response_data, list):
            self.log_test("Search Rides", True, f"Found {len(response_data)} rides", response_data)
            return True
        else:
            self.log_test("Search Rides", False, f"Ride search failed: {response_data} (Status: {status_code})", response_data)
            return False
            
    def test_search_rides_with_filters(self):
        """Test ride search with location filters"""
        if not self.auth_token:
            self.log_test("Search Rides with Filters", False, "No auth token available")
            return False
            
        # Test search with location parameters
        params = {
            "origin_lat": 37.7749,
            "origin_lng": -122.4194,
            "destination_lat": 37.3639,
            "destination_lng": -121.9289
        }
        
        success, response_data, status_code = self.make_request("GET", "/rides", params=params)
        
        if success and isinstance(response_data, list):
            self.log_test("Search Rides with Filters", True, f"Filtered search returned {len(response_data)} rides", response_data)
            return True
        else:
            self.log_test("Search Rides with Filters", False, f"Filtered search failed: {response_data} (Status: {status_code})", response_data)
            return False
            
    def test_get_my_rides(self):
        """Test get my rides endpoint"""
        if not self.auth_token:
            self.log_test("Get My Rides", False, "No auth token available")
            return False
            
        success, response_data, status_code = self.make_request("GET", "/rides/my")
        
        if success and isinstance(response_data, list):
            self.log_test("Get My Rides", True, f"Retrieved {len(response_data)} of my rides", response_data)
            return True
        else:
            self.log_test("Get My Rides", False, f"Failed to get my rides: {response_data} (Status: {status_code})", response_data)
            return False
            
    def test_create_booking(self):
        """Test booking creation endpoint"""
        if not self.auth_token or not hasattr(self, 'created_ride_id'):
            self.log_test("Create Booking", False, "No auth token or ride ID available")
            return False
            
        # Switch to passenger mode first
        self.make_request("PUT", "/users/toggle-role")
        
        booking_data = {
            "ride_id": self.created_ride_id,
            "seats_requested": 2
        }
        
        success, response_data, status_code = self.make_request("POST", "/bookings", booking_data)
        
        if success and "id" in response_data:
            self.created_booking_id = response_data["id"]
            self.log_test("Create Booking", True, f"Booking created successfully with ID: {self.created_booking_id}", response_data)
            return True
        else:
            self.log_test("Create Booking", False, f"Booking creation failed: {response_data} (Status: {status_code})", response_data)
            return False
            
    def test_booking_seat_validation(self):
        """Test booking with more seats than available"""
        if not self.auth_token or not hasattr(self, 'created_ride_id'):
            self.log_test("Booking Seat Validation", False, "No auth token or ride ID available")
            return False
            
        booking_data = {
            "ride_id": self.created_ride_id,
            "seats_requested": 10  # More than available
        }
        
        success, response_data, status_code = self.make_request("POST", "/bookings", booking_data)
        
        if not success and status_code == 400:
            self.log_test("Booking Seat Validation", True, "Correctly rejected booking with too many seats", response_data)
            return True
        else:
            self.log_test("Booking Seat Validation", False, f"Should have rejected booking with too many seats: {response_data} (Status: {status_code})", response_data)
            return False
            
    def test_get_my_bookings(self):
        """Test get my bookings endpoint"""
        if not self.auth_token:
            self.log_test("Get My Bookings", False, "No auth token available")
            return False
            
        success, response_data, status_code = self.make_request("GET", "/bookings/my")
        
        if success and isinstance(response_data, list):
            self.log_test("Get My Bookings", True, f"Retrieved {len(response_data)} of my bookings", response_data)
            return True
        else:
            self.log_test("Get My Bookings", False, f"Failed to get my bookings: {response_data} (Status: {status_code})", response_data)
            return False
            
    def test_chat_messages(self):
        """Test get chat messages endpoint"""
        if not self.auth_token or not hasattr(self, 'created_ride_id'):
            self.log_test("Get Chat Messages", False, "No auth token or ride ID available")
            return False
            
        success, response_data, status_code = self.make_request("GET", f"/chat/{self.created_ride_id}/messages")
        
        if success and isinstance(response_data, list):
            self.log_test("Get Chat Messages", True, f"Retrieved {len(response_data)} chat messages", response_data)
            return True
        else:
            self.log_test("Get Chat Messages", False, f"Failed to get chat messages: {response_data} (Status: {status_code})", response_data)
            return False
            
    def test_unauthorized_access(self):
        """Test accessing protected endpoints without authentication"""
        # Temporarily remove auth token
        original_token = self.auth_token
        self.headers.pop("Authorization", None)
        self.auth_token = None
        
        success, response_data, status_code = self.make_request("GET", "/auth/me")
        
        # Restore auth token
        if original_token:
            self.set_auth_token(original_token)
            
        if not success and status_code == 401:
            self.log_test("Unauthorized Access Test", True, "Correctly rejected unauthorized access", response_data)
            return True
        else:
            self.log_test("Unauthorized Access Test", False, f"Should have rejected unauthorized access: {response_data} (Status: {status_code})", response_data)
            return False
            
    def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Ride-Sharing Backend API Tests")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Authentication Tests
        print("\n🔐 AUTHENTICATION TESTS")
        self.test_user_registration()
        self.test_invalid_login()
        self.test_user_login()
        self.test_get_current_user()
        self.test_unauthorized_access()
        
        # User Management Tests
        print("\n👤 USER MANAGEMENT TESTS")
        self.test_role_toggle()
        
        # Ride Management Tests
        print("\n🚗 RIDE MANAGEMENT TESTS")
        self.test_create_ride()
        self.test_search_rides()
        self.test_search_rides_with_filters()
        self.test_get_my_rides()
        
        # Booking System Tests
        print("\n📝 BOOKING SYSTEM TESTS")
        self.test_create_booking()
        self.test_booking_seat_validation()
        self.test_get_my_bookings()
        
        # Chat System Tests
        print("\n💬 CHAT SYSTEM TESTS")
        self.test_chat_messages()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for result in self.test_results if result["success"])
        failed = len(self.test_results) - passed
        
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📈 Success Rate: {(passed/len(self.test_results)*100):.1f}%")
        
        if failed > 0:
            print("\n🔍 FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  • {result['test']}: {result['details']}")
                    
        return passed, failed

if __name__ == "__main__":
    tester = RideSharingAPITester()
    passed, failed = tester.run_all_tests()
    
    # Exit with appropriate code
    exit(0 if failed == 0 else 1)