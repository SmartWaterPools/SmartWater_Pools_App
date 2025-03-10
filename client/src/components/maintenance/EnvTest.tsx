import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function EnvTest() {
  // Force the use of the environment variable or a fallback for development
  // In production, this will use the environment variable from .env
  const googleMapsApiKey = process.env.NODE_ENV === 'production'
    ? (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '')
    : 'AIzaSyB3mCrj1qCOz6wCAxPqBq3gEd9VXt_gUYk'; // Fallback for development
  
  const googleMapsKeyAvailable = typeof googleMapsApiKey === 'string' && googleMapsApiKey.length > 0;
  
  // Get all available environment variables that start with VITE_
  const envKeys = Object.keys(import.meta.env)
    .filter(key => key.startsWith('VITE_'))
    .sort();

  return (
    <Card className="w-full mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Environment Variables Status</CardTitle>
        <CardDescription>
          Google Maps API Key: {googleMapsKeyAvailable ? 
            <span className="text-green-500 font-semibold">✅ Available{process.env.NODE_ENV !== 'production' ? ' (Development Fallback)' : ''}</span> : 
            <span className="text-red-500 font-semibold">❌ Not Available</span>}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm">
          <div className="font-medium mb-2">Available Environment Variables:</div>
          {envKeys.length === 0 ? (
            <div>
              <p className="text-amber-500 mb-2">No VITE_ environment variables detected. Using fallback values for development.</p>
              <p className="text-xs">Development mode: {process.env.NODE_ENV !== 'production' ? 'Yes' : 'No'}</p>
            </div>
          ) : (
            <ul className="list-disc pl-5 space-y-1">
              {envKeys.map(key => (
                <li key={key} className="text-xs font-mono">
                  {key} - {import.meta.env[key] ? "Has value" : "Empty"}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}