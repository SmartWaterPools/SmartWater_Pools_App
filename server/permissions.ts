/**
 * Permission Management System
 * 
 * This module implements a granular role-based access control (RBAC) system
 * for the application. It defines permissions for different user roles
 * across various resources and operations.
 */

// Resource types that permissions can be applied to
export type ResourceType = 
  | 'clients'
  | 'technicians' 
  | 'projects'
  | 'maintenance'
  | 'repairs'
  | 'invoices'
  | 'inventory'
  | 'reports'
  | 'settings'
  | 'vehicles'
  | 'communications'
  | 'users'
  | 'organization';

// Actions that can be performed on resources
export type ActionType = 'view' | 'create' | 'edit' | 'delete';

// User roles in the system
export type UserRole = 
  | 'system_admin'    // Can access everything across all organizations
  | 'org_admin'       // Can access everything within their organization
  | 'manager'         // Can manage most things in their organization, but with some restrictions
  | 'office_staff'    // Can handle administrative tasks but not technical operations
  | 'technician'      // Can perform maintenance and repairs
  | 'client'          // Can view their own data and request services
  | 'admin';          // Legacy role, treated same as org_admin

// Role permission mapping
const permissionsByRole: Record<UserRole, Record<ResourceType, Record<ActionType, boolean>>> = {
  // System Admin has all permissions
  system_admin: {
    clients:        { view: true, create: true, edit: true, delete: true },
    technicians:    { view: true, create: true, edit: true, delete: true },
    projects:       { view: true, create: true, edit: true, delete: true },
    maintenance:    { view: true, create: true, edit: true, delete: true },
    repairs:        { view: true, create: true, edit: true, delete: true },
    invoices:       { view: true, create: true, edit: true, delete: true },
    inventory:      { view: true, create: true, edit: true, delete: true },
    reports:        { view: true, create: true, edit: true, delete: true },
    settings:       { view: true, create: true, edit: true, delete: true },
    vehicles:       { view: true, create: true, edit: true, delete: true },
    communications: { view: true, create: true, edit: true, delete: true },
    users:          { view: true, create: true, edit: true, delete: true },
    organization:   { view: true, create: true, edit: true, delete: true },
  },
  
  // For backward compatibility - treat admin same as org_admin
  admin: {
    clients:        { view: true, create: true, edit: true, delete: true },
    technicians:    { view: true, create: true, edit: true, delete: true },
    projects:       { view: true, create: true, edit: true, delete: true },
    maintenance:    { view: true, create: true, edit: true, delete: true },
    repairs:        { view: true, create: true, edit: true, delete: true },
    invoices:       { view: true, create: true, edit: true, delete: true },
    inventory:      { view: true, create: true, edit: true, delete: true },
    reports:        { view: true, create: true, edit: true, delete: true },
    settings:       { view: true, create: true, edit: true, delete: true },
    vehicles:       { view: true, create: true, edit: true, delete: true },
    communications: { view: true, create: true, edit: true, delete: true },
    users:          { view: true, create: true, edit: true, delete: true },
    organization:   { view: true, create: false, edit: true, delete: false },
  },
  
  // Organization Admin has all permissions within their organization
  org_admin: {
    clients:        { view: true, create: true, edit: true, delete: true },
    technicians:    { view: true, create: true, edit: true, delete: true },
    projects:       { view: true, create: true, edit: true, delete: true },
    maintenance:    { view: true, create: true, edit: true, delete: true },
    repairs:        { view: true, create: true, edit: true, delete: true },
    invoices:       { view: true, create: true, edit: true, delete: true },
    inventory:      { view: true, create: true, edit: true, delete: true },
    reports:        { view: true, create: true, edit: true, delete: true },
    settings:       { view: true, create: true, edit: true, delete: true },
    vehicles:       { view: true, create: true, edit: true, delete: true },
    communications: { view: true, create: true, edit: true, delete: true },
    users:          { view: true, create: true, edit: true, delete: true },
    organization:   { view: true, create: false, edit: true, delete: false },
  },
  
  // Manager has broad permissions but can't delete critical resources
  manager: {
    clients:        { view: true, create: true, edit: true, delete: true },
    technicians:    { view: true, create: true, edit: true, delete: false },
    projects:       { view: true, create: true, edit: true, delete: true },
    maintenance:    { view: true, create: true, edit: true, delete: true },
    repairs:        { view: true, create: true, edit: true, delete: true },
    invoices:       { view: true, create: true, edit: true, delete: false },
    inventory:      { view: true, create: true, edit: true, delete: true },
    reports:        { view: true, create: true, edit: true, delete: true },
    settings:       { view: true, create: false, edit: true, delete: false },
    vehicles:       { view: true, create: true, edit: true, delete: false },
    communications: { view: true, create: true, edit: true, delete: true },
    users:          { view: true, create: true, edit: true, delete: false },
    organization:   { view: true, create: false, edit: false, delete: false },
  },
  
  // Office Staff can handle administrative tasks
  office_staff: {
    clients:        { view: true, create: true, edit: true, delete: false },
    technicians:    { view: true, create: false, edit: false, delete: false },
    projects:       { view: true, create: true, edit: true, delete: false },
    maintenance:    { view: true, create: true, edit: true, delete: false },
    repairs:        { view: true, create: true, edit: true, delete: false },
    invoices:       { view: true, create: true, edit: true, delete: false },
    inventory:      { view: true, create: true, edit: true, delete: false },
    reports:        { view: true, create: true, edit: true, delete: false },
    settings:       { view: false, create: false, edit: false, delete: false },
    vehicles:       { view: true, create: false, edit: false, delete: false },
    communications: { view: true, create: true, edit: true, delete: false },
    users:          { view: true, create: false, edit: false, delete: false },
    organization:   { view: true, create: false, edit: false, delete: false },
  },
  
  // Technician can primarily handle maintenance and repairs
  technician: {
    clients:        { view: true, create: false, edit: false, delete: false },
    technicians:    { view: true, create: false, edit: false, delete: false },
    projects:       { view: true, create: false, edit: true, delete: false },
    maintenance:    { view: true, create: true, edit: true, delete: false },
    repairs:        { view: true, create: true, edit: true, delete: false },
    invoices:       { view: true, create: false, edit: false, delete: false },
    inventory:      { view: true, create: false, edit: true, delete: false },
    reports:        { view: true, create: true, edit: true, delete: false },
    settings:       { view: false, create: false, edit: false, delete: false },
    vehicles:       { view: true, create: false, edit: false, delete: false },
    communications: { view: true, create: true, edit: false, delete: false },
    users:          { view: false, create: false, edit: false, delete: false },
    organization:   { view: false, create: false, edit: false, delete: false },
  },
  
  // Client can only see their own data and request services
  client: {
    clients:        { view: true, create: false, edit: true, delete: false }, // Can view and edit their own profile
    technicians:    { view: true, create: false, edit: false, delete: false }, // Can view assigned technicians
    projects:       { view: true, create: false, edit: false, delete: false }, // Can view their own projects
    maintenance:    { view: true, create: false, edit: false, delete: false }, // Can view their maintenance schedule
    repairs:        { view: true, create: true, edit: false, delete: false },  // Can request repairs
    invoices:       { view: true, create: false, edit: false, delete: false }, // Can view their invoices
    inventory:      { view: false, create: false, edit: false, delete: false }, // No inventory access
    reports:        { view: true, create: false, edit: false, delete: false },  // Can view their reports
    settings:       { view: false, create: false, edit: false, delete: false }, // No settings access
    vehicles:       { view: false, create: false, edit: false, delete: false }, // No vehicle access
    communications: { view: true, create: true, edit: false, delete: false },   // Can view and send communications
    users:          { view: false, create: false, edit: false, delete: false }, // No user management
    organization:   { view: false, create: false, edit: false, delete: false }, // No organization access
  },
};

/**
 * Check if a user has permission to perform an action on a resource
 */
export function hasPermission(
  role: UserRole,
  resource: ResourceType,
  action: ActionType
): boolean {
  try {
    // Check if the role exists in our permissions
    if (!permissionsByRole[role]) {
      console.warn(`Unknown role: ${role}`);
      return false;
    }
    
    // Check if the resource exists for this role
    if (!permissionsByRole[role][resource]) {
      console.warn(`Unknown resource: ${resource} for role: ${role}`);
      return false;
    }
    
    // Return the permission setting for this combination
    return permissionsByRole[role][resource][action] || false;
  } catch (error) {
    console.error("Error checking permissions:", error);
    return false; // Fail closed (deny access) on any errors
  }
}

/**
 * Get all permissions for a specific role
 */
export function getRolePermissions(role: UserRole): Record<ResourceType, Record<ActionType, boolean>> {
  return permissionsByRole[role] || {};
}

/**
 * Express middleware to check permission for an action on a resource
 */
export function checkPermission(resource: ResourceType, action: ActionType) {
  return (req: any, res: any, next: any) => {
    // Skip if not authenticated
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    const userRole = req.user.role as UserRole;
    
    // System admins and admins can do anything
    if (userRole === 'system_admin' || userRole === 'admin') {
      return next();
    }
    
    const permitted = hasPermission(userRole, resource, action);
    
    if (permitted) {
      return next();
    } else {
      // Log permission failure for debugging
      console.log(`Permission denied for user ${req.user.id} (${req.user.username}) with role ${userRole}: ${action} ${resource}`);
      
      // If request expects JSON, return 403 status
      if (req.xhr || req.path.startsWith('/api/')) {
        return res.status(403).json({ 
          message: 'Forbidden', 
          details: `You don't have permission to ${action} ${resource}`,
          role: userRole,
          requiredPermission: { resource, action }
        });
      }
      
      // For regular requests, redirect to unauthorized page
      return res.redirect('/unauthorized');
    }
  };
}

/**
 * Check if user owns a resource (e.g., a client viewing their own data)
 * This should be used in addition to checkPermission for client-specific data
 */
export function checkResourceOwnership(req: any, res: any, resourceOwnerId: number | undefined, next: () => void) {
  // Skip check for admin-level roles
  if (['system_admin', 'org_admin', 'admin', 'manager'].includes(req.user.role)) {
    return next();
  }
  
  // For clients, check if they're accessing their own data
  if (req.user.role === 'client' && req.user.id === resourceOwnerId) {
    return next();
  }
  
  // For technicians, additional checks would go here
  // (e.g., if they're assigned to this client/project/maintenance)
  
  // Log ownership check failure
  console.log(`Resource ownership check failed for user ${req.user.id} (${req.user.username}) with role ${req.user.role}: trying to access resource owned by ${resourceOwnerId}`);
  
  // Deny access if ownership check fails
  return res.status(403).json({ 
    message: 'Forbidden', 
    details: 'You can only access your own resources',
    role: req.user.role,
    userId: req.user.id,
    resourceOwnerId: resourceOwnerId
  });
}

// Export default object with all permission functions
export default {
  hasPermission,
  getRolePermissions,
  checkPermission,
  checkResourceOwnership
};