import React, { useState, useEffect, useRef } from 'react';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Search, MapPin, X } from 'lucide-react';
import { useDebounce } from '../../hooks/use-debounce';
import { loadGoogleMapsApi, geocodeAddress } from '../../lib/googleMapsUtils';

// Interface for Google Maps predictions
interface Prediction {
  description: string;
  place_id: string;
}

// Function to get address suggestions using Google Maps Places API
const getAddressSuggestions = async (input: string): Promise<string[]> => {
  // Only return suggestions if input is at least 3 characters
  if (!input || input.length < 3) {
    return [];
  }

  try {
    // Try to load Google Maps API, but don't block if it fails
    try {
      await loadGoogleMapsApi();
    } catch (error) {
      console.warn('Failed to load Google Maps API:', error);
      return getFallbackSuggestions(input);
    }

    // Check if Google Maps API is loaded
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      console.warn('Google Maps Places API not loaded. Using fallback suggestions.');
      return getFallbackSuggestions(input);
    }

    // Create a session token for billing efficiency if supported
    const sessionToken = new window.google.maps.places.AutocompleteSessionToken();
    
    // Create a new place service
    const service = new window.google.maps.places.AutocompleteService();
    
    // Request predictions from the service
    const response = await new Promise<google.maps.places.AutocompletePrediction[]>((resolve, reject) => {
      service.getPlacePredictions(
        {
          input: input,
          types: ['address'],
          sessionToken: sessionToken,
        },
        (predictions, status) => {
          if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
            console.warn('Google Places API status:', status);
            resolve([]);
          } else {
            resolve(predictions);
          }
        }
      );
    });
    
    // Extract address descriptions from predictions
    return response.map(prediction => prediction.description);
  } catch (error) {
    console.error('Error fetching address suggestions:', error);
    return getFallbackSuggestions(input);
  }
};

// Fallback function if Google Maps API is not available - returns empty to allow manual entry
const getFallbackSuggestions = (input: string): Promise<string[]> => {
  // Return empty array - user can still type addresses manually
  return Promise.resolve([]);
};

export interface AddressCoordinates {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export interface AddressAutocompleteProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onAddressSelect: (address: string, coordinates?: AddressCoordinates) => void;
  value: string;
}

export function AddressAutocomplete({ 
  onAddressSelect, 
  value,
  ...props 
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const debouncedValue = useDebounce(inputValue, 300);
  const suggestionContainerRef = useRef<HTMLDivElement>(null);
  const justSelectedRef = useRef(false); // Track if we just selected a suggestion

  // Fetch suggestions when input changes (debounced)
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedValue.length < 3) {
        setSuggestions([]);
        return;
      }

      setLoading(true);
      try {
        const results = await getAddressSuggestions(debouncedValue);
        setSuggestions(results);
        // Keep dropdown open for manual entry option even when no results
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching address suggestions:', error);
        // Still show dropdown for manual entry option on error
        setShowSuggestions(true);
      } finally {
        setLoading(false);
      }
    };

    fetchSuggestions();
  }, [debouncedValue]);

  // Update internal state when value prop changes
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionContainerRef.current && 
        !suggestionContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    // Show suggestions only if we have input with length >= 3
    setShowSuggestions(e.target.value.length >= 3);
  };

  const handleSelectSuggestion = async (suggestion: string) => {
    justSelectedRef.current = true; // Mark that we just selected a suggestion
    setInputValue(suggestion);
    setShowSuggestions(false);
    
    // Geocode the selected address to get coordinates
    setGeocoding(true);
    
    try {
      const result = await geocodeAddress(suggestion);
      if (result) {
        console.log('Geocoded address:', result);
        onAddressSelect(suggestion, {
          latitude: result.latitude,
          longitude: result.longitude,
          formattedAddress: result.formattedAddress
        });
      } else {
        // If geocoding fails, provide default coordinates to keep functionality working
        console.warn('Geocoding failed for address:', suggestion);
        // Use a default coordinate (this can be adjusted as needed)
        onAddressSelect(suggestion, {
          latitude: 34.0522, // Default to Los Angeles
          longitude: -118.2437,
          formattedAddress: suggestion
        });
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
      // Use a default coordinate (this can be adjusted as needed)
      onAddressSelect(suggestion, {
        latitude: 34.0522, // Default to Los Angeles
        longitude: -118.2437,
        formattedAddress: suggestion
      });
    } finally {
      setGeocoding(false);
    }
  };

  const handleClear = () => {
    setInputValue('');
    onAddressSelect('');
    setShowSuggestions(false);
  };

  const handleBlur = () => {
    // Small delay to allow click on suggestions to register
    setTimeout(() => {
      // Skip if we just selected a suggestion (it already called onAddressSelect with coordinates)
      if (justSelectedRef.current) {
        justSelectedRef.current = false;
        setShowSuggestions(false);
        return;
      }
      if (inputValue && inputValue !== value) {
        // User typed an address manually, submit it
        onAddressSelect(inputValue);
      }
      setShowSuggestions(false);
    }, 200);
  };

  return (
    <div className="relative" ref={suggestionContainerRef}>
      <div className="relative">
        <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400">
          <MapPin className="h-4 w-4" />
        </div>
        <Input
          {...props}
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => inputValue.length >= 3 && setShowSuggestions(true)}
          onBlur={handleBlur}
          className="pl-8 pr-8"
          placeholder="Enter address..."
        />
        {inputValue && (
          <div 
            className="absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-600"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 max-h-60 overflow-auto">
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-500">Searching addresses...</div>
          ) : suggestions.length > 0 ? (
            <ul>
              {suggestions.map((suggestion, index) => (
                <li 
                  key={index} 
                  className="px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer flex items-center"
                  onClick={() => handleSelectSuggestion(suggestion)}
                >
                  <MapPin className="h-4 w-4 mr-2 text-blue-500" />
                  <span>{suggestion}</span>
                </li>
              ))}
            </ul>
          ) : debouncedValue.length >= 3 ? (
            <div 
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer flex items-center"
              onClick={() => handleSelectSuggestion(debouncedValue)}
            >
              <MapPin className="h-4 w-4 mr-2 text-gray-400" />
              <span>Use "{debouncedValue}"</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}