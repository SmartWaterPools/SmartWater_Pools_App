import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

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
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch Google Maps API key
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const response = await fetch('/api/google-maps-key');
        if (!response.ok) throw new Error('Failed to fetch API key');
        const data = await response.json();
        if (data.apiKey) {
          setApiKey(data.apiKey);
        }
      } catch (error) {
        console.error('Error fetching Google Maps API key:', error);
      }
    };
    fetchApiKey();
  }, []);

  // Load Google Maps Places API and initialize autocomplete
  useEffect(() => {
    if (!apiKey || !inputRef.current) return;

    setIsLoading(true);

    // Check if Google Maps is already loaded
    if (!window.google?.maps?.places) {
      // Load Google Maps script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        initializeAutocomplete();
        setIsLoading(false);
      };
      
      script.onerror = () => {
        console.error('Failed to load Google Maps API');
        setIsLoading(false);
      };
      
      document.head.appendChild(script);
    } else {
      // Google Maps already loaded, initialize immediately
      initializeAutocomplete();
      setIsLoading(false);
    }

    return () => {
      // Cleanup autocomplete listener
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [apiKey]);

  const initializeAutocomplete = () => {
    if (!inputRef.current || !window.google?.maps?.places) return;

    // Create autocomplete instance
    const autocomplete = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'us' }, // Restrict to US addresses
      fields: ['formatted_address', 'geometry', 'address_components']
    });

    // Listen for place selection
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      
      if (!place.formatted_address) {
        console.warn('No address selected');
        return;
      }

      const address = place.formatted_address;
      const lat = place.geometry?.location?.lat();
      const lng = place.geometry?.location?.lng();

      // Update local state
      setInputValue(address);
      
      // Call onChange with address and coordinates
      onChange(address, lat, lng);
    });

    autocompleteRef.current = autocomplete;
  };

  // Handle manual input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // If user clears the input, notify parent
    if (!newValue) {
      onChange('', undefined, undefined);
    }
  };

  // Sync with external value changes
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        placeholder={placeholder}
        disabled={disabled || isLoading}
        className={className}
        data-testid={dataTestId}
      />
      {isLoading && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}