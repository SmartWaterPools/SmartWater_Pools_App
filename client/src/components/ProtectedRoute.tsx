import React, { ReactNode, useEffect } from 'react';
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

  useEffect(() => {
    // If not loading and not authenticated, redirect to login
    if (!isLoading && !isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(location)}`);
      return;
    }

    // If authenticated and user data is loaded
    if (!isLoading && isAuthenticated && user) {
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
    }
  }, [isLoading, isAuthenticated, user, roles, permissions, navigate, location]);

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If authentication check is complete and user is authorized
  if (isAuthenticated) {
    if (user) {
      // Check both role-based and permission-based access
      const hasRequiredRole = roles.length === 0 || roles.includes(user.role);
      const hasRequiredPermissions = permissions.length === 0 || canAccessRoute(user, permissions);
      
      if (hasRequiredRole && hasRequiredPermissions) {
        return <>{children}</>;
      }
    }
    // If no user or unauthorized
    return null;
  }

  // Return null if redirecting
  return null;
};

export default ProtectedRoute;