import { Location } from './rides';

const MAPMYINDIA_API_KEY = process.env.EXPO_PUBLIC_MAPMYINDIA_API_KEY;
const MAPMYINDIA_CLIENT_SECRET = process.env.EXPO_PUBLIC_MAPMYINDIA_CLIENT_SECRET;

export interface PlaceSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export interface PlaceDetails {
  name: string;
  lat: number;
  lng: number;
}

// MapMyIndia API response interfaces
interface MapMyIndiaSuggestion {
  placeId: string;
  placeAddress: string;
  placeName: string;
  type: string;
  eLoc: string;
}


export const placesApi = {
  async getAutocompleteSuggestions(input: string): Promise<PlaceSuggestion[]> {
    if (!input.trim() || !MAPMYINDIA_API_KEY) {
      return [];
    }

    try {
      const url = `https://atlas.mapmyindia.com/api/places/search/json?query=${encodeURIComponent(
        input
      )}&key=${MAPMYINDIA_API_KEY}&region=ind`;

      console.log('MapMyIndia API URL:', url);

      const response = await fetch(url);
      console.log('MapMyIndia API response status:', response.status);

      const data = await response.json();
      console.log('MapMyIndia API response:', data);

      if (data.status === 'success' && data.suggestedLocations) {
        return data.suggestedLocations.map((item: MapMyIndiaSuggestion) => ({
          place_id: item.eLoc,
          description: `${item.placeName}, ${item.placeAddress}`,
          structured_formatting: {
            main_text: item.placeName,
            secondary_text: item.placeAddress,
          },
        }));
      } else {
        console.warn('MapMyIndia API error:', data.message || 'Unknown error', 'Status:', data.status);
        return [];
      }
    } catch (error) {
      console.error('Error fetching places suggestions:', error);
      return [];
    }
  },

  async getPlaceDetails(eLoc: string): Promise<PlaceDetails | null> {
    if (!MAPMYINDIA_API_KEY) {
      return null;
    }

    try {
      const url = `https://atlas.mapmyindia.com/api/places/place_detail/json?place_id=${eLoc}&key=${MAPMYINDIA_API_KEY}`;

      console.log('MapMyIndia Place Details URL:', url);

      const response = await fetch(url);
      console.log('MapMyIndia Place Details response status:', response.status);

      const data = await response.json();
      console.log('MapMyIndia Place Details response:', data);

      if (data.status === 'success' && data.places && data.places.length > 0) {
        const place = data.places[0];
        return {
          name: place.placeName,
          lat: parseFloat(place.latitude),
          lng: parseFloat(place.longitude),
        };
      } else {
        console.warn('Place details API error:', data.message || 'Unknown error', 'Status:', data.status);
        return null;
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
      return null;
    }
  },

  // Convert PlaceDetails to Location format used in the app
  convertToLocation(placeDetails: PlaceDetails): Location {
    return {
      name: placeDetails.name,
      lat: placeDetails.lat,
      lng: placeDetails.lng,
    };
  },
};