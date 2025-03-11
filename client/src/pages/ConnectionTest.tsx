import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertCircle, RefreshCcw, Server } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

// URLs with explicit port for testing in Replit environment
const PORT = 5000; // The port our server is running on
const getApiUrl = (endpoint: string) => {
  // Handle both local development and Replit environments
  const isReplit = typeof window !== 'undefined' && window.location.hostname.includes('.repl.co');
  
  if (isReplit) {
    // In Replit, use the current origin (handles HTTPS properly)
    return `${window.location.origin}${endpoint}`;
  } else {
    // For local development with explicit port
    return `${window.location.protocol}//${window.location.hostname}:${PORT}${endpoint}`;
  }
};

export default function ConnectionTest() {
  const [healthStatus, setHealthStatus] = useState<string | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [dashboardStatus, setDashboardStatus] = useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [customEndpoint, setCustomEndpoint] = useState<string>('/api/health');
  const [customEndpointResult, setCustomEndpointResult] = useState<string | null>(null);
  const [customEndpointError, setCustomEndpointError] = useState<string | null>(null);
  const [envInfo, setEnvInfo] = useState<Record<string, string>>({});

  // Get environment information
  useEffect(() => {
    const info: Record<string, string> = {
      'User Agent': navigator.userAgent,
      'Window Location': window.location.href,
      'Hostname': window.location.hostname,
      'Origin': window.location.origin,
      'Protocol': window.location.protocol,
      'API Base Health URL': getApiUrl('/api/health'),
      'Replit Environment': window.location.hostname.includes('.repl.co') ? 'Yes' : 'No',
      'Online Status': navigator.onLine ? 'Yes' : 'No',
      'Viewport Dimensions': `${window.innerWidth}x${window.innerHeight}`,
      'Device Pixel Ratio': `${window.devicePixelRatio}`,
    };
    setEnvInfo(info);
  }, []);

  // Test the API health endpoint
  const testHealthEndpoint = async () => {
    setLoading(true);
    try {
      const url = getApiUrl('/api/health');
      console.log(`Testing API health endpoint at: ${url}`);
      
      // Use a timeout to prevent long-hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // Direct fetch to health endpoint with explicit URL and timeout
      const response = await fetch(url, { 
        signal: controller.signal,
        // Add cache-busting query parameter to avoid cached responses
        headers: { 'Cache-Control': 'no-cache, no-store' }
      });
      clearTimeout(timeoutId);
      
      console.log(`Health endpoint response status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log("Health endpoint data:", data);
        setHealthStatus(JSON.stringify(data, null, 2));
        setHealthError(null);
      } else {
        setHealthStatus(null);
        setHealthError(`Error: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.error("Error testing health endpoint:", err);
      setHealthStatus(null);
      // Provide a more user-friendly error message
      if (err instanceof DOMException && err.name === 'AbortError') {
        setHealthError('Request timed out after 5 seconds. Server may be unresponsive.');
      } else {
        setHealthError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setLoading(false);
    }
  };

  // Test the dashboard summary endpoint
  const testDashboardEndpoint = async () => {
    setLoading(true);
    try {
      const url = getApiUrl('/api/dashboard/summary');
      console.log(`Testing dashboard summary endpoint at: ${url}`);
      
      // Use a timeout to prevent long-hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // Direct fetch to dashboard summary endpoint with explicit URL and timeout
      const response = await fetch(url, { 
        signal: controller.signal,
        // Add cache-busting query parameter to avoid cached responses
        headers: { 'Cache-Control': 'no-cache, no-store' }
      });
      clearTimeout(timeoutId);
      
      console.log(`Dashboard summary response status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log("Dashboard summary data:", data);
        setDashboardStatus(`Success (${Object.keys(data).length} keys)`);
        setDashboardError(null);
      } else {
        setDashboardStatus(null);
        setDashboardError(`Error: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.error("Error testing dashboard endpoint:", err);
      setDashboardStatus(null);
      
      // Provide a more user-friendly error message
      if (err instanceof DOMException && err.name === 'AbortError') {
        setDashboardError('Request timed out after 5 seconds. Server may be unresponsive.');
      } else {
        setDashboardError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setLoading(false);
    }
  };

  // Test a custom endpoint
  const testCustomEndpoint = async () => {
    setLoading(true);
    try {
      const url = getApiUrl(customEndpoint);
      console.log(`Testing custom endpoint at: ${url}`);
      
      // Use a timeout to prevent long-hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(url, { 
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache, no-store' }
      });
      clearTimeout(timeoutId);
      
      console.log(`Custom endpoint response status: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log("Custom endpoint data:", data);
        setCustomEndpointResult(JSON.stringify(data, null, 2));
        setCustomEndpointError(null);
      } else {
        setCustomEndpointResult(null);
        setCustomEndpointError(`Error: ${response.status} ${response.statusText}`);
      }
    } catch (err) {
      console.error("Error testing custom endpoint:", err);
      setCustomEndpointResult(null);
      
      // Provide a more user-friendly error message
      if (err instanceof DOMException && err.name === 'AbortError') {
        setCustomEndpointError('Request timed out after 5 seconds. Server may be unresponsive.');
      } else {
        setCustomEndpointError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      setLoading(false);
    }
  };

  // Test both endpoints on initial load
  useEffect(() => {
    const runTests = async () => {
      await testHealthEndpoint();
      await testDashboardEndpoint();
    };
    
    runTests();
  }, []);

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <Server className="mr-2 h-8 w-8" /> 
        Connection Test Page
      </h1>
      
      <div className="mb-8">
        <Tabs defaultValue="api-test">
          <TabsList className="mb-4">
            <TabsTrigger value="api-test">API Tests</TabsTrigger>
            <TabsTrigger value="custom-test">Custom Endpoint</TabsTrigger>
            <TabsTrigger value="environment">Environment</TabsTrigger>
          </TabsList>
          
          <TabsContent value="api-test">
            <Card>
              <CardHeader>
                <CardTitle>API Connection Status</CardTitle>
                <CardDescription>Testing connectivity to backend API endpoints</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Health Endpoint Test */}
                  <div>
                    <h3 className="text-lg font-semibold flex items-center mb-2">
                      Health Endpoint Test
                      {healthStatus && <CheckCircle className="ml-2 h-5 w-5 text-green-500" />}
                      {healthError && <XCircle className="ml-2 h-5 w-5 text-red-500" />}
                      {loading && <AlertCircle className="ml-2 h-5 w-5 text-yellow-500 animate-pulse" />}
                    </h3>
                    
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-2 mb-2">
                      <code className="text-xs font-mono">{getApiUrl('/api/health')}</code>
                    </div>
                    
                    {healthStatus ? (
                      <div className="bg-green-50 border border-green-200 rounded-md p-4">
                        <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-60">{healthStatus}</pre>
                      </div>
                    ) : healthError ? (
                      <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{healthError}</AlertDescription>
                      </Alert>
                    ) : (
                      <p className="text-gray-500">Testing endpoint...</p>
                    )}
                  </div>
                  
                  {/* Dashboard Endpoint Test */}
                  <div>
                    <h3 className="text-lg font-semibold flex items-center mb-2">
                      Dashboard Summary Endpoint Test
                      {dashboardStatus && <CheckCircle className="ml-2 h-5 w-5 text-green-500" />}
                      {dashboardError && <XCircle className="ml-2 h-5 w-5 text-red-500" />}
                      {loading && <AlertCircle className="ml-2 h-5 w-5 text-yellow-500 animate-pulse" />}
                    </h3>
                    
                    <div className="bg-gray-50 border border-gray-200 rounded-md p-2 mb-2">
                      <code className="text-xs font-mono">{getApiUrl('/api/dashboard/summary')}</code>
                    </div>
                    
                    {dashboardStatus ? (
                      <div className="bg-green-50 border border-green-200 rounded-md p-4">
                        <p>{dashboardStatus}</p>
                      </div>
                    ) : dashboardError ? (
                      <Alert variant="destructive">
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{dashboardError}</AlertDescription>
                      </Alert>
                    ) : (
                      <p className="text-gray-500">Testing endpoint...</p>
                    )}
                  </div>
                  
                  <div className="flex gap-4 mt-4">
                    <Button onClick={testHealthEndpoint} disabled={loading}>
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Retest Health
                    </Button>
                    <Button onClick={testDashboardEndpoint} disabled={loading} variant="outline">
                      <RefreshCcw className="mr-2 h-4 w-4" />
                      Retest Dashboard
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="custom-test">
            <Card>
              <CardHeader>
                <CardTitle>Test Custom API Endpoint</CardTitle>
                <CardDescription>Enter any API endpoint to test connectivity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-end gap-4">
                    <div className="flex-1">
                      <Label htmlFor="custom-endpoint" className="mb-2 block">API Endpoint</Label>
                      <Input 
                        id="custom-endpoint"
                        value={customEndpoint}
                        onChange={(e) => setCustomEndpoint(e.target.value)}
                        placeholder="/api/health"
                      />
                    </div>
                    <Button onClick={testCustomEndpoint} disabled={loading}>
                      Test Endpoint
                    </Button>
                  </div>
                  
                  {customEndpointResult ? (
                    <div className="bg-green-50 border border-green-200 rounded-md p-4 mt-4">
                      <h4 className="font-semibold mb-2 flex items-center">
                        Response <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
                      </h4>
                      <pre className="text-sm whitespace-pre-wrap overflow-auto max-h-60">{customEndpointResult}</pre>
                    </div>
                  ) : customEndpointError ? (
                    <Alert variant="destructive" className="mt-4">
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{customEndpointError}</AlertDescription>
                    </Alert>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="environment">
            <Card>
              <CardHeader>
                <CardTitle>Environment Information</CardTitle>
                <CardDescription>Details about your browser and network environment</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                    <h3 className="text-lg font-semibold mb-4">Browser Environment</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(envInfo).map(([key, value]) => (
                        <div key={key} className="border-b border-gray-200 pb-2">
                          <p className="font-medium text-gray-600">{key}</p>
                          <p className="font-mono text-sm">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                    <h3 className="text-lg font-semibold mb-4">Connection Information</h3>
                    <div>
                      <p className="font-medium text-gray-600">Online Status</p>
                      <p className="flex items-center">
                        {navigator.onLine 
                          ? <><CheckCircle className="mr-2 h-4 w-4 text-green-500" /> Connected</> 
                          : <><XCircle className="mr-2 h-4 w-4 text-red-500" /> Disconnected</>}
                      </p>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                    <h3 className="text-lg font-semibold mb-2">Server Information</h3>
                    <div>
                      <p className="font-medium text-gray-600">Server Port</p>
                      <p className="font-mono">{PORT}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}