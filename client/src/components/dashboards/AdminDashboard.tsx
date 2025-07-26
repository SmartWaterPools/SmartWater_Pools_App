import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Building2, 
  DollarSign, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Settings,
  BarChart4
} from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "../../contexts/AuthContext";

/**
 * Admin Dashboard Component
 * 
 * Comprehensive dashboard for system admins and organization admins
 * with organization-wide metrics, user management, and system controls.
 */
export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const isSystemAdmin = user?.role === 'system_admin';

  // Fetch admin-specific dashboard data
  const { data: adminMetrics, isLoading } = useQuery({
    queryKey: ['/api/admin/dashboard-metrics'],
    queryFn: async () => {
      const response = await fetch('/api/admin/dashboard-metrics');
      if (!response.ok) throw new Error('Failed to fetch admin metrics');
      return response.json();
    }
  });

  const { data: organizations } = useQuery({
    queryKey: ['/api/organizations'],
    queryFn: async () => {
      const response = await fetch('/api/organizations');
      if (!response.ok) throw new Error('Failed to fetch organizations');
      return response.json();
    },
    enabled: isSystemAdmin
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const metrics = adminMetrics || {
    totalUsers: 0,
    activeClients: 0,
    monthlyRevenue: 0,
    activeProjects: 0,
    pendingApprovals: 0,
    systemAlerts: 0
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {isSystemAdmin ? 'System Administration' : 'Organization Dashboard'}
          </h1>
          <p className="text-gray-600 mt-1">
            {isSystemAdmin 
              ? 'Multi-tenant system overview and management' 
              : 'Organization metrics and management tools'
            }
          </p>
        </div>
        <div className="flex space-x-3">
          <Link href="/users/new">
            <Button>
              <Users className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeClients}</div>
            <p className="text-xs text-muted-foreground">
              +8% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${metrics.monthlyRevenue?.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              +15% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeProjects}</div>
            <p className="text-xs text-muted-foreground">
              +3 new this week
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts and Notifications */}
      {(metrics.pendingApprovals > 0 || metrics.systemAlerts > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {metrics.pendingApprovals > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center text-orange-800">
                  <Clock className="h-5 w-5 mr-2" />
                  Pending Approvals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-orange-700 mb-3">
                  {metrics.pendingApprovals} items require your approval
                </p>
                <Link href="/approvals">
                  <Button variant="outline" size="sm">
                    Review Approvals
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {metrics.systemAlerts > 0 && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center text-red-800">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  System Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-700 mb-3">
                  {metrics.systemAlerts} system alerts need attention
                </p>
                <Link href="/admin/alerts">
                  <Button variant="outline" size="sm">
                    View Alerts
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* System Admin: Multi-Organization Overview */}
      {isSystemAdmin && organizations && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="h-5 w-5 mr-2" />
              Organization Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {organizations.map((org: any) => (
                <div key={org.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h3 className="font-medium">{org.name}</h3>
                    <p className="text-sm text-gray-500">{org.email}</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant={org.active ? "default" : "secondary"}>
                      {org.active ? "Active" : "Inactive"}
                    </Badge>
                    <Badge variant="outline">
                      {org.userCount || 0} users
                    </Badge>
                    <Link href={`/admin/organizations/${org.id}`}>
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/users">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-primary mr-4" />
                <div>
                  <h3 className="font-semibold">User Management</h3>
                  <p className="text-sm text-gray-600">Manage users, roles, and permissions</p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/reports">
            <CardContent className="p-6">
              <div className="flex items-center">
                <BarChart4 className="h-8 w-8 text-primary mr-4" />
                <div>
                  <h3 className="font-semibold">Analytics & Reports</h3>
                  <p className="text-sm text-gray-600">Business intelligence and insights</p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/settings">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Settings className="h-8 w-8 text-primary mr-4" />
                <div>
                  <h3 className="font-semibold">System Settings</h3>
                  <p className="text-sm text-gray-600">Configure system preferences</p>
                </div>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;