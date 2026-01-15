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
let placesLibraryLoaded = false;

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
    const env = import.meta.env as Record<string, string | undefined>;
    if (env.VITE_GOOGLE_MAPS_API_KEY) {
      return env.VITE_GOOGLE_MAPS_API_KEY;
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
      console.error(`Failed to fetch Google Maps API key: ${response.status} ${response.statusText}`);
      return '';
    }
    
    const data = await response.json();
    const apiKey = data.apiKey || '';
    
    if (!apiKey) {
      console.warn('No Google Maps API key configured - address autocomplete will be disabled');
      return '';
    }
    
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
    
    console.error('All API key fetch attempts failed - address autocomplete will be disabled');
    return '';
  }
};

/**
 * Load the Google Maps Core API using dynamic import (new API style)
 * This is required for the new Places API (AutocompleteSuggestion)
 */
export const loadGoogleMapsApi = async (): Promise<void> => {
  // If already loaded, resolve immediately
  if (googleMapsApiLoaded && window.google?.maps) {
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

  try {
    const apiKey = await getGoogleMapsApiKey();
    
    if (!apiKey) {
      googleMapsApiLoading = false;
      throw new Error('No Google Maps API key available');
    }

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Wait for existing script to load
      await new Promise<void>((resolve, reject) => {
        if (window.google?.maps) {
          resolve();
        } else {
          existingScript.addEventListener('load', () => resolve());
          existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Maps')));
        }
      });
    } else {
      // Load the new way using inline bootstrap loader
      // This allows importLibrary() to work with the new Places API
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.innerHTML = `
          (g=>{var h,a,k,p="The Google Maps JavaScript API",c="google",l="importLibrary",q="__ib__",m=document,b=window;b=b[c]||(b[c]={});var d=b.maps||(b.maps={}),r=new Set,e=new URLSearchParams,u=()=>h||(h=new Promise(async(f,n)=>{await (a=m.createElement("script"));e.set("libraries",[...r]);for(k in g)e.set(k.replace(/[A-Z]/g,t=>"_"+t[0].toLowerCase()),g[k]);e.set("callback",c+".maps."+q);a.src="https://maps.googleapis.com/maps/api/js?"+e;d[q]=f;a.onerror=()=>h=n(Error(p+" could not load."));a.nonce=m.querySelector("script[nonce]")?.nonce||"";m.head.append(a)}));d[l]?console.warn(p+" only loads once. Ignoring:",g):d[l]=(f,...n)=>r.add(f)&&u().then(()=>d[l](f,...n))})({
            key: "${apiKey}",
            v: "weekly"
          });
        `;
        script.onerror = () => reject(new Error('Failed to load Google Maps bootstrap'));
        document.head.appendChild(script);
        
        // Give the bootstrap a moment to set up, then verify
        const checkLoaded = () => {
          if (window.google?.maps?.importLibrary) {
            resolve();
          } else {
            setTimeout(checkLoaded, 50);
          }
        };
        setTimeout(checkLoaded, 100);
      });
    }
    
    googleMapsApiLoaded = true;
    googleMapsApiLoading = false;
    
    // Call all waiting callbacks
    loadCallbacks.forEach(callback => callback());
    loadCallbacks = [];
    
  } catch (error) {
    googleMapsApiLoading = false;
    console.error('Error loading Google Maps API:', error);
    throw error;
  }
};

/**
 * Load the Places library specifically (required for new Autocomplete API)
 */
export const loadPlacesLibrary = async (): Promise<google.maps.PlacesLibrary> => {
  // Ensure core API is loaded first
  await loadGoogleMapsApi();
  
  if (!window.google?.maps?.importLibrary) {
    throw new Error('Google Maps importLibrary not available');
  }
  
  // Import places library using the new API
  const placesLib = await window.google.maps.importLibrary("places") as google.maps.PlacesLibrary;
  placesLibraryLoaded = true;
  
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
 * @param address The address to geocode
 * @returns Promise with geocoding result
 */
export const geocodeAddress = async (address: string): Promise<GeocodingResult | null> => {
  if (!address) {
    console.warn('Address is empty, cannot geocode');
    return null;
  }

  console.log('Starting geocode for address:', address);

  try {
    // Check if Google Maps is already loaded (by any script)
    if (window.google && window.google.maps && window.google.maps.Geocoder) {
      console.log('Google Maps already loaded, using existing geocoder');
      return await performGeocode(address);
    }

    // Try to load Google Maps API
    try {
      await loadGoogleMapsApi();
    } catch (error) {
      console.warn('Failed to load Google Maps API during geocoding:', error);
    }

    // Check if API is available after loading attempt
    if (!window.google || !window.google.maps || !window.google.maps.Geocoder) {
      // Wait a bit and try again (API might be loading via another script)
      console.log('Waiting for Google Maps API to be available...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (!window.google || !window.google.maps || !window.google.maps.Geocoder) {
        console.warn('Google Maps Geocoder is not available, using fallback');
        return generateFallbackCoordinates(address);
      }
    }

    return await performGeocode(address);
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
      console.log('Geocode response - status:', status, 'results:', results?.length);
      
      if (status !== 'OK' || !results || results.length === 0) {
        console.warn(`Geocoding error: ${status}, using fallback coordinates`);
        resolve(generateFallbackCoordinates(address));
        return;
      }

      const location = results[0].geometry.location;
      const formattedAddress = results[0].formatted_address;
      
      console.log('Geocoded successfully:', formattedAddress, 'coords:', location.lat(), location.lng());
      
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
 * This ensures we always return something usable when the API fails
 */
const generateFallbackCoordinates = (address: string): GeocodingResult => {
  // Default to New Jersey
  let latitude = 40.8478;
  let longitude = -74.0858;

  // Try to extract state from address and use a general coordinate for that state
  const stateMatch = address.match(/([A-Z]{2})\s+\d{5}/);
  if (stateMatch && stateMatch[1]) {
    const state = stateMatch[1];
    const stateCoordinates: Record<string, [number, number]> = {
      'CA': [36.7783, -119.4179], // California
      'FL': [27.6648, -81.5158],  // Florida
      'NY': [40.7128, -74.0060],  // New York
      'TX': [31.9686, -99.9018],  // Texas
      'IL': [40.6331, -89.3985],  // Illinois
      // Add more states as needed
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

// Add the callback type to window
declare global {
  interface Window {
    initGoogleMapsCallback: () => void;
  }
}