import { useState, useRef, useEffect, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin } from 'lucide-react';

interface GoogleAddressAutocompleteProps {
  value: string;
  onChange: (address: string, lat?: number, lng?: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  'data-testid'?: string;
}

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting?: {
    main_text: string;
    secondary_text: string;
  };
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
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPredictions = useCallback(async (input: string) => {
    if (input.length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(input)}`);
      const data = await res.json();
      setPredictions(data.predictions || []);
      setShowDropdown((data.predictions || []).length > 0);
      setActiveIndex(-1);
    } catch {
      setPredictions([]);
      setShowDropdown(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (!newValue) {
      onChange('', undefined, undefined);
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(newValue), 300);
  };

  const handleSelect = async (prediction: Prediction) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setInputValue(prediction.description);
    setShowDropdown(false);
    setPredictions([]);

    try {
      const res = await fetch(`/api/places/details?place_id=${encodeURIComponent(prediction.place_id)}`);
      const data = await res.json();
      if (data.result) {
        const address = data.result.formatted_address || prediction.description;
        const lat = data.result.geometry?.location?.lat;
        const lng = data.result.geometry?.location?.lng;
        setInputValue(address);
        onChange(address, lat, lng);
      } else {
        onChange(prediction.description, undefined, undefined);
      }
    } catch {
      onChange(prediction.description, undefined, undefined);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || predictions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < predictions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : predictions.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(predictions[activeIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <Input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (predictions.length > 0) setShowDropdown(true);
        }}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        data-testid={dataTestId}
      />
      {loading && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      )}
      {showDropdown && predictions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border border-border bg-white dark:bg-gray-800 shadow-lg max-h-60 overflow-auto">
          {predictions.map((prediction, index) => (
            <li
              key={prediction.place_id}
              className={`flex items-start gap-2 px-3 py-2 cursor-pointer text-sm transition-colors ${
                index === activeIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50'
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(prediction);
              }}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div className="flex flex-col min-w-0">
                <span className="font-medium truncate">
                  {prediction.structured_formatting?.main_text || prediction.description}
                </span>
                {prediction.structured_formatting?.secondary_text && (
                  <span className="text-xs text-muted-foreground truncate">
                    {prediction.structured_formatting.secondary_text}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
