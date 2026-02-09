import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useJsApiLoader } from '@react-google-maps/api';

const LIBRARIES: ("places")[] = ['places'];

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
  error: null,
});

export const useGoogleMaps = () => useContext(GoogleMapsContext);

interface GoogleMapsProviderProps {
  children: ReactNode;
}

export const GoogleMapsProvider: React.FC<GoogleMapsProviderProps> = ({ children }) => {
  const [apiKey, setApiKey] = useState<string>('');
  const [keyLoading, setKeyLoading] = useState(true);
  const [keyError, setKeyError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchKey = async () => {
      try {
        const response = await fetch('/api/google-maps-key');
        if (!response.ok) throw new Error('Failed to fetch API key');
        const data = await response.json();
        setApiKey(data.apiKey || '');
      } catch (err) {
        console.error('Error fetching Google Maps API key:', err);
        setKeyError(err instanceof Error ? err : new Error('Failed to load API key'));
      } finally {
        setKeyLoading(false);
      }
    };
    fetchKey();
  }, []);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
  });

  const contextIsLoaded = !keyLoading && !!apiKey && isLoaded;
  const contextIsLoading = keyLoading || (!!apiKey && !isLoaded && !loadError);
  const contextError = keyError || (loadError ? new Error(loadError.message) : null);

  return (
    <GoogleMapsContext.Provider value={{
      apiKey,
      isLoaded: contextIsLoaded,
      isLoading: contextIsLoading,
      error: contextError,
    }}>
      {children}
    </GoogleMapsContext.Provider>
  );
};
