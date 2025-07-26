import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { hasPermission, canAccessRoute, ResourceType, ActionType } from '../lib/permissions';

/**
 * Custom hook for role-based navigation and UI control
 * 
 * This hook provides utilities for controlling navigation and UI elements
 * based on the current user's role and permissions.
 */
export function useRoleBasedNavigation() {
  const { user, isAuthenticated } = useAuth();

  const roleConfig = useMemo(() => {
    if (!isAuthenticated || !user) {
      return {
        role: null,
        isSystemAdmin: false,
        isOrgAdmin: false,
        isManager: false,
        isOfficeStaff: false,
        isTechnician: false,
        isClient: false,
        canAccessAdminFeatures: false,
        canManageUsers: false,
        canViewReports: false,
        canManageInventory: false,
        defaultRoute: '/login'
      };
    }

    const role = user.role;
    const isSystemAdmin = role === 'system_admin';
    const isOrgAdmin = role === 'org_admin' || role === 'admin';
    const isManager = role === 'manager';
    const isOfficeStaff = role === 'office_staff';
    const isTechnician = role === 'technician';
    const isClient = role === 'client';

    return {
      role,
      isSystemAdmin,
      isOrgAdmin,
      isManager,
      isOfficeStaff,
      isTechnician,
      isClient,
      canAccessAdminFeatures: isSystemAdmin || isOrgAdmin,
      canManageUsers: hasPermission(role, 'users', 'create'),
      canViewReports: hasPermission(role, 'reports', 'view'),
      canManageInventory: hasPermission(role, 'inventory', 'edit'),
      defaultRoute: getDefaultRoute(role)
    };
  }, [user, isAuthenticated]);

  /**
   * Check if user has permission for a specific resource and action
   */
  const checkPermission = (resource: ResourceType, action: ActionType): boolean => {
    if (!user) return false;
    return hasPermission(user.role, resource, action);
  };

  /**
   * Check if user can access a specific route
   */
  const canAccess = (permissions: Array<[ResourceType, ActionType]>): boolean => {
    if (!user) return false;
    return canAccessRoute(user, permissions);
  };

  /**
   * Get allowed navigation items based on user role
   */
  const getNavigationItems = () => {
    const { role } = roleConfig;
    
    if (!role) return [];

    const baseItems = [
      {
        label: 'Dashboard',
        href: getDashboardRoute(role),
        show: true
      }
    ];

    if (roleConfig.isSystemAdmin || roleConfig.isOrgAdmin) {
      return [
        ...baseItems,
        {
          label: 'Users',
          href: '/users',
          show: roleConfig.canManageUsers
        },
        {
          label: 'Clients',
          href: '/clients',
          show: checkPermission('clients', 'view')
        },
        {
          label: 'Technicians',
          href: '/technicians',
          show: checkPermission('technicians', 'view')
        },
        {
          label: 'Projects',
          href: '/projects',
          show: checkPermission('projects', 'view')
        },
        {
          label: 'Reports',
          href: '/reports',
          show: roleConfig.canViewReports
        },
        {
          label: 'Settings',
          href: '/settings',
          show: checkPermission('settings', 'view')
        }
      ];
    }

    if (roleConfig.isManager) {
      return [
        ...baseItems,
        {
          label: 'Team',
          href: '/team',
          show: checkPermission('users', 'view')
        },
        {
          label: 'Projects',
          href: '/projects',
          show: checkPermission('projects', 'view')
        },
        {
          label: 'Clients',
          href: '/clients',
          show: checkPermission('clients', 'view')
        },
        {
          label: 'Reports',
          href: '/reports',
          show: roleConfig.canViewReports
        },
        {
          label: 'Inventory',
          href: '/inventory',
          show: roleConfig.canManageInventory
        }
      ];
    }

    if (roleConfig.isOfficeStaff) {
      return [
        ...baseItems,
        {
          label: 'Clients',
          href: '/clients',
          show: checkPermission('clients', 'view')
        },
        {
          label: 'Scheduling',
          href: '/scheduling',
          show: checkPermission('maintenance', 'create')
        },
        {
          label: 'Communications',
          href: '/communications',
          show: checkPermission('communications', 'view')
        },
        {
          label: 'Invoicing',
          href: '/invoices',
          show: checkPermission('invoices', 'view')
        }
      ];
    }

    if (roleConfig.isTechnician) {
      return [
        ...baseItems,
        {
          label: 'My Schedule',
          href: '/technician/schedule',
          show: true
        },
        {
          label: 'Maintenance',
          href: '/maintenance',
          show: checkPermission('maintenance', 'view')
        },
        {
          label: 'Repairs',
          href: '/repairs',
          show: checkPermission('repairs', 'view')
        },
        {
          label: 'Inventory',
          href: '/inventory',
          show: checkPermission('inventory', 'view')
        },
        {
          label: 'Clients',
          href: '/clients',
          show: checkPermission('clients', 'view')
        }
      ];
    }

    if (roleConfig.isClient) {
      return [
        {
          label: 'My Pool',
          href: '/client-portal',
          show: true
        },
        {
          label: 'Service History',
          href: '/client/history',
          show: true
        },
        {
          label: 'Schedule',
          href: '/client/schedule',
          show: true
        },
        {
          label: 'Messages',
          href: '/client/messages',
          show: true
        },
        {
          label: 'Billing',
          href: '/client/billing',
          show: true
        }
      ];
    }

    return baseItems;
  };

  /**
   * Get contextual quick actions based on user role
   */
  const getQuickActions = () => {
    const { role } = roleConfig;
    
    if (!role) return [];

    if (roleConfig.isSystemAdmin || roleConfig.isOrgAdmin || roleConfig.isManager) {
      return [
        {
          label: 'Add Client',
          href: '/clients/new',
          show: checkPermission('clients', 'create')
        },
        {
          label: 'Create Project',
          href: '/projects/new',
          show: checkPermission('projects', 'create')
        },
        {
          label: 'Schedule Maintenance',
          href: '/maintenance/new',
          show: checkPermission('maintenance', 'create')
        }
      ];
    }

    if (roleConfig.isOfficeStaff) {
      return [
        {
          label: 'Add Client',
          href: '/clients/new',
          show: checkPermission('clients', 'create')
        },
        {
          label: 'Schedule Service',
          href: '/scheduling/new',
          show: checkPermission('maintenance', 'create')
        },
        {
          label: 'Send Message',
          href: '/communications/new',
          show: checkPermission('communications', 'create')
        }
      ];
    }

    if (roleConfig.isTechnician) {
      return [
        {
          label: 'Start Route',
          href: '/technician/routes/start',
          show: true
        },
        {
          label: 'Report Issue',
          href: '/repairs/new',
          show: checkPermission('repairs', 'create')
        },
        {
          label: 'Update Inventory',
          href: '/inventory/update',
          show: checkPermission('inventory', 'edit')
        }
      ];
    }

    if (roleConfig.isClient) {
      return [
        {
          label: 'Request Service',
          href: '/client/requests/new',
          show: checkPermission('repairs', 'create')
        },
        {
          label: 'Contact Team',
          href: '/client/messages/new',
          show: checkPermission('communications', 'create')
        },
        {
          label: 'View Photos',
          href: '/client/photos',
          show: true
        }
      ];
    }

    return [];
  };

  return {
    ...roleConfig,
    checkPermission,
    canAccess,
    getNavigationItems,
    getQuickActions,
    user
  };
}

/**
 * Get the default dashboard route for a user role
 */
function getDashboardRoute(role: string): string {
  switch (role) {
    case 'system_admin':
    case 'org_admin':
    case 'admin':
      return '/admin/dashboard';
    case 'manager':
      return '/manager/dashboard';
    case 'office_staff':
      return '/office/dashboard';
    case 'technician':
      return '/technician/dashboard';
    case 'client':
      return '/client-portal';
    default:
      return '/dashboard';
  }
}

/**
 * Get the default route after login for a user role
 */
function getDefaultRoute(role: string): string {
  return getDashboardRoute(role);
}

export default useRoleBasedNavigation;