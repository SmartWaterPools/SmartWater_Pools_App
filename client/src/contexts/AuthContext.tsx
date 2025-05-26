import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from "@/hooks/use-toast";
import { User } from "@shared/schema";

// Simplified AuthUser type without password field
type AuthUser = Omit<User, 'password'>;

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  register: (userData: any) => Promise<boolean>;
  googleLogin: () => Promise<void>;
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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sessionCheckAttempts, setSessionCheckAttempts] = useState<number>(0);
  const [lastCheckTime, setLastCheckTime] = useState<number>(0);
  const { toast } = useToast();

  // Check session when the component mounts
  useEffect(() => {
    console.log("Auth provider initialized, checking session");
    
    // Set initial loading state
    setIsLoading(true);
    
    // Set a timeout to make sure loading state isn't stuck
    const loadingTimeout = setTimeout(() => {
      if (isLoading) {
        console.log("Auth context timeout reached, forcing loading state to false");
        setIsLoading(false);
      }
    }, 3000);
    
    checkSession().then(authenticated => {
      console.log("Initial session check complete:", authenticated ? "Authenticated" : "Not authenticated");
    }).catch(error => {
      console.error("Error during initial session check:", error);
      // Make sure to set loading to false if there's an error
      setIsLoading(false);
    });
    
    // Cleanup the timeout
    return () => clearTimeout(loadingTimeout);
  }, []);

  const checkSession = async (): Promise<boolean> => {
    try {
      // Prevent too many rapid checks that could cause an infinite loop
      const now = Date.now();
      const timeSinceLastCheck = now - lastCheckTime;
      
      // Skip this check if it's happening too quickly after the last one
      if (timeSinceLastCheck < 500 && sessionCheckAttempts > 3) {
        console.warn(`Too many session checks in rapid succession (${sessionCheckAttempts} attempts in ${timeSinceLastCheck}ms), skipping to prevent loop`);
        // Continue showing the last known authentication state
        return isAuthenticated;
      }
      
      // Update session check tracking info
      setSessionCheckAttempts(prev => prev + 1);
      setLastCheckTime(now);
      
      setIsLoading(true);
      console.log(`Checking session... (attempt ${sessionCheckAttempts + 1})`);
      
      // Set a timeout for this fetch to avoid hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn('Session check request timeout - aborting');
        controller.abort();
      }, 2500);
      
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        },
        signal: controller.signal
      });
      
      // Clear the timeout
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.warn(`Session check failed with status: ${response.status}`);
        setUser(null);
        setIsAuthenticated(false);
        
        // Reset attempts counter after a failed session check
        if (sessionCheckAttempts > 5) {
          console.warn("Too many failed session checks, resetting counter");
          setSessionCheckAttempts(0);
        }
        
        return false;
      }
      
      const data = await response.json();
      console.log("Session response:", data);

      if (data.isAuthenticated && data.user) {
        console.log("Session contains authenticated user:", data.user.email);
        setUser(data.user);
        setIsAuthenticated(true);
        
        // Reset attempts counter after a successful session check
        setSessionCheckAttempts(0);
        
        return true;
      } else {
        console.log("Not authenticated");
        setUser(null);
        setIsAuthenticated(false);
        
        // Increment failed auth check counter to help detect auth loops
        if (sessionCheckAttempts > 5) {
          console.warn("Too many failed session checks, resetting counter");
          setSessionCheckAttempts(0);
        }
        
        return false;
      }
    } catch (error) {
      console.error('Session check error:', error);
      setUser(null);
      setIsAuthenticated(false);
      
      // Reset attempts counter after a session check error
      if (sessionCheckAttempts > 5) {
        console.warn("Too many failed session checks, resetting counter");
        setSessionCheckAttempts(0);
      }
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
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
        return false;
      }
      
      const data = await response.json();
      console.log("Login response:", data);

      if (data.success && data.user) {
        setUser(data.user);
        setIsAuthenticated(true);
        return true;
      } else {
        console.warn("Login failed");
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = async () => {
    try {
      console.log("Preparing for Google OAuth login");
      
      // Generate a client-side state token to use as our fallback
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 10);
      const clientState = `client_${timestamp}_${randomString}`;
      
      // Save this in localStorage first as insurance in case of redirect issues
      localStorage.setItem('oauth_client_state', clientState);
      localStorage.setItem('oauth_timestamp', timestamp.toString());
      
      // Step 1: Clear any existing OAuth state from previous attempts
      try {
        console.log("Clearing previous OAuth state");
        const clearResponse = await fetch('/api/auth/clear-oauth-state', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          // Set a timeout to avoid hanging
          signal: AbortSignal.timeout(5000)
        });
        
        if (clearResponse.ok) {
          const clearData = await clearResponse.json();
          console.log("OAuth state cleared:", clearData.message);
        } else {
          console.warn("Failed to clear OAuth state (HTTP error):", clearResponse.status);
        }
      } catch (clearErr: unknown) {
        // Check if it's an AbortError (timeout)
        if (clearErr && typeof clearErr === 'object' && 'name' in clearErr) {
          const error = clearErr as { name: string };
          if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            console.warn("Timeout while clearing OAuth state");
          } else {
            console.warn("Error in OAuth state clearing:", error);
          }
        } else {
          console.warn("Unknown error in OAuth state clearing");
        }
        // Continue even if clearing fails
      }
      
      // Step 2: Try to prepare OAuth session with server (with timeout protection)
      let serverState = null;
      let useServerState = false;
      
      try {
        console.log("Preparing OAuth session with server");
        const prepResponse = await fetch('/api/auth/prepare-oauth', {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate'
          },
          // Set a timeout to avoid hanging
          signal: AbortSignal.timeout(5000)
        });
        
        if (prepResponse.ok) {
          const data = await prepResponse.json();
          if (data.success && data.state) {
            console.log("Server prepared OAuth session successfully");
            serverState = data.state;
            useServerState = true;
            
            // Store server state in localStorage as backup
            localStorage.setItem('oauth_server_state', serverState);
          } else {
            console.warn("Server returned success=false for OAuth preparation:", data.message);
          }
        } else {
          console.warn("OAuth preparation endpoint returned error:", prepResponse.status);
        }
      } catch (prepErr: unknown) {
        // Check if it's an AbortError (timeout)
        if (prepErr && typeof prepErr === 'object' && 'name' in prepErr) {
          const error = prepErr as { name: string };
          if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            console.warn("Timeout while preparing OAuth session");
          } else {
            console.error("Error preparing OAuth with server:", error);
          }
        } else {
          console.error("Unknown error preparing OAuth with server");
        }
      }
      
      // Step 3: Determine which state to use and redirect
      if (useServerState && serverState) {
        console.log("Using server-generated state for OAuth:", serverState);
        
        // Add a query param to track OAuth source
        const redirectUrl = `/api/auth/google?state=${serverState}&prompt=select_account&source=server`;
        
        // Also store this in cookies in case localStorage gets cleared
        document.cookie = `oauth_token=${serverState}; path=/; max-age=900; SameSite=Lax`;
        document.cookie = `oauth_source=server; path=/; max-age=900; SameSite=Lax`;
        
        window.location.href = redirectUrl;
      } else {
        console.log("Using client-generated state for OAuth:", clientState);
        
        // Add a query param to track OAuth source
        const redirectUrl = `/api/auth/google?state=${clientState}&prompt=select_account&source=client`;
        
        // Also store this in cookies in case localStorage gets cleared
        document.cookie = `oauth_token=${clientState}; path=/; max-age=900; SameSite=Lax`;
        document.cookie = `oauth_source=client; path=/; max-age=900; SameSite=Lax`;
        
        window.location.href = redirectUrl;
      }
    } catch (error) {
      console.error("Fatal error in Google OAuth preparation:", error);
      
      try {
        // Attempt to create a safe fallback state
        const emergencyState = `emergency_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        
        // Store the emergency state in multiple places
        localStorage.setItem('oauth_emergency_state', emergencyState);
        document.cookie = `oauth_token=${emergencyState}; path=/; max-age=900; SameSite=Lax`;
        document.cookie = `oauth_source=emergency; path=/; max-age=900; SameSite=Lax`;
        
        // Last resort fallback with emergency state
        console.warn("Using emergency fallback for Google OAuth");
        window.location.href = `/api/auth/google?state=${emergencyState}&prompt=select_account&source=emergency`;
      } catch (e) {
        // If even that fails, go with absolute minimal params
        console.error("Emergency fallback failed, using minimal OAuth redirect");
        window.location.href = '/api/auth/google?prompt=select_account';
      }
    }
  };

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
      
      // Clear user data
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

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    register,
    googleLogin,
    checkSession
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};