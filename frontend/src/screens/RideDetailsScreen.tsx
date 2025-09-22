import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE, Polyline } from 'react-native-maps';
import { router, useLocalSearchParams } from 'expo-router';
import { ridesApi, Ride } from '../api/rides';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';

const { width, height } = Dimensions.get('window');

export default function RideDetailsScreen() {
  const params = useLocalSearchParams();
  const { user } = useAuth();
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapRegion, setMapRegion] = useState({
    latitude: 20.5937, // Center of India
    longitude: 78.9629,
    latitudeDelta: 10,
    longitudeDelta: 10,
  });

  useEffect(() => {
    if (params.ride) {
      const rideData = JSON.parse(params.ride as string);
      setRide(rideData);

      // Set map region to show both origin and destination
      if (rideData.origin && rideData.destination) {
        const avgLat = (rideData.origin.lat + rideData.destination.lat) / 2;
        const avgLng = (rideData.origin.lng + rideData.destination.lng) / 2;
        const latDelta = Math.abs(rideData.origin.lat - rideData.destination.lat) * 1.5;
        const lngDelta = Math.abs(rideData.origin.lng - rideData.destination.lng) * 1.5;

        setMapRegion({
          latitude: avgLat,
          longitude: avgLng,
          latitudeDelta: Math.max(latDelta, 0.05),
          longitudeDelta: Math.max(lngDelta, 0.05),
        });
      }
    }
  }, [params.ride]);

  const handleBookRide = async () => {
    if (!ride) return;

    const rideId = ride._id || ride.id;
    if (!rideId) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Invalid ride information.',
      });
      return;
    }

    // Check if user is trying to book their own ride
    if (user && ride.rider_id === user.id) {
      Toast.show({
        type: 'error',
        text1: 'Cannot Book Own Ride',
        text2: 'You cannot book your own ride.',
      });
      return;
    }

    Alert.alert(
      'Confirm Booking',
      `Book this ride for ₹${ride.price_per_seat}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Book Now',
          onPress: async () => {
            setLoading(true);
            try {
              await ridesApi.createBooking({
                ride_id: rideId,
                seats_requested: 1,
              });

              Toast.show({
                type: 'success',
                text1: 'Ride Booked!',
                text2: 'Your booking has been confirmed successfully.',
              });

              router.back();
            } catch (error: any) {
              Toast.show({
                type: 'error',
                text1: 'Booking Failed',
                text2: error.response?.data?.detail || 'Unable to book ride. Please try again.',
              });
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return `₹${price.toFixed(2)}`;
  };

  if (!ride) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading ride details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ride Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Map Section */}
        <View style={styles.mapContainer}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            region={mapRegion}
            showsUserLocation={false}
            showsMyLocationButton={false}
            scrollEnabled={true}
            zoomEnabled={true}
          >
            {/* Origin Marker */}
            <Marker
              coordinate={{
                latitude: ride.origin.lat,
                longitude: ride.origin.lng,
              }}
              title="Pickup Location"
              description={ride.origin.name}
              pinColor="green"
            />

            {/* Destination Marker */}
            <Marker
              coordinate={{
                latitude: ride.destination.lat,
                longitude: ride.destination.lng,
              }}
              title="Drop Location"
              description={ride.destination.name}
              pinColor="red"
            />

            {/* Route Line (if route info available) */}
            {ride.route_info && (
              <Polyline
                coordinates={[
                  { latitude: ride.origin.lat, longitude: ride.origin.lng },
                  { latitude: ride.destination.lat, longitude: ride.destination.lng },
                ]}
                strokeColor="#007AFF"
                strokeWidth={3}
              />
            )}
          </MapView>
        </View>

        {/* Ride Info Card */}
        <View style={styles.rideCard}>
          {/* Driver Info */}
          <View style={styles.driverSection}>
            <View style={styles.driverAvatar}>
              <Ionicons name="person-circle" size={50} color="#007AFF" />
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{ride.rider_name}</Text>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={16} color="#FFD700" />
                <Text style={styles.ratingText}>4.8</Text>
                <Text style={styles.reviewCount}>(127 reviews)</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.messageButton}>
              <Ionicons name="chatbubble-outline" size={20} color="#007AFF" />
            </TouchableOpacity>
          </View>

          {/* Route Details */}
          <View style={styles.routeSection}>
            <View style={styles.routePoint}>
              <View style={styles.routeIcon}>
                <Ionicons name="radio-button-on" size={16} color="#34C759" />
              </View>
              <View style={styles.routeTextContainer}>
                <Text style={styles.routeLabel}>From</Text>
                <Text style={styles.routeLocation}>{ride.origin.name}</Text>
              </View>
            </View>

            <View style={styles.routeConnector}>
              <View style={styles.routeLine} />
              <Ionicons name="chevron-forward" size={16} color="#ddd" style={styles.routeArrow} />
            </View>

            <View style={styles.routePoint}>
              <View style={styles.routeIcon}>
                <Ionicons name="location" size={16} color="#FF3B30" />
              </View>
              <View style={styles.routeTextContainer}>
                <Text style={styles.routeLabel}>To</Text>
                <Text style={styles.routeLocation}>{ride.destination.name}</Text>
              </View>
            </View>
          </View>

          {/* Ride Details */}
          <View style={styles.detailsSection}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="calendar-outline" size={20} color="#666" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>{formatDate(ride.departure_time)}</Text>
                </View>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="time-outline" size={20} color="#666" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Time</Text>
                  <Text style={styles.detailValue}>{formatTime(ride.departure_time)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <Ionicons name="car-outline" size={20} color="#666" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Vehicle</Text>
                  <Text style={styles.detailValue}>Sedan</Text>
                </View>
              </View>
              <View style={styles.detailItem}>
                <Ionicons name="people-outline" size={20} color="#666" />
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Seats Available</Text>
                  <Text style={styles.detailValue}>{ride.available_seats}</Text>
                </View>
              </View>
            </View>

            {ride.route_info && (
              <View style={styles.detailRow}>
                <View style={styles.detailItem}>
                  <Ionicons name="speedometer-outline" size={20} color="#666" />
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Distance</Text>
                    <Text style={styles.detailValue}>{Math.round(ride.route_info.distance / 1000)} km</Text>
                  </View>
                </View>
                <View style={styles.detailItem}>
                  <Ionicons name="time-outline" size={20} color="#666" />
                  <View style={styles.detailTextContainer}>
                    <Text style={styles.detailLabel}>Duration</Text>
                    <Text style={styles.detailValue}>{Math.round(ride.route_info.duration / 60)} min</Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Description */}
          {ride.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.descriptionTitle}>Ride Description</Text>
              <Text style={styles.descriptionText}>{ride.description}</Text>
            </View>
          )}
        </View>

        {/* Price and Book Button */}
        <View style={styles.bookingSection}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Price per seat</Text>
            <Text style={styles.priceValue}>{formatPrice(ride.price_per_seat)}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.bookButton,
              loading && styles.bookButtonDisabled,
              (ride.available_seats === 0 || (user && ride.rider_id === user.id)) && styles.bookButtonDisabled,
            ]}
            onPress={handleBookRide}
            disabled={Boolean(
              loading ||
              ride.available_seats === 0 ||
              !ride._id ||
              (user?.id && ride.rider_id === user.id)
            )}
          >
            <Text style={styles.bookButtonText}>
              {user && ride.rider_id === user.id
                ? 'Your Ride'
                : ride.available_seats === 0
                ? 'Fully Booked'
                : loading
                ? 'Booking...'
                : 'Book Now'
              }
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  scrollView: {
    flex: 1,
  },
  mapContainer: {
    height: height * 0.3,
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  map: {
    flex: 1,
  },
  rideCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  driverSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  driverAvatar: {
    marginRight: 16,
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 4,
  },
  reviewCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  messageButton: {
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
  },
  routeSection: {
    marginBottom: 24,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  routeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  routeTextContainer: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  routeLocation: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
    marginTop: 2,
  },
  routeConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
    marginVertical: 8,
  },
  routeLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#ddd',
  },
  routeArrow: {
    marginLeft: 8,
  },
  detailsSection: {
    marginBottom: 24,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1a1a1a',
    fontWeight: '500',
    marginTop: 2,
  },
  descriptionSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  bookingSection: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 40,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  priceContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  priceLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#34C759',
  },
  bookButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  bookButtonDisabled: {
    backgroundColor: '#ccc',
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});