import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { loadGoogleMapsApi } from '../../lib/googleMapsUtils';

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

export function AddressAutocomplete({ 
  onAddressSelect, 
  value,
  placeholder = "Enter address...",
  className = ""
}: AddressAutocompleteProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayValue, setDisplayValue] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteRef = useRef<any>(null);
  const isInitializedRef = useRef(false);

  const initializeAutocomplete = useCallback(async () => {
    if (isInitializedRef.current || !containerRef.current) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      await loadGoogleMapsApi();
      
      // Import the Places library using the new API
      // Cast to any since TypeScript types may not include new PlaceAutocompleteElement
      const placesLib = await google.maps.importLibrary("places") as any;
      const PlaceAutocompleteElement = placesLib.PlaceAutocompleteElement;
      
      if (!PlaceAutocompleteElement) {
        setError('Places API not available');
        setIsLoading(false);
        return;
      }

      // Create the autocomplete element with address type restriction
      // Use includedPrimaryTypes for the new API (not types)
      const placeAutocomplete = new PlaceAutocompleteElement({
        includedRegionCodes: ['US'],
        includedPrimaryTypes: ['street_address', 'premise', 'subpremise'],
      });

      // Style the element
      placeAutocomplete.style.width = '100%';
      placeAutocomplete.style.fontSize = '14px';
      
      // Set initial value if provided
      if (value) {
        placeAutocomplete.value = value;
      }
      
      // Clear container and append
      containerRef.current.innerHTML = '';
      containerRef.current.appendChild(placeAutocomplete);
      
      autocompleteRef.current = placeAutocomplete;

      // Listen for place selection using the new gmp-select event
      placeAutocomplete.addEventListener('gmp-select', async (event: any) => {
        try {
          const placePrediction = event.placePrediction;
          if (!placePrediction) {
            console.warn('No place prediction in event');
            return;
          }

          // Convert prediction to Place and fetch details
          const place = placePrediction.toPlace();
          
          // Fetch the fields we need including addressComponents for zip code
          await place.fetchFields({ 
            fields: ['formattedAddress', 'location', 'addressComponents', 'displayName'] 
          });

          console.log('Place selected:', place);

          const formattedAddress = place.formattedAddress || '';
          const location = place.location;
          
          // Extract zip code from address components
          let zipCode = '';
          if (place.addressComponents) {
            for (const component of place.addressComponents) {
              if (component.types.includes('postal_code')) {
                zipCode = component.shortText || component.longText || '';
                break;
              }
            }
          }

          console.log('Parsed address:', { formattedAddress, zipCode, location });
          
          setDisplayValue(formattedAddress);

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
          console.error('Error processing place selection:', err);
        }
      });

      // Handle errors
      placeAutocomplete.addEventListener('gmp-error', (event: any) => {
        console.error('Autocomplete error:', event);
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
  }, [initializeAutocomplete]);

  useEffect(() => {
    setDisplayValue(value || '');
    // Sync value to the web component if it exists
    if (autocompleteRef.current && value) {
      autocompleteRef.current.value = value;
    }
  }, [value]);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <div className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 z-10 pointer-events-none">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MapPin className="h-4 w-4" />
          )}
        </div>
        
        {/* Loading state overlay */}
        {isLoading && (
          <div className="flex h-10 w-full rounded-md border border-input bg-background px-8 py-2 text-sm text-muted-foreground">
            Loading address search...
          </div>
        )}
        
        {/* Error state */}
        {error && !isLoading && (
          <div className="flex h-10 w-full rounded-md border border-red-300 bg-red-50 px-8 py-2 text-sm text-red-600">
            {error}
          </div>
        )}
        
        {/* Container for the autocomplete - always rendered but hidden when loading/error */}
        <div 
          ref={containerRef}
          className={`w-full [&>gmp-place-autocomplete]:w-full [&>gmp-place-autocomplete]:h-10 [&>gmp-place-autocomplete]:rounded-md [&>gmp-place-autocomplete]:border [&>gmp-place-autocomplete]:border-input [&>gmp-place-autocomplete]:bg-background [&>gmp-place-autocomplete]:px-8 [&>gmp-place-autocomplete]:text-sm [&>gmp-place-autocomplete]:ring-offset-background [&>gmp-place-autocomplete]:focus-within:outline-none [&>gmp-place-autocomplete]:focus-within:ring-2 [&>gmp-place-autocomplete]:focus-within:ring-ring [&>gmp-place-autocomplete]:focus-within:ring-offset-2 ${isLoading || error ? 'hidden' : ''}`}
        />
      </div>
      {!isLoading && !error && (
        <p className="text-xs text-gray-500 mt-1">Start typing to see address suggestions</p>
      )}
    </div>
  );
}
