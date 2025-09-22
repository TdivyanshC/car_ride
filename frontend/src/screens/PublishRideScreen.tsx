import React, { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { ridesApi, Location } from '../api/rides';
import Toast from 'react-native-toast-message';

export default function PublishRideScreen() {
  const [rideData, setRideData] = useState({
    origin: null as Location | null,
    destination: null as Location | null,
    departureTime: '',
    pricePerSeat: '',
  });
  const [loading, setLoading] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [selectingOrigin, setSelectingOrigin] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

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

    if (!rideData.departureTime.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Time Required',
        text2: 'Please select departure time',
      });
      return false;
    }

    const departureDate = new Date(rideData.departureTime);
    if (departureDate <= new Date()) {
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
        departureTime: '',
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

  const selectLocation = (location: Location) => {
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

  const selectDateTime = (dateTime: string) => {
    setRideData(prev => ({ ...prev, departureTime: dateTime }));
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView style={styles.scrollView}>
          <View style={styles.header}>
            <Text style={styles.title}>Publish a Ride</Text>
            <Text style={styles.subtitle}>Share your journey with others</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location" size={20} color="#007AFF" />
              <Text style={styles.sectionTitle}>Route</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>From *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter origin location"
                value={rideData.originName}
                onChangeText={(value) => updateField('originName', value)}
              />
            </View>

            <View style={styles.coordinatesContainer}>
              <View style={styles.coordinateInput}>
                <TextInput
                  style={styles.input}
                  placeholder="Latitude"
                  value={rideData.originLat}
                  onChangeText={(value) => updateField('originLat', value)}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.coordinateInput}>
                <TextInput
                  style={styles.input}
                  placeholder="Longitude"
                  value={rideData.originLng}
                  onChangeText={(value) => updateField('originLng', value)}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>To *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter destination location"
                value={rideData.destinationName}
                onChangeText={(value) => updateField('destinationName', value)}
              />
            </View>

            <View style={styles.coordinatesContainer}>
              <View style={styles.coordinateInput}>
                <TextInput
                  style={styles.input}
                  placeholder="Latitude"
                  value={rideData.destinationLat}
                  onChangeText={(value) => updateField('destinationLat', value)}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.coordinateInput}>
                <TextInput
                  style={styles.input}
                  placeholder="Longitude"
                  value={rideData.destinationLng}
                  onChangeText={(value) => updateField('destinationLng', value)}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.mapButtonsContainer}>
              <TouchableOpacity style={styles.mapButton} onPress={openMapForOrigin}>
                <Ionicons name="location" size={20} color="#007AFF" />
                <Text style={styles.mapButtonText}>Set Origin</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.mapButton} onPress={openMapForDestination}>
                <Ionicons name="location" size={20} color="#34C759" />
                <Text style={styles.mapButtonText}>Set Destination</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.sectionHeader}>
              <Ionicons name="time" size={20} color="#007AFF" />
              <Text style={styles.sectionTitle}>Trip Details</Text>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Departure Date & Time *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD HH:MM"
                value={rideData.departureTime}
                onChangeText={(value) => updateField('departureTime', value)}
              />
            </View>

            <View style={styles.rowContainer}>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Available Seats *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="4"
                  value={rideData.availableSeats}
                  onChangeText={(value) => updateField('availableSeats', value)}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.inputLabel}>Price per Seat *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="$25.00"
                  value={rideData.pricePerSeat}
                  onChangeText={(value) => updateField('pricePerSeat', value)}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add any additional details about the ride..."
                value={rideData.description}
                onChangeText={(value) => updateField('description', value)}
                multiline
                numberOfLines={3}
              />
            </View>

            <TouchableOpacity
              style={[styles.publishButton, loading && styles.publishButtonDisabled]}
              onPress={handlePublishRide}
              disabled={loading}
            >
              <Text style={styles.publishButtonText}>
                {loading ? 'Publishing...' : 'Publish Ride'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Map Modal */}
      <Modal
        visible={mapModalVisible}
        animationType="slide"
        onRequestClose={() => setMapModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              Select {selectingOrigin ? 'Origin' : 'Destination'}
            </Text>
            <TouchableOpacity
              onPress={() => setMapModalVisible(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            region={mapRegion}
            onPress={handleMapPress}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            {rideData.originLat && rideData.originLng && (
              <Marker
                coordinate={{
                  latitude: parseFloat(rideData.originLat),
                  longitude: parseFloat(rideData.originLng),
                }}
                title="Origin"
                pinColor="blue"
              />
            )}
            {rideData.destinationLat && rideData.destinationLng && (
              <Marker
                coordinate={{
                  latitude: parseFloat(rideData.destinationLat),
                  longitude: parseFloat(rideData.destinationLng),
                }}
                title="Destination"
                pinColor="green"
              />
            )}
          </MapView>

          <View style={styles.modalFooter}>
            <Text style={styles.modalInstructions}>
              Tap on the map to select the {selectingOrigin ? 'starting point' : 'destination'}
            </Text>
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
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 4,
  },
  form: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  coordinatesContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  coordinateInput: {
    flex: 1,
  },
  mapButtonsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  mapButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF20',
    borderRadius: 12,
    paddingVertical: 12,
  },
  mapButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 8,
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  halfInput: {
    flex: 1,
  },
  publishButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  map: {
    flex: 1,
  },
  modalFooter: {
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  modalInstructions: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
  },
});