import React, { ReactNode, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: string[]; // Optional array of roles that are allowed to access this route
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  roles = [] 
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, navigate] = useLocation();
  const [location] = useLocation();

  useEffect(() => {
    // If not loading and not authenticated, redirect to login
    if (!isLoading && !isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(location)}`);
      return;
    }

    // If authenticated but doesn't have the required role
    if (!isLoading && isAuthenticated && roles.length > 0 && user) {
      if (!roles.includes(user.role)) {
        navigate('/unauthorized');
        return;
      }
    }
  }, [isLoading, isAuthenticated, user, roles, navigate, location]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If authentication check is complete and user is authorized, render children
  if (isAuthenticated && (roles.length === 0 || (user && roles.includes(user.role)))) {
    return <>{children}</>;
  }

  // Return null if redirecting
  return null;
};

export default ProtectedRoute;