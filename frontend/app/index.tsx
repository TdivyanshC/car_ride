import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { StatusBar } from 'expo-status-bar';
import { Redirect } from 'expo-router';

// Import providers and hooks
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthScreen from './screens/AuthScreen';

const queryClient = new QueryClient();

function RootLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return null; // Or loading screen
  }

  if (user) {
    return <Redirect href="/(tabs)" />;
  }

  return <AuthScreen />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="auto" />
          <RootLayout />
          <Toast />
        </AuthProvider>  
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}