import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Calendar, 
  FileText,
  DollarSign,
  MessageSquare,
  Building2,
  ClipboardList,
  BarChart4,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  Menu,
  X,
  Droplet,
  PlusCircle,
  Search
} from "lucide-react";
import { useAuth } from '../../contexts/AuthContext';
import { User } from '@shared/schema';

interface OfficeStaffLayoutProps {
  children: React.ReactNode;
  user: Omit<User, 'password'>;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
  description?: string;
  badge?: string;
  color?: 'default' | 'blue' | 'green' | 'yellow' | 'red';
}

/**
 * Office Staff Layout Component
 * 
 * Provides an administrative interface for office staff focused on
 * client management, scheduling, communications, and billing support.
 */
export const OfficeStaffLayout: React.FC<OfficeStaffLayoutProps> = ({ children, user }) => {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { logout } = useAuth();

  // Mock data for demonstration - in real app, fetch from API
  const pendingInvoices = 12;
  const todaysAppointments = 8;
  const unreadMessages = 5;

  const navigationItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/dashboard',
      icon: BarChart4,
      description: 'Overview and daily metrics'
    },
    {
      label: 'Client Management',
      href: '/clients',
      icon: Building2,
      description: 'Client profiles and information'
    },
    {
      label: 'Scheduling',
      href: '/scheduling',
      icon: Calendar,
      description: 'Appointments and service schedules',
      badge: todaysAppointments.toString(),
      color: 'blue'
    },
    {
      label: 'Communications',
      href: '/communications',
      icon: MessageSquare,
      description: 'Client messages and notifications',
      badge: unreadMessages > 0 ? unreadMessages.toString() : undefined,
      color: 'red'
    },
    {
      label: 'Invoicing',
      href: '/invoices',
      icon: DollarSign,
      description: 'Billing and payment processing',
      badge: pendingInvoices.toString(),
      color: 'yellow'
    },
    {
      label: 'Projects',
      href: '/projects',
      icon: ClipboardList,
      description: 'Project coordination and updates'
    },
    {
      label: 'Service History',
      href: '/maintenance',
      icon: FileText,
      description: 'Maintenance records and reports'
    },
    {
      label: 'Reports',
      href: '/reports',
      icon: BarChart4,
      description: 'Generate client and business reports'
    }
  ];

  const isActive = (href: string) => {
    return location === href || location.startsWith(href + '/');
  };

  const getBadgeVariant = (color?: string) => {
    switch (color) {
      case 'blue': return 'default';
      case 'green': return 'secondary';
      case 'yellow': return 'outline';
      case 'red': return 'destructive';
      default: return 'secondary';
    }
  };

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href);

    return (
      <Link key={item.href} href={item.href}>
        <div
          className={cn(
            "flex items-center justify-between p-3 rounded-lg transition-colors",
            active
              ? "bg-primary text-primary-foreground"
              : "text-gray-700 hover:bg-gray-100"
          )}
        >
          <div className="flex items-center space-x-3">
            <item.icon className={cn(
              "h-5 w-5",
              active ? "text-primary-foreground" : "text-gray-500"
            )} />
            <div>
              <p className={cn(
                "font-medium text-sm",
                active ? "text-primary-foreground" : "text-gray-900"
              )}>
                {item.label}
              </p>
              <p className={cn(
                "text-xs",
                active ? "text-primary-foreground/80" : "text-gray-500"
              )}>
                {item.description}
              </p>
            </div>
          </div>
          
          {item.badge && (
            <Badge 
              variant={getBadgeVariant(item.color)}
              className="ml-2"
            >
              {item.badge}
            </Badge>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-72">
          <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
            {/* Logo and Role Info */}
            <div className="flex items-center flex-shrink-0 px-4 mb-6">
              <Droplet className="h-8 w-8 text-primary mr-3" fill="currentColor" />
              <div>
                <h1 className="text-xl font-bold text-primary">SmartWater Pools</h1>
                <p className="text-sm text-gray-500">Administrative Portal</p>
              </div>
            </div>

            {/* Staff Profile */}
            <div className="px-4 mb-6">
              <div className="flex items-center p-3 bg-gradient-to-r from-purple-50 to-primary/5 rounded-lg border border-primary/20">
                <div className="flex-shrink-0">
                  {user.photoUrl ? (
                    <img 
                      className="h-10 w-10 rounded-full border-2 border-primary/20" 
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
                    Office Staff
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="px-4 mb-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Link href="/clients/new">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add New Client
                  </Button>
                </Link>
                <Link href="/scheduling/new">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    Schedule Service
                  </Button>
                </Link>
                <Link href="/communications/new">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Message
                  </Button>
                </Link>
              </div>
            </div>

            {/* Today's Summary */}
            <div className="px-4 mb-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                Today's Summary
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded-md">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-blue-600 mr-2" />
                    <span className="text-sm text-blue-800">Appointments</span>
                  </div>
                  <Badge variant="default">{todaysAppointments}</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-md">
                  <div className="flex items-center">
                    <DollarSign className="h-4 w-4 text-yellow-600 mr-2" />
                    <span className="text-sm text-yellow-800">Pending Invoices</span>
                  </div>
                  <Badge variant="outline">{pendingInvoices}</Badge>
                </div>
                {unreadMessages > 0 && (
                  <div className="flex items-center justify-between p-2 bg-red-50 rounded-md">
                    <div className="flex items-center">
                      <MessageSquare className="h-4 w-4 text-red-600 mr-2" />
                      <span className="text-sm text-red-800">Unread Messages</span>
                    </div>
                    <Badge variant="destructive">{unreadMessages}</Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-1">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                Navigation
              </h3>
              {navigationItems.map(item => renderNavItem(item))}
            </nav>

            {/* Footer Actions */}
            <div className="flex-shrink-0 border-t border-gray-200 p-4">
              <div className="mb-3 text-center">
                <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Phone className="h-4 w-4 mr-1" />
                    <span>(555) 123-4567</span>
                  </div>
                </div>
              </div>
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
                  <p className="text-sm text-gray-500">Office Staff</p>
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
              <p className="text-xs text-gray-500">Admin Portal</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {unreadMessages > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unreadMessages}
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

export default OfficeStaffLayout;