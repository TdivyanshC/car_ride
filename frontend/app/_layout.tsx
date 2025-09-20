import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';

// Import providers and hooks
import { AuthProvider } from './context/AuthContext';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthProvider>
          <StatusBar style="auto" />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="chat/[id]" options={{ headerShown: true, title: 'Ride Chat' }} />
          </Stack>
          <Toast />
        </AuthProvider>  
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}