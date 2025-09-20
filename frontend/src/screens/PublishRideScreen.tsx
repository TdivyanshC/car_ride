import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ridesApi } from '../api/rides';

export default function PublishRideScreen() {
  const [rideData, setRideData] = useState({
    originName: '',
    originLat: '',
    originLng: '',
    destinationName: '',
    destinationLat: '',
    destinationLng: '',
    departureTime: '',
    availableSeats: '4',
    pricePerSeat: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);

  const handlePublishRide = async () => {
    if (!rideData.originName || !rideData.destinationName || !rideData.departureTime || !rideData.pricePerSeat) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const departureDate = new Date(rideData.departureTime).toISOString();
      
      await ridesApi.createRide({
        origin: {
          name: rideData.originName,
          lat: parseFloat(rideData.originLat) || 0,
          lng: parseFloat(rideData.originLng) || 0,
        },
        destination: {
          name: rideData.destinationName,
          lat: parseFloat(rideData.destinationLat) || 0,
          lng: parseFloat(rideData.destinationLng) || 0,
        },
        departure_time: departureDate,
        available_seats: parseInt(rideData.availableSeats),
        price_per_seat: parseFloat(rideData.pricePerSeat),
        description: rideData.description,
      });

      Alert.alert('Success', 'Ride published successfully!');
      // Reset form
      setRideData({
        originName: '',
        originLat: '',
        originLng: '',
        destinationName: '',
        destinationLat: '',
        destinationLng: '',
        departureTime: '',
        availableSeats: '4',
        pricePerSeat: '',
        description: '',
      });
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to publish ride');
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setRideData((prev) => ({ ...prev, [field]: value }));
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

            <TouchableOpacity style={styles.mapButton}>
              <Ionicons name="map" size={20} color="#007AFF" />
              <Text style={styles.mapButtonText}>Select Route on Map</Text>
            </TouchableOpacity>

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
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF20',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 24,
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
});