import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { ridesApi } from '../api/rides';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';

export default function MyRidesScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<'booked' | 'published'>('booked');

  const {
    data: myBookings = [],
    isLoading: bookingsLoading,
    refetch: refetchBookings,
  } = useQuery({
    queryKey: ['my-bookings'],
    queryFn: ridesApi.getMyBookings,
    enabled: activeTab === 'booked',
  });

  const {
    data: myRides = [],
    isLoading: ridesLoading,
    refetch: refetchRides,
  } = useQuery({
    queryKey: ['my-rides'],
    queryFn: ridesApi.getMyRides,
    enabled: activeTab === 'published' && user?.is_rider,
  });

  const handleRefresh = () => {
    if (activeTab === 'booked') {
      refetchBookings();
    } else {
      refetchRides();
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

  const openChat = (rideId: string) => {
    navigation.navigate('Chat' as never, { rideId } as never);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Rides</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'booked' && styles.activeTab]}
          onPress={() => setActiveTab('booked')}
        >
          <Text style={[styles.tabText, activeTab === 'booked' && styles.activeTabText]}>
            Booked Rides
          </Text>
        </TouchableOpacity>
        {user?.is_rider && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'published' && styles.activeTab]}
            onPress={() => setActiveTab('published')}
          >
            <Text style={[styles.tabText, activeTab === 'published' && styles.activeTabText]}>
              Published Rides
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={activeTab === 'booked' ? bookingsLoading : ridesLoading}
            onRefresh={handleRefresh}
          />
        }
      >
        {activeTab === 'booked' && (
          <>
            {myBookings.map((booking) => (
              <View key={booking.id} style={styles.rideCard}>
                <View style={styles.rideHeader}>
                  <View style={styles.statusBadge}>
                    <Ionicons
                      name={booking.status === 'confirmed' ? 'checkmark-circle' : 'close-circle'}
                      size={16}
                      color={booking.status === 'confirmed' ? '#34C759' : '#FF3B30'}
                    />
                    <Text style={[
                      styles.statusText,
                      { color: booking.status === 'confirmed' ? '#34C759' : '#FF3B30' }
                    ]}>
                      {booking.status}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.chatButton}
                    onPress={() => openChat(booking.ride_id)}
                  >
                    <Ionicons name="chatbubble" size={16} color="#007AFF" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.rideDate}>{formatDate(booking.created_at)}</Text>

                <View style={styles.rideInfo}>
                  <Text style={styles.rideDetail}>
                    <Ionicons name="person" size={14} color="#666" /> Booked {booking.seats_booked} seat(s)
                  </Text>
                  <Text style={styles.rideDetail}>
                    <Ionicons name="cash" size={14} color="#666" /> Total: {formatPrice(booking.total_price)}
                  </Text>
                </View>

                <Text style={styles.bookingId}>Booking ID: {booking.id.slice(0, 8)}</Text>
              </View>
            ))}

            {myBookings.length === 0 && !bookingsLoading && (
              <View style={styles.emptyState}>
                <Ionicons name="car-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No booked rides</Text>
                <Text style={styles.emptySubtext}>
                  Start by searching for available rides
                </Text>
              </View>
            )}
          </>
        )}

        {activeTab === 'published' && user?.is_rider && (
          <>
            {myRides.map((ride) => (
              <View key={ride.id} style={styles.rideCard}>
                <View style={styles.rideHeader}>
                  <View style={styles.statusBadge}>
                    <Ionicons
                      name={ride.status === 'active' ? 'checkmark-circle' : 'close-circle'}
                      size={16}
                      color={ride.status === 'active' ? '#34C759' : '#FF3B30'}
                    />
                    <Text style={[
                      styles.statusText,
                      { color: ride.status === 'active' ? '#34C759' : '#FF3B30' }
                    ]}>
                      {ride.status}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.chatButton}
                    onPress={() => openChat(ride.id)}
                  >
                    <Ionicons name="chatbubble" size={16} color="#007AFF" />
                  </TouchableOpacity>
                </View>

                <Text style={styles.rideDate}>{formatDate(ride.departure_time)}</Text>

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

                <View style={styles.rideInfo}>
                  <Text style={styles.rideDetail}>
                    <Ionicons name="people" size={14} color="#666" /> {ride.available_seats} seats available
                  </Text>
                  <Text style={styles.rideDetail}>
                    <Ionicons name="cash" size={14} color="#666" /> {formatPrice(ride.price_per_seat)} per seat
                  </Text>
                </View>

                {ride.description && (
                  <Text style={styles.description}>{ride.description}</Text>
                )}
              </View>
            ))}

            {myRides.length === 0 && !ridesLoading && (
              <View style={styles.emptyState}>
                <Ionicons name="add-circle-outline" size={64} color="#ccc" />
                <Text style={styles.emptyText}>No published rides</Text>
                <Text style={styles.emptySubtext}>
                  Publish your first ride to start sharing
                </Text>
              </View>
            )}
          </>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
    marginRight: 8,
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
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
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
    textTransform: 'capitalize',
  },
  chatButton: {
    padding: 4,
  },
  rideDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
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
  rideInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  rideDetail: {
    fontSize: 12,
    color: '#666',
  },
  description: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 8,
  },
  bookingId: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
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
  },
});