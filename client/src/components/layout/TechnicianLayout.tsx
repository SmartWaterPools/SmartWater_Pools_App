import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Wrench, 
  MapPin, 
  Calendar, 
  CheckCircle,
  Clock,
  AlertTriangle,
  Users,
  MessageSquare,
  Package,
  Camera,
  Menu,
  X,
  Droplet,
  Navigation,
  ClipboardList,
  FileText
} from "lucide-react";
import { useAuth } from '../../contexts/AuthContext';
import { User } from '@shared/schema';

interface TechnicianLayoutProps {
  children: React.ReactNode;
  user: User;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
  description?: string;
  badge?: string;
  urgent?: boolean;
}

/**
 * Technician Layout Component
 * 
 * Provides a field-focused interface for technicians with quick access
 * to maintenance tasks, route planning, and service documentation.
 */
export const TechnicianLayout: React.FC<TechnicianLayoutProps> = ({ children, user }) => {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { logout } = useAuth();

  // Mock data for demonstration - in real app, fetch from API
  const todaysTasks = 8;
  const urgentTasks = 2;
  const completedToday = 3;

  const navigationItems: NavItem[] = [
    {
      label: 'Today\'s Schedule',
      href: '/technician/schedule',
      icon: Calendar,
      description: 'Your daily route and tasks',
      badge: todaysTasks.toString()
    },
    {
      label: 'Active Tasks',
      href: '/maintenance',
      icon: Wrench,
      description: 'Current maintenance jobs',
      badge: urgentTasks > 0 ? urgentTasks.toString() : undefined,
      urgent: urgentTasks > 0
    },
    {
      label: 'Route Navigation',
      href: '/technician/routes',
      icon: Navigation,
      description: 'GPS navigation to next job'
    },
    {
      label: 'Service Reports',
      href: '/technician/reports',
      icon: ClipboardList,
      description: 'Complete service documentation'
    },
    {
      label: 'Repairs',
      href: '/repairs',
      icon: AlertTriangle,
      description: 'Report and track repairs'
    },
    {
      label: 'Inventory',
      href: '/inventory',
      icon: Package,
      description: 'Chemical usage and stock'
    },
    {
      label: 'Clients',
      href: '/clients',
      icon: Users,
      description: 'Client information and notes'
    },
    {
      label: 'Photos & Notes',
      href: '/technician/documentation',
      icon: Camera,
      description: 'Upload service photos'
    },
    {
      label: 'Messages',
      href: '/communications',
      icon: MessageSquare,
      description: 'Client and office communications'
    }
  ];

  const isActive = (href: string) => {
    return location === href || location.startsWith(href + '/');
  };

  const renderNavItem = (item: NavItem) => {
    const active = isActive(item.href);

    return (
      <Link key={item.href} href={item.href}>
        <div
          className={cn(
            "flex items-center justify-between p-4 rounded-lg transition-colors border",
            active
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-white hover:bg-gray-50 border-gray-200"
          )}
        >
          <div className="flex items-center space-x-3">
            <div className={cn(
              "p-2 rounded-md",
              active ? "bg-primary-foreground/20" : "bg-gray-100"
            )}>
              <item.icon className={cn(
                "h-5 w-5",
                active ? "text-primary-foreground" : "text-gray-600"
              )} />
            </div>
            <div>
              <p className={cn(
                "font-medium",
                active ? "text-primary-foreground" : "text-gray-900"
              )}>
                {item.label}
              </p>
              <p className={cn(
                "text-sm",
                active ? "text-primary-foreground/80" : "text-gray-500"
              )}>
                {item.description}
              </p>
            </div>
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
    );
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-80">
          <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
            {/* Logo and Technician Info */}
            <div className="flex items-center flex-shrink-0 px-4 mb-6">
              <Droplet className="h-8 w-8 text-primary mr-3" fill="currentColor" />
              <div>
                <h1 className="text-xl font-bold text-primary">SmartWater Pools</h1>
                <p className="text-sm text-gray-500">Field Technician Portal</p>
              </div>
            </div>

            {/* Technician Profile */}
            <div className="px-4 mb-6">
              <div className="flex items-center p-4 bg-gradient-to-r from-blue-50 to-primary/5 rounded-lg border border-primary/20">
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
                    Field Technician
                  </p>
                  <div className="flex items-center mt-1 space-x-2">
                    <Badge variant="secondary" className="text-xs">
                      {completedToday} completed today
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="px-4 mb-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                    <span className="text-sm font-medium text-green-800">
                      {completedToday} Done
                    </span>
                  </div>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-orange-600 mr-2" />
                    <span className="text-sm font-medium text-orange-800">
                      {todaysTasks - completedToday} Pending
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-3">
              {navigationItems.map(item => renderNavItem(item))}
            </nav>

            {/* Emergency Contact */}
            <div className="flex-shrink-0 border-t border-gray-200 p-4">
              <div className="bg-red-50 p-3 rounded-lg border border-red-200 mb-3">
                <div className="flex items-center">
                  <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                  <span className="text-sm font-medium text-red-800">
                    Emergency: (555) 123-4567
                  </span>
                </div>
              </div>
              <Button
                onClick={() => logout()}
                variant="outline"
                className="w-full"
              >
                End Shift
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
                  <p className="text-sm text-gray-500">Field Technician</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
              {navigationItems.map(item => renderNavItem(item))}
            </nav>
            
            <div className="border-t border-gray-200 p-4">
              <Button onClick={() => logout()} variant="outline" className="w-full">
                End Shift
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
              <p className="text-xs text-gray-500">Field Portal</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {urgentTasks > 0 && (
              <Badge variant="destructive" className="text-xs">
                {urgentTasks}
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

export default TechnicianLayout;