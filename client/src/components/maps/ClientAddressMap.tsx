import { useState, useEffect, useRef } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';

interface ClientAddressMapProps {
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  height?: string;
  width?: string;
  zoom?: number;
  mapType?: 'roadmap' | 'satellite' | 'hybrid' | 'terrain';
}

const ClientAddressMap: React.FC<ClientAddressMapProps> = ({
  address,
  latitude,
  longitude,
  height = '200px',
  width = '100%',
  zoom = 16,
  mapType = 'satellite',
}) => {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const response = await fetch('/api/google-maps-key');
        if (!response.ok) throw new Error('Failed to fetch API key');
        const data = await response.json();
        if (data.apiKey) {
          setApiKey(data.apiKey);
        } else {
          setError('No API key available');
        }
      } catch (err) {
        console.error('Error fetching Google Maps API key:', err);
        setError('Failed to load map');
      }
    };

    fetchApiKey();
  }, []);

  useEffect(() => {
    if (!apiKey || scriptLoadedRef.current) return;

    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      if (window.google && window.google.maps) {
        setIsLoaded(true);
        scriptLoadedRef.current = true;
      } else {
        existingScript.addEventListener('load', () => {
          setIsLoaded(true);
          scriptLoadedRef.current = true;
        });
      }
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      setIsLoaded(true);
      scriptLoadedRef.current = true;
    };
    script.onerror = () => {
      setError('Failed to load Google Maps');
    };
    document.head.appendChild(script);
  }, [apiKey]);

  useEffect(() => {
    if (latitude && longitude) {
      setCenter({ lat: latitude, lng: longitude });
      return;
    }

    if (!isLoaded || !address || !window.google?.maps?.Geocoder) return;

    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const location = results[0].geometry.location;
        setCenter({
          lat: location.lat(),
          lng: location.lng(),
        });
      } else {
        console.error('Geocoding failed:', status);
        setCenter({ lat: 40.8478, lng: -74.0858 });
      }
    });
  }, [address, latitude, longitude, isLoaded]);

  if (error) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-100 rounded-md"
        style={{ height, width }}
      >
        <p className="text-sm text-red-500">{error}</p>
      </div>
    );
  }

  if (!apiKey || !isLoaded || !center) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-100 rounded-md"
        style={{ height, width }}
      >
        <p className="text-sm text-gray-500">Loading map...</p>
      </div>
    );
  }

  const containerStyle = {
    width,
    height,
  };

  const mapOptions = {
    mapTypeId: mapType,
    mapTypeControl: true,
    zoomControl: true,
    streetViewControl: false,
    fullscreenControl: true,
  };

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={zoom}
      options={mapOptions}
    >
      <Marker position={center} title={address} />
    </GoogleMap>
  );
};

export default ClientAddressMap;
