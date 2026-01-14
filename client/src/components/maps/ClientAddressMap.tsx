import { useCallback, useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';

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
  const [geocodedCoordinates, setGeocodedCoordinates] = useState<{ lat: number; lng: number } | null>(null);

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

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || '',
    id: 'google-map-script',
  });

  useEffect(() => {
    if (!latitude || !longitude) {
      if (address && isLoaded && window.google?.maps?.Geocoder) {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address }, (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const location = results[0].geometry.location;
            setGeocodedCoordinates({
              lat: location.lat(),
              lng: location.lng(),
            });
          }
        });
      }
    }
  }, [address, latitude, longitude, isLoaded]);

  const center = latitude && longitude
    ? { lat: latitude, lng: longitude }
    : geocodedCoordinates
    ? geocodedCoordinates
    : { lat: 28.3232, lng: -81.5130 };

  if (!apiKey) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-100 rounded-md"
        style={{ height, width }}
      >
        <p className="text-sm text-gray-500">Loading map...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div 
        className="flex items-center justify-center bg-gray-100 rounded-md"
        style={{ height, width }}
      >
        <p className="text-sm text-red-500">Error loading map</p>
      </div>
    );
  }

  if (!isLoaded) {
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
