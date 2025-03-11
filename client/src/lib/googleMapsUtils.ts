/**
 * Google Maps Utilities
 * 
 * This file contains utility functions for working with Google Maps
 * including loading the API, geocoding addresses, and other common tasks.
 */

// Store API loaded state
let googleMapsApiLoaded = false;
let googleMapsApiLoading = false;
let loadCallbacks: (() => void)[] = [];

// Configuration for API key fetch retries
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

/**
 * Sleep for specified milliseconds
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get the Google Maps API key from environment variables or from server
 * with retry functionality for enhanced reliability
 */
export const getGoogleMapsApiKey = async (retryCount = 0): Promise<string> => {
  try {
    // First check if we have it in the environment variables
    if (import.meta.env.VITE_GOOGLE_MAPS_API_KEY) {
      return import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    }
    
    // Add cache-busting to prevent stale responses
    const timestamp = Date.now();
    
    // Determine the correct base URL - handle both development and production
    const isProduction = window.location.hostname.includes('replit.app');
    const baseUrl = isProduction
      ? `https://${window.location.hostname}`
      : '';
    
    const url = `${baseUrl}/api/google-maps-key?_t=${timestamp}`;
    
    console.log('Fetching Google Maps API key from:', url);
    
    // If not in environment, fetch from server API endpoint with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Google Maps API key: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    const apiKey = data.apiKey || '';
    
    // Verify we actually got a key
    if (!apiKey && retryCount < MAX_RETRIES) {
      console.warn(`Empty API key received, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
      // Exponential backoff for retries
      await sleep(RETRY_DELAY * Math.pow(2, retryCount));
      return getGoogleMapsApiKey(retryCount + 1);
    }
    
    return apiKey;
  } catch (error) {
    console.error('Error getting Google Maps API key:', error);
    
    // Implement retry for network errors or timeouts
    if (retryCount < MAX_RETRIES) {
      console.warn(`API key fetch failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
      // Exponential backoff for retries
      await sleep(RETRY_DELAY * Math.pow(2, retryCount));
      return getGoogleMapsApiKey(retryCount + 1);
    }
    
    return '';
  }
};

/**
 * Load the Google Maps API with the Places library
 */
export const loadGoogleMapsApi = async (): Promise<void> => {
  // If already loaded, resolve immediately
  if (googleMapsApiLoaded) {
    return Promise.resolve();
  }

  // If already loading, return a promise that resolves when loading is complete
  if (googleMapsApiLoading) {
    return new Promise((resolve) => {
      loadCallbacks.push(resolve);
    });
  }

  // Start loading the API
  googleMapsApiLoading = true;

  return new Promise(async (resolve, reject) => {
    try {
      // Add callback for the API loader
      window.initGoogleMapsCallback = () => {
        // Mark as loaded
        googleMapsApiLoaded = true;
        googleMapsApiLoading = false;
        
        // Call all callbacks
        loadCallbacks.forEach(callback => callback());
        loadCallbacks = [];
        
        resolve();
      };

      // Get API key - now properly awaiting the async function
      const apiKey = await getGoogleMapsApiKey();
      
      if (!apiKey) {
        console.error('No Google Maps API key available');
        reject(new Error('No Google Maps API key available'));
        return;
      }
      
      // Create script element
      const script = document.createElement('script');
      
      // Set script attributes
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initGoogleMapsCallback`;
      script.async = true;
      script.defer = true;
      script.onerror = (error) => {
        console.error('Error loading Google Maps API:', error);
        reject(new Error('Failed to load Google Maps API'));
      };

      // Add script to document
      document.head.appendChild(script);
    } catch (error) {
      console.error('Error setting up Google Maps API:', error);
      reject(error);
    }
  });
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
 * @param address The address to geocode
 * @returns Promise with geocoding result
 */
export const geocodeAddress = async (address: string): Promise<GeocodingResult | null> => {
  if (!address) {
    console.warn('Address is empty, cannot geocode');
    return null;
  }

  try {
    // Ensure Google Maps API is loaded
    await loadGoogleMapsApi();

    // Check if API is available
    if (!window.google || !window.google.maps || !window.google.maps.Geocoder) {
      console.error('Google Maps Geocoder is not available');
      return null;
    }

    // Create geocoder instance
    const geocoder = new window.google.maps.Geocoder();

    // Geocode the address
    return new Promise((resolve, reject) => {
      geocoder.geocode({ address }, (results, status) => {
        if (status !== 'OK' || !results || results.length === 0) {
          console.warn(`Geocoding error: ${status}`);
          resolve(null);
          return;
        }

        const location = results[0].geometry.location;
        
        // Return coordinates and formatted address
        resolve({
          latitude: location.lat(),
          longitude: location.lng(),
          formattedAddress: results[0].formatted_address
        });
      });
    });
  } catch (error) {
    console.error('Error during geocoding:', error);
    return null;
  }
};

// Add the callback type to window
declare global {
  interface Window {
    initGoogleMapsCallback: () => void;
  }
}