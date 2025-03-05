import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin, X } from 'lucide-react';
import { useDebounce } from '../../hooks/use-debounce';

// Service for address suggestions (currently mock, could be replaced with Google Places API)
const getAddressSuggestions = (input: string): Promise<Array<{text: string, mainText: string, secondaryText: string}>> => {
  // Only return suggestions if input is at least 3 characters
  if (!input || input.length < 3) {
    return Promise.resolve([]);
  }

  // Production implementation would call a real API
  // For example:
  // return fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${API_KEY}`)
  //   .then(res => res.json())
  //   .then(data => data.predictions.map(p => ({
  //     text: p.description,
  //     mainText: p.structured_formatting.main_text,
  //     secondaryText: p.structured_formatting.secondary_text
  //   })));

  // For now, use realistic mock data
  return new Promise((resolve) => {
    setTimeout(() => {
      // Common pool service locations in major cities with actual street names
      const realAddresses = [
        { 
          text: "123 Ocean View Dr, Miami, FL 33139",
          mainText: "123 Ocean View Dr", 
          secondaryText: "Miami, FL 33139"
        },
        { 
          text: "456 Palm Ave, Los Angeles, CA 90210",
          mainText: "456 Palm Ave", 
          secondaryText: "Los Angeles, CA 90210"
        },
        { 
          text: "789 Desert Springs Rd, Phoenix, AZ 85001",
          mainText: "789 Desert Springs Rd", 
          secondaryText: "Phoenix, AZ 85001"
        },
        { 
          text: "234 Lake Shore Dr, Chicago, IL 60611",
          mainText: "234 Lake Shore Dr", 
          secondaryText: "Chicago, IL 60611"
        },
        { 
          text: "567 Gulf Blvd, Tampa, FL 33607",
          mainText: "567 Gulf Blvd", 
          secondaryText: "Tampa, FL 33607"
        },
        { 
          text: "890 Mountain View Rd, Denver, CO 80202",
          mainText: "890 Mountain View Rd", 
          secondaryText: "Denver, CO 80202"
        },
        { 
          text: "345 Beachside Ave, San Diego, CA 92101",
          mainText: "345 Beachside Ave", 
          secondaryText: "San Diego, CA 92101"
        },
        { 
          text: "678 Sunshine Pkwy, Orlando, FL 32801",
          mainText: "678 Sunshine Pkwy", 
          secondaryText: "Orlando, FL 32801"
        }
      ];
      
      // Filter addresses based on input
      const filteredAddresses = realAddresses.filter(address => 
        address.text.toLowerCase().includes(input.toLowerCase())
      );
      
      // Limit to 5 suggestions
      resolve(filteredAddresses.slice(0, 5));
    }, 300); // Simulate network delay
  });
};

export interface AddressAutocompleteProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onAddressSelect: (address: string) => void;
  value: string;
}

export function AddressAutocomplete({ 
  onAddressSelect, 
  value,
  ...props 
}: AddressAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState<Array<{text: string, mainText: string, secondaryText: string}>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const debouncedValue = useDebounce(inputValue, 300);
  const suggestionContainerRef = useRef<HTMLDivElement>(null);

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
        setShowSuggestions(results.length > 0);
      } catch (error) {
        console.error('Error fetching address suggestions:', error);
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

  const handleSelectSuggestion = (suggestion: {text: string, mainText: string, secondaryText: string}) => {
    setInputValue(suggestion.text);
    onAddressSelect(suggestion.text);
    setShowSuggestions(false);
  };

  const handleClear = () => {
    setInputValue('');
    onAddressSelect('');
    setShowSuggestions(false);
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
          className="pl-8 pr-8"
          placeholder="123 Main St, City, State"
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
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 max-h-60 overflow-auto">
          {loading ? (
            <div className="px-4 py-2 text-sm text-gray-500">Loading suggestions...</div>
          ) : suggestions.length > 0 ? (
            <ul>
              {suggestions.map((suggestion, index) => (
                <li 
                  key={index} 
                  className="px-4 py-2 text-sm hover:bg-blue-50 cursor-pointer flex items-start"
                  onClick={() => handleSelectSuggestion(suggestion)}
                >
                  <MapPin className="h-4 w-4 mr-2 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium">{suggestion.mainText}</p>
                    <p className="text-gray-500 text-xs">{suggestion.secondaryText}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : debouncedValue.length >= 3 ? (
            <div className="px-4 py-2 text-sm text-gray-500">No suggestions found</div>
          ) : null}
        </div>
      )}
    </div>
  );
}