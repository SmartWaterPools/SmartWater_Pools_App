import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useGoogleMaps } from '../../contexts/GoogleMapsContext';

interface GoogleAddressAutocompleteProps {
  value: string;
  onChange: (address: string, lat?: number, lng?: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'data-testid'?: string;
}

export function GoogleAddressAutocomplete({
  value,
  onChange,
  placeholder = "Enter address...",
  disabled = false,
  className = "",
  'data-testid': dataTestId
}: GoogleAddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value || '');
  const { isLoaded, isLoading: mapsLoading, error: mapsError } = useGoogleMaps();
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    initializeAutocomplete();

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [isLoaded]);

  const initializeAutocomplete = () => {
    if (!inputRef.current || !window.google?.maps?.places) return;

    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'us' },
      fields: ['formatted_address', 'geometry', 'address_components']
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      
      if (!place.formatted_address) {
        console.warn('No address selected');
        return;
      }

      const address = place.formatted_address;
      const lat = place.geometry?.location?.lat();
      const lng = place.geometry?.location?.lng();

      setInputValue(address);
      onChange(address, lat, lng);
    });

    autocompleteRef.current = autocomplete;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    if (!newValue) {
      onChange('', undefined, undefined);
    }
  };

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  if (mapsError || (!isLoaded && !mapsLoading)) {
    return (
      <Input
        type="text"
        value={inputValue}
        onChange={(e) => {
          const newValue = e.target.value;
          setInputValue(newValue);
          onChange(newValue, undefined, undefined);
        }}
        placeholder={placeholder || "Enter address manually..."}
        disabled={disabled}
        className={className}
        data-testid={dataTestId}
      />
    );
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        disabled={disabled || mapsLoading}
        className={className}
        data-testid={dataTestId}
      />
      {mapsLoading && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}
