import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ridesApi, Ride } from '../api/rides';
import { useQuery } from '@tanstack/react-query';

export default function SearchScreen() {
  const [searchParams, setSearchParams] = useState({
    from: '',
    to: '',
    date: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const { data: rides = [], isLoading, refetch, error } = useQuery({
    queryKey: ['rides', searchParams],
    queryFn: () => ridesApi.searchRides(),
    retry: 3,
    retryDelay: 1000,
  });

  const handleBookRide = async (rideId: string, availableSeats: number) => {
    try {
      console.log('🔄 Booking ride with ID:', rideId);
      const response = await ridesApi.createBooking({
        ride_id: rideId,
        seats_requested: 1,
      });
      console.log('✅ Booking successful:', response);
      Alert.alert('Success', 'Ride booked successfully!');
      refetch();
    } catch (error: any) {
      console.log('❌ Booking failed:', error.response?.data);
      Alert.alert('Error', error.response?.data?.detail || 'Booking failed');
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
    return `$${price.toFixed(2)}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Find a Ride</Text>
        <TouchableOpacity
          onPress={() => setShowFilters(!showFilters)}
          style={styles.filterButton}
        >
          <Ionicons name="options" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.inputContainer}>
          <Ionicons name="location" size={20} color="#666" />
          <TextInput
            style={styles.input}
            placeholder="From"
            value={searchParams.from}
            onChangeText={(value) =>
              setSearchParams((prev) => ({ ...prev, from: value }))
            }
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="flag" size={20} color="#666" />
          <TextInput
            style={styles.input}
            placeholder="To"
            value={searchParams.to}
            onChangeText={(value) =>
              setSearchParams((prev) => ({ ...prev, to: value }))
            }
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons name="calendar" size={20} color="#666" />
          <TextInput
            style={styles.input}
            placeholder="Date (optional)"
            value={searchParams.date}
            onChangeText={(value) =>
              setSearchParams((prev) => ({ ...prev, date: value }))
            }
          />
        </View>

        <TouchableOpacity style={styles.searchButton} onPress={() => {
          console.log('🔍 Searching for rides...');
          refetch();
        }}>
          <Text style={styles.searchButtonText}>Search Rides</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.searchButton, { backgroundColor: '#34C759' }]} onPress={() => {
          console.log('🔄 Manual refresh...');
          refetch();
        }}>
          <Text style={styles.searchButtonText}>Refresh</Text>
        </TouchableOpacity>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error loading rides: {error.message}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>
          {rides.length} rides available
        </Text>

        {__DEV__ && (
          <Text style={{ fontSize: 12, color: '#666', textAlign: 'center', marginBottom: 8 }}>
            Debug: {isLoading ? 'Loading...' : `Loaded ${rides.length} rides`}
          </Text>
        )}

        {rides.map((ride) => (
          <View key={ride._id} style={styles.rideCard}>
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
                  ride.available_seats === 0 && styles.bookButtonDisabled,
                ]}
                onPress={() => handleBookRide(ride._id, ride.available_seats)}
                disabled={ride.available_seats === 0}
              >
                <Text style={styles.bookButtonText}>
                  {ride.available_seats === 0 ? 'Full' : 'Book'}
                </Text>
              </TouchableOpacity>
            </View>

            {ride.description && (
              <Text style={styles.description}>{ride.description}</Text>
            )}
          </View>
        ))}

        {rides.length === 0 && !isLoading && (
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No rides found</Text>
            <Text style={styles.emptySubtext}>
              Try adjusting your search criteria
            </Text>
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  filterButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
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
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f44336',
  },
  errorText: {
    fontSize: 14,
    color: '#c62828',
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
});