import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:8001';

export interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  is_rider: boolean;
  is_passenger: boolean;
  profile_image?: string;
  created_at: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

class AuthAPI {
  private api = axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Set auth token for subsequent requests
  setAuthToken(token: string) {
    this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  }

  // Remove auth token
  removeAuthToken() {
    delete this.api.defaults.headers.common['Authorization'];
  }

  // Login user
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    try {
      const response = await this.api.post('/auth/login', credentials);
      return response.data;
    } catch (error: any) {
      console.error('Login API error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.detail || 'Login failed');
    }
  }

  // Register user
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await this.api.post('/auth/register', userData);
      return response.data;
    } catch (error: any) {
      console.error('Register API error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.detail || 'Registration failed');
    }
  }

  // Get current user info
  async getCurrentUser(): Promise<{ user: User }> {
    try {
      const response = await this.api.get('/auth/me');
      return response.data;
    } catch (error: any) {
      console.error('Get current user API error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.detail || 'Failed to get user info');
    }
  }

  // Toggle user role (rider/passenger)
  async toggleRole(): Promise<{ message: string; is_rider: boolean }> {
    try {
      const response = await this.api.put('/users/toggle-role');
      return response.data;
    } catch (error: any) {
      console.error('Toggle role API error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.detail || 'Failed to toggle role');
    }
  }
}

export const authApi = new AuthAPI();