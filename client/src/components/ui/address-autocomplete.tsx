import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '../../components/ui/input';
import { MapPin, X, Loader2 } from 'lucide-react';
import { loadGoogleMapsApi } from '../../lib/googleMapsUtils';

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const isInitializedRef = useRef(false);

  const initializeAutocomplete = useCallback(async () => {
    if (isInitializedRef.current || !inputRef.current) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      await loadGoogleMapsApi();
      
      if (!window.google?.maps?.places?.Autocomplete) {
        setError('Google Maps not available');
        setIsLoading(false);
        return;
      }

      autocompleteRef.current = new window.google.maps.places.Autocomplete(
        inputRef.current,
        {
          componentRestrictions: { country: ['us'] },
          fields: ['address_components', 'geometry', 'formatted_address'],
          types: ['address'],
        }
      );

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        
        if (!place) {
          console.warn('No place data returned');
          return;
        }

        console.log('Place selected:', place);

        let streetNumber = '';
        let route = '';
        let city = '';
        let state = '';
        let postalCode = '';
        let country = '';

        for (const component of place.address_components || []) {
          const type = component.types[0];
          
          switch (type) {
            case 'street_number':
              streetNumber = component.long_name;
              break;
            case 'route':
              route = component.short_name;
              break;
            case 'locality':
              city = component.long_name;
              break;
            case 'administrative_area_level_1':
              state = component.short_name;
              break;
            case 'postal_code':
              postalCode = component.long_name;
              break;
            case 'postal_code_suffix':
              if (postalCode) {
                postalCode = `${postalCode}-${component.long_name}`;
              }
              break;
            case 'country':
              country = component.long_name;
              break;
          }
        }

        const streetAddress = streetNumber ? `${streetNumber} ${route}` : route;
        const fullAddress = place.formatted_address || 
          [streetAddress, city, state, postalCode, country].filter(Boolean).join(', ');

        console.log('Parsed address:', { streetAddress, city, state, postalCode, fullAddress });

        const lat = place.geometry?.location?.lat();
        const lng = place.geometry?.location?.lng();

        setInputValue(fullAddress);

        if (lat !== undefined && lng !== undefined) {
          onAddressSelect(fullAddress, {
            latitude: lat,
            longitude: lng,
            formattedAddress: fullAddress
          });
        } else {
          onAddressSelect(fullAddress);
        }
      });

      isInitializedRef.current = true;
      setIsLoading(false);
      
    } catch (err) {
      console.error('Error initializing autocomplete:', err);
      setError('Failed to load address search');
      setIsLoading(false);
    }
  }, [onAddressSelect]);

  useEffect(() => {
    initializeAutocomplete();
    
    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [initializeAutocomplete]);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleClear = () => {
    setInputValue('');
    onAddressSelect('');
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      if (inputValue && inputValue !== value) {
        onAddressSelect(inputValue);
      }
    }, 200);
  };

  return (
    <div className="relative">
      <div className="relative">
        <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 z-10">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
        </div>
        <Input
          {...props}
          ref={inputRef}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          className="pl-8 pr-8"
          placeholder={isLoading ? "Loading..." : "Enter address..."}
          disabled={isLoading}
        />
        {inputValue && !isLoading && (
          <div 
            className="absolute right-2 top-1/2 transform -translate-y-1/2 cursor-pointer text-gray-400 hover:text-gray-600 z-10"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
      {!isLoading && !error && (
        <p className="text-xs text-gray-500 mt-1">Start typing to see address suggestions</p>
      )}
    </div>
  );
}
