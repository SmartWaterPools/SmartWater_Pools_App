import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function ConnectionTest() {
  const [healthStatus, setHealthStatus] = useState<string | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [dashboardStatus, setDashboardStatus] = useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Test the API health endpoint
  const testHealthEndpoint = async () => {
    setLoading(true);
    try {
      console.log("Testing API health endpoint...");
      
      // Direct fetch to health endpoint
      const response = await fetch("/api/health");
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
      setHealthError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  // Test the dashboard summary endpoint
  const testDashboardEndpoint = async () => {
    setLoading(true);
    try {
      console.log("Testing dashboard summary endpoint...");
      
      // Direct fetch to dashboard summary endpoint
      const response = await fetch("/api/dashboard/summary");
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
      setDashboardError(err instanceof Error ? err.message : String(err));
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
      <h1 className="text-3xl font-bold mb-6">Connection Test Page</h1>
      
      <div className="mb-8">
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
                
                {healthStatus ? (
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <pre className="text-sm whitespace-pre-wrap">{healthStatus}</pre>
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
                  Retest Health Endpoint
                </Button>
                <Button onClick={testDashboardEndpoint} disabled={loading} variant="outline">
                  Retest Dashboard Endpoint
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div>
        <Card>
          <CardHeader>
            <CardTitle>Browser Network Information</CardTitle>
            <CardDescription>Information about your browser's network connection</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Current URL</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                  <p className="font-mono">{window.location.href}</p>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Network Status</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                  <p>Online: <span className="font-semibold">{navigator.onLine ? "Yes" : "No"}</span></p>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">API Base URL</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                  <p className="font-mono">{window.location.origin}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}