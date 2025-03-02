import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin, X } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

// Mock service for address suggestions (simulating Google Places API)
const mockAddressSuggestions = (input: string): Promise<string[]> => {
  // Only return suggestions if input is at least 3 characters
  if (!input || input.length < 3) {
    return Promise.resolve([]);
  }

  // Simulation of API delay
  return new Promise((resolve) => {
    setTimeout(() => {
      // Realistic address suggestions based on input
      const cityState = ['CA', 'FL', 'NY', 'TX', 'IL'];
      const streets = ['Main', 'Park', 'Oak', 'Maple', 'Washington', 'Cedar'];
      const types = ['St', 'Ave', 'Blvd', 'Dr', 'Ln', 'Rd'];
      const cities = ['Springfield', 'Riverside', 'Oakdale', 'Lakeside', 'Maplewood'];
      
      // Generate 5 random but realistic looking addresses
      const suggestions = [];
      
      // First, direct match if input looks like a number + street
      if (/^\d+\s+\w+/.test(input)) {
        const parts = input.split(' ');
        const number = parts[0];
        const streetName = parts.slice(1).join(' ');
        
        // Add variations of the street name with different suffixes and states
        for (let i = 0; i < 3 && i < types.length; i++) {
          for (let j = 0; j < 2 && j < cities.length; j++) {
            const zip = Math.floor(90000 + Math.random() * 10000);
            suggestions.push(`${number} ${streetName} ${types[i]}, ${cities[j]}, ${cityState[j % cityState.length]} ${zip}`);
          }
        }
      }
      
      // Add some more variations based on the input string
      for (let i = 0; i < 5 - suggestions.length; i++) {
        const number = Math.floor(100 + Math.random() * 900);
        const street = streets[Math.floor(Math.random() * streets.length)];
        const type = types[Math.floor(Math.random() * types.length)];
        const city = cities[Math.floor(Math.random() * cities.length)];
        const state = cityState[Math.floor(Math.random() * cityState.length)];
        const zip = Math.floor(90000 + Math.random() * 10000);
        
        // If input seems to match part of this suggestion, include it
        const suggestion = `${number} ${street} ${type}, ${city}, ${state} ${zip}`;
        if (suggestion.toLowerCase().includes(input.toLowerCase())) {
          suggestions.push(suggestion);
        }
      }
      
      // If we still don't have enough suggestions, add some generic ones
      while (suggestions.length < 3) {
        const number = Math.floor(100 + Math.random() * 900);
        const street = streets[Math.floor(Math.random() * streets.length)];
        const type = types[Math.floor(Math.random() * types.length)];
        const city = cities[Math.floor(Math.random() * cities.length)];
        const state = cityState[Math.floor(Math.random() * cityState.length)];
        const zip = Math.floor(90000 + Math.random() * 10000);
        
        suggestions.push(`${number} ${street} ${type}, ${city}, ${state} ${zip}`);
      }
      
      resolve(suggestions);
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
  const [suggestions, setSuggestions] = useState<string[]>([]);
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
        const results = await mockAddressSuggestions(debouncedValue);
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

  const handleSelectSuggestion = (suggestion: string) => {
    setInputValue(suggestion);
    onAddressSelect(suggestion);
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
                  className="px-4 py-2 text-sm hover:bg-blue-50 cursor-pointer flex items-center"
                  onClick={() => handleSelectSuggestion(suggestion)}
                >
                  <MapPin className="h-4 w-4 mr-2 text-blue-500" />
                  <span>{suggestion}</span>
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