import React, { ReactNode, useEffect, useState, useCallback } from 'react';
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
  // Additional protection against race condition - when true, we've confirmed auth and are allowed to render
  const [renderConfirmed, setRenderConfirmed] = useState<boolean>(false);
  // Add another local loading state to delay showing content
  const [localLoading, setLocalLoading] = useState<boolean>(true);

  // Function to check if the current route is part of the OAuth callback flow
  const isOAuthCallbackRoute = useCallback(() => {
    return location.includes('/auth/callback') || 
           location.includes('/api/auth/google/callback') || 
           location.includes('/organization-selection');
  }, [location]);

  // Function to perform auth check and navigation
  const checkAuthAndNavigate = useCallback(() => {
    // Don't redirect during OAuth callbacks to prevent interruption of the auth flow
    if (isOAuthCallbackRoute()) {
      console.log("ProtectedRoute: On OAuth callback route, allowing without auth check:", location);
      setRenderConfirmed(true);
      return true;
    }

    // Not authenticated - redirect to login
    if (!isAuthenticated) {
      console.log("ProtectedRoute: Not authenticated, redirecting to login from:", location);
      navigate(`/login?redirect=${encodeURIComponent(location)}`);
      return false;
    }

    // Authenticated with user data
    if (isAuthenticated && user) {
      let accessDenied = false;
      let reason = '';
      
      // First check permissions if specified (new permission system)
      if (permissions.length > 0) {
        if (!canAccessRoute(user, permissions)) {
          accessDenied = true;
          reason = `Permission-based check failed: User has role '${user.role}' but lacks required permissions`;
          console.warn(`Access denied for user ${user.username} (ID: ${user.id}) with role ${user.role} - required permissions:`, 
            permissions.map(([resource, action]) => `${action} ${resource}`).join(', '));
        }
      }
      // Fall back to legacy role-based check if no permissions are specified but roles are
      else if (roles.length > 0 && !roles.includes(user.role)) {
        accessDenied = true;
        reason = `Role-based check failed: User has role '${user.role}' but needs one of: ${roles.join(', ')}`;
        console.warn(`Access denied for user ${user.username} (ID: ${user.id}) with role ${user.role} - required roles:`, roles);
      }
      
      // If access was denied, redirect to unauthorized page
      if (accessDenied) {
        console.error(`Route access denied to ${location}: ${reason}`);
        navigate('/unauthorized');
        return false;
      }
      
      // If we reached here, user is authenticated and authorized - confirm rendering
      console.log("ProtectedRoute: Auth confirmed, rendering content");
      return true;
    }
    
    return false;
  }, [isAuthenticated, user, location, navigate, permissions, roles, isOAuthCallbackRoute]);

  useEffect(() => {
    console.log("ProtectedRoute: Auth state changed", { 
      isAuthenticated, 
      isLoading, 
      hasUser: !!user, 
      location, 
      isOAuthRoute: isOAuthCallbackRoute() 
    });
    
    // Reset render confirmation whenever auth state changes
    setRenderConfirmed(false);
    
    // Add a slight delay to prevent flashing content and give time for auth state to stabilize
    const localLoadingTimeout = setTimeout(() => {
      setLocalLoading(false);
      
      // Only proceed with auth check if loading is complete
      if (!isLoading) {
        const authCheckResult = checkAuthAndNavigate();
        setRenderConfirmed(authCheckResult);
      }
    }, 200); // Slightly longer delay to ensure auth state has settled
    
    // Special handling for potential OAuth callback routes
    if (isOAuthCallbackRoute()) {
      // For OAuth routes, we want to be extra careful not to disrupt the flow
      console.log("ProtectedRoute: Detected OAuth callback route, proceeding with caution");
      
      // For these routes, we allow rendering even if auth check is pending
      // This prevents disruption of the OAuth flow by premature redirects
      setRenderConfirmed(true);
    }
    
    return () => clearTimeout(localLoadingTimeout);
  }, [isLoading, isAuthenticated, user, checkAuthAndNavigate, isOAuthCallbackRoute]);

  // Show loading spinner while checking authentication or during local loading delay
  if (isLoading || localLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Special handling for OAuth callback routes - allow rendering without strict auth checks
  // This is necessary because during OAuth flow there's a period where the user might not
  // be fully authenticated yet (between callback and session establishment)
  if (isOAuthCallbackRoute() && renderConfirmed) {
    console.log("ProtectedRoute: Rendering OAuth callback route without strict auth checks");
    return <>{children}</>;
  }

  // Standard case: render content if authentication is confirmed AND we've confirmed we can render
  if (isAuthenticated && renderConfirmed && user) {
    // Double-check permissions one more time before rendering
    const hasRequiredRole = roles.length === 0 || roles.includes(user.role);
    const hasRequiredPermissions = permissions.length === 0 || canAccessRoute(user, permissions);
    
    if (hasRequiredRole && hasRequiredPermissions) {
      return <>{children}</>;
    }
  }

  // Show temporary loading for any other case
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
};

export default ProtectedRoute;