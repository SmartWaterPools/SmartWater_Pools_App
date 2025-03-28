import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  AlertTriangle, 
  CheckCircle2, 
  Cookie, 
  Database, 
  Key,
  RefreshCw,
  ShieldAlert,
  UserCheck
} from 'lucide-react';

export default function OAuthDebug() {
  const { user, isAuthenticated, isLoading, checkSession } = useAuth();
  const [location, setLocation] = useLocation();
  const [sessionData, setSessionData] = useState<any>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [sessionDataHistory, setSessionDataHistory] = useState<any[]>([]);
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>({});
  
  // Apply global styling for this page
  useEffect(() => {
    // Add a class to the body for full height scrolling
    document.body.classList.add('h-full', 'overflow-auto');
    
    return () => {
      // Clean up by removing the classes when component unmounts
      document.body.classList.remove('h-full', 'overflow-auto');
    };
  }, []);

  // Function to check session directly
  const checkSessionManually = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      // Extract and save headers
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      setResponseHeaders(headers);
      
      const data = await response.json();
      setSessionData(data);
      
      // Store this check in history
      setSessionDataHistory(prev => [
        { 
          timestamp: new Date(),
          data,
          headers
        },
        ...prev.slice(0, 9) // Keep last 10 checks
      ]);
      
      setLastChecked(new Date());
      
      // Trigger auth context refresh
      checkSession();
    } catch (error) {
      console.error('Error checking session:', error);
    } finally {
      setIsChecking(false);
    }
  };

  // Add global styles to fix scrolling
  useEffect(() => {
    // Create a style element to fix scrolling
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
      html, body, #root {
        height: auto !important;
        min-height: 100%;
        overflow: auto !important;
      }
      .overflow-hidden {
        overflow: visible !important;
      }
    `;
    document.head.appendChild(styleEl);
    
    return () => {
      document.head.removeChild(styleEl);
    };
  }, []);

  // Initial check on component mount
  useEffect(() => {
    checkSessionManually();
    // Set up periodic check every 15 seconds
    const interval = setInterval(() => {
      checkSessionManually();
    }, 15000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mx-auto py-8 space-y-8 pb-20" style={{ 
      maxHeight: "none", 
      overflow: "auto", 
      height: "auto", 
      minHeight: "100vh",
      position: "relative",
      zIndex: 10
    }}>
      <div className="flex justify-between items-center sticky top-0 bg-background z-10 py-2">
        <h1 className="text-3xl font-bold">OAuth Authentication Debug</h1>
        <Button 
          onClick={checkSessionManually} 
          disabled={isChecking}
          variant="outline"
        >
          {isChecking ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Session
            </>
          )}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Authentication Status Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center">
              <ShieldAlert className="mr-2 h-5 w-5 text-primary" />
              Authentication Status
            </CardTitle>
            <CardDescription>
              Current authentication state from context
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-medium">Status:</span>
                <Badge 
                  variant={isAuthenticated ? "default" : "destructive"}
                  className="ml-2"
                >
                  {isAuthenticated ? "Authenticated" : "Not Authenticated"}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-medium">Loading:</span>
                <Badge 
                  variant={isLoading ? "outline" : "secondary"}
                  className="ml-2"
                >
                  {isLoading ? "Loading..." : "Completed"}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-medium">User ID:</span>
                <span className="text-sm font-mono bg-muted px-2 py-1 rounded">
                  {user?.id || "None"}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-medium">Email:</span>
                <span className="text-sm">
                  {user?.email || "None"}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="font-medium">Auth Provider:</span>
                <Badge 
                  variant={user?.authProvider === 'google' ? "default" : "secondary"}
                  className="ml-2"
                >
                  {user?.authProvider || "None"}
                </Badge>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-0 text-xs text-muted-foreground">
            {lastChecked ? `Last checked: ${lastChecked.toLocaleTimeString()}` : 'Not checked yet'}
          </CardFooter>
        </Card>
        
        {/* Session Status Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center">
              <Database className="mr-2 h-5 w-5 text-primary" />
              Session Details
            </CardTitle>
            <CardDescription>
              Raw session data from server
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessionData ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Session ID:</span>
                  <span className="text-xs font-mono bg-muted px-2 py-1 rounded truncate max-w-[180px]" title={sessionData.sessionID}>
                    {sessionData.sessionID?.substring(0, 12)}...
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="font-medium">Session Exists:</span>
                  <Badge 
                    variant={sessionData.sessionExists ? "default" : "destructive"}
                  >
                    {sessionData.sessionExists ? "Yes" : "No"}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="font-medium">Authenticated:</span>
                  <Badge 
                    variant={sessionData.isAuthenticated ? "default" : "destructive"}
                  >
                    {sessionData.isAuthenticated ? "Yes" : "No"}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="font-medium">OAuth Pending:</span>
                  <Badge 
                    variant={sessionData.oauthPending ? "default" : "secondary"}
                  >
                    {sessionData.oauthPending ? "Yes" : "No"}
                  </Badge>
                </div>
                
                {sessionData.hasPendingOAuthUser && (
                  <div className="flex justify-between items-center">
                    <span className="font-medium">OAuth Email:</span>
                    <span className="text-sm font-medium">
                      {sessionData.oauthEmail}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between items-center">
                  <span className="font-medium">Session Store:</span>
                  <span className="text-sm">
                    {sessionData.sessionStore || "Unknown"}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="font-medium">New Session:</span>
                  <Badge 
                    variant={sessionData.isNew ? "outline" : "secondary"}
                  >
                    {sessionData.isNew ? "Yes" : "No"}
                  </Badge>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-48">
                <p className="text-muted-foreground">Loading session data...</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-0 text-xs text-muted-foreground">
            Cookie: {sessionData?.sessionCookieName || "Unknown"}
          </CardFooter>
        </Card>
        
        {/* Cookie Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center">
              <Cookie className="mr-2 h-5 w-5 text-primary" />
              Cookie Configuration
            </CardTitle>
            <CardDescription>
              Session cookie settings from server
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {sessionData ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Max Age:</span>
                  <span className="text-sm">
                    {sessionData.cookieMaxAge 
                      ? `${Math.round(sessionData.cookieMaxAge / 86400)}d ${Math.round((sessionData.cookieMaxAge % 86400) / 3600)}h` 
                      : "None"}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="font-medium">Expires:</span>
                  <span className="text-sm">
                    {sessionData.cookieExpires 
                      ? new Date(sessionData.cookieExpires).toLocaleDateString() 
                      : "None"}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="font-medium">HttpOnly:</span>
                  <Badge 
                    variant={sessionData.cookieHttpOnly ? "default" : "destructive"}
                  >
                    {sessionData.cookieHttpOnly ? "Yes" : "No"}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="font-medium">Secure:</span>
                  <Badge 
                    variant={sessionData.cookieSecure ? "default" : "destructive"}
                  >
                    {sessionData.cookieSecure ? "Yes" : "No"}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="font-medium">SameSite:</span>
                  <Badge 
                    variant={responseHeaders['set-cookie']?.includes('SameSite=None') ? "default" : "outline"}
                  >
                    {responseHeaders['set-cookie']?.includes('SameSite=None') 
                      ? "None" 
                      : responseHeaders['set-cookie']?.includes('SameSite=Lax')
                        ? "Lax"
                        : responseHeaders['set-cookie']?.includes('SameSite=Strict')
                          ? "Strict"
                          : "Unknown"}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="font-medium">Cookie Found:</span>
                  <Badge 
                    variant={sessionData.hasSwpSidCookie ? "default" : "destructive"}
                  >
                    {sessionData.hasSwpSidCookie ? "Yes" : "No"}
                  </Badge>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="font-medium">Cookie Name:</span>
                  <span className="text-sm font-mono">
                    {sessionData.sessionCookieName || "Unknown"}
                  </span>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-48">
                <p className="text-muted-foreground">Loading cookie data...</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-0 flex space-x-2">
            {sessionData?.cookieSecure === true && (
              <Badge variant="outline" className="bg-green-50">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Secure
              </Badge>
            )}
            {sessionData?.cookieHttpOnly === true && (
              <Badge variant="outline" className="bg-green-50">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                HttpOnly
              </Badge>
            )}
            {responseHeaders['set-cookie']?.includes('SameSite=None') && (
              <Badge variant="outline" className="bg-green-50">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                SameSite=None
              </Badge>
            )}
          </CardFooter>
        </Card>
      </div>
      
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Key className="mr-2 h-5 w-5 text-primary" />
            Response Headers
          </CardTitle>
          <CardDescription>
            Headers from session response
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-md p-4 overflow-auto max-h-[200px]">
            <pre className="text-xs font-mono whitespace-pre-wrap">
              {JSON.stringify(responseHeaders, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
      
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCheck className="mr-2 h-5 w-5 text-primary" />
            OAuth Status
          </CardTitle>
          <CardDescription>
            Special route for testing Google OAuth authentication
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <p className="text-sm">Test your OAuth authentication by going through the full authentication flow.</p>
            
            <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-6">
              <div className="rounded-lg border bg-card p-4 flex-1">
                <h3 className="font-semibold text-lg mb-2 flex items-center">
                  <AlertCircle className="mr-2 h-4 w-4 text-primary" />
                  Test OAuth Login
                </h3>
                <p className="text-sm mb-4">Authenticate with Google through the standard login process.</p>
                <Button 
                  variant="default" 
                  className="w-full"
                  onClick={() => window.location.href = '/login?source=oauthdebug'}
                >
                  Go to Login Page
                </Button>
              </div>
              
              <div className="rounded-lg border bg-card p-4 flex-1">
                <h3 className="font-semibold text-lg mb-2 flex items-center">
                  <AlertTriangle className="mr-2 h-4 w-4 text-primary" />
                  Direct OAuth Attempt
                </h3>
                <p className="text-sm mb-4">Directly trigger the Google OAuth flow, bypassing the login page.</p>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={async () => {
                    // First, prepare the session
                    try {
                      const prepResult = await fetch('/api/auth/prepare-oauth');
                      const data = await prepResult.json();
                      if (data.success) {
                        // If successfully prepared, redirect to Google OAuth
                        window.location.href = `/api/auth/google?state=${data.state}&originPath=/oauth-debug`;
                      } else {
                        alert('Failed to prepare OAuth session: ' + data.message);
                      }
                    } catch (error) {
                      console.error('Error preparing OAuth:', error);
                      alert('Error preparing OAuth session');
                    }
                  }}
                >
                  Test Direct OAuth
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Session History</CardTitle>
          <CardDescription>
            Track changes in your session over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessionDataHistory.length > 0 ? (
            <div className="space-y-4">
              {sessionDataHistory.map((entry, index) => (
                <div key={index} className="rounded-lg border p-4">
                  <div className="flex justify-between mb-2">
                    <h4 className="font-medium">{entry.timestamp.toLocaleTimeString()}</h4>
                    <Badge variant={entry.data.isAuthenticated ? "default" : "secondary"}>
                      {entry.data.isAuthenticated ? "Authenticated" : "Not Authenticated"}
                    </Badge>
                  </div>
                  <Separator className="my-2" />
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Session ID:</span> {entry.data.sessionID?.substring(0, 10)}...
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Auth Headers:</span> {entry.headers['x-auth-status']}
                  </div>
                  {entry.data.hasPendingOAuthUser && (
                    <div className="text-xs font-medium text-amber-600 mt-1">
                      Has pending OAuth user: {entry.data.oauthEmail}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground">No history recorded yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}