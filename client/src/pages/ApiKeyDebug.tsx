import React, { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useGoogleMaps } from "@/contexts/GoogleMapsContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DebugApiResponse {
  envInfo: {
    nodeEnv: string;
    isReplitEnv: boolean;
    replSlug: string;
    replOwner: string;
  };
  apiKeyInfo: {
    exists: boolean;
    length: number;
    maskedKey: string;
  };
  envFiles: Array<{
    file: string;
    exists: boolean;
    error?: string;
  }>;
}

export default function ApiKeyDebug() {
  const [apiKeyFromServer, setApiKeyFromServer] = useState<string | null>(null);
  const [apiKeyLength, setApiKeyLength] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [viteEnvVar, setViteEnvVar] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<DebugApiResponse | null>(null);
  const [loadingDebugInfo, setLoadingDebugInfo] = useState(false);
  const [debugError, setDebugError] = useState<string | null>(null);
  const { apiKey: contextApiKey, isLoaded, error } = useGoogleMaps();

  const fetchApiKey = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const response = await fetchApi<{ apiKey: string }>('/api/google-maps-key');
      const apiKey = response.apiKey;
      setApiKeyFromServer(apiKey ? 'Present' : 'Not present');
      setApiKeyLength(apiKey ? apiKey.length : 0);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  const fetchDebugInfo = async () => {
    setLoadingDebugInfo(true);
    setDebugError(null);
    try {
      const response = await fetchApi<DebugApiResponse>('/api/debug/google-maps-key');
      setDebugInfo(response);
    } catch (err) {
      setDebugError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoadingDebugInfo(false);
    }
  };

  // Check if VITE_GOOGLE_MAPS_API_KEY is present in environment
  useEffect(() => {
    const envApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    setViteEnvVar(envApiKey ? 'Present' : 'Not present');
  }, []);

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">API Key Debug Page</h1>
      
      <Alert className="mb-6">
        <AlertTitle>Important Information</AlertTitle>
        <AlertDescription>
          This page helps troubleshoot Google Maps API key configuration issues. If the problem persists after following the troubleshooting steps, consider adding the API key directly to the Replit Secrets section.
        </AlertDescription>
      </Alert>
      
      <Tabs defaultValue="frontend">
        <TabsList className="mb-4">
          <TabsTrigger value="frontend">Frontend</TabsTrigger>
          <TabsTrigger value="backend">Backend</TabsTrigger>
          <TabsTrigger value="help">Troubleshooting</TabsTrigger>
          <TabsTrigger value="production">Production Setup</TabsTrigger>
        </TabsList>
        
        <TabsContent value="frontend">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Google Maps API Key Status (Frontend)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Context API Key Status:</p>
                    <p className="text-sm bg-muted p-2 rounded">
                      {contextApiKey ? 'Present' : 'Not present'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-1">Context API Key Length:</p>
                    <p className="text-sm bg-muted p-2 rounded">
                      {contextApiKey ? contextApiKey.length : 0} characters
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-1">Context isLoaded:</p>
                    <p className="text-sm bg-muted p-2 rounded">
                      {isLoaded ? 'True' : 'False'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-1">Context Error:</p>
                    <p className="text-sm bg-muted p-2 rounded">
                      {error ? error.message : 'None'}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-1">VITE_GOOGLE_MAPS_API_KEY:</p>
                    <p className="text-sm bg-muted p-2 rounded">
                      {viteEnvVar}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Basic API Key from Server</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button onClick={fetchApiKey} disabled={loading}>
                    {loading ? 'Fetching...' : 'Fetch API Key from Server'}
                  </Button>
                  
                  {apiKeyFromServer && (
                    <div>
                      <p className="text-sm font-medium mb-1">API Key Status:</p>
                      <p className="text-sm bg-muted p-2 rounded">{apiKeyFromServer}</p>
                    </div>
                  )}
                  
                  {apiKeyLength !== null && (
                    <div>
                      <p className="text-sm font-medium mb-1">API Key Length:</p>
                      <p className="text-sm bg-muted p-2 rounded">{apiKeyLength} characters</p>
                    </div>
                  )}
                  
                  {errorMessage && (
                    <Alert variant="destructive">
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{errorMessage}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="backend">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Backend Debug Info</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button onClick={fetchDebugInfo} disabled={loadingDebugInfo}>
                    {loadingDebugInfo ? 'Fetching...' : 'Fetch Detailed Debug Info'}
                  </Button>
                  
                  {debugInfo && (
                    <div className="mt-4 space-y-6">
                      <div>
                        <h3 className="text-md font-medium mb-2">Environment Info:</h3>
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <p className="text-sm font-medium">NODE_ENV:</p>
                            <p className="text-sm bg-muted p-1 rounded">{debugInfo.envInfo.nodeEnv}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <p className="text-sm font-medium">Is Replit Environment:</p>
                            <p className="text-sm bg-muted p-1 rounded">{debugInfo.envInfo.isReplitEnv ? 'Yes' : 'No'}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <p className="text-sm font-medium">REPL_SLUG:</p>
                            <p className="text-sm bg-muted p-1 rounded">{debugInfo.envInfo.replSlug || 'Not set'}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <p className="text-sm font-medium">REPL_OWNER:</p>
                            <p className="text-sm bg-muted p-1 rounded">{debugInfo.envInfo.replOwner || 'Not set'}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-md font-medium mb-2">API Key Info:</h3>
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <p className="text-sm font-medium">API Key Exists:</p>
                            <p className="text-sm bg-muted p-1 rounded">{debugInfo.apiKeyInfo.exists ? 'Yes' : 'No'}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <p className="text-sm font-medium">API Key Length:</p>
                            <p className="text-sm bg-muted p-1 rounded">{debugInfo.apiKeyInfo.length} characters</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <p className="text-sm font-medium">Masked Key:</p>
                            <p className="text-sm bg-muted p-1 rounded">{debugInfo.apiKeyInfo.maskedKey || 'None'}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-md font-medium mb-2">Environment Files:</h3>
                        <div className="space-y-2">
                          {debugInfo.envFiles.map((file, index) => (
                            <div key={index} className="grid grid-cols-2 gap-2">
                              <p className="text-sm font-medium">{file.file}:</p>
                              <p className="text-sm bg-muted p-1 rounded">{file.exists ? 'Exists' : 'Missing'}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {debugError && (
                    <Alert variant="destructive">
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{debugError}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="help">
          <Card>
            <CardHeader>
              <CardTitle>Common Issues & Solutions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">API Key Not Available</h3>
                  <p>If the API key is missing in any of the checks:</p>
                  <ol className="list-decimal pl-5 space-y-2 mt-2">
                    <li>Make sure the <code>GOOGLE_MAPS_API_KEY</code> secret is set in Replit Secrets.</li>
                    <li>Verify that your <code>.env</code> file correctly forwards the secret with <code>VITE_GOOGLE_MAPS_API_KEY=$&#123;GOOGLE_MAPS_API_KEY&#125;</code>.</li>
                    <li>Check that the deployed version has been restarted since adding the secret.</li>
                  </ol>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">API Key Domain Restrictions</h3>
                  <p>If the API key is present but maps still don't load:</p>
                  <ol className="list-decimal pl-5 space-y-2 mt-2">
                    <li>Check browser console for "RefererNotAllowedMapError" which indicates domain restrictions.</li>
                    <li>In Google Cloud Console, add your deployment domain to the allowed HTTP referrers:
                      <ul className="list-disc pl-5 mt-1">
                        <li>Add <code>*.replit.app</code> to allow all Replit domains.</li>
                        <li>Add your specific deployment URL (e.g., <code>smartwaterpools.replit.app</code>).</li>
                        <li>Add any test/development URLs (e.g., <code>*.repl.co</code>).</li>
                      </ul>
                    </li>
                  </ol>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">Environment Variable Inconsistencies</h3>
                  <p>If environment variables don't match between frontend and backend:</p>
                  <ol className="list-decimal pl-5 space-y-2 mt-2">
                    <li>Ensure your Replit environment is properly loading secrets.</li>
                    <li>Check that your <code>.env</code> file is correctly set up and being loaded.</li>
                    <li>Restart both the server and Vite processes to reload environment variables.</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="production">
          <Card>
            <CardHeader>
              <CardTitle>Production Deployment Setup</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">1. Replit Deployment Configuration</h3>
                  <p>For proper Google Maps functionality in a production Replit deployment:</p>
                  <ol className="list-decimal pl-5 space-y-2 mt-2">
                    <li>Go to your <strong>Replit Dashboard</strong> → Select this project → Click the <strong>Secrets</strong> tab</li>
                    <li>Add a new secret with key <code>GOOGLE_MAPS_API_KEY</code> and your Google Maps API key as the value</li>
                    <li>Save the secret and redeploy your application</li>
                    <li>Check our debug tools to verify the API key is being properly loaded</li>
                  </ol>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">2. Google Cloud Console Settings</h3>
                  <p>Configure your Google Maps API key correctly in the Google Cloud Console:</p>
                  <ol className="list-decimal pl-5 space-y-2 mt-2">
                    <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Cloud Console Credentials</a></li>
                    <li>Find your API key and click on it to edit</li>
                    <li>Under "Application restrictions", select "HTTP referrers (websites)"</li>
                    <li>Add the following website restrictions:
                      <ul className="list-disc pl-5 mt-1">
                        <li><code>https://*.replit.app/*</code></li>
                        <li><code>https://*.repl.co/*</code></li>
                        <li><code>https://smartwaterpools.replit.app/*</code> (your specific app URL)</li>
                      </ul>
                    </li>
                    <li>Under "API restrictions", select "Restrict key"</li>
                    <li>Select the following APIs:
                      <ul className="list-disc pl-5 mt-1">
                        <li>Maps JavaScript API</li>
                        <li>Places API</li>
                        <li>Geocoding API</li>
                      </ul>
                    </li>
                    <li>Click "Save" to apply the changes</li>
                  </ol>
                </div>
                
                <div>
                  <h3 className="text-lg font-medium mb-2">3. Testing the Deployed Application</h3>
                  <p>Verify your API key is working correctly in production:</p>
                  <ol className="list-decimal pl-5 space-y-2 mt-2">
                    <li>Open your deployed application at <code>https://smartwaterpools.replit.app</code></li>
                    <li>Navigate to the <strong>Maintenance Map</strong> page</li>
                    <li>Check if the map loads correctly and displays maintenance locations</li>
                    <li>If issues persist, visit this debug page in production at <code>https://smartwaterpools.replit.app/api-key-debug</code></li>
                    <li>Use the "Fetch Detailed Debug Info" button to check API key status in production</li>
                  </ol>
                </div>
                
                <Alert className="mt-4">
                  <AlertTitle>Remember</AlertTitle>
                  <AlertDescription>
                    After making any changes to API key settings or Replit secrets, you may need to restart your application or redeploy it for changes to take effect.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}