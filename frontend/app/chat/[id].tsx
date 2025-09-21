import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';

export default function ChatScreen() {
  const { id: rideId } = useLocalSearchParams();
  const { user } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="chatbubble" size={24} color="#007AFF" />
        <Text style={styles.title}>Ride Chat</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.emptyChat}>
          <Ionicons name="chatbubble-outline" size={64} color="#ccc" />
          <Text style={styles.emptyChatText}>Chat Coming Soon</Text>
          <Text style={styles.emptyChatSubtext}>
            Real-time messaging will be available in the next update
          </Text>
          <Text style={styles.rideInfo}>
            Ride ID: {rideId}
          </Text>
          {user && (
            <Text style={styles.userInfo}>
              Logged in as: {user.name}
            </Text>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 12,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  emptyChat: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChatText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyChatSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  rideInfo: {
    fontSize: 12,
    color: '#666',
    marginTop: 16,
  },
  userInfo: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 4,
  },
});