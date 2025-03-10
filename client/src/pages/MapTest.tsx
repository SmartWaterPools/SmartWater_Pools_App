import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadScript, GoogleMap, Marker } from '@react-google-maps/api';
import { Skeleton } from "@/components/ui/skeleton";

const containerStyle = {
  width: '100%',
  height: '400px'
};

const center = {
  lat: 34.0522,
  lng: -118.2437
};

export default function MapTest() {
  // Use a hardcoded API key for testing to bypass environment variable issues
  const googleMapsApiKey = 'AIzaSyB3mCrj1qCOz6wCAxPqBq3gEd9VXt_gUYk';

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Google Maps Integration Test</h1>
      
      <Card className="w-full mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Map Test Status</CardTitle>
          <CardDescription>
            Testing Google Maps integration with a hardcoded API key
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoadScript googleMapsApiKey={googleMapsApiKey} 
            loadingElement={<div className="h-[400px] w-full flex items-center justify-center"><Skeleton className="h-[400px] w-full" /></div>}>
            <GoogleMap
              mapContainerStyle={containerStyle}
              center={center}
              zoom={10}
            >
              <Marker position={center} />
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
                This test page uses a hardcoded Google Maps API key to test the integration.
                For production use, the key should be stored in environment variables and accessed securely.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Next Steps:</h3>
              <ol className="list-decimal pl-5 space-y-1">
                <li>If the map appears above, the integration is working with the test key</li>
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