import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart4, 
  Users, 
  Calendar, 
  Building2,
  Wrench,
  DollarSign,
  Package,
  MessageSquare,
  Settings,
  TrendingUp,
  FileText,
  Map,
  UserCheck,
  AlertTriangle,
  Menu,
  X,
  Droplet,
  ChevronDown,
  ChevronRight
} from "lucide-react";
import { useAuth } from '../../contexts/AuthContext';
import { User } from '@shared/schema';

interface ManagerLayoutProps {
  children: React.ReactNode;
  user: User;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
  description?: string;
  children?: NavItem[];
  badge?: string;
  urgent?: boolean;
}

/**
 * Manager Layout Component
 * 
 * Provides a management-focused interface for pool service managers
 * with oversight capabilities and operational control.
 */
export const ManagerLayout: React.FC<ManagerLayoutProps> = ({ children, user }) => {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['operations']));
  const { logout } = useAuth();

  // Mock data for demonstration
  const activeProjects = 7;
  const pendingApprovals = 3;
  const teamMessages = 4;

  const navigationItems: NavItem[] = [
    {
      label: 'Management Dashboard',
      href: '/dashboard',
      icon: BarChart4,
      description: 'Business overview and KPIs'
    },
    {
      label: 'Team Management',
      href: '/team',
      icon: Users,
      children: [
        {
          label: 'Technicians',
          href: '/technicians',
          icon: UserCheck,
          description: 'Field team management'
        },
        {
          label: 'Office Staff',
          href: '/users',
          icon: Users,
          description: 'Administrative team'
        },
        {
          label: 'Schedules',
          href: '/scheduling',
          icon: Calendar,
          description: 'Team scheduling and assignments'
        }
      ]
    },
    {
      label: 'Operations',
      href: '/operations',
      icon: Wrench,
      children: [
        {
          label: 'Active Projects',
          href: '/projects',
          icon: Building2,
          description: 'Construction and renovation oversight',
          badge: activeProjects.toString()
        },
        {
          label: 'Maintenance',
          href: '/maintenance',
          icon: Wrench,
          description: 'Service operations management'
        },
        {
          label: 'Route Planning',
          href: '/routes',
          icon: Map,
          description: 'Service route optimization'
        },
        {
          label: 'Quality Control',
          href: '/quality',
          icon: FileText,
          description: 'Service quality monitoring'
        }
      ]
    },
    {
      label: 'Business Intelligence',
      href: '/business',
      icon: TrendingUp,
      children: [
        {
          label: 'Financial Reports',
          href: '/reports/financial',
          icon: DollarSign,
          description: 'Revenue and profitability analysis'
        },
        {
          label: 'Performance Analytics',
          href: '/reports/performance',
          icon: BarChart4,
          description: 'Operational efficiency metrics'
        },
        {
          label: 'Client Analytics',
          href: '/reports/clients',
          icon: Building2,
          description: 'Customer satisfaction and retention'
        }
      ]
    },
    {
      label: 'Client Relations',
      href: '/clients',
      icon: Building2,
      description: 'Client portfolio management'
    },
    {
      label: 'Inventory Control',
      href: '/inventory',
      icon: Package,
      description: 'Chemical and equipment management'
    },
    {
      label: 'Communications',
      href: '/communications',
      icon: MessageSquare,
      description: 'Team and client communications',
      badge: teamMessages > 0 ? teamMessages.toString() : undefined
    },
    {
      label: 'Approvals',
      href: '/approvals',
      icon: AlertTriangle,
      description: 'Pending decisions and approvals',
      badge: pendingApprovals > 0 ? pendingApprovals.toString() : undefined,
      urgent: pendingApprovals > 0
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
    const isExpanded = expandedSections.has(item.label.toLowerCase().replace(' ', '-'));
    const active = isActive(item.href);

    return (
      <div key={item.href} className={cn(isChild && "ml-4")}>
        <div className="flex items-center">
          {hasChildren ? (
            <button
              onClick={() => toggleSection(item.label.toLowerCase().replace(' ', '-'))}
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
                {item.badge && (
                  <Badge 
                    variant={item.urgent ? "destructive" : "secondary"}
                    className="ml-2"
                  >
                    {item.badge}
                  </Badge>
                )}
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
                  "flex items-center justify-between px-3 py-2 text-sm font-medium rounded-md transition-colors",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <div className="flex items-center">
                  <item.icon className="h-5 w-5 mr-3" />
                  {item.label}
                </div>
                {item.badge && (
                  <Badge 
                    variant={item.urgent ? "destructive" : active ? "secondary" : "default"}
                    className="ml-2"
                  >
                    {item.badge}
                  </Badge>
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
            {/* Logo and Manager Info */}
            <div className="flex items-center flex-shrink-0 px-4 mb-6">
              <Droplet className="h-8 w-8 text-primary mr-3" fill="currentColor" />
              <div>
                <h1 className="text-xl font-bold text-primary">SmartWater Pools</h1>
                <p className="text-sm text-gray-500">Management Console</p>
              </div>
            </div>

            {/* Manager Profile */}
            <div className="px-4 mb-6">
              <div className="flex items-center p-4 bg-gradient-to-r from-green-50 to-primary/5 rounded-lg border border-primary/20">
                <div className="flex-shrink-0">
                  {user.photoUrl ? (
                    <img 
                      className="h-12 w-12 rounded-full border-2 border-primary/20" 
                      src={user.photoUrl} 
                      alt={user.name}
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-white font-medium text-lg">
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
                    Operations Manager
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="px-4 mb-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                Today's Overview
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <div className="text-center">
                    <p className="text-lg font-bold text-blue-800">{activeProjects}</p>
                    <p className="text-xs text-blue-600">Active Projects</p>
                  </div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                  <div className="text-center">
                    <p className="text-lg font-bold text-orange-800">{pendingApprovals}</p>
                    <p className="text-xs text-orange-600">Need Approval</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-1">
              {navigationItems.map(item => renderNavItem(item))}
            </nav>

            {/* Footer Actions */}
            <div className="flex-shrink-0 border-t border-gray-200 p-4">
              <Link href="/settings">
                <Button variant="outline" className="w-full mb-3">
                  <Settings className="h-4 w-4 mr-2" />
                  Organization Settings
                </Button>
              </Link>
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
          <div className="fixed inset-y-0 left-0 flex flex-col w-full max-w-sm bg-white">
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
            
            {/* Mobile user info */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-white font-medium">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{user.name}</p>
                  <p className="text-sm text-gray-500">Operations Manager</p>
                </div>
              </div>
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
            <div className="text-center">
              <h1 className="text-lg font-bold text-primary">SmartWater</h1>
              <p className="text-xs text-gray-500">Management</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {pendingApprovals > 0 && (
              <Badge variant="destructive" className="text-xs">
                {pendingApprovals}
              </Badge>
            )}
          </div>
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default ManagerLayout;