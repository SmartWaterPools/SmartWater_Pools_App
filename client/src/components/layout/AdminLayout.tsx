import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { 
  Settings, 
  Users, 
  Building2, 
  BarChart4, 
  Shield, 
  Database,
  UserCheck,
  Wrench,
  Calendar,
  DollarSign,
  Package,
  MessageSquare,
  Map,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Droplet
} from "lucide-react";
import { useAuth } from '../../contexts/AuthContext';
import { User } from '@shared/schema';
import { EnhancedTabManager } from './EnhancedTabManager';
import { EnhancedBreadcrumbs } from './EnhancedBreadcrumbs';

interface AdminLayoutProps {
  children: React.ReactNode;
  user: User;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
  description?: string;
  children?: NavItem[];
}

/**
 * Admin Layout Component
 * 
 * Provides a comprehensive administration interface for system admins
 * and organization admins with full feature access and management tools.
 */
export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, user }) => {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['management']));
  const { logout } = useAuth();

  const isSystemAdmin = user.role === 'system_admin';

  const navigationItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: BarChart4,
      description: 'Overview and analytics'
    },
    {
      label: 'Management',
      href: '/management',
      icon: Settings,
      children: [
        {
          label: 'Users & Teams',
          href: '/users',
          icon: Users,
          description: 'Manage all users and permissions'
        },
        {
          label: 'Clients',
          href: '/clients',
          icon: Building2,
          description: 'Client management and profiles'
        },
        {
          label: 'Technicians',
          href: '/technicians',
          icon: UserCheck,
          description: 'Technician schedules and assignments'
        },
        ...(isSystemAdmin ? [{
          label: 'Organizations',
          href: '/admin/organizations',
          icon: Shield,
          description: 'Multi-tenant organization management'
        }] : [])
      ]
    },
    {
      label: 'Operations',
      href: '/operations',
      icon: Wrench,
      children: [
        {
          label: 'Projects',
          href: '/projects',
          icon: Calendar,
          description: 'Construction and renovation projects'
        },
        {
          label: 'Maintenance',
          href: '/maintenance',
          icon: Wrench,
          description: 'Scheduled maintenance tasks'
        },
        {
          label: 'Repairs',
          href: '/repairs',
          icon: Settings,
          description: 'Repair requests and tracking'
        },
        {
          label: 'Routes',
          href: '/routes',
          icon: Map,
          description: 'Service route planning'
        }
      ]
    },
    {
      label: 'Business',
      href: '/business',
      icon: DollarSign,
      children: [
        {
          label: 'Invoicing',
          href: '/invoices',
          icon: DollarSign,
          description: 'Billing and invoice management'
        },
        {
          label: 'Reports',
          href: '/reports',
          icon: BarChart4,
          description: 'Business analytics and insights'
        },
        {
          label: 'Inventory',
          href: '/inventory',
          icon: Package,
          description: 'Chemical and equipment tracking'
        }
      ]
    },
    {
      label: 'Communications',
      href: '/communications',
      icon: MessageSquare,
      description: 'Client communications and notifications'
    },
    ...(isSystemAdmin ? [{
      label: 'System Admin',
      href: '/admin',
      icon: Database,
      description: 'System-wide administration'
    }] : []),
    {
      label: 'Settings',
      href: '/settings',
      icon: Settings,
      description: 'Organization and system settings'
    }
  ];

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const isActive = (href: string) => {
    return location === href || location.startsWith(href + '/');
  };

  const renderNavItem = (item: NavItem, isChild = false) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections.has(item.label.toLowerCase());
    const active = isActive(item.href);

    return (
      <div key={item.href} className={cn(isChild && "ml-6")}>
        <div className="flex items-center">
          {hasChildren ? (
            <button
              onClick={() => toggleSection(item.label.toLowerCase())}
              className={cn(
                "flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-md transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <div className="flex items-center">
                <item.icon className="h-5 w-5 mr-3" />
                {item.label}
              </div>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ) : (
            <Link href={item.href} className="w-full">
              <div
                className={cn(
                  "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <item.icon className="h-5 w-5 mr-3" />
                {item.label}
                {item.description && (
                  <span className="ml-auto text-xs text-gray-500 hidden lg:block">
                    {item.description}
                  </span>
                )}
              </div>
            </Link>
          )}
        </div>
        
        {hasChildren && isExpanded && (
          <div className="mt-2 space-y-1">
            {item.children!.map(child => renderNavItem(child, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-80">
          <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
            {/* Logo and Organization Info */}
            <div className="flex items-center flex-shrink-0 px-4 mb-6">
              <Droplet className="h-8 w-8 text-primary mr-3" fill="currentColor" />
              <div>
                <h1 className="text-xl font-bold text-primary">SmartWater Pools</h1>
                <p className="text-sm text-gray-500">
                  {isSystemAdmin ? 'System Administrator' : 'Organization Admin'}
                </p>
              </div>
            </div>

            {/* User Info */}
            <div className="px-4 mb-6">
              <div className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex-shrink-0">
                  {user.photoUrl ? (
                    <img 
                      className="h-10 w-10 rounded-full" 
                      src={user.photoUrl} 
                      alt={user.name}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-white font-medium">
                        {user.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-1">
              {navigationItems.map(item => renderNavItem(item))}
            </nav>

            {/* Footer Actions */}
            <div className="flex-shrink-0 border-t border-gray-200 p-4">
              <Button
                onClick={() => logout()}
                variant="outline"
                className="w-full"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsMobileMenuOpen(false)} />
          <div className="fixed inset-y-0 left-0 flex flex-col w-full max-w-xs bg-white">
            <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
              <div className="flex items-center">
                <Droplet className="h-6 w-6 text-primary mr-2" fill="currentColor" />
                <h1 className="text-lg font-bold text-primary">SmartWater</h1>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
              {navigationItems.map(item => renderNavItem(item))}
            </nav>
            <div className="border-t border-gray-200 p-4">
              <Button onClick={() => logout()} variant="outline" className="w-full">
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile Header */}
        <div className="md:hidden flex items-center justify-between h-16 px-4 bg-white border-b border-gray-200">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-gray-500 hover:text-gray-700"
          >
            <Menu className="h-6 w-6" />
          </button>
          <div className="flex items-center">
            <Droplet className="h-6 w-6 text-primary mr-2" fill="currentColor" />
            <h1 className="text-lg font-bold text-primary">SmartWater</h1>
          </div>
          <div className="w-6" /> {/* Spacer for center alignment */}
        </div>

        {/* Tab Manager */}
        <EnhancedTabManager />
        
        {/* Breadcrumbs */}
        <div className="px-6 py-2 border-b border-gray-200 bg-white">
          <EnhancedBreadcrumbs />
        </div>
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;