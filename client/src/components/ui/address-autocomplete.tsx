import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2, X } from 'lucide-react';
import { useGoogleMaps } from '../../contexts/GoogleMapsContext';
import { Input } from './input';

export interface AddressCoordinates {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export interface AddressAutocompleteProps {
  onAddressSelect: (address: string, coordinates?: AddressCoordinates) => void;
  value: string;
  placeholder?: string;
  className?: string;
}

interface Suggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
  fullText: string;
  placePrediction: any;
}

export function AddressAutocomplete({ 
  onAddressSelect, 
  value,
  placeholder = "Enter address...",
  className = ""
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isApiReady, setIsApiReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTokenRef = useRef<any>(null);
  const placesLibRef = useRef<google.maps.PlacesLibrary | null>(null);

  const { isLoaded } = useGoogleMaps();

  useEffect(() => {
    if (!isLoaded) return;

    const init = async () => {
      try {
        const placesLib = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;
        placesLibRef.current = placesLib;
        setIsApiReady(true);
      } catch (err) {
        console.error('Failed to load Google Places API:', err);
        setError('Failed to load address search');
      }
    };
    init();
  }, [isLoaded]);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const getSessionToken = useCallback(() => {
    const placesLib = placesLibRef.current as any;
    if (!sessionTokenRef.current && placesLib?.AutocompleteSessionToken) {
      sessionTokenRef.current = new placesLib.AutocompleteSessionToken();
    }
    return sessionTokenRef.current;
  }, []);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!isApiReady || !query || query.length < 3) {
      setSuggestions([]);
      setShowDropdown(false);
      return;
    }

    const placesLib = placesLibRef.current as any;
    if (!placesLib) {
      console.error('Places library not loaded');
      return;
    }

    setIsLoading(true);
    
    try {
      const { AutocompleteSuggestion } = placesLib;
      
      if (!AutocompleteSuggestion) {
        console.error('AutocompleteSuggestion not available. Available:', Object.keys(placesLib));
        setIsLoading(false);
        return;
      }
      
      const request = {
        input: query,
        includedRegionCodes: ['us'],
        sessionToken: getSessionToken(),
      };

      const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
      
      const results = response?.suggestions;
      
      if (results && results.length > 0) {
        const formattedSuggestions: Suggestion[] = results.map((suggestion: any) => {
          const placePrediction = suggestion.placePrediction;
          return {
            placeId: placePrediction.placeId,
            mainText: placePrediction.mainText?.text || '',
            secondaryText: placePrediction.secondaryText?.text || '',
            fullText: placePrediction.text?.text || '',
            placePrediction: placePrediction,
          };
        });
        setSuggestions(formattedSuggestions);
        setShowDropdown(true);
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    } catch (err: any) {
      console.error('Error fetching suggestions:', err);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [isApiReady, getSessionToken]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(newValue);
    }, 300);
  };

  const handleSelectSuggestion = async (suggestion: Suggestion) => {
    setShowDropdown(false);
    setInputValue(suggestion.fullText);
    setIsLoading(true);
    
    try {
      const place = suggestion.placePrediction.toPlace();
      await place.fetchFields({ 
        fields: ['formattedAddress', 'location', 'addressComponents'] 
      });

      const formattedAddress = place.formattedAddress || suggestion.fullText;
      const location = place.location;

      let zipCode = '';
      if (place.addressComponents) {
        for (const component of place.addressComponents) {
          if (component.types.includes('postal_code')) {
            zipCode = component.shortText || component.longText || '';
            break;
          }
        }
      }

      setInputValue(formattedAddress);
      
      sessionTokenRef.current = null;

      if (location) {
        onAddressSelect(formattedAddress, {
          latitude: location.lat(),
          longitude: location.lng(),
          formattedAddress: formattedAddress
        });
      } else {
        onAddressSelect(formattedAddress);
      }
    } catch (err) {
      console.error('Error fetching place details:', err);
      onAddressSelect(suggestion.fullText);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setInputValue('');
    setSuggestions([]);
    setShowDropdown(false);
    onAddressSelect('');
    inputRef.current?.focus();
  };

  if (error) {
    return (
      <div className={`relative ${className}`}>
        <div className="flex h-10 w-full rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-600">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowDropdown(true);
            }
          }}
          placeholder={placeholder}
          className="pl-9 pr-8"
          autoComplete="off"
        />
        {isLoading ? (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        ) : inputValue ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      
      {showDropdown && suggestions.length > 0 && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.placeId || index}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none border-b border-gray-100 dark:border-gray-700 last:border-b-0"
            >
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                    {suggestion.mainText}
                  </div>
                  {suggestion.secondaryText && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {suggestion.secondaryText}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      
      {!isApiReady && !error && (
        <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading address search...
        </p>
      )}
    </div>
  );
}
