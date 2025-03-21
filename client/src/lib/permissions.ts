/**
 * Client-side permission utilities for role-based access control
 * 
 * This module mirrors the server-side permission system to provide consistent
 * access control across the application.
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
  | 'admin';          // Legacy role, treated as org_admin

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
  role: UserRole | undefined | null,
  resource: ResourceType,
  action: ActionType
): boolean {
  if (!role) return false;
  
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
 * Check if user can access a specific route based on permissions
 */
export function canAccessRoute(user: any, requiredPermissions: Array<[ResourceType, ActionType]>): boolean {
  if (!user || !user.role) {
    return false;
  }
  
  // If no specific permissions are required, allow access
  if (!requiredPermissions || requiredPermissions.length === 0) {
    return true;
  }
  
  // System admin and admin can access everything
  if (user.role === 'system_admin' || user.role === 'admin') {
    return true;
  }
  
  // Check each required permission
  return requiredPermissions.every(([resource, action]) => 
    hasPermission(user.role as UserRole, resource, action)
  );
}