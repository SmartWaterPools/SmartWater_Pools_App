import React, { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ResourceType, ActionType, hasPermission, UserRole } from '../lib/permissions';

interface PermissionGateProps {
  children: ReactNode;
  resource: ResourceType;
  action: ActionType;
  fallback?: ReactNode; // Optional component to render if permission is denied
}

/**
 * A component that conditionally renders its children based on user permissions
 * 
 * Example usage:
 * <PermissionGate resource="clients" action="edit">
 *   <ClientEditForm />
 * </PermissionGate>
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({ 
  children, 
  resource, 
  action,
  fallback = null
}) => {
  const { user } = useAuth();
  
  // If no user is logged in, don't render anything
  if (!user) {
    return null;
  }
  
  // Check if the current user has permission for this resource and action
  const allowed = hasPermission(user.role as UserRole, resource, action);
  
  // Render children only if the user has permission
  if (allowed) {
    return <>{children}</>;
  }
  
  // Otherwise, render the fallback component
  return <>{fallback}</>;
};

interface PermissionButtonProps {
  children: ReactNode;
  resource: ResourceType;
  action: ActionType;
  onClick?: () => void;
  className?: string;
  [prop: string]: any; // Allow other button props to be passed through
}

/**
 * A button that is disabled if the user doesn't have permission
 * 
 * Example usage:
 * <PermissionButton resource="clients" action="create" onClick={handleCreate}>
 *   Create Client
 * </PermissionButton>
 */
export const PermissionButton: React.FC<PermissionButtonProps> = ({ 
  children, 
  resource, 
  action, 
  onClick,
  className = "",
  ...props 
}) => {
  const { user } = useAuth();
  
  // Check if the current user has permission for this resource and action
  const allowed = user ? hasPermission(user.role as UserRole, resource, action) : false;
  
  // Button is disabled if the user doesn't have permission
  return (
    <button 
      onClick={allowed ? onClick : undefined}
      disabled={!allowed}
      className={`${className} ${!allowed ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={!allowed ? `You don't have permission to ${action} ${resource}` : ''}
      {...props}
    >
      {children}
    </button>
  );
};

export default PermissionGate;