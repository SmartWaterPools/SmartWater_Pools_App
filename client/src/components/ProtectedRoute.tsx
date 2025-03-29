import React, { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { ResourceType, ActionType, canAccessRoute } from '../lib/permissions';

interface ProtectedRouteProps {
  children: ReactNode;
  roles?: string[]; // Legacy: array of roles allowed to access this route
  permissions?: Array<[ResourceType, ActionType]>; // New: required permissions to access this route
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  roles = [],
  permissions = [] 
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const [, navigate] = useLocation();
  const [location] = useLocation();

  // Track the number of redirects to prevent loops
  const [redirectCount, setRedirectCount] = useState<number>(0);
  const [lastRedirectTime, setLastRedirectTime] = useState<number>(0);
  
  // Simple effect to check authentication status and redirect if needed
  useEffect(() => {
    // Skip auth check during loading
    if (isLoading) {
      return;
    }
    
    // Prevent redirect loops
    const now = Date.now();
    const timeSinceLastRedirect = now - lastRedirectTime;
    
    // If we've redirected too many times in a short period, stop redirecting
    const isTooManyRedirects = redirectCount > 3 && timeSinceLastRedirect < 5000;
    
    // We are no longer redirecting to the login page since login is directly integrated into the dashboard
    if (!isAuthenticated) {
      // Log for debug purposes but don't redirect
      console.log("ProtectedRoute: Not authenticated, allowing access to the route to show login card");
      // Simply return, allowing the main app to render the appropriate component with login card
      return;
    }
    
    // Reset redirect counter when authenticated
    if (isAuthenticated && redirectCount > 0) {
      setRedirectCount(0);
    }

    // Check permissions if user is authenticated
    if (isAuthenticated && user) {
      let accessDenied = false;
      
      // First check permissions if specified (new permission system)
      if (permissions.length > 0) {
        if (!canAccessRoute(user, permissions)) {
          accessDenied = true;
          console.warn(`Access denied for user ${user.username} (ID: ${user.id}) with role ${user.role} - required permissions:`, 
            permissions.map(([resource, action]) => `${action} ${resource}`).join(', '));
        }
      }
      // Fall back to legacy role-based check if no permissions are specified but roles are
      else if (roles.length > 0 && !roles.includes(user.role)) {
        accessDenied = true;
        console.warn(`Access denied for user ${user.username} (ID: ${user.id}) with role ${user.role} - required roles:`, roles);
      }
      
      // If access was denied, redirect to unauthorized page
      if (accessDenied) {
        navigate('/unauthorized');
      }
    }
    
    console.log("ProtectedRoute: Auth state changed", { 
      isAuthenticated, 
      isLoading, 
      hasUser: !!user, 
      location, 
      isOAuthRoute: false 
    });
  }, [isLoading, isAuthenticated, user, location, navigate, permissions, roles]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Show content if authenticated and authorized
  if (isAuthenticated && user) {
    // Check if user has required role or permissions
    const hasRequiredRole = roles.length === 0 || roles.includes(user.role);
    const hasRequiredPermissions = permissions.length === 0 || canAccessRoute(user, permissions);
    
    if (hasRequiredRole && hasRequiredPermissions) {
      // If we're on the root path and authenticated, redirect to dashboard
      if (location === '/' || location === '') {
        console.log("ProtectedRoute: On root path and authenticated, redirecting to dashboard");
        navigate('/dashboard');
        return <Loader2 className="h-12 w-12 animate-spin text-primary" />;
      }
      
      // If we already have /dashboard in the URL and it's showing not found, try refreshing the page
      if (location === '/dashboard' && document.querySelector('[data-testid="404-not-found"]')) {
        console.log("ProtectedRoute: Found 404 on dashboard page, refreshing");
        window.location.reload();
        return <Loader2 className="h-12 w-12 animate-spin text-primary" />;
      }
      
      return <>{children}</>;
    }
  }

  // For our new approach, we always render children and let the components handle authentication state
  // This allows showing the login card on the Dashboard when not authenticated
  return <>{children}</>;
};

export default ProtectedRoute;