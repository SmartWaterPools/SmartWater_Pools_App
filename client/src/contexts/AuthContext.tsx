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

  // Check if the user is authenticated on component mount
  useEffect(() => {
    const checkInitialSession = async () => {
      console.log("Performing initial session check...");
      try {
        // Keep isLoading true during the entire session check
        setIsLoading(true);
        await checkSession();
      } catch (error) {
        console.error("Error during initial session check:", error);
        // Make sure auth state is reset on error
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        // Complete the session check and update loading state
        setSessionChecked(true);
        setIsLoading(false);
        console.log("Initial session check completed.");
      }
    };
    
    checkInitialSession();
  }, []);

  const checkSession = async (): Promise<boolean> => {
    try {
      // Don't set isLoading here, it's handled by the parent function
      console.log("Checking session...");
      
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
        
        // Try a second check if session exists but no auth
        if (data.sessionExists && data.sessionID) {
          console.log("Session exists but not authenticated, retrying check once...");
          
          // Small delay before retry
          await new Promise(resolve => setTimeout(resolve, 500));
          
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
            console.log("Session retry response:", retryData);
            
            if (retryData.isAuthenticated && retryData.user) {
              console.log("Session retry: Found authenticated user");
              setUser(retryData.user);
              setIsAuthenticated(true);
              return true;
            }
          }
        }
        
        // Reset auth state if not authenticated
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