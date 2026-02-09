import { useState, useEffect } from 'react';
import { GoogleMap, Marker } from '@react-google-maps/api';
import { useGoogleMaps } from '../../contexts/GoogleMapsContext';

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
  const { isLoaded, error: mapsError } = useGoogleMaps();
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mapsError) {
      setError('Failed to load map');
    }
  }, [mapsError]);

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

  if (!isLoaded || !center) {
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
