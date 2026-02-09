/**
 * Google Maps Utilities
 * 
 * This file contains utility functions for working with Google Maps.
 * The Google Maps JS API is loaded centrally via GoogleMapsContext using useJsApiLoader.
 * These utilities assume the API is already loaded when called.
 */

/**
 * Get the Google Maps API key from environment variables or from server
 */
export const getGoogleMapsApiKey = async (): Promise<string> => {
  try {
    const env = import.meta.env as Record<string, string | undefined>;
    if (env.VITE_GOOGLE_MAPS_API_KEY) {
      return env.VITE_GOOGLE_MAPS_API_KEY;
    }
    
    const response = await fetch('/api/google-maps-key');
    
    if (!response.ok) {
      console.error(`Failed to fetch Google Maps API key: ${response.status} ${response.statusText}`);
      return '';
    }
    
    const data = await response.json();
    const apiKey = data.apiKey || '';
    
    if (!apiKey) {
      console.warn('No Google Maps API key configured - address autocomplete will be disabled');
    }
    
    return apiKey;
  } catch (error) {
    console.error('Error getting Google Maps API key:', error);
    return '';
  }
};

/**
 * Load the Places library (assumes core Google Maps API is already loaded via context)
 */
export const loadPlacesLibrary = async (): Promise<google.maps.PlacesLibrary> => {
  if (!window.google?.maps?.importLibrary) {
    throw new Error('Google Maps API not loaded. Ensure GoogleMapsProvider is wrapping your component.');
  }
  
  const placesLib = await window.google.maps.importLibrary("places") as google.maps.PlacesLibrary;
  return placesLib;
};

/**
 * Interface for geocoding result
 */
export interface GeocodingResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

/**
 * Geocode an address to get latitude and longitude
 */
export const geocodeAddress = async (address: string): Promise<GeocodingResult | null> => {
  if (!address) {
    console.warn('Address is empty, cannot geocode');
    return null;
  }

  try {
    if (window.google && window.google.maps && window.google.maps.Geocoder) {
      return await performGeocode(address);
    }

    console.warn('Google Maps Geocoder is not available, using fallback');
    return generateFallbackCoordinates(address);
  } catch (error) {
    console.error('Error during geocoding:', error);
    return generateFallbackCoordinates(address);
  }
};

/**
 * Perform the actual geocoding
 */
const performGeocode = (address: string): Promise<GeocodingResult> => {
  return new Promise((resolve) => {
    const geocoder = new window.google.maps.Geocoder();
    
    geocoder.geocode({ address }, (results, status) => {
      if (status !== 'OK' || !results || results.length === 0) {
        console.warn(`Geocoding error: ${status}, using fallback coordinates`);
        resolve(generateFallbackCoordinates(address));
        return;
      }

      const location = results[0].geometry.location;
      const formattedAddress = results[0].formatted_address;
      
      resolve({
        latitude: location.lat(),
        longitude: location.lng(),
        formattedAddress: formattedAddress
      });
    });
  });
};

/**
 * Generate fallback coordinates based on an address string
 */
const generateFallbackCoordinates = (address: string): GeocodingResult => {
  let latitude = 40.8478;
  let longitude = -74.0858;

  const stateMatch = address.match(/([A-Z]{2})\s+\d{5}/);
  if (stateMatch && stateMatch[1]) {
    const state = stateMatch[1];
    const stateCoordinates: Record<string, [number, number]> = {
      'CA': [36.7783, -119.4179],
      'FL': [27.6648, -81.5158],
      'NY': [40.7128, -74.0060],
      'TX': [31.9686, -99.9018],
      'IL': [40.6331, -89.3985],
    };

    if (stateCoordinates[state]) {
      [latitude, longitude] = stateCoordinates[state];
    }
  }

  return {
    latitude,
    longitude,
    formattedAddress: address
  };
};

declare global {
  interface Window {
    initGoogleMapsCallback: () => void;
  }
}
