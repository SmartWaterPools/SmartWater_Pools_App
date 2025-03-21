import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useLocation } from 'wouter';

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
  } | null;
  cookies: string | null;
}

export default function OAuthDebug() {
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [location] = useLocation();
  const [loading, setLoading] = useState(true);

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
              {sessionInfo.user.googleId && (
                <tr>
                  <td className="pr-4 py-2 font-medium">Google ID:</td>
                  <td>{sessionInfo.user.googleId}</td>
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
          <p>Loading session information...</p>
        </div>
      ) : (
        <>
          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
            <p className="mb-4">
              Status: <span className="font-medium">{sessionInfo?.isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</span>
            </p>
            
            {renderUserInfo()}
            
            <div className="mt-6 space-x-4">
              {!sessionInfo?.isAuthenticated ? (
                <button
                  onClick={handleGoogleLogin}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
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
              
              <a
                href="/"
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition inline-block"
              >
                Back to Home
              </a>
            </div>
          </div>
          
          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Session Cookie</h2>
            <div className="bg-gray-50 p-4 rounded overflow-x-auto">
              <code className="text-sm whitespace-pre-wrap break-all">
                {sessionInfo?.cookies || 'No cookies found'}
              </code>
            </div>
          </div>
          
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Debug Information</h2>
            <p className="mb-2">
              Current URL: <code className="bg-gray-100 px-2 py-1 rounded">{window.location.href}</code>
            </p>
            <p className="mb-2">
              OAuth Redirect URL: <code className="bg-gray-100 px-2 py-1 rounded">/api/auth/google/callback</code>
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
        </div>
      )}
    </div>
  );
}