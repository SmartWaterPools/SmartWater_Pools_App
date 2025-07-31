import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Home, 
  Calendar, 
  FileText,
  MessageSquare,
  DollarSign,
  Settings,
  Droplets,
  Camera,
  AlertTriangle,
  CheckCircle,
  Clock,
  Menu,
  X,
  Droplet,
  MapPin,
  Phone,
  Mail
} from "lucide-react";
import { useAuth } from '../../contexts/AuthContext';
import { User } from '@shared/schema';
import { EnhancedTabManager } from './EnhancedTabManager';
import { EnhancedBreadcrumbs } from './EnhancedBreadcrumbs';

interface ClientLayoutProps {
  children: React.ReactNode;
  user: User;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<any>;
  description?: string;
  badge?: string;
  status?: 'active' | 'pending' | 'completed';
}

/**
 * Client Layout Component
 * 
 * Provides a customer-focused interface for pool service clients
 * with access to their service history, scheduling, and communications.
 */
export const ClientLayout: React.FC<ClientLayoutProps> = ({ children, user }) => {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { logout } = useAuth();

  // Mock data for demonstration - in real app, fetch from API
  const nextService = "Tomorrow, 2:00 PM";
  const lastService = "3 days ago";
  const pendingRequests = 1;
  const unreadMessages = 2;

  const navigationItems: NavItem[] = [
    {
      label: 'My Pool Dashboard',
      href: '/client-portal',
      icon: Home,
      description: 'Overview of your pool service'
    },
    {
      label: 'Service Schedule',
      href: '/client/schedule',
      icon: Calendar,
      description: 'Upcoming maintenance visits',
      status: 'active'
    },
    {
      label: 'Service History',
      href: '/client/history',
      icon: FileText,
      description: 'Past maintenance and repairs'
    },
    {
      label: 'Pool Photos',
      href: '/client/photos',
      icon: Camera,
      description: 'Before/after service photos'
    },
    {
      label: 'Water Quality',
      href: '/client/water-quality',
      icon: Droplets,
      description: 'Chemical balance reports'
    },
    {
      label: 'Service Requests',
      href: '/client/requests',
      icon: AlertTriangle,
      description: 'Report issues or request service',
      badge: pendingRequests > 0 ? pendingRequests.toString() : undefined,
      status: pendingRequests > 0 ? 'pending' : undefined
    },
    {
      label: 'Messages',
      href: '/client/messages',
      icon: MessageSquare,
      description: 'Communication with your service team',
      badge: unreadMessages > 0 ? unreadMessages.toString() : undefined,
      status: unreadMessages > 0 ? 'active' : undefined
    },
    {
      label: 'Billing & Invoices',
      href: '/client/billing',
      icon: DollarSign,
      description: 'View and pay invoices'
    },
    {
      label: 'Account Settings',
      href: '/client/settings',
      icon: Settings,
      description: 'Update your profile and preferences'
    }
  ];

  const isActive = (href: string) => {
    return location === href || location.startsWith(href + '/');
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
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
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <p className={cn(
                  "font-medium",
                  active ? "text-primary-foreground" : "text-gray-900"
                )}>
                  {item.label}
                </p>
                {getStatusIcon(item.status)}
              </div>
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
              variant={item.status === 'pending' ? "destructive" : "default"}
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
            {/* Logo and Client Portal Branding */}
            <div className="flex items-center flex-shrink-0 px-4 mb-6">
              <Droplet className="h-8 w-8 text-primary mr-3" fill="currentColor" />
              <div>
                <h1 className="text-xl font-bold text-primary">SmartWater Pools</h1>
                <p className="text-sm text-gray-500">Client Portal</p>
              </div>
            </div>

            {/* Client Profile */}
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
                    Premium Pool Service
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Service Status Overview */}
            <div className="px-4 mb-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                Service Status
              </h3>
              <div className="space-y-3">
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="p-3">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-green-800">Last Service</p>
                        <p className="text-xs text-green-600">{lastService}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="p-3">
                    <div className="flex items-center">
                      <Calendar className="h-5 w-5 text-blue-600 mr-3" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">Next Service</p>
                        <p className="text-xs text-blue-600">{nextService}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {pendingRequests > 0 && (
                  <Card className="border-yellow-200 bg-yellow-50">
                    <CardContent className="p-3">
                      <div className="flex items-center">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mr-3" />
                        <div>
                          <p className="text-sm font-medium text-yellow-800">Pending Request</p>
                          <p className="text-xs text-yellow-600">Equipment repair needed</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="px-4 mb-6">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Link href="/client/requests/new">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Report Issue
                  </Button>
                </Link>
                <Link href="/client/schedule/request">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <Calendar className="h-4 w-4 mr-2" />
                    Request Service
                  </Button>
                </Link>
                <Link href="/client/messages/new">
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Contact Team
                  </Button>
                </Link>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-2">
              <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
                My Account
              </h3>
              {navigationItems.map(item => renderNavItem(item))}
            </nav>

            {/* Contact Information */}
            <div className="flex-shrink-0 border-t border-gray-200 p-4">
              <div className="bg-gray-50 p-3 rounded-lg mb-3">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Need Help?</h4>
                <div className="space-y-1">
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="h-4 w-4 mr-2" />
                    <span>(555) 123-4567</span>
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    <span>support@smartwaterpools.com</span>
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
                  <p className="text-sm text-gray-500">Pool Service Client</p>
                </div>
              </div>
            </div>

            <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
              {navigationItems.map(item => renderNavItem(item))}
            </nav>
            
            <div className="border-t border-gray-200 p-4">
              <div className="text-center mb-3">
                <p className="text-sm text-gray-600">Need help? Call us:</p>
                <p className="text-sm font-medium text-primary">(555) 123-4567</p>
              </div>
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
              <p className="text-xs text-gray-500">Client Portal</p>
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

        {/* Tab Manager */}
        <EnhancedTabManager />
        
        {/* Breadcrumbs */}
        <div className="px-4 md:px-6 py-2 border-b border-gray-200 bg-white">
          <EnhancedBreadcrumbs />
        </div>
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default ClientLayout;