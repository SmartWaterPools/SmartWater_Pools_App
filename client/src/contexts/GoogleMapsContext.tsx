import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getGoogleMapsApiKey } from '@/lib/googleMapsUtils';

interface GoogleMapsContextType {
  apiKey: string;
  isLoaded: boolean;
  isLoading: boolean;
  error: Error | null;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  apiKey: '',
  isLoaded: false,
  isLoading: true,
  error: null
});

export const useGoogleMaps = () => useContext(GoogleMapsContext);

interface GoogleMapsProviderProps {
  children: ReactNode;
}

export const GoogleMapsProvider: React.FC<GoogleMapsProviderProps> = ({ children }) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Load the Google Maps API key once at the application level
  useEffect(() => {
    const loadApiKey = async () => {
      try {
        console.log('GoogleMapsContext: Loading API key');
        setIsLoading(true);
        const key = await getGoogleMapsApiKey();
        console.log('GoogleMapsContext: API key loaded:', key ? 'Valid key received' : 'Empty key');
        setApiKey(key);
        setIsLoaded(true);
        setIsLoading(false);
      } catch (err) {
        console.error('GoogleMapsContext: Error loading API key:', err);
        setError(err instanceof Error ? err : new Error('Failed to load Google Maps API key'));
        setIsLoading(false);
      }
    };

    loadApiKey();
  }, []);

  return (
    <GoogleMapsContext.Provider value={{ apiKey, isLoaded, isLoading, error }}>
      {children}
    </GoogleMapsContext.Provider>
  );
};