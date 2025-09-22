import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import Toast from 'react-native-toast-message';
import { placesApi, PlaceSuggestion } from '../api/places';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function SearchScreen() {
  const [searchParams, setSearchParams] = useState({
    origin: null as any,
    destination: null as any,
    date: new Date(),
  });
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [selectingOrigin, setSelectingOrigin] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapRegion, setMapRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [, setLocationPermission] = useState(false);
  const [searchResults, setSearchResults] = useState<PlaceSuggestion[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Request location permissions and get current location
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission(true);
        try {
          let location = await Location.getCurrentPositionAsync({});
          const currentLoc = {
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
      }
    })();
  }, []);

  // Get autocomplete suggestions based on search query
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (searchQuery.trim().length > 2) {
        const suggestions = await placesApi.getAutocompleteSuggestions(searchQuery);
        setSearchResults(suggestions);
      } else {
        setSearchResults([]);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 300); // Debounce API calls
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const selectLocation = async (suggestion: PlaceSuggestion) => {
    try {
      const placeDetails = await placesApi.getPlaceDetails(suggestion.place_id);
      if (placeDetails) {
        const location = placesApi.convertToLocation(placeDetails);

        if (selectingOrigin) {
          setSearchParams(prev => ({ ...prev, origin: location }));
          // Update map region to show the selected location
          setMapRegion({
            latitude: location.lat,
            longitude: location.lng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
        } else {
          setSearchParams(prev => ({ ...prev, destination: location }));
          // Update map region to show the selected location
          setMapRegion({
            latitude: location.lat,
            longitude: location.lng,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          });
        }
        setLocationModalVisible(false);
        Toast.show({
          type: 'success',
          text1: 'Location Selected',
          text2: selectingOrigin ? 'Pickup location set' : 'Drop location set',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to get location details',
      });
    }
  };

  const selectDateTime = (dateTime: Date) => {
    setSearchParams(prev => ({ ...prev, date: dateTime }));
  };

  const handleSearch = () => {
    if (!searchParams.origin) {
      Toast.show({
        type: 'error',
        text1: 'Origin Required',
        text2: 'Please select a starting location',
      });
      return;
    }

    if (!searchParams.destination) {
      Toast.show({
        type: 'error',
        text1: 'Destination Required',
        text2: 'Please select a destination',
      });
      return;
    }

    // Navigate to search results with parameters
    router.push({
      pathname: '/search-results',
      params: {
        origin: JSON.stringify(searchParams.origin),
        destination: JSON.stringify(searchParams.destination),
        date: searchParams.date.toISOString(),
      },
    } as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Find a Ride</Text>
      </View>

      <View style={styles.searchContainer}>
        {/* Origin Selection */}
        <TouchableOpacity
          style={styles.locationButton}
          onPress={() => {
            setSelectingOrigin(true);
            setLocationModalVisible(true);
          }}
        >
          <Ionicons name="location" size={20} color="#007AFF" />
          <View style={styles.locationContent}>
            <Text style={styles.locationLabel}>From</Text>
            <Text style={[styles.locationValue, !searchParams.origin && styles.locationPlaceholder]}>
              {searchParams.origin ? searchParams.origin.name : 'Select pickup location'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        {/* Destination Selection */}
        <TouchableOpacity
          style={styles.locationButton}
          onPress={() => {
            setSelectingOrigin(false);
            setLocationModalVisible(true);
          }}
        >
          <Ionicons name="flag" size={20} color="#FF3B30" />
          <View style={styles.locationContent}>
            <Text style={styles.locationLabel}>To</Text>
            <Text style={[styles.locationValue, !searchParams.destination && styles.locationPlaceholder]}>
              {searchParams.destination ? searchParams.destination.name : 'Select destination'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>

        {/* Date & Time */}
        <TouchableOpacity
          style={styles.timeButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="time" size={20} color="#007AFF" />
          <View style={styles.timeContent}>
            <Text style={styles.timeLabel}>Departure Time</Text>
            <Text style={styles.timeValue}>
              {searchParams.date.toLocaleString('en-US', {
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
              const newTime = new Date();
              newTime.setHours(newTime.getHours() + 2);
              selectDateTime(newTime);
            }}
          >
            <Ionicons name="create" size={16} color="#007AFF" />
          </TouchableOpacity>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={searchParams.date}
            mode="datetime"
            display="default"
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                selectDateTime(selectedDate);
              }
            }}
          />
        )}

        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Find Rides</Text>
        </TouchableOpacity>
      </View>

      {/* Location Selection Modal */}
      <Modal
        visible={locationModalVisible}
        animationType="slide"
        onRequestClose={() => setLocationModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setLocationModalVisible(false)}>
              <Ionicons name="close" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              Select {selectingOrigin ? 'Pickup' : 'Drop'} Location
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#666" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for a city..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            region={mapRegion}
            onRegionChangeComplete={setMapRegion}
           >
            {currentLocation && (
              <Marker
                coordinate={{
                  latitude: currentLocation.lat,
                  longitude: currentLocation.lng,
                }}
                title="Current Location"
                pinColor="blue"
              />
            )}
            {searchParams.origin && (
              <Marker
                coordinate={{
                  latitude: searchParams.origin.lat,
                  longitude: searchParams.origin.lng,
                }}
                title="Pickup Location"
                description={searchParams.origin.name}
                pinColor="green"
              />
            )}
            {searchParams.destination && (
              <Marker
                coordinate={{
                  latitude: searchParams.destination.lat,
                  longitude: searchParams.destination.lng,
                }}
                title="Drop Location"
                description={searchParams.destination.name}
                pinColor="red"
              />
            )}
          </MapView>

          <View style={styles.locationSuggestions}>
            {searchResults.length > 0 ? (
              // Show search results
              searchResults.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.suggestionItem}
                  onPress={() => selectLocation(suggestion)}
                >
                  <Ionicons name="location" size={20} color="#007AFF" />
                  <View style={styles.suggestionContent}>
                    <Text style={styles.suggestionMainText}>
                      {suggestion.structured_formatting.main_text}
                    </Text>
                    <Text style={styles.suggestionSecondaryText}>
                      {suggestion.structured_formatting.secondary_text}
                    </Text>
                  </View>
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
                    onPress={() => {
                      const location = placesApi.convertToLocation({
                        name: currentLocation.name,
                        lat: currentLocation.lat,
                        lng: currentLocation.lng,
                      });
                      if (selectingOrigin) {
                        setSearchParams(prev => ({ ...prev, origin: location }));
                      } else {
                        setSearchParams(prev => ({ ...prev, destination: location }));
                      }
                      setLocationModalVisible(false);
                      Toast.show({
                        type: 'success',
                        text1: 'Location Selected',
                        text2: selectingOrigin ? 'Pickup location set' : 'Drop location set',
                      });
                    }}
                  >
                    <Ionicons name="locate" size={20} color="#007AFF" />
                    <Text style={styles.suggestionText}>Use current location</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => {
                    const location = placesApi.convertToLocation({
                      name: `Location (${mapRegion.latitude.toFixed(4)}, ${mapRegion.longitude.toFixed(4)})`,
                      lat: mapRegion.latitude,
                      lng: mapRegion.longitude,
                    });
                    if (selectingOrigin) {
                      setSearchParams(prev => ({ ...prev, origin: location }));
                    } else {
                      setSearchParams(prev => ({ ...prev, destination: location }));
                    }
                    setLocationModalVisible(false);
                    Toast.show({
                      type: 'success',
                      text1: 'Location Selected',
                      text2: selectingOrigin ? 'Pickup location set' : 'Drop location set',
                    });
                  }}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  locationContent: {
    flex: 1,
    marginLeft: 12,
  },
  locationLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  locationValue: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  locationPlaceholder: {
    color: '#999',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  timeContent: {
    flex: 1,
    marginLeft: 12,
  },
  timeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  timeEditButton: {
    padding: 8,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#1a1a1a',
  },
  map: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
  },
  locationSuggestions: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionContent: {
    flex: 1,
    marginLeft: 12,
  },
  suggestionMainText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  suggestionSecondaryText: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  suggestionText: {
    fontSize: 16,
    color: '#1a1a1a',
    marginLeft: 12,
  },
});