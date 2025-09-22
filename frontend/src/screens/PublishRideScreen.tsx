import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { ridesApi, Location as LocationType } from '../api/rides';
import Toast from 'react-native-toast-message';

export default function PublishRideScreen() {
  const [rideData, setRideData] = useState({
    origin: null as LocationType | null,
    destination: null as LocationType | null,
    departureTime: new Date(),
    pricePerSeat: '',
  });
  const [loading, setLoading] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [selectingOrigin, setSelectingOrigin] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationType[]>([]);
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [currentLocation, setCurrentLocation] = useState<LocationType | null>(null);
  const [locationPermission, setLocationPermission] = useState(false);

  // Predefined locations for search
  const predefinedLocations: LocationType[] = [
    { name: 'Mumbai, Maharashtra', lat: 19.0760, lng: 72.8777 },
    { name: 'Delhi, India', lat: 28.7041, lng: 77.1025 },
    { name: 'Bangalore, Karnataka', lat: 12.9716, lng: 77.5946 },
    { name: 'Chennai, Tamil Nadu', lat: 13.0827, lng: 80.2707 },
    { name: 'Kolkata, West Bengal', lat: 22.5726, lng: 88.3639 },
    { name: 'Pune, Maharashtra', lat: 18.5204, lng: 73.8567 },
    { name: 'Hyderabad, Telangana', lat: 17.3850, lng: 78.4867 },
    { name: 'Ahmedabad, Gujarat', lat: 23.0225, lng: 72.5714 },
    { name: 'Jaipur, Rajasthan', lat: 26.9124, lng: 75.7873 },
    { name: 'Surat, Gujarat', lat: 21.1702, lng: 72.8311 },
  ];

  // Request location permissions and get current location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission(true);
        try {
          let location = await Location.getCurrentPositionAsync({});
          const currentLoc: LocationType = {
            name: 'Current Location',
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          };
          setCurrentLocation(currentLoc);
          setMapRegion({
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          });
        } catch (error) {
          console.log('Error getting current location:', error);
        }
      } else {
        Alert.alert(
          'Location Permission',
          'Location permission is required to use current location features.',
          [{ text: 'OK' }]
        );
      }
    })();
  }, []);

  // Filter locations based on search query
  useEffect(() => {
    if (searchQuery.trim().length > 0) {
      const filtered = predefinedLocations.filter(location =>
        location.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const validateRideData = () => {
    if (!rideData.origin) {
      Toast.show({
        type: 'error',
        text1: 'Origin Required',
        text2: 'Please select a starting location',
      });
      return false;
    }

    if (!rideData.destination) {
      Toast.show({
        type: 'error',
        text1: 'Destination Required',
        text2: 'Please select a destination',
      });
      return false;
    }

    if (rideData.departureTime <= new Date()) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Time',
        text2: 'Departure time must be in the future',
      });
      return false;
    }

    if (!rideData.pricePerSeat.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Price Required',
        text2: 'Please set a price per seat',
      });
      return false;
    }

    const price = parseFloat(rideData.pricePerSeat);
    if (isNaN(price) || price <= 0) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Price',
        text2: 'Please enter a valid price',
      });
      return false;
    }

    return true;
  };

  const handlePublishRide = async () => {
    if (!validateRideData()) return;

    setLoading(true);
    try {
      const departureDate = new Date(rideData.departureTime).toISOString();

      await ridesApi.createRide({
        origin: rideData.origin!,
        destination: rideData.destination!,
        departure_time: departureDate,
        available_seats: 4, // Default 4 seats
        price_per_seat: parseFloat(rideData.pricePerSeat),
      });

      Toast.show({
        type: 'success',
        text1: 'Ride Published!',
        text2: 'Your ride is now available for booking',
      });

      // Reset form
      setRideData({
        origin: null,
        destination: null,
        departureTime: new Date(),
        pricePerSeat: '',
      });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Publication Failed',
        text2: error.response?.data?.detail || 'Please try again',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setRideData((prev) => ({ ...prev, [field]: value }));
  };

  const openLocationPicker = (isOrigin: boolean) => {
    setSelectingOrigin(isOrigin);
    setLocationModalVisible(true);
  };

  const selectLocation = (location: LocationType) => {
    if (selectingOrigin) {
      setRideData(prev => ({ ...prev, origin: location }));
    } else {
      setRideData(prev => ({ ...prev, destination: location }));
    }
    setLocationModalVisible(false);
    Toast.show({
      type: 'success',
      text1: 'Location Selected',
      text2: selectingOrigin ? 'Pickup location set' : 'Drop location set',
    });
  };

  const selectDateTime = (dateTime: Date) => {
    setRideData(prev => ({ ...prev, departureTime: dateTime }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Publish Ride</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Location Selection */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.locationButton}
            onPress={() => openLocationPicker(true)}
          >
            <View style={styles.locationIcon}>
              <Ionicons name="radio-button-on" size={20} color="#34C759" />
            </View>
            <View style={styles.locationContent}>
              <Text style={styles.locationLabel}>From</Text>
              <Text style={[styles.locationText, !rideData.origin && styles.locationPlaceholder]}>
                {rideData.origin ? rideData.origin.name : 'Select pickup location'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <View style={styles.routeLine} />

          <TouchableOpacity
            style={styles.locationButton}
            onPress={() => openLocationPicker(false)}
          >
            <View style={styles.locationIcon}>
              <Ionicons name="location" size={20} color="#FF3B30" />
            </View>
            <View style={styles.locationContent}>
              <Text style={styles.locationLabel}>To</Text>
              <Text style={[styles.locationText, !rideData.destination && styles.locationPlaceholder]}>
                {rideData.destination ? rideData.destination.name : 'Select drop location'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Date & Time */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.timeButton}
            onPress={() => {
              // Simple date/time picker - in production use a proper picker
              Alert.alert(
                'Date/Time Picker',
                'In a full implementation, this would open a native date/time picker. For now, the time is set to 2 hours from now.',
                [{ text: 'OK' }]
              );
            }}
          >
            <Ionicons name="time" size={20} color="#007AFF" />
            <View style={styles.timeContent}>
              <Text style={styles.timeLabel}>Departure Time</Text>
              <Text style={styles.timeValue}>
                {rideData.departureTime.toLocaleString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.timeEditButton}
              onPress={() => {
                // Set to 2 hours from now for demo
                const newTime = new Date();
                newTime.setHours(newTime.getHours() + 2);
                selectDateTime(newTime);
              }}
            >
              <Ionicons name="create" size={16} color="#007AFF" />
            </TouchableOpacity>
          </TouchableOpacity>
        </View>

        {/* Price */}
        <View style={styles.section}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Price per seat</Text>
            <View style={styles.priceInputContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="25"
                value={rideData.pricePerSeat}
                onChangeText={(value) => setRideData(prev => ({ ...prev, pricePerSeat: value }))}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Publish Button */}
        <TouchableOpacity
          style={[styles.publishButton, loading && styles.publishButtonDisabled]}
          onPress={handlePublishRide}
          disabled={loading}
        >
          <Text style={styles.publishButtonText}>
            {loading ? 'Publishing...' : 'Publish Ride'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Location Picker Modal */}
      <Modal
        visible={locationModalVisible}
        animationType="slide"
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              onPress={() => setLocationModalVisible(false)}
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectingOrigin ? 'Set pickup location' : 'Set drop location'}
            </Text>
          </View>

          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={20} color="#666" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for a place"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>

          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            region={mapRegion}
            showsUserLocation={true}
            showsMyLocationButton={true}
          />

          <View style={styles.locationSuggestions}>
            {searchResults.length > 0 ? (
              // Show search results
              searchResults.map((location, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionItem}
                  onPress={() => selectLocation(location)}
                >
                  <Ionicons name="location" size={20} color="#007AFF" />
                  <Text style={styles.suggestionText}>{location.name}</Text>
                </TouchableOpacity>
              ))
            ) : searchQuery.trim().length > 0 ? (
              // No search results
              <View style={styles.suggestionItem}>
                <Ionicons name="search" size={20} color="#666" />
                <Text style={styles.suggestionText}>No locations found</Text>
              </View>
            ) : (
              // Default options when no search
              <>
                {currentLocation && (
                  <TouchableOpacity
                    style={styles.suggestionItem}
                    onPress={() => selectLocation(currentLocation)}
                  >
                    <Ionicons name="locate" size={20} color="#007AFF" />
                    <Text style={styles.suggestionText}>Use current location</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => selectLocation({
                    name: `Location (${mapRegion.latitude.toFixed(4)}, ${mapRegion.longitude.toFixed(4)})`,
                    lat: mapRegion.latitude,
                    lng: mapRegion.longitude,
                  })}
                >
                  <Ionicons name="location" size={20} color="#34C759" />
                  <Text style={styles.suggestionText}>Use map center</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  locationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  locationContent: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  locationText: {
    fontSize: 16,
    color: '#1a1a1a',
    marginTop: 2,
  },
  locationPlaceholder: {
    color: '#999',
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#ddd',
    marginLeft: 20,
    marginVertical: 8,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  timeContent: {
    flex: 1,
    marginLeft: 16,
  },
  timeLabel: {
    fontSize: 12,
    color: '#666',
    textTransform: 'uppercase',
    fontWeight: '500',
  },
  timeInput: {
    fontSize: 16,
    color: '#1a1a1a',
    marginTop: 2,
    paddingVertical: 4,
  },
  timeValue: {
    fontSize: 16,
    color: '#1a1a1a',
    marginTop: 2,
  },
  timeEditButton: {
    padding: 8,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceLabel: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  currencySymbol: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
  },
  priceInput: {
    fontSize: 16,
    color: '#1a1a1a',
    minWidth: 60,
    textAlign: 'center',
  },
  publishButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 40,
  },
  publishButtonDisabled: {
    backgroundColor: '#ccc',
  },
  publishButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  backButton: {
    padding: 8,
    marginRight: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    marginLeft: 8,
  },
  map: {
    flex: 1,
  },
  locationSuggestions: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e1e5e9',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    fontSize: 16,
    color: '#1a1a1a',
    marginLeft: 12,
  },
});