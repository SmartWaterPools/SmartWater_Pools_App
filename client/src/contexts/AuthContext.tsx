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
  googleLogin: () => void;
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
      console.log("Starting Google OAuth login");
      
      // Simple redirect to Google OAuth without complex state management
      // Let the server handle state generation and management
      window.location.href = '/api/auth/google?prompt=select_account';
    } catch (error) {
      console.error('Google OAuth error:', error);
      toast({
        title: 'Login error',
        description: 'Unable to start Google authentication. Please try again.',
        variant: 'destructive',
      });
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