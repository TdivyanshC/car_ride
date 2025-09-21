import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Get auth token from AsyncStorage and set it
const setAuthToken = async () => {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Failed to set auth token:', error);
  }
};

// Set auth token before making requests
setAuthToken();

export interface Location {
  name: string;
  lat: number;
  lng: number;
}

export interface RouteInfo {
  distance: number;
  duration: number;
  route?: any;
}

export interface CreateRideRequest {
  origin: Location;
  destination: Location;
  departure_time: string;
  available_seats: number;
  price_per_seat: number;
  description?: string;
  route_info?: RouteInfo;
}

export interface Ride {
  id: string;
  rider_id: string;
  rider_name: string;
  origin: Location;
  destination: Location;
  departure_time: string;
  available_seats: number;
  price_per_seat: number;
  description: string;
  route_info?: RouteInfo;
  status: string;
  created_at: string;
}

export interface CreateBookingRequest {
  ride_id: string;
  seats_requested: number;
}

export interface Booking {
  id: string;
  ride_id: string;
  passenger_id: string;
  passenger_name: string;
  seats_booked: number;
  total_price: number;
  status: string;
  created_at: string;
}

export const ridesApi = {
  createRide: async (data: CreateRideRequest): Promise<Ride> => {
    const response = await api.post('/rides', data);
    return response.data;
  },

  searchRides: async (params?: {
    origin_lat?: number;
    origin_lng?: number;
    destination_lat?: number;
    destination_lng?: number;
    date?: string;
  }): Promise<Ride[]> => {
    console.log('🚗 API: Searching for rides...', params);
    try {
      const response = await api.get('/rides', { params });
      console.log('✅ API: Found rides:', response.data.length);
      return response.data;
    } catch (error: any) {
      console.error('❌ API: Search rides failed:', error.message);
      throw error;
    }
  },

  getMyRides: async (): Promise<Ride[]> => {
    const response = await api.get('/rides/my');
    return response.data;
  },

  createBooking: async (data: CreateBookingRequest): Promise<Booking> => {
    const response = await api.post('/bookings', data);
    return response.data;
  },

  getMyBookings: async (): Promise<Booking[]> => {
    const response = await api.get('/bookings/my');
    return response.data;
  },
};