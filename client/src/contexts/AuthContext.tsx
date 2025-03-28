import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";

type AuthUser = Omit<User, 'password'>;

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: ((username: string, password: string) => Promise<boolean>) & {
    onLoginSuccess: (user: AuthUser) => void;
  };
  logout: () => Promise<void>;
  register: (userData: any) => Promise<boolean>;
  checkSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionChecked, setSessionChecked] = useState<boolean>(false);
  const { toast } = useToast();

  // Check for OAuth callback state to trigger additional session checks if needed
  const [oauthRetryCount, setOauthRetryCount] = useState(0);
  const MAX_OAUTH_RETRIES = 5; // Increased from 3 to 5 to allow more retries
  
  // Enhanced function to check if the current URL is an OAuth callback URL
  // or if there are other indicators of OAuth flow in progress
  const isOAuthCallback = (): boolean => {
    const pathname = window.location.pathname;
    const url = window.location.href;
    
    // Check URL path for OAuth routes
    const isOAuthPath = pathname.includes('/api/auth/google/callback') || 
           pathname.includes('/oauth/callback') ||
           pathname.includes('/organization-selection') ||
           pathname === '/dashboard' || // Dashboard is where we redirect after successful OAuth
           pathname === '/oauth-debug';
           
    // Also check URL parameters that might indicate OAuth flow
    const hasOAuthParams = url.includes('?code=') || 
                          url.includes('&code=') ||
                          url.includes('?state=') || 
                          url.includes('&state=') ||
                          url.includes('?error=') ||
                          url.includes('&error=');
                          
    // Check for OAuth indicators in cookies and localStorage
    const hasOAuthCookie = document.cookie.includes('oauth_flow=') || 
                          document.cookie.includes('oauth_token=');
    const hasOAuthState = localStorage.getItem('oauth_state') !== null;
    const oauthTimestamp = localStorage.getItem('oauth_timestamp');
    const isRecentOAuth = oauthTimestamp && 
                           (parseInt(oauthTimestamp) > Date.now() - (10 * 60 * 1000));
    
    return isOAuthPath || hasOAuthParams || (hasOAuthCookie && hasOAuthState) || (hasOAuthState && isRecentOAuth);
  };
  
  // Check if the user is authenticated on component mount with enhanced OAuth handling
  useEffect(() => {
    const checkInitialSession = async () => {
      console.log("Performing initial session check...");
      try {
        // Keep isLoading true during the entire session check
        setIsLoading(true);
        
        const isAuthenticated = await checkSession();
        
        // Special handling for OAuth callback paths - retry session check multiple times with delay
        // This helps with race conditions where the server-side session might not be fully established
        if (!isAuthenticated && isOAuthCallback() && oauthRetryCount < MAX_OAUTH_RETRIES) {
          console.log(`OAuth path detected, scheduling retry ${oauthRetryCount + 1} of ${MAX_OAUTH_RETRIES}`);
          
          // Schedule a retry after a delay (exponential backoff)
          const delayMs = Math.min(1000 * Math.pow(2, oauthRetryCount), 5000);
          
          setTimeout(() => {
            setOauthRetryCount(prev => prev + 1);
            // Will trigger this effect again with increased retry count
          }, delayMs);
          
          // Keep loading state while we wait for retry
          return;
        }
      } catch (error) {
        console.error("Error during initial session check:", error);
        // Make sure auth state is reset on error
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        // Only mark session as checked if we're not planning more retries
        if (!isOAuthCallback() || oauthRetryCount >= MAX_OAUTH_RETRIES) {
          setSessionChecked(true);
          setIsLoading(false);
          console.log("Initial session check completed.");
        }
      }
    };
    
    checkInitialSession();
  }, [oauthRetryCount]); // Re-run when oauthRetryCount changes

  const checkSession = async (): Promise<boolean> => {
    try {
      // Don't set isLoading here, it's handled by the parent function
      console.log("Checking session...");
      
      // Check for OAuth flow indicators that might help us detect a pending OAuth login
      const isInOAuthFlow = isOAuthCallback();
      const hasOAuthCookie = document.cookie.includes('oauth_flow=');
      const hasOAuthToken = document.cookie.includes('oauth_token=');
      
      if (isInOAuthFlow || hasOAuthCookie || hasOAuthToken) {
        console.log("OAuth indicators detected during session check:", {
          isInOAuthFlow,
          hasOAuthCookie,
          hasOAuthToken,
          pathname: window.location.pathname
        });
      }
      
      // Add a timestamp to bust cache
      const timestamp = new Date().getTime();
      
      // Use more aggressive cache-busting headers
      const response = await fetch(`/api/auth/session?_t=${timestamp}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      
      // Log response headers for debugging
      console.log("Session check response headers:", 
        Object.fromEntries([...response.headers.entries()].map(([k, v]) => [k, v]))
      );
      
      if (!response.ok) {
        console.warn(`Session check failed with status: ${response.status}`);
        setUser(null);
        setIsAuthenticated(false);
        return false;
      }
      
      const data = await response.json();
      console.log("Session response:", data, "Status:", response.status);

      if (data.isAuthenticated && data.user) {
        // Found authenticated user
        console.log("Session contains authenticated user:", data.user.email);
        setUser(data.user);
        setIsAuthenticated(true);
        return true;
      } else {
        // Not authenticated
        console.log("Session check: Not authenticated", 
          data.sessionID ? `(session ID: ${data.sessionID})` : "(no session ID)");
        
        // Check if we're in an OAuth flow - if so, we should retry more aggressively
        const maxRetries = isInOAuthFlow ? 3 : 1;
        
        // Try up to maxRetries times if session exists but no auth
        if (data.sessionExists && data.sessionID) {
          for (let i = 0; i < maxRetries; i++) {
            console.log(`Session exists but not authenticated, retry attempt ${i + 1} of ${maxRetries}...`);
            
            // Exponential backoff for retries
            const delayMs = Math.min(500 * Math.pow(2, i), 2000);
            console.log(`Waiting ${delayMs}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delayMs));
            
            const retryTimestamp = new Date().getTime();
            const retryResponse = await fetch(`/api/auth/session?_t=${retryTimestamp}`, {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'X-Requested-With': 'XMLHttpRequest'
              }
            });
            
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              console.log(`Session retry ${i + 1} response:`, retryData);
              
              if (retryData.isAuthenticated && retryData.user) {
                console.log("Session retry: Found authenticated user");
                setUser(retryData.user);
                setIsAuthenticated(true);
                return true;
              }
              
              // Special check for OAuth indicators in the response
              if (retryData.hasPendingOAuthUser || retryData.isPartialLogin) {
                console.log("Session has pending OAuth user or partial login, continuing retries...");
                continue;
              }
            } else {
              console.warn(`Session retry ${i + 1} failed with status:`, retryResponse.status);
            }
          }
        }
        
        // Add a special check for OAuth flow with indicators but no session
        if ((isInOAuthFlow || hasOAuthCookie || hasOAuthToken) && !data.hasSessionId) {
          console.log("OAuth flow detected but no session ID found. Attempting emergency session creation...");
          
          try {
            // Try to start a new session via the prepare-oauth endpoint
            const prepareResponse = await fetch(`/api/auth/prepare-oauth?_t=${Date.now()}`, {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
              }
            });
            
            if (prepareResponse.ok) {
              console.log("Successfully created emergency session, rechecking session...");
              
              // Wait a moment for the session to be fully established
              await new Promise(resolve => setTimeout(resolve, 1000));
              
              // Make one final check
              const finalCheckResponse = await fetch(`/api/auth/session?_t=${Date.now()}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                  'Accept': 'application/json',
                  'Cache-Control': 'no-cache, no-store, must-revalidate',
                  'Pragma': 'no-cache'
                }
              });
              
              if (finalCheckResponse.ok) {
                const finalData = await finalCheckResponse.json();
                console.log("Final session check after emergency session creation:", finalData);
                
                if (finalData.isAuthenticated && finalData.user) {
                  setUser(finalData.user);
                  setIsAuthenticated(true);
                  return true;
                }
              }
            }
          } catch (emergencyError) {
            console.error("Emergency session creation failed:", emergencyError);
          }
        }
        
        // Reset auth state if not authenticated after all retries
        setUser(null);
        setIsAuthenticated(false);
        return false;
      }
    } catch (error) {
      console.error('Session check error:', error);
      setUser(null);
      setIsAuthenticated(false);
      return false;
    }
    // Remove the finally block - we handle setting isLoading in the caller
  };

  const loginImpl = async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      console.log("Attempting login for user:", username);
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      
      if (!response.ok) {
        console.warn(`Login failed with status: ${response.status}`);
        setUser(null);
        setIsAuthenticated(false);
        return false;
      }
      
      const data = await response.json();
      console.log("Login response:", data);

      if (data.success && data.user) {
        setUser(data.user);
        setIsAuthenticated(true);
        return true;
      } else {
        console.warn("Login returned success: false or no user data");
        setUser(null);
        setIsAuthenticated(false);
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      setUser(null);
      setIsAuthenticated(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add the onLoginSuccess method to the login function
  const login = Object.assign(
    loginImpl,
    {
      onLoginSuccess: (userData: AuthUser) => {
        console.log("Manual login success, setting user data:", userData);
        setUser(userData);
        setIsAuthenticated(true);
      }
    }
  );

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      console.log("Attempting logout");
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.warn(`Logout failed with status: ${response.status}`);
        toast({
          title: 'Logout error',
          description: 'Server error during logout. Please try again.',
          variant: 'destructive',
        });
        return;
      }
      
      const data = await response.json();
      console.log("Logout response:", data);

      // Clear user data regardless of server response
      setUser(null);
      setIsAuthenticated(false);
      
      toast({
        title: 'Logout successful',
        description: 'You have been logged out',
      });
    } catch (error) {
      console.error('Logout error:', error);
      
      // Clear user data even if there's an error
      setUser(null);
      setIsAuthenticated(false);
      
      toast({
        title: 'Logout error',
        description: 'Could not communicate with server, but you have been logged out locally.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      console.log("Attempting registration for user:", userData.email, "with organization:", userData.organizationName);
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      if (!response.ok) {
        console.warn(`Registration failed with status: ${response.status}`);
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        toast({
          title: 'Registration failed',
          description: errorData.message || 'Could not create account',
          variant: 'destructive',
        });
        // Make sure auth state is cleared
        setUser(null);
        setIsAuthenticated(false);
        return false;
      }
      
      const data = await response.json();
      console.log("Registration response:", data);

      if (data.success && data.user) {
        setUser(data.user);
        setIsAuthenticated(true);
        toast({
          title: 'Registration successful',
          description: 'Your account has been created',
        });
        return true;
      } else {
        // Make sure auth state is cleared
        setUser(null);
        setIsAuthenticated(false);
        toast({
          title: 'Registration failed',
          description: data.message || 'Could not create account',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Registration error:', error);
      // Make sure auth state is cleared
      setUser(null);
      setIsAuthenticated(false);
      toast({
        title: 'Registration error',
        description: 'Could not connect to the server. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue: AuthContextType = {
    user,
    isAuthenticated,
    isLoading: isLoading || !sessionChecked, // Prevent UI flash by considering loading until session is checked
    login,
    logout,
    register,
    checkSession,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};