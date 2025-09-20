import api from './auth';

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
    const response = await api.get('/rides', { params });
    return response.data;
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