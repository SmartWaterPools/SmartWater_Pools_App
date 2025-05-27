import React, { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Home, 
  Calendar, 
  FileText, 
  CreditCard, 
  MessageSquare, 
  LifeBuoy,
  User,
  LogOut,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PermissionGate } from '../PermissionGate';

interface ClientPortalLayoutProps {
  children: ReactNode;
}

/**
 * Layout component for the client portal
 * This provides a simplified sidebar with access only to client-relevant pages
 * and enforces permissions appropriate for clients
 */
export const ClientPortalLayout: React.FC<ClientPortalLayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const [location, navigate] = useLocation();

  // Navigation links with permission requirements
  const links = [
    { 
      href: '/client-portal', 
      label: 'Dashboard', 
      icon: <Home className="h-5 w-5 mr-2" />,
      permission: { resource: 'clients' as const, action: 'view' as const }
    },
    { 
      href: '/client-portal/schedule', 
      label: 'Schedule', 
      icon: <Calendar className="h-5 w-5 mr-2" />,
      permission: { resource: 'maintenance' as const, action: 'view' as const }
    },
    { 
      href: '/client-portal/reports', 
      label: 'Reports', 
      icon: <FileText className="h-5 w-5 mr-2" />,
      permission: { resource: 'reports' as const, action: 'view' as const }
    },
    { 
      href: '/client-portal/invoices', 
      label: 'Invoices', 
      icon: <CreditCard className="h-5 w-5 mr-2" />,
      permission: { resource: 'invoices' as const, action: 'view' as const }
    },
    { 
      href: '/client-portal/service-requests', 
      label: 'Service Requests', 
      icon: <LifeBuoy className="h-5 w-5 mr-2" />,
      permission: { resource: 'repairs' as const, action: 'create' as const }
    },
    { 
      href: '/client-portal/messages', 
      label: 'Messages', 
      icon: <MessageSquare className="h-5 w-5 mr-2" />,
      permission: { resource: 'communications' as const, action: 'view' as const }
    },
    { 
      href: '/client-portal/profile', 
      label: 'My Profile', 
      icon: <User className="h-5 w-5 mr-2" />,
      permission: { resource: 'clients' as const, action: 'edit' as const }
    }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar for client navigation */}
      <aside className="w-64 bg-white shadow-md p-6 flex flex-col">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-primary mb-2">Smart Water Pools</h1>
          <p className="text-sm text-muted-foreground">Client Portal</p>
        </div>
        
        <nav className="flex-1 space-y-1">
          {links.map((link) => (
            <PermissionGate 
              key={link.href}
              resource={link.permission.resource}
              action={link.permission.action}
            >
              <Link href={link.href}>
                <a 
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium w-full transition-colors ${
                    location === link.href
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {link.icon}
                  {link.label}
                </a>
              </Link>
            </PermissionGate>
          ))}
        </nav>
        
        <div className="pt-6 border-t mt-6">
          <div className="flex items-center mb-4">
            <div className="relative">
              <span className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                {user?.name?.charAt(0) || 'U'}
              </span>
              <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{user?.name || 'Client'}</p>
              <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
            </div>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            className="w-full flex items-center justify-center"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>
      
      {/* Main content area */}
      <main className="flex-1 p-6 overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default ClientPortalLayout;