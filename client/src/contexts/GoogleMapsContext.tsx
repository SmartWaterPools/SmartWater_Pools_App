import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getGoogleMapsApiKey } from '../lib/googleMapsUtils';

// Dynamically import Google Maps libraries when needed
let GoogleMap: any = null;
let Marker: any = null;
let InfoWindow: any = null; 
let Circle: any = null;
let Polyline: any = null;
let LoadScript: any = null;

// Extended Google Maps context type with components
interface GoogleMapsContextType {
  apiKey: string;
  isLoaded: boolean;
  isLoading: boolean;
  error: Error | null;
  GoogleMap: any;
  Marker: any;
  InfoWindow: any;
  Circle: any;
  Polyline: any;
  LoadScript: any;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  apiKey: '',
  isLoaded: false,
  isLoading: true,
  error: null,
  GoogleMap: null,
  Marker: null,
  InfoWindow: null,
  Circle: null,
  Polyline: null,
  LoadScript: null
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
  const [mapComponents, setMapComponents] = useState({
    GoogleMap: null,
    Marker: null,
    InfoWindow: null,
    Circle: null,
    Polyline: null,
    LoadScript: null
  });

  // Load the Google Maps API key and components
  useEffect(() => {
    const loadApiKeyAndComponents = async () => {
      try {
        console.log('GoogleMapsContext: Loading API key');
        setIsLoading(true);
        const key = await getGoogleMapsApiKey();
        console.log('GoogleMapsContext: API key loaded:', key ? 'Valid key received' : 'Empty key');
        setApiKey(key);
        
        // If we have a valid API key, dynamically import the @react-google-maps/api components
        if (key) {
          try {
            // Dynamic import of the React Google Maps components
            const { GoogleMap: GM, Marker: M, InfoWindow: IW, Circle: C, Polyline: P, LoadScript: LS } = 
              await import('@react-google-maps/api');
            
            // Store the components in state
            setMapComponents({
              GoogleMap: GM,
              Marker: M,
              InfoWindow: IW,
              Circle: C,
              Polyline: P,
              LoadScript: LS
            });
            
            // Also store in module-level variables for direct access
            GoogleMap = GM;
            Marker = M;
            InfoWindow = IW;
            Circle = C;
            Polyline = P;
            LoadScript = LS;
            
            console.log('GoogleMapsContext: Map components loaded successfully');
          } catch (componentErr) {
            console.error('GoogleMapsContext: Error loading map components:', componentErr);
            setError(new Error('Failed to load Google Maps components'));
          }
        }
        
        setIsLoaded(true);
        setIsLoading(false);
      } catch (err) {
        console.error('GoogleMapsContext: Error loading API key:', err);
        setError(err instanceof Error ? err : new Error('Failed to load Google Maps API key'));
        setIsLoading(false);
      }
    };

    loadApiKeyAndComponents();
  }, []);

  return (
    <GoogleMapsContext.Provider value={{ 
      apiKey, 
      isLoaded, 
      isLoading, 
      error,
      GoogleMap: mapComponents.GoogleMap,
      Marker: mapComponents.Marker,
      InfoWindow: mapComponents.InfoWindow,
      Circle: mapComponents.Circle,
      Polyline: mapComponents.Polyline,
      LoadScript: mapComponents.LoadScript
    }}>
      {children}
    </GoogleMapsContext.Provider>
  );
};