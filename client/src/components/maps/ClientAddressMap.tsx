import React, { useCallback, useState } from 'react';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';

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
  const [mapLoaded, setMapLoaded] = useState(false);

  // Fetch Google Maps API key from backend
  React.useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const response = await fetch('/api/google-maps-key');
        if (!response.ok) throw new Error('Failed to fetch API key');
        const data = await response.json();
        if (data.apiKey) {
          setApiKey(data.apiKey);
        } else {
          console.error('No API key returned from server');
        }
      } catch (error) {
        console.error('Error fetching Google Maps API key:', error);
      }
    };

    fetchApiKey();
  }, []);

  const onLoad = useCallback(() => {
    setMapLoaded(true);
  }, []);

  // If we don't have coordinates, try to geocode the address
  const [geocodedCoordinates, setGeocodedCoordinates] = useState<{ lat: number; lng: number } | null>(null);

  React.useEffect(() => {
    if (!latitude || !longitude) {
      // Only try to geocode if we have an address, API key, and the map is loaded
      if (address && apiKey && mapLoaded && window.google?.maps?.Geocoder) {
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
  }, [address, apiKey, latitude, longitude, mapLoaded]);

  // Use provided coordinates or geocoded ones
  const center = latitude && longitude
    ? { lat: latitude, lng: longitude }
    : geocodedCoordinates
    ? geocodedCoordinates
    : { lat: 28.3232, lng: -81.5130 }; // Orlando area as default

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
    <LoadScript
      googleMapsApiKey={apiKey}
      onLoad={onLoad}
    >
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={zoom}
        options={mapOptions}
      >
        <Marker position={center} title={address} />
      </GoogleMap>
    </LoadScript>
  );
};

export default ClientAddressMap;