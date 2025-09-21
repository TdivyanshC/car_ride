import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { StatusBar } from 'expo-status-bar';
import { Redirect } from 'expo-router';

// Import providers and hooks
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import AuthScreen from '../src/screens/AuthScreen';

const queryClient = new QueryClient();

function RootLayout() {
  // Bypass authentication and go directly to main app
  return <Redirect href="/(tabs)" />;
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