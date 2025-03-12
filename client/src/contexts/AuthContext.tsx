import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { User } from "@shared/schema";

type AuthUser = Omit<User, 'password'>;

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
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
      await checkSession();
      setSessionChecked(true);
    };
    
    checkInitialSession();
  }, []);

  const checkSession = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      console.log("Checking session...");
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        }
      });
      
      if (!response.ok) {
        console.warn(`Session check failed with status: ${response.status}`);
        setUser(null);
        setIsAuthenticated(false);
        return false;
      }
      
      const data = await response.json();
      console.log("Session response:", data);

      if (data.isAuthenticated && data.user) {
        setUser(data.user);
        setIsAuthenticated(true);
        return true;
      } else {
        setUser(null);
        setIsAuthenticated(false);
        return false;
      }
    } catch (error) {
      console.error('Session check error:', error);
      setUser(null);
      setIsAuthenticated(false);
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
        console.warn("Login returned success: false or no user data");
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
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
      
      console.log("Attempting registration for user:", userData.username);
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
        toast({
          title: 'Registration failed',
          description: data.message || 'Could not create account',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Registration error:', error);
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