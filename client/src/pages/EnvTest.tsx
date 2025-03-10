import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function EnvTestPage() {
  // Directly access the environment variables for display
  const googleMapsKeyAvailable = typeof import.meta.env.VITE_GOOGLE_MAPS_API_KEY === 'string' && 
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY.length > 0;
  
  // Get all available environment variables that start with VITE_
  const envKeys = Object.keys(import.meta.env)
    .filter(key => key.startsWith('VITE_'))
    .sort();

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Environment Variables Test Page</h1>
      
      <Card className="w-full mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Environment Variables Status</CardTitle>
          <CardDescription>
            Google Maps API Key: {googleMapsKeyAvailable ? 
              <span className="text-green-500 font-semibold">✅ Available</span> : 
              <span className="text-red-500 font-semibold">❌ Not Available</span>}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm">
            <div className="font-medium mb-2">Available Environment Variables:</div>
            {envKeys.length === 0 ? (
              <p className="text-red-500">No VITE_ environment variables detected.</p>
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

      <Card className="w-full">
        <CardHeader>
          <CardTitle>Troubleshooting Information</CardTitle>
          <CardDescription>
            Information to help debug environment variable issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold mb-2">How Environment Variables Work:</h3>
              <p>
                In Vite applications, only variables prefixed with <code className="bg-gray-100 px-1 rounded">VITE_</code> are 
                exposed to the client-side code. These variables must be defined in the <code className="bg-gray-100 px-1 rounded">.env</code> file 
                at the root of the project.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Current Configuration:</h3>
              <p>
                The Google Maps API key should be defined as <code className="bg-gray-100 px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code> in the .env file.
              </p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Next Steps:</h3>
              <ol className="list-decimal pl-5 space-y-1">
                <li>Verify that the .env file exists at the root of the project</li>
                <li>Ensure the API key is properly formatted with the VITE_ prefix</li>
                <li>Restart the application after any changes to environment variables</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}