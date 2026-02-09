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

function GoogleMapsLoader({ apiKey, children }: { apiKey: string; children: ReactNode }) {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
  });

  const error = loadError ? new Error(loadError.message) : null;

  return (
    <GoogleMapsContext.Provider value={{
      apiKey,
      isLoaded,
      isLoading: !isLoaded && !loadError,
      error,
    }}>
      {children}
    </GoogleMapsContext.Provider>
  );
}

export const GoogleMapsProvider: React.FC<GoogleMapsProviderProps> = ({ children }) => {
  const [apiKey, setApiKey] = useState<string | null>(null);
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
        setApiKey('');
      }
    };
    fetchKey();
  }, []);

  if (apiKey === null) {
    return (
      <GoogleMapsContext.Provider value={{
        apiKey: '',
        isLoaded: false,
        isLoading: true,
        error: null,
      }}>
        {children}
      </GoogleMapsContext.Provider>
    );
  }

  if (!apiKey || keyError) {
    return (
      <GoogleMapsContext.Provider value={{
        apiKey: '',
        isLoaded: false,
        isLoading: false,
        error: keyError || new Error('No Google Maps API key configured'),
      }}>
        {children}
      </GoogleMapsContext.Provider>
    );
  }

  return (
    <GoogleMapsLoader apiKey={apiKey}>
      {children}
    </GoogleMapsLoader>
  );
};
