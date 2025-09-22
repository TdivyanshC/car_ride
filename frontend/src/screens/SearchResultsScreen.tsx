import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { ridesApi, Ride } from '../api/rides';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';

export default function SearchResultsScreen() {
  const params = useLocalSearchParams();
  const { user } = useAuth();

  // Parse parameters using useMemo to avoid infinite loops
  const { origin, destination, searchDate } = useMemo(() => {
    const parsedOrigin = params.origin ? JSON.parse(params.origin as string) : null;
    const parsedDestination = params.destination ? JSON.parse(params.destination as string) : null;
    const parsedDate = params.date ? new Date(params.date as string) : new Date();

    return {
      origin: parsedOrigin,
      destination: parsedDestination,
      searchDate: parsedDate,
    };
  }, [params.origin, params.destination, params.date]);

  const { data: rides = [], isLoading, refetch, error } = useQuery({
    queryKey: ['search-rides', origin, destination, searchDate],
    queryFn: () => ridesApi.searchRides({
      origin_lat: origin?.lat,
      origin_lng: origin?.lng,
      destination_lat: destination?.lat,
      destination_lng: destination?.lng,
      date: searchDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
    }),
    enabled: !!(origin && destination), // Only run query when we have both locations
    retry: 3,
    retryDelay: 1000,
  });

  const handleBookRide = async (rideId: string, availableSeats: number, riderId: string) => {
    // Check if user is trying to book their own ride
    if (user && riderId === user.id) {
      Toast.show({
        type: 'error',
        text1: 'Cannot Book Own Ride',
        text2: 'You cannot book your own ride.',
      });
      return;
    }

    try {
      console.log('🔄 Booking ride with ID:', rideId);
      const response = await ridesApi.createBooking({
        ride_id: rideId,
        seats_requested: 1,
      });
      console.log('✅ Booking successful:', response);
      Toast.show({
        type: 'success',
        text1: 'Ride Booked!',
        text2: 'Your booking has been confirmed successfully.',
      });
      refetch();
    } catch (error: any) {
      console.log('❌ Booking failed:', error.response?.data);
      Toast.show({
        type: 'error',
        text1: 'Booking Failed',
        text2: error.response?.data?.detail || 'Unable to book ride. Please try again.',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return `₹${price.toFixed(2)}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.title}>Available Rides</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Summary */}
      <View style={styles.searchSummary}>
        <View style={styles.routeSummary}>
          <Text style={styles.routeText}>
            {origin?.name} → {destination?.name}
          </Text>
          <Text style={styles.dateText}>
            {searchDate.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.modifySearchButton}
          onPress={() => router.back()}
        >
          <Text style={styles.modifySearchText}>Modify Search</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>
          {rides.length} rides found
        </Text>

        {__DEV__ && (
          <Text style={{ fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 8 }}>
            Debug: {isLoading ? 'Loading...' : `Loaded ${rides.length} rides`}
          </Text>
        )}

        {rides.map((ride) => (
          <TouchableOpacity
            key={ride._id}
            style={styles.rideCard}
            onPress={() => {
              router.push({
                pathname: '/ride-details',
                params: { ride: JSON.stringify(ride) },
              } as any);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.rideHeader}>
              <View style={styles.riderInfo}>
                <Ionicons name="person-circle" size={32} color="#007AFF" />
                <Text style={styles.riderName}>{ride.rider_name}</Text>
              </View>
              <View style={styles.rideTime}>
                <Text style={styles.timeText}>
                  {formatDate(ride.departure_time)}
                </Text>
              </View>
            </View>

            <View style={styles.routeInfo}>
              <View style={styles.routePoint}>
                <Ionicons name="radio-button-on" size={12} color="#34C759" />
                <Text style={styles.locationText}>{ride.origin.name}</Text>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.routePoint}>
                <Ionicons name="location" size={12} color="#FF3B30" />
                <Text style={styles.locationText}>{ride.destination.name}</Text>
              </View>
            </View>

            {ride.route_info && (
              <View style={styles.routeDetails}>
                <Text style={styles.routeDetail}>
                  <Ionicons name="time" size={12} color="#666" />{' '}
                  {Math.round(ride.route_info.duration / 60)} min
                </Text>
                <Text style={styles.routeDetail}>
                  <Ionicons name="speedometer" size={12} color="#666" />{' '}
                  {Math.round(ride.route_info.distance / 1000)} km
                </Text>
              </View>
            )}

            <View style={styles.rideFooter}>
              <View style={styles.priceInfo}>
                <Text style={styles.price}>{formatPrice(ride.price_per_seat)}</Text>
                <Text style={styles.seatsAvailable}>
                  {ride.available_seats} seats available
                </Text>
              </View>
              <TouchableOpacity
                style={[
                  styles.bookButton,
                  (ride.available_seats === 0 || (user && ride.rider_id === user.id)) && styles.bookButtonDisabled,
                ]}
                onPress={(e) => {
                  e.stopPropagation(); // Prevent card click when pressing book button
                  ride._id && handleBookRide(ride._id, ride.available_seats, ride.rider_id);
                }}
                disabled={Boolean(ride.available_seats === 0 || !ride._id || (user?.id && ride.rider_id === user.id))}
              >
                <Text style={styles.bookButtonText}>
                  {user && ride.rider_id === user.id
                    ? 'Your Ride'
                    : ride.available_seats === 0
                      ? 'Full'
                      : 'Book'
                  }
                </Text>
              </TouchableOpacity>
            </View>

            {ride.description && (
              <Text style={styles.description}>{ride.description}</Text>
            )}
          </TouchableOpacity>
        ))}

        {rides.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No rides found</Text>
            <Text style={styles.emptySubtext}>
              Try adjusting your search criteria or check back later
            </Text>
            <TouchableOpacity
              style={styles.newSearchButton}
              onPress={() => router.back()}
            >
              <Text style={styles.newSearchButtonText}>New Search</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  searchSummary: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  routeSummary: {
    marginBottom: 12,
  },
  routeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  modifySearchButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
  },
  modifySearchText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 20,
    marginBottom: 16,
  },
  rideCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  riderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riderName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  rideTime: {
    alignItems: 'flex-end',
  },
  timeText: {
    fontSize: 14,
    color: '#666',
  },
  routeInfo: {
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  locationText: {
    fontSize: 14,
    color: '#1a1a1a',
    marginLeft: 8,
  },
  routeLine: {
    width: 1,
    height: 16,
    backgroundColor: '#ddd',
    marginLeft: 6,
    marginVertical: 2,
  },
  routeDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  routeDetail: {
    fontSize: 12,
    color: '#666',
  },
  rideFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceInfo: {
    flex: 1,
  },
  price: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34C759',
  },
  seatsAvailable: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  bookButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  bookButtonDisabled: {
    backgroundColor: '#ccc',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 4,
    textAlign: 'center',
    marginBottom: 20,
  },
  newSearchButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  newSearchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});