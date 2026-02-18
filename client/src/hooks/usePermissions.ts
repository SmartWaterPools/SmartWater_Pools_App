import { useAuth } from "@/contexts/AuthContext";

type ResourceType =
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

type ActionType = 'view' | 'create' | 'edit' | 'delete';

const permissionsByRole: Record<string, Record<ResourceType, Record<ActionType, boolean>>> = {
  system_admin: {
    clients: { view: true, create: true, edit: true, delete: true },
    technicians: { view: true, create: true, edit: true, delete: true },
    projects: { view: true, create: true, edit: true, delete: true },
    maintenance: { view: true, create: true, edit: true, delete: true },
    repairs: { view: true, create: true, edit: true, delete: true },
    invoices: { view: true, create: true, edit: true, delete: true },
    inventory: { view: true, create: true, edit: true, delete: true },
    reports: { view: true, create: true, edit: true, delete: true },
    settings: { view: true, create: true, edit: true, delete: true },
    vehicles: { view: true, create: true, edit: true, delete: true },
    communications: { view: true, create: true, edit: true, delete: true },
    users: { view: true, create: true, edit: true, delete: true },
    organization: { view: true, create: true, edit: true, delete: true },
  },
  admin: {
    clients: { view: true, create: true, edit: true, delete: true },
    technicians: { view: true, create: true, edit: true, delete: true },
    projects: { view: true, create: true, edit: true, delete: true },
    maintenance: { view: true, create: true, edit: true, delete: true },
    repairs: { view: true, create: true, edit: true, delete: true },
    invoices: { view: true, create: true, edit: true, delete: true },
    inventory: { view: true, create: true, edit: true, delete: true },
    reports: { view: true, create: true, edit: true, delete: true },
    settings: { view: true, create: true, edit: true, delete: true },
    vehicles: { view: true, create: true, edit: true, delete: true },
    communications: { view: true, create: true, edit: true, delete: true },
    users: { view: true, create: true, edit: true, delete: true },
    organization: { view: true, create: false, edit: true, delete: false },
  },
  org_admin: {
    clients: { view: true, create: true, edit: true, delete: true },
    technicians: { view: true, create: true, edit: true, delete: true },
    projects: { view: true, create: true, edit: true, delete: true },
    maintenance: { view: true, create: true, edit: true, delete: true },
    repairs: { view: true, create: true, edit: true, delete: true },
    invoices: { view: true, create: true, edit: true, delete: true },
    inventory: { view: true, create: true, edit: true, delete: true },
    reports: { view: true, create: true, edit: true, delete: true },
    settings: { view: true, create: true, edit: true, delete: true },
    vehicles: { view: true, create: true, edit: true, delete: true },
    communications: { view: true, create: true, edit: true, delete: true },
    users: { view: true, create: true, edit: true, delete: true },
    organization: { view: true, create: false, edit: true, delete: false },
  },
  manager: {
    clients: { view: true, create: true, edit: true, delete: true },
    technicians: { view: true, create: true, edit: true, delete: false },
    projects: { view: true, create: true, edit: true, delete: true },
    maintenance: { view: true, create: true, edit: true, delete: true },
    repairs: { view: true, create: true, edit: true, delete: true },
    invoices: { view: true, create: true, edit: true, delete: false },
    inventory: { view: true, create: true, edit: true, delete: true },
    reports: { view: true, create: true, edit: true, delete: true },
    settings: { view: true, create: false, edit: true, delete: false },
    vehicles: { view: true, create: true, edit: true, delete: false },
    communications: { view: true, create: true, edit: true, delete: true },
    users: { view: true, create: true, edit: true, delete: false },
    organization: { view: true, create: false, edit: false, delete: false },
  },
  office_staff: {
    clients: { view: true, create: true, edit: true, delete: false },
    technicians: { view: true, create: false, edit: false, delete: false },
    projects: { view: true, create: true, edit: true, delete: false },
    maintenance: { view: true, create: true, edit: true, delete: false },
    repairs: { view: true, create: true, edit: true, delete: false },
    invoices: { view: true, create: true, edit: true, delete: false },
    inventory: { view: true, create: true, edit: true, delete: false },
    reports: { view: true, create: true, edit: true, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
    vehicles: { view: true, create: false, edit: false, delete: false },
    communications: { view: true, create: true, edit: true, delete: false },
    users: { view: true, create: false, edit: false, delete: false },
    organization: { view: true, create: false, edit: false, delete: false },
  },
  technician: {
    clients: { view: true, create: false, edit: false, delete: false },
    technicians: { view: true, create: false, edit: false, delete: false },
    projects: { view: true, create: false, edit: true, delete: false },
    maintenance: { view: true, create: true, edit: true, delete: false },
    repairs: { view: true, create: true, edit: true, delete: false },
    invoices: { view: true, create: false, edit: false, delete: false },
    inventory: { view: true, create: false, edit: true, delete: false },
    reports: { view: true, create: true, edit: true, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
    vehicles: { view: true, create: false, edit: false, delete: false },
    communications: { view: true, create: true, edit: false, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    organization: { view: false, create: false, edit: false, delete: false },
  },
  client: {
    clients: { view: false, create: false, edit: false, delete: false },
    technicians: { view: false, create: false, edit: false, delete: false },
    projects: { view: true, create: false, edit: false, delete: false },
    maintenance: { view: true, create: false, edit: false, delete: false },
    repairs: { view: true, create: true, edit: false, delete: false },
    invoices: { view: true, create: false, edit: false, delete: false },
    inventory: { view: false, create: false, edit: false, delete: false },
    reports: { view: true, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
    vehicles: { view: false, create: false, edit: false, delete: false },
    communications: { view: true, create: true, edit: false, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    organization: { view: false, create: false, edit: false, delete: false },
  },
  vendor: {
    clients: { view: false, create: false, edit: false, delete: false },
    technicians: { view: false, create: false, edit: false, delete: false },
    projects: { view: false, create: false, edit: false, delete: false },
    maintenance: { view: false, create: false, edit: false, delete: false },
    repairs: { view: false, create: false, edit: false, delete: false },
    invoices: { view: true, create: false, edit: false, delete: false },
    inventory: { view: false, create: false, edit: false, delete: false },
    reports: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
    vehicles: { view: false, create: false, edit: false, delete: false },
    communications: { view: true, create: true, edit: false, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    organization: { view: false, create: false, edit: false, delete: false },
  },
};

export function usePermissions() {
  const { user } = useAuth();
  const role = user?.role || 'client';

  const hasPermission = (resource: ResourceType, action: ActionType): boolean => {
    const rolePerms = permissionsByRole[role];
    if (!rolePerms) return false;
    return rolePerms[resource]?.[action] || false;
  };

  const canView = (resource: ResourceType): boolean => hasPermission(resource, 'view');
  const canCreate = (resource: ResourceType): boolean => hasPermission(resource, 'create');
  const canEdit = (resource: ResourceType): boolean => hasPermission(resource, 'edit');
  const canDelete = (resource: ResourceType): boolean => hasPermission(resource, 'delete');

  return { hasPermission, canView, canCreate, canEdit, canDelete, role };
}
