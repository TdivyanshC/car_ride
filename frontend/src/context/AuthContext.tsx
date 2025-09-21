import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi, User } from '../api/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: {
    email: string;
    password: string;
    name: string;
    phone: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  toggleRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        authApi.setAuthToken(token);
        const userData = await authApi.getCurrentUser();
        setUser(userData.user);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await AsyncStorage.removeItem('authToken');
      authApi.removeAuthToken();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });
      await AsyncStorage.setItem('authToken', response.access_token);
      authApi.setAuthToken(response.access_token);
      setUser(response.user);
    } catch (error: any) {
      throw error;
    }
  };

  const register = async (userData: {
    email: string;
    password: string;
    name: string;
    phone: string;
  }) => {
    try {
      const response = await authApi.register(userData);
      await AsyncStorage.setItem('authToken', response.access_token);
      authApi.setAuthToken(response.access_token);
      setUser(response.user);
    } catch (error: any) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      authApi.removeAuthToken();
      setUser(null);
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const toggleRole = async () => {
    try {
      const response = await authApi.toggleRole();
      if (user) {
        setUser({
          ...user,
          is_rider: response.is_rider,
          is_passenger: !response.is_rider || user.is_passenger
        });
      }
    } catch (error: any) {
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        toggleRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}