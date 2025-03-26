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
  // Additional protection against race condition - when true, we've confirmed auth and are allowed to render
  const [renderConfirmed, setRenderConfirmed] = useState<boolean>(false);
  // Add another local loading state to delay showing content
  const [localLoading, setLocalLoading] = useState<boolean>(true);

  useEffect(() => {
    console.log("ProtectedRoute: Auth state changed", { isAuthenticated, isLoading, hasUser: !!user, location });
    
    // Reset render confirmation whenever auth state changes
    setRenderConfirmed(false);
    
    // Add a slight delay to prevent flashing content
    const localLoadingTimeout = setTimeout(() => {
      setLocalLoading(false);
    }, 100);

    // Only proceed with auth check if loading is complete
    if (!isLoading) {
      // Not authenticated - redirect to login
      if (!isAuthenticated) {
        console.log("ProtectedRoute: Not authenticated, redirecting to login");
        navigate(`/login?redirect=${encodeURIComponent(location)}`);
        return;
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
          return;
        }
        
        // If we reached here, user is authenticated and authorized - confirm rendering
        console.log("ProtectedRoute: Auth confirmed, rendering content");
        setRenderConfirmed(true);
      }
    }
    
    return () => clearTimeout(localLoadingTimeout);
  }, [isLoading, isAuthenticated, user, roles, permissions, navigate, location]);

  // Show loading spinner while checking authentication or during local loading delay
  if (isLoading || localLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Only render content if authentication is confirmed AND we've confirmed we can render
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