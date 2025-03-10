import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadScript, GoogleMap } from '@react-google-maps/api';
import { Skeleton } from "@/components/ui/skeleton";
import { useGoogleMaps } from "@/contexts/GoogleMapsContext";

const containerStyle = {
  width: '100%',
  height: '400px'
};

const center = {
  lat: 34.0522,
  lng: -118.2437
};

export default function MapTest() {
  const [libraries] = useState(['marker'] as any);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  
  // Use our GoogleMapsContext to get the API key
  const { apiKey: googleMapsApiKey } = useGoogleMaps();

  // Add the advanced marker when the map loads
  useEffect(() => {
    if (!map) return;
    
    // Create an advanced marker when the map is loaded
    // This requires the 'marker' library to be loaded
    const { AdvancedMarkerElement } = google.maps.marker as any;
    
    if (AdvancedMarkerElement) {
      new AdvancedMarkerElement({
        map,
        position: center,
        title: 'Los Angeles'
      });
    }
  }, [map]);

  const onLoad = React.useCallback(function callback(map: google.maps.Map) {
    setMap(map);
  }, []);

  const onUnmount = React.useCallback(function callback() {
    setMap(null);
  }, []);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Google Maps Integration Test</h1>
      
      <Card className="w-full mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Map Test Status</CardTitle>
          <CardDescription>
            Testing Google Maps integration with Advanced Markers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoadScript 
            googleMapsApiKey={googleMapsApiKey}
            libraries={libraries}
            loadingElement={<div className="h-[400px] w-full flex items-center justify-center"><Skeleton className="h-[400px] w-full" /></div>}>
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={10}
              onLoad={onLoad}
              onUnmount={onUnmount}
            >
              {/* Advanced markers are added via the useEffect */}
            </GoogleMap>
          </LoadScript>
        </CardContent>
      </Card>
      
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Troubleshooting Information</CardTitle>
          <CardDescription>
            Information about Google Maps integration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">How Google Maps Integration Works:</h3>
              <p>
                This test page uses the Google Maps JavaScript API with the new Advanced Markers.
                For production use, the API key should be stored in environment variables and accessed securely.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Implementation Details:</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Uses <code>AdvancedMarkerElement</code> instead of the deprecated <code>Marker</code></li>
                <li>Requires loading the 'marker' library</li>
                <li>Creates markers programmatically after the map loads</li>
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Next Steps:</h3>
              <ol className="list-decimal pl-5 space-y-1">
                <li>If the map appears above, the integration is working with the API key</li>
                <li>For production, ensure the VITE_GOOGLE_MAPS_API_KEY environment variable is set</li>
                <li>Check for any console errors if the map fails to load</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}