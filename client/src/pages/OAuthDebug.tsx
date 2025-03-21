import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SessionResponse {
  isAuthenticated: boolean;
  user?: {
    id: number;
    username: string;
    email: string;
    role: string;
    name: string;
    // Add other user fields as needed
  }
}

interface DiagnosticData {
  currentUrl: string;
  expectedCallbackUrl: string;
  environmentDetails: {
    nodeEnv: string;
    replSlug: string;
    replOwner: string;
  };
  isReplit: boolean;
  recommendedCallbackURLs: string[];
  userDetails?: {
    id: number;
    username: string;
    email: string;
    role: string;
    isAuthenticated: boolean;
  }
}

export default function OAuthDebug() {
  const [session, setSession] = useState<SessionResponse | null>(null);
  const [diagnosticData, setDiagnosticData] = useState<DiagnosticData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      setSession(data);
      console.log('Session data:', data);
    } catch (err) {
      setError('Failed to fetch session data');
      console.error('Error fetching session:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDiagnosticData = async () => {
    try {
      const response = await fetch('/api/auth/google-test');
      if (!response.ok) {
        throw new Error('Failed to fetch diagnostic data');
      }
      const data = await response.json();
      setDiagnosticData(data);
      console.log('Diagnostic data:', data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error fetching diagnostic data:', err);
    }
  };

  useEffect(() => {
    fetchSession();
    fetchDiagnosticData();
  }, []);

  const handleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      await fetchSession();
    } catch (err) {
      setError('Failed to logout');
      console.error('Error logging out:', err);
    }
  };

  const refreshData = () => {
    fetchSession();
    fetchDiagnosticData();
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">OAuth Debugging Tools</h1>
      
      <div className="grid gap-6">
        {/* Session Status */}
        <Card>
          <CardHeader>
            <CardTitle>Session Status</CardTitle>
            <CardDescription>
              Current authentication state
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading session data...</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Authentication Status:</span>
                  {session?.isAuthenticated ? (
                    <Badge className="bg-green-500">Authenticated</Badge>
                  ) : (
                    <Badge variant="destructive">Not Authenticated</Badge>
                  )}
                </div>
                
                {session?.isAuthenticated && session.user && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold">User Information</h3>
                    <div className="rounded-md bg-muted p-4">
                      <pre className="text-sm overflow-auto whitespace-pre-wrap">
                        {JSON.stringify(session.user, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button onClick={refreshData} variant="outline">Refresh</Button>
            {session?.isAuthenticated ? (
              <Button onClick={handleLogout} variant="destructive">Logout</Button>
            ) : (
              <Button onClick={handleLogin}>Login with Google</Button>
            )}
          </CardFooter>
        </Card>
        
        {/* OAuth Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>OAuth Configuration</CardTitle>
            <CardDescription>
              Diagnostic information about your OAuth setup
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!diagnosticData ? (
              <p>Loading configuration data...</p>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Environment</h3>
                  <ul className="list-disc list-inside space-y-1 mt-2">
                    <li><span className="font-medium">Node Environment:</span> {diagnosticData.environmentDetails.nodeEnv}</li>
                    <li><span className="font-medium">Replit Slug:</span> {diagnosticData.environmentDetails.replSlug}</li>
                    <li><span className="font-medium">Replit Owner:</span> {diagnosticData.environmentDetails.replOwner}</li>
                    <li><span className="font-medium">Is Replit Environment:</span> {diagnosticData.isReplit ? 'Yes' : 'No'}</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold">Callback URLs</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    These URLs must be added to your Google Cloud Console OAuth configuration.
                  </p>
                  
                  <div className="space-y-2">
                    <div>
                      <p className="font-medium">Current URL:</p>
                      <code className="block p-2 rounded-md bg-muted text-sm">
                        {diagnosticData.currentUrl}
                      </code>
                    </div>
                    
                    <div>
                      <p className="font-medium">Expected Callback URL:</p>
                      <code className="block p-2 rounded-md bg-muted text-sm">
                        {diagnosticData.expectedCallbackUrl}
                      </code>
                    </div>
                    
                    <div>
                      <p className="font-medium">Recommended Callback URLs to add to Google Cloud Console:</p>
                      <ul className="mt-1 space-y-1">
                        {diagnosticData.recommendedCallbackURLs.map((url, index) => (
                          <li key={index}>
                            <code className="block p-2 rounded-md bg-muted text-sm">
                              {url}
                            </code>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                
                {diagnosticData.userDetails && (
                  <div>
                    <h3 className="text-lg font-semibold">User Details from Diagnostic Endpoint</h3>
                    <div className="rounded-md bg-muted p-4 mt-2">
                      <pre className="text-sm overflow-auto whitespace-pre-wrap">
                        {JSON.stringify(diagnosticData.userDetails, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={fetchDiagnosticData} variant="outline">
              Refresh Configuration
            </Button>
          </CardFooter>
        </Card>
        
        {/* Troubleshooting Guide */}
        <Card>
          <CardHeader>
            <CardTitle>Troubleshooting Guide</CardTitle>
            <CardDescription>
              Common issues and solutions for OAuth configuration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Problem: Redirect URI mismatch error</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This happens when the callback URL doesn't match what's configured in Google Cloud Console.
                </p>
                <p className="text-sm mt-2">
                  <span className="font-medium">Solution:</span> Add all recommended callback URLs to your Google Cloud Console OAuth configuration.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold">Problem: Successfully authenticates but redirects to login</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This usually means the session isn't being maintained after authentication.
                </p>
                <p className="text-sm mt-2">
                  <span className="font-medium">Solution:</span> Check if cookies are being properly set and if the session store is working.
                </p>
              </div>
              
              <div>
                <h3 className="font-semibold">Problem: "accounts.google.com refused to connect"</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Google may refuse the connection if the OAuth configuration is incorrect.
                </p>
                <p className="text-sm mt-2">
                  <span className="font-medium">Solution:</span> Verify that your authorized origins in Google Cloud Console include your application domain.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}