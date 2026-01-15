import React, { useState, useEffect, useRef } from 'react';
import { Input } from '../../components/ui/input';
import { MapPin, X, Loader2 } from 'lucide-react';
import { useDebounce } from '../../hooks/use-debounce';
import { loadGoogleMapsApi } from '../../lib/googleMapsUtils';

// Interface for place prediction with place_id
interface PlacePrediction {
  placeId: string;
  description: string;
}

// Interface for place details result
interface PlaceDetailsResult {
  formattedAddress: string;
  zipCode: string;
  latitude: number | null;
  longitude: number | null;
}

// Function to get address suggestions with place_id using client-side Places API
const getAddressSuggestions = async (input: string): Promise<PlacePrediction[]> => {
  if (!input || input.length < 3) {
    return [];
  }

  try {
    await loadGoogleMapsApi();
    
    if (!window.google?.maps?.places?.AutocompleteService) {
      console.warn('Google Places AutocompleteService not available');
      return [];
    }

    const service = new window.google.maps.places.AutocompleteService();
    
    return new Promise((resolve) => {
      service.getPlacePredictions(
        {
          input: input,
          types: ['address'],
        },
        (predictions, status) => {
          if (status !== 'OK' || !predictions) {
            console.warn('Places predictions status:', status);
            resolve([]);
          } else {
            resolve(predictions.map(p => ({
              placeId: p.place_id,
              description: p.description
            })));
          }
        }
      );
    });
  } catch (error) {
    console.error('Error fetching address suggestions:', error);
    return [];
  }
};

// Function to geocode address as a fallback
const geocodeAddressFallback = async (address: string): Promise<PlaceDetailsResult | null> => {
  if (!address || !window.google?.maps?.Geocoder) {
    return null;
  }

  const geocoder = new window.google.maps.Geocoder();
  
  return new Promise((resolve) => {
    geocoder.geocode({ address }, (results, status) => {
      console.log('Geocoder fallback status:', status);
      
      if (status !== 'OK' || !results || results.length === 0) {
        resolve(null);
        return;
      }
      
      const result = results[0];
      const formattedAddress = result.formatted_address;
      const lat = result.geometry?.location?.lat();
      const lng = result.geometry?.location?.lng();
      
      let zipCode = '';
      for (const component of result.address_components || []) {
        if (component.types.includes('postal_code')) {
          zipCode = component.short_name;
          break;
        }
      }
      
      resolve({
        formattedAddress,
        zipCode,
        latitude: lat || null,
        longitude: lng || null,
      });
    });
  });
};

// Function to get place details by place_id using client-side PlacesService
const getPlaceDetails = async (placeId: string, descriptionFallback: string): Promise<PlaceDetailsResult | null> => {
  if (!placeId) {
    return null;
  }

  try {
    await loadGoogleMapsApi();
    
    if (!window.google?.maps?.places?.PlacesService) {
      console.warn('Google PlacesService not available, trying geocoder fallback');
      return geocodeAddressFallback(descriptionFallback);
    }

    // PlacesService requires a map or div element
    const dummyDiv = document.createElement('div');
    const service = new window.google.maps.places.PlacesService(dummyDiv);
    
    return new Promise((resolve) => {
      service.getDetails(
        {
          placeId: placeId,
          fields: ['formatted_address', 'address_components', 'geometry'],
        },
        async (place, status) => {
          console.log('PlaceDetails status:', status);
          
          if (status !== 'OK' || !place) {
            console.warn('Place details failed:', status, '- trying geocoder fallback');
            const fallbackResult = await geocodeAddressFallback(descriptionFallback);
            resolve(fallbackResult);
            return;
          }
          
          const formattedAddress = place.formatted_address || '';
          const lat = place.geometry?.location?.lat();
          const lng = place.geometry?.location?.lng();
          
          // Extract zip code from address components
          let zipCode = '';
          for (const component of place.address_components || []) {
            if (component.types.includes('postal_code')) {
              zipCode = component.short_name;
              break;
            }
          }
          
          // If we got no coordinates, try geocoder fallback
          if (lat === undefined || lng === undefined) {
            console.warn('No coordinates from Place Details, trying geocoder fallback');
            const fallbackResult = await geocodeAddressFallback(descriptionFallback);
            if (fallbackResult && fallbackResult.latitude && fallbackResult.longitude) {
              resolve(fallbackResult);
              return;
            }
          }
          
          console.log('Place details result:', { formattedAddress, zipCode, lat, lng });
          
          resolve({
            formattedAddress,
            zipCode,
            latitude: lat || null,
            longitude: lng || null,
          });
        }
      );
    });
  } catch (error) {
    console.error('Error fetching place details:', error);
    // Try geocoder fallback on error
    return geocodeAddressFallback(descriptionFallback);
  }
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
  const [suggestions, setSuggestions] = useState<PlacePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const debouncedValue = useDebounce(inputValue, 300);
  const suggestionContainerRef = useRef<HTMLDivElement>(null);
  const justSelectedRef = useRef(false);

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
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching address suggestions:', error);
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
    setShowSuggestions(e.target.value.length >= 3);
  };

  // Handle selection of a prediction - uses place_id to get full details with zip + coordinates
  const handleSelectPrediction = async (prediction: PlacePrediction, e?: React.PointerEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (fetchingDetails || justSelectedRef.current) {
      console.log('Already processing, skipping duplicate call');
      return;
    }
    
    justSelectedRef.current = true;
    setShowSuggestions(false);
    setFetchingDetails(true);
    setInputValue(prediction.description + ' (loading...)');
    
    console.log('Fetching place details for:', prediction.placeId, prediction.description);
    
    try {
      const result = await getPlaceDetails(prediction.placeId, prediction.description);
      console.log('Place details result:', result);
      
      if (result && result.formattedAddress) {
        const fullAddress = result.formattedAddress;
        console.log('Setting full address with zip:', fullAddress, 'zip:', result.zipCode);
        setInputValue(fullAddress);
        
        if (result.latitude !== null && result.longitude !== null) {
          onAddressSelect(fullAddress, {
            latitude: result.latitude,
            longitude: result.longitude,
            formattedAddress: fullAddress
          });
        } else {
          onAddressSelect(fullAddress);
        }
      } else {
        console.warn('No details for place:', prediction.placeId);
        setInputValue(prediction.description);
        onAddressSelect(prediction.description);
      }
    } catch (error) {
      console.error('Error fetching place details:', error);
      setInputValue(prediction.description);
      onAddressSelect(prediction.description);
    } finally {
      setFetchingDetails(false);
      setTimeout(() => {
        justSelectedRef.current = false;
      }, 500);
    }
  };

  const handleClear = () => {
    setInputValue('');
    onAddressSelect('');
    setShowSuggestions(false);
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (justSelectedRef.current) {
        justSelectedRef.current = false;
        setShowSuggestions(false);
        return;
      }
      if (inputValue && inputValue !== value && !inputValue.includes('(loading...)')) {
        onAddressSelect(inputValue);
      }
      setShowSuggestions(false);
    }, 350);
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
            <div className="px-4 py-2 text-sm text-gray-500 flex items-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Searching addresses...
            </div>
          ) : fetchingDetails ? (
            <div className="px-4 py-2 text-sm text-blue-500 flex items-center">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Getting full address with zip code...
            </div>
          ) : suggestions.length > 0 ? (
            <ul role="listbox">
              {suggestions.map((prediction, index) => (
                <li 
                  key={prediction.placeId || index}
                  role="option"
                  tabIndex={0}
                  className="px-4 py-3 text-sm hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer flex items-center touch-manipulation active:bg-blue-100"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    justSelectedRef.current = true;
                    handleSelectPrediction(prediction, e);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectPrediction(prediction);
                    }
                  }}
                >
                  <MapPin className="h-4 w-4 mr-2 text-blue-500 flex-shrink-0" />
                  <span>{prediction.description}</span>
                </li>
              ))}
            </ul>
          ) : debouncedValue.length >= 3 ? (
            <div 
              role="option"
              tabIndex={0}
              className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-gray-700 cursor-pointer flex items-center touch-manipulation active:bg-blue-100"
              onPointerDown={async (e) => {
                e.preventDefault();
                justSelectedRef.current = true;
                setShowSuggestions(false);
                setFetchingDetails(true);
                setInputValue(debouncedValue + ' (loading...)');
                
                // Try to geocode manual entry to get full address with zip and coordinates
                const result = await geocodeAddressFallback(debouncedValue);
                if (result && result.formattedAddress && result.latitude && result.longitude) {
                  setInputValue(result.formattedAddress);
                  onAddressSelect(result.formattedAddress, {
                    latitude: result.latitude,
                    longitude: result.longitude,
                    formattedAddress: result.formattedAddress
                  });
                } else {
                  setInputValue(debouncedValue);
                  onAddressSelect(debouncedValue);
                }
                setFetchingDetails(false);
                setTimeout(() => { justSelectedRef.current = false; }, 500);
              }}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  justSelectedRef.current = true;
                  setShowSuggestions(false);
                  setFetchingDetails(true);
                  setInputValue(debouncedValue + ' (loading...)');
                  
                  const result = await geocodeAddressFallback(debouncedValue);
                  if (result && result.formattedAddress && result.latitude && result.longitude) {
                    setInputValue(result.formattedAddress);
                    onAddressSelect(result.formattedAddress, {
                      latitude: result.latitude,
                      longitude: result.longitude,
                      formattedAddress: result.formattedAddress
                    });
                  } else {
                    setInputValue(debouncedValue);
                    onAddressSelect(debouncedValue);
                  }
                  setFetchingDetails(false);
                  setTimeout(() => { justSelectedRef.current = false; }, 500);
                }
              }}
            >
              <MapPin className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
              <span>Use "{debouncedValue}"</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}