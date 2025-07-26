import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { AdminLayout } from './AdminLayout';
import { ManagerLayout } from './ManagerLayout';
import { OfficeStaffLayout } from './OfficeStaffLayout';
import { TechnicianLayout } from './TechnicianLayout';
import { ClientLayout } from './ClientLayout';
import { DefaultLayout } from './DefaultLayout';

interface RoleBasedLayoutProps {
  children: React.ReactNode;
}

/**
 * Role-Based Layout Component
 * 
 * This component renders different layouts and navigation structures
 * based on the authenticated user's role, providing a tailored
 * experience for each user type in the multi-tenant system.
 */
export const RoleBasedLayout: React.FC<RoleBasedLayoutProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  // If not authenticated, use default layout
  if (!isAuthenticated || !user) {
    return <DefaultLayout>{children}</DefaultLayout>;
  }

  // Route to role-specific layout based on user role
  switch (user.role) {
    case 'system_admin':
    case 'org_admin':
    case 'admin':
      return <AdminLayout user={user}>{children}</AdminLayout>;
    
    case 'manager':
      return <ManagerLayout user={user}>{children}</ManagerLayout>;
    
    case 'office_staff':
      return <OfficeStaffLayout user={user}>{children}</OfficeStaffLayout>;
    
    case 'technician':
      return <TechnicianLayout user={user}>{children}</TechnicianLayout>;
    
    case 'client':
      return <ClientLayout user={user}>{children}</ClientLayout>;
    
    default:
      console.warn(`Unknown user role: ${user.role}, using default layout`);
      return <DefaultLayout>{children}</DefaultLayout>;
  }
};

export default RoleBasedLayout;