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
  const { toast } = useToast();

  // Check if the user is authenticated on component mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await apiRequest('/api/auth/session', 'GET');

      if (response.isAuthenticated && response.user) {
        setUser(response.user);
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
      const response = await apiRequest('/api/auth/login', 'POST', { username, password });

      if (response.success && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        toast({
          title: 'Login successful',
          description: 'Welcome back!',
        });
        return true;
      } else {
        toast({
          title: 'Login failed',
          description: response.message || 'Invalid username or password',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Login error',
        description: 'Could not connect to the server. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await apiRequest('/api/auth/logout', 'POST');

      setUser(null);
      setIsAuthenticated(false);
      toast({
        title: 'Logout successful',
        description: 'You have been logged out',
      });
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: 'Logout error',
        description: 'Could not complete logout. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await apiRequest('/api/auth/register', 'POST', userData);

      if (response.success && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
        toast({
          title: 'Registration successful',
          description: 'Your account has been created',
        });
        return true;
      } else {
        toast({
          title: 'Registration failed',
          description: response.message || 'Could not create account',
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
    isLoading,
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