import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation, Link } from 'wouter';

interface SessionInfo {
  isAuthenticated: boolean;
  user: {
    id: number;
    username: string;
    name: string;
    email: string;
    role: string;
    googleId?: string;
    photoUrl?: string;
    authProvider?: string;
  } | null;
  cookies: string | null;
}

interface OAuthParams {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}

export default function OAuthDebug() {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [oauthParams, setOAuthParams] = useState<OAuthParams>({});
  const [location] = useLocation();
  const [loading, setLoading] = useState(true);
  const [showDebugHelp, setShowDebugHelp] = useState(false);

  // Parse URL parameters related to OAuth
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const params: OAuthParams = {};

    // Extract OAuth-related parameters
    if (urlParams.has('code')) params.code = urlParams.get('code') || undefined;
    if (urlParams.has('state')) params.state = urlParams.get('state') || undefined;
    if (urlParams.has('error')) params.error = urlParams.get('error') || undefined;
    if (urlParams.has('error_description')) 
      params.error_description = urlParams.get('error_description') || undefined;

    setOAuthParams(params);

    // If we have an OAuth error, display it
    if (params.error) {
      setError(`OAuth Error: ${params.error}${params.error_description ? ` - ${params.error_description}` : ''}`);
    }
  }, [location]);

  useEffect(() => {
    const fetchSessionInfo = async () => {
      try {
        setLoading(true);
        const response = await axios.get('/api/auth/session');
        
        setSessionInfo({
          isAuthenticated: response.data.isAuthenticated,
          user: response.data.user || null,
          cookies: document.cookie || null,
        });
        
        console.log('Session response:', response.data);
      } catch (err: any) {
        console.error('Error fetching session info:', err);
        setError(err.message || 'Failed to fetch session information');
      } finally {
        setLoading(false);
      }
    };

    fetchSessionInfo();
  }, [location]);

  const handleGoogleLogin = () => {
    window.location.href = '/api/auth/google';
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
      
      // Refresh session info after logout
      const response = await axios.get('/api/auth/session');
      setSessionInfo({
        isAuthenticated: response.data.isAuthenticated,
        user: response.data.user || null,
        cookies: document.cookie || null,
      });
      
      console.log('Logged out successfully');
    } catch (err: any) {
      console.error('Error during logout:', err);
      setError(err.message || 'Failed to logout');
    }
  };

  const refreshSession = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/auth/session');
      
      setSessionInfo({
        isAuthenticated: response.data.isAuthenticated,
        user: response.data.user || null,
        cookies: document.cookie || null,
      });
      
      console.log('Session refreshed:', response.data);
    } catch (err: any) {
      console.error('Error refreshing session:', err);
      setError(err.message || 'Failed to refresh session information');
    } finally {
      setLoading(false);
    }
  };

  const renderUserInfo = () => {
    if (!sessionInfo?.user) {
      return <p>No user logged in</p>;
    }

    return (
      <div className="mt-4">
        <h3 className="text-lg font-medium">User Details:</h3>
        <div className="bg-slate-50 p-4 rounded-md mt-2 overflow-x-auto">
          <table className="min-w-full">
            <tbody>
              <tr>
                <td className="pr-4 py-2 font-medium">ID:</td>
                <td>{sessionInfo.user.id}</td>
              </tr>
              <tr>
                <td className="pr-4 py-2 font-medium">Username:</td>
                <td>{sessionInfo.user.username}</td>
              </tr>
              <tr>
                <td className="pr-4 py-2 font-medium">Name:</td>
                <td>{sessionInfo.user.name}</td>
              </tr>
              <tr>
                <td className="pr-4 py-2 font-medium">Email:</td>
                <td>{sessionInfo.user.email}</td>
              </tr>
              <tr>
                <td className="pr-4 py-2 font-medium">Role:</td>
                <td>{sessionInfo.user.role}</td>
              </tr>
              <tr>
                <td className="pr-4 py-2 font-medium">Auth Provider:</td>
                <td>{sessionInfo.user.authProvider || 'local'}</td>
              </tr>
              {sessionInfo.user.googleId && (
                <tr>
                  <td className="pr-4 py-2 font-medium">Google ID:</td>
                  <td>
                    <span className="font-mono text-xs bg-gray-100 p-1 rounded">
                      {sessionInfo.user.googleId}
                    </span>
                  </td>
                </tr>
              )}
              {sessionInfo.user.photoUrl && (
                <tr>
                  <td className="pr-4 py-2 font-medium">Photo:</td>
                  <td>
                    <img 
                      src={sessionInfo.user.photoUrl} 
                      alt="Profile" 
                      className="h-10 w-10 rounded-full"
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">OAuth Debug Page</h1>
      
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 rounded w-3/4 mx-auto"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2 mx-auto"></div>
            <div className="h-4 bg-slate-200 rounded w-2/3 mx-auto"></div>
          </div>
          <p className="mt-4">Loading session information...</p>
        </div>
      ) : (
        <>
          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
            <p className="mb-4">
              Status: <span className={`font-medium ${sessionInfo?.isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
                {sessionInfo?.isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
              </span>
            </p>
            
            {renderUserInfo()}
            
            <div className="mt-6 space-x-4">
              {!sessionInfo?.isAuthenticated ? (
                <button
                  onClick={handleGoogleLogin}
                  className="px-4 py-2 flex items-center bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#ffffff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#ffffff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="#ffffff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Sign in with Google
                </button>
              ) : (
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                >
                  Logout
                </button>
              )}
              
              <button
                onClick={refreshSession}
                className="px-4 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition"
                disabled={loading}
              >
                Refresh Session Info
              </button>
              
              <Link href="/"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition inline-block"
              >
                Back to Home
              </Link>
            </div>
          </div>
          
          {/* OAuth Parameters if present */}
          {(oauthParams.code || oauthParams.error) && (
            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">OAuth Response Parameters</h2>
              <div className="bg-yellow-50 p-4 rounded overflow-x-auto border border-yellow-200">
                <table className="min-w-full">
                  <tbody>
                    {oauthParams.code && (
                      <tr>
                        <td className="pr-4 py-2 font-medium">Auth Code:</td>
                        <td>
                          <span className="font-mono text-xs bg-gray-100 p-1 rounded">
                            {oauthParams.code.substring(0, 10)}...
                          </span>
                          <span className="text-gray-500 text-xs ml-2">(Showing partial code for security)</span>
                        </td>
                      </tr>
                    )}
                    {oauthParams.state && (
                      <tr>
                        <td className="pr-4 py-2 font-medium">State:</td>
                        <td>{oauthParams.state}</td>
                      </tr>
                    )}
                    {oauthParams.error && (
                      <tr>
                        <td className="pr-4 py-2 font-medium">Error:</td>
                        <td className="text-red-600">{oauthParams.error}</td>
                      </tr>
                    )}
                    {oauthParams.error_description && (
                      <tr>
                        <td className="pr-4 py-2 font-medium">Error Description:</td>
                        <td className="text-red-600">{oauthParams.error_description}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Session Cookie</h2>
            <div className="bg-gray-50 p-4 rounded overflow-x-auto">
              <code className="text-sm whitespace-pre-wrap break-all">
                {sessionInfo?.cookies || 'No cookies found'}
              </code>
            </div>
          </div>
          
          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Debug Information</h2>
              <button 
                className="text-sm text-blue-600 hover:text-blue-800"
                onClick={() => setShowDebugHelp(!showDebugHelp)}
              >
                {showDebugHelp ? 'Hide Help' : 'Show Help'}
              </button>
            </div>
            
            {showDebugHelp && (
              <div className="bg-blue-50 p-4 rounded mb-4 border border-blue-100">
                <h3 className="font-semibold mb-2">OAuth Debugging Tips</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Verify Google credentials in environment variables are correct</li>
                  <li>Check callback URL matches exactly with Google Console configuration</li>
                  <li>Session persistence requires properly configured cookies</li>
                  <li>Use browser dev tools to check for CORS or cookie issues</li>
                  <li>Clear browser cookies if experiencing persistent issues</li>
                </ul>
              </div>
            )}
            
            <p className="mb-2">
              Current URL: <code className="bg-gray-100 px-2 py-1 rounded">{window.location.href}</code>
            </p>
            <p className="mb-2">
              OAuth Redirect URL: <code className="bg-gray-100 px-2 py-1 rounded">/api/auth/google/callback</code>
            </p>
            <p className="mb-2">
              Environment: <code className="bg-gray-100 px-2 py-1 rounded">
                {process.env.NODE_ENV || "development"}
              </code>
            </p>
            <p>
              Page generated at: <span className="font-mono">{new Date().toISOString()}</span>
            </p>
          </div>
        </>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-6" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
          <div className="mt-2">
            <button 
              className="text-sm underline hover:no-underline"
              onClick={() => setError(null)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}